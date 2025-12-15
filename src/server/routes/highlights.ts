import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

const router = Router();

// 获取文章的所有高亮
router.get('/article/:articleId', (req: Request, res: Response) => {
  try {
    const highlights = db.prepare(`
      SELECT * FROM highlights
      WHERE article_id = ?
      ORDER BY start_offset ASC
    `).all(req.params.articleId);

    res.json(highlights);
  } catch (error) {
    console.error('Get highlights error:', error);
    res.status(500).json({ error: '获取高亮失败' });
  }
});

// 创建高亮
router.post('/', (req: Request, res: Response) => {
  try {
    const { article_id, text, note, color, start_offset, end_offset } = req.body;

    if (!article_id || !text) {
      return res.status(400).json({ error: '文章ID和高亮文本不能为空' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO highlights (id, article_id, text, note, color, start_offset, end_offset)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, article_id, text, note || null, color || 'yellow', start_offset || null, end_offset || null);

    res.json({
      id,
      article_id,
      text,
      note,
      color: color || 'yellow',
      start_offset,
      end_offset
    });
  } catch (error) {
    console.error('Create highlight error:', error);
    res.status(500).json({ error: '创建高亮失败' });
  }
});

// 更新高亮（添加/修改笔记）
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { note, color } = req.body;
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (note !== undefined) {
      updates.push('note = ?');
      params.push(note);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    params.push(req.params.id);

    db.prepare(`UPDATE highlights SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('Update highlight error:', error);
    res.status(500).json({ error: '更新高亮失败' });
  }
});

// 删除高亮
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM highlights WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete highlight error:', error);
    res.status(500).json({ error: '删除高亮失败' });
  }
});

// 获取所有高亮（带文章信息）
router.get('/', (req: Request, res: Response) => {
  try {
    const highlights = db.prepare(`
      SELECT h.*, a.title as article_title
      FROM highlights h
      JOIN articles a ON h.article_id = a.id
      ORDER BY h.created_at DESC
      LIMIT 100
    `).all();

    res.json(highlights);
  } catch (error) {
    console.error('Get all highlights error:', error);
    res.status(500).json({ error: '获取高亮失败' });
  }
});

export default router;
