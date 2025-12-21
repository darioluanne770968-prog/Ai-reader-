import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { answerFromKnowledge, generateLearningPath } from '../services/ai.js';

const router = Router();

// 知识问答
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    // 获取知识库内容
    const articles = db.prepare(`
      SELECT id, title, content FROM articles
      ORDER BY created_at DESC LIMIT 20
    `).all() as any[];

    const notes = db.prepare(`
      SELECT id, title, content FROM notes
      ORDER BY updated_at DESC LIMIT 10
    `).all() as any[];

    const highlights = db.prepare(`
      SELECT h.id, h.text as content, a.title
      FROM highlights h
      JOIN articles a ON h.article_id = a.id
      ORDER BY h.created_at DESC LIMIT 20
    `).all() as any[];

    const knowledgeBase = [
      ...articles.map(a => ({ type: 'article' as const, id: a.id, title: a.title, content: a.content })),
      ...notes.map(n => ({ type: 'note' as const, id: n.id, title: n.title, content: n.content })),
      ...highlights.map(h => ({ type: 'highlight' as const, id: h.id, title: h.title, content: h.content }))
    ];

    const result = await answerFromKnowledge(question, knowledgeBase);

    // 保存问答历史
    const id = uuidv4();
    db.prepare(`
      INSERT INTO knowledge_qa (id, question, answer, source_article_ids, confidence)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      question,
      result.answer,
      JSON.stringify(result.sources.filter(s => s.type === 'article').map(s => s.id)),
      result.confidence
    );

    res.json({ id, ...result });
  } catch (error) {
    console.error('Knowledge QA error:', error);
    res.status(500).json({ error: '知识问答失败' });
  }
});

// 获取问答历史
router.get('/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM knowledge_qa
      ORDER BY created_at DESC LIMIT 50
    `).all();

    res.json(history);
  } catch (error) {
    console.error('Get QA history error:', error);
    res.status(500).json({ error: '获取历史失败' });
  }
});

// 学习路径相关

// 获取所有学习路径
router.get('/paths', (req, res) => {
  try {
    const paths = db.prepare(`
      SELECT * FROM learning_paths
      ORDER BY created_at DESC
    `).all();

    res.json(paths);
  } catch (error) {
    console.error('Get learning paths error:', error);
    res.status(500).json({ error: '获取学习路径失败' });
  }
});

// 获取单个学习路径详情
router.get('/paths/:id', (req, res) => {
  try {
    const { id } = req.params;
    const path = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(id);

    if (!path) {
      return res.status(404).json({ error: '学习路径不存在' });
    }

    const nodes = db.prepare(`
      SELECT lpn.*, a.title as article_title
      FROM learning_path_nodes lpn
      LEFT JOIN articles a ON lpn.article_id = a.id
      WHERE lpn.path_id = ?
      ORDER BY lpn.node_order
    `).all(id);

    res.json({ ...path, nodes });
  } catch (error) {
    console.error('Get learning path error:', error);
    res.status(500).json({ error: '获取学习路径失败' });
  }
});

// 生成学习路径
router.post('/paths/generate', async (req, res) => {
  try {
    const { goal, currentKnowledge = [] } = req.body;

    if (!goal) {
      return res.status(400).json({ error: '学习目标不能为空' });
    }

    // 获取可用文章
    const articles = db.prepare(`
      SELECT a.id, a.title, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all() as any[];

    const availableArticles = articles.map(a => ({
      id: a.id,
      title: a.title,
      tags: a.tags ? a.tags.split(',') : []
    }));

    const pathData = await generateLearningPath(goal, currentKnowledge, availableArticles);

    // 保存学习路径
    const pathId = uuidv4();
    db.prepare(`
      INSERT INTO learning_paths (id, title, description, goal, estimated_hours)
      VALUES (?, ?, ?, ?, ?)
    `).run(pathId, pathData.title, pathData.description, goal, pathData.estimatedHours);

    // 保存节点
    pathData.nodes.forEach((node, index) => {
      const nodeId = uuidv4();
      db.prepare(`
        INSERT INTO learning_path_nodes (id, path_id, article_id, external_url, title, description, node_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(nodeId, pathId, node.articleId || null, node.externalUrl || null, node.title, node.description, node.order || index);
    });

    const path = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(pathId);
    const nodes = db.prepare('SELECT * FROM learning_path_nodes WHERE path_id = ? ORDER BY node_order').all(pathId);

    res.status(201).json({ ...path, nodes });
  } catch (error) {
    console.error('Generate learning path error:', error);
    res.status(500).json({ error: '生成学习路径失败' });
  }
});

// 更新节点完成状态
router.put('/paths/:pathId/nodes/:nodeId/complete', (req, res) => {
  try {
    const { pathId, nodeId } = req.params;
    const { completed } = req.body;

    db.prepare(`
      UPDATE learning_path_nodes
      SET is_completed = ?, completed_at = ?
      WHERE id = ? AND path_id = ?
    `).run(completed ? 1 : 0, completed ? new Date().toISOString() : null, nodeId, pathId);

    // 更新路径进度
    const stats = db.prepare(`
      SELECT COUNT(*) as total, SUM(is_completed) as completed
      FROM learning_path_nodes WHERE path_id = ?
    `).get(pathId) as any;

    const progress = stats.total > 0 ? (stats.completed / stats.total) : 0;
    db.prepare('UPDATE learning_paths SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(progress, pathId);

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Update node error:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除学习路径
router.delete('/paths/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM learning_path_nodes WHERE path_id = ?').run(id);
    db.prepare('DELETE FROM learning_paths WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete learning path error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
