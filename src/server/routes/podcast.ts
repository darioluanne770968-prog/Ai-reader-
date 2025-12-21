import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { generatePodcastScript } from '../services/ai.js';

const router = Router();

// 获取所有播客
router.get('/', (req, res) => {
  try {
    const podcasts = db.prepare(`
      SELECT p.*, a.title as article_title
      FROM podcasts p
      JOIN articles a ON p.article_id = a.id
      ORDER BY p.created_at DESC
    `).all();

    res.json(podcasts.map((p: any) => ({
      ...p,
      speakers: JSON.parse(p.speakers || '[]'),
      script: JSON.parse(p.script || '[]')
    })));
  } catch (error) {
    console.error('Get podcasts error:', error);
    res.status(500).json({ error: '获取播客失败' });
  }
});

// 获取文章的播客
router.get('/article/:articleId', (req, res) => {
  try {
    const { articleId } = req.params;
    const podcast = db.prepare(`
      SELECT * FROM podcasts WHERE article_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(articleId);

    if (podcast) {
      res.json({
        ...podcast,
        speakers: JSON.parse((podcast as any).speakers || '[]'),
        script: JSON.parse((podcast as any).script || '[]')
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get podcast error:', error);
    res.status(500).json({ error: '获取播客失败' });
  }
});

// 为文章生成播客
router.post('/generate/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { style = 'conversational' } = req.body;

    const article = db.prepare('SELECT title, content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const podcastData = await generatePodcastScript(article.title, article.content, style);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO podcasts (id, article_id, title, script, duration_seconds, speakers, style)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      articleId,
      podcastData.title,
      JSON.stringify(podcastData.script),
      podcastData.duration * 60,
      JSON.stringify(podcastData.speakers),
      style
    );

    res.status(201).json({
      id,
      articleId,
      ...podcastData
    });
  } catch (error) {
    console.error('Generate podcast error:', error);
    res.status(500).json({ error: '生成播客失败' });
  }
});

// 获取播客详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const podcast = db.prepare(`
      SELECT p.*, a.title as article_title, a.content as article_content
      FROM podcasts p
      JOIN articles a ON p.article_id = a.id
      WHERE p.id = ?
    `).get(id);

    if (!podcast) {
      return res.status(404).json({ error: '播客不存在' });
    }

    res.json({
      ...podcast,
      speakers: JSON.parse((podcast as any).speakers || '[]'),
      script: JSON.parse((podcast as any).script || '[]')
    });
  } catch (error) {
    console.error('Get podcast error:', error);
    res.status(500).json({ error: '获取播客详情失败' });
  }
});

// 删除播客
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM podcasts WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete podcast error:', error);
    res.status(500).json({ error: '删除播客失败' });
  }
});

export default router;
