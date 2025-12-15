import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

const router = Router();

// 获取所有标签
router.get('/', (_req: Request, res: Response) => {
  try {
    const tags = db.prepare(`
      SELECT t.*, COUNT(at.article_id) as article_count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      GROUP BY t.id
      ORDER BY article_count DESC, t.name ASC
    `).all();

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: '获取标签失败' });
  }
});

// 创建标签
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: '标签已存在', tagId: (existing as { id: string }).id });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#3b82f6');

    res.json({ id, name, color: color || '#3b82f6' });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: '创建标签失败' });
  }
});

// 更新标签
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const updates: string[] = [];
    const params: string[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (color) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    params.push(req.params.id);

    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: '更新标签失败' });
  }
});

// 删除标签
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: '删除标签失败' });
  }
});

// 为文章添加标签
router.post('/article/:articleId', (req: Request, res: Response) => {
  try {
    const { tag_id, tag_name } = req.body;
    let tagId = tag_id;

    // 如果提供了tag_name而不是tag_id，先创建或获取标签
    if (!tagId && tag_name) {
      const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag_name) as { id: string } | undefined;
      if (existing) {
        tagId = existing.id;
      } else {
        tagId = uuidv4();
        db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tag_name);
      }
    }

    if (!tagId) {
      return res.status(400).json({ error: '请提供标签ID或标签名称' });
    }

    // 检查关联是否已存在
    const existing = db.prepare('SELECT 1 FROM article_tags WHERE article_id = ? AND tag_id = ?').get(req.params.articleId, tagId);
    if (existing) {
      return res.json({ message: '标签已关联' });
    }

    db.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(req.params.articleId, tagId);

    res.json({ message: '标签添加成功' });
  } catch (error) {
    console.error('Add tag to article error:', error);
    res.status(500).json({ error: '添加标签失败' });
  }
});

// 移除文章标签
router.delete('/article/:articleId/:tagId', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?').run(req.params.articleId, req.params.tagId);
    res.json({ message: '标签移除成功' });
  } catch (error) {
    console.error('Remove tag from article error:', error);
    res.status(500).json({ error: '移除标签失败' });
  }
});

export default router;
