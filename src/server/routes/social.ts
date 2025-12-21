import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ========== 阅读小组 ==========

// 获取所有小组
router.get('/groups', (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM reading_groups WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const groups = db.prepare(query).all(...params);

    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: '获取小组失败' });
  }
});

// 获取小组详情
router.get('/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const group = db.prepare('SELECT * FROM reading_groups WHERE id = ?').get(id);

    if (!group) {
      return res.status(404).json({ error: '小组不存在' });
    }

    const members = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ?
    `).all(id);

    const recentAnnotations = db.prepare(`
      SELECT ca.*, a.title as article_title
      FROM collaborative_annotations ca
      JOIN articles a ON ca.article_id = a.id
      WHERE ca.group_id = ?
      ORDER BY ca.created_at DESC LIMIT 20
    `).all(id);

    res.json({ ...group, members, recentAnnotations });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: '获取小组详情失败' });
  }
});

// 创建小组
router.post('/groups', (req, res) => {
  try {
    const { name, description, coverImage, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ error: '小组名称不能为空' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO reading_groups (id, name, description, cover_image, is_private)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description, coverImage, isPrivate ? 1 : 0);

    // 创建者自动加入并成为管理员
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, role)
      VALUES (?, ?, 'user', 'admin')
    `).run(memberId, id);

    const group = db.prepare('SELECT * FROM reading_groups WHERE id = ?').get(id);
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: '创建小组失败' });
  }
});

// 加入小组
router.post('/groups/:id/join', (req, res) => {
  try {
    const { id } = req.params;
    const { userId = 'user', userName = 'Anonymous' } = req.body;

    // 检查是否已加入
    const existing = db.prepare(`
      SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (existing) {
      return res.status(400).json({ error: '已经是小组成员' });
    }

    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, role)
      VALUES (?, ?, ?, 'member')
    `).run(memberId, id, userId);

    // 更新成员数
    db.prepare('UPDATE reading_groups SET member_count = member_count + 1 WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: '加入小组失败' });
  }
});

// 离开小组
router.post('/groups/:id/leave', (req, res) => {
  try {
    const { id } = req.params;
    const { userId = 'user' } = req.body;

    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(id, userId);
    db.prepare('UPDATE reading_groups SET member_count = member_count - 1 WHERE id = ? AND member_count > 0').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: '离开小组失败' });
  }
});

// 删除小组
router.delete('/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM collaborative_annotations WHERE group_id = ?').run(id);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(id);
    db.prepare('DELETE FROM reading_groups WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: '删除小组失败' });
  }
});

// ========== 协作标注 ==========

// 获取文章的协作标注
router.get('/annotations/article/:articleId', (req, res) => {
  try {
    const { articleId } = req.params;
    const { groupId } = req.query;

    let query = `
      SELECT ca.*, rg.name as group_name
      FROM collaborative_annotations ca
      JOIN reading_groups rg ON ca.group_id = rg.id
      WHERE ca.article_id = ?
    `;
    const params: any[] = [articleId];

    if (groupId) {
      query += ' AND ca.group_id = ?';
      params.push(groupId);
    }

    query += ' ORDER BY ca.start_offset, ca.created_at';
    const annotations = db.prepare(query).all(...params);

    res.json(annotations);
  } catch (error) {
    console.error('Get annotations error:', error);
    res.status(500).json({ error: '获取标注失败' });
  }
});

// 创建协作标注
router.post('/annotations', (req, res) => {
  try {
    const { articleId, groupId, content, comment, startOffset, endOffset, annotationType, userId, userName } = req.body;

    if (!articleId || !groupId || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO collaborative_annotations
      (id, article_id, group_id, user_id, user_name, annotation_type, content, comment, start_offset, end_offset)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, articleId, groupId, userId || 'user', userName || 'Anonymous', annotationType || 'highlight', content, comment, startOffset, endOffset);

    const annotation = db.prepare('SELECT * FROM collaborative_annotations WHERE id = ?').get(id);
    res.status(201).json(annotation);
  } catch (error) {
    console.error('Create annotation error:', error);
    res.status(500).json({ error: '创建标注失败' });
  }
});

// 添加评论到标注
router.post('/annotations/:id/comment', (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    db.prepare('UPDATE collaborative_annotations SET comment = ? WHERE id = ?').run(comment, id);

    const annotation = db.prepare('SELECT * FROM collaborative_annotations WHERE id = ?').get(id);
    res.json(annotation);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: '添加评论失败' });
  }
});

// 删除协作标注
router.delete('/annotations/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM collaborative_annotations WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete annotation error:', error);
    res.status(500).json({ error: '删除标注失败' });
  }
});

export default router;
