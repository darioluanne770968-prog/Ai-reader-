import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { generateMindMap } from '../services/ai.js';

const router = Router();

// 获取文章的思维导图
router.get('/:articleId', (req, res) => {
  try {
    const { articleId } = req.params;
    const mindmap = db.prepare(`
      SELECT * FROM mindmaps
      WHERE article_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(articleId);

    if (mindmap) {
      res.json({
        ...mindmap,
        data: JSON.parse((mindmap as any).data)
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get mindmap error:', error);
    res.status(500).json({ error: '获取思维导图失败' });
  }
});

// 为文章生成思维导图
router.post('/:articleId/generate', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { layout = 'tree' } = req.body;

    // 获取文章内容
    const article = db.prepare('SELECT title, content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 生成思维导图
    const mindmapData = await generateMindMap(article.content, article.title);

    // 保存到数据库
    const id = uuidv4();
    db.prepare(`
      INSERT INTO mindmaps (id, article_id, data, layout)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        layout = excluded.layout,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, articleId, JSON.stringify(mindmapData), layout);

    res.json({
      id,
      articleId,
      data: mindmapData,
      layout
    });
  } catch (error) {
    console.error('Generate mindmap error:', error);
    res.status(500).json({ error: '生成思维导图失败' });
  }
});

// 更新思维导图（手动编辑）
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { data, layout } = req.body;

    db.prepare(`
      UPDATE mindmaps
      SET data = ?, layout = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(data), layout, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Update mindmap error:', error);
    res.status(500).json({ error: '更新思维导图失败' });
  }
});

// 删除思维导图
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM mindmaps WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete mindmap error:', error);
    res.status(500).json({ error: '删除思维导图失败' });
  }
});

export default router;
