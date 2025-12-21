import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取所有笔记
router.get('/', (req, res) => {
  try {
    const { search, articleId } = req.query;
    let query = 'SELECT * FROM notes';
    const params: any[] = [];

    if (articleId) {
      query += ' WHERE article_id = ?';
      params.push(articleId);
    }

    if (search) {
      query = `
        SELECT n.* FROM notes n
        JOIN notes_fts fts ON n.id = fts.note_id
        WHERE notes_fts MATCH ?
      `;
      params.length = 0;
      params.push(search);
    }

    query += ' ORDER BY updated_at DESC';
    const notes = db.prepare(query).all(...params);

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: '获取笔记失败' });
  }
});

// 获取单个笔记及其链接
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

    if (!note) {
      return res.status(404).json({ error: '笔记不存在' });
    }

    // 获取出链（从此笔记链接到其他笔记）
    const outgoingLinks = db.prepare(`
      SELECT nl.*, n.title as target_title
      FROM note_links nl
      JOIN notes n ON nl.target_note_id = n.id
      WHERE nl.source_note_id = ?
    `).all(id);

    // 获取反向链接（其他笔记链接到此笔记）
    const backlinks = db.prepare(`
      SELECT nl.*, n.title as source_title, n.id as source_id
      FROM note_links nl
      JOIN notes n ON nl.source_note_id = n.id
      WHERE nl.target_note_id = ?
    `).all(id);

    res.json({
      ...note,
      outgoingLinks,
      backlinks
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: '获取笔记失败' });
  }
});

// 创建笔记
router.post('/', (req, res) => {
  try {
    const { title, content, articleId, isDaily } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const id = uuidv4();
    const wordCount = content.length;

    db.prepare(`
      INSERT INTO notes (id, title, content, article_id, is_daily, word_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, content, articleId || null, isDaily ? 1 : 0, wordCount);

    // 添加到全文搜索
    db.prepare(`
      INSERT INTO notes_fts (note_id, title, content)
      VALUES (?, ?, ?)
    `).run(id, title, content);

    // 解析并创建链接 [[note title]]
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const linkedTitle = match[1];
      const linkedNote = db.prepare('SELECT id FROM notes WHERE title = ?').get(linkedTitle) as any;

      if (linkedNote) {
        const linkId = uuidv4();
        db.prepare(`
          INSERT OR IGNORE INTO note_links (id, source_note_id, target_note_id, link_text)
          VALUES (?, ?, ?, ?)
        `).run(linkId, id, linkedNote.id, linkedTitle);
      }
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: '创建笔记失败' });
  }
});

// 更新笔记
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const wordCount = content?.length || 0;

    db.prepare(`
      UPDATE notes
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          word_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, wordCount, id);

    // 更新全文搜索
    db.prepare('DELETE FROM notes_fts WHERE note_id = ?').run(id);
    if (title && content) {
      db.prepare(`
        INSERT INTO notes_fts (note_id, title, content)
        VALUES (?, ?, ?)
      `).run(id, title, content);
    }

    // 重新解析链接
    if (content) {
      db.prepare('DELETE FROM note_links WHERE source_note_id = ?').run(id);

      const linkPattern = /\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        const linkedTitle = match[1];
        const linkedNote = db.prepare('SELECT id FROM notes WHERE title = ?').get(linkedTitle) as any;

        if (linkedNote) {
          const linkId = uuidv4();
          db.prepare(`
            INSERT OR IGNORE INTO note_links (id, source_note_id, target_note_id, link_text)
            VALUES (?, ?, ?, ?)
          `).run(linkId, id, linkedNote.id, linkedTitle);
        }
      }
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: '更新笔记失败' });
  }
});

// 删除笔记
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notes_fts WHERE note_id = ?').run(id);
    db.prepare('DELETE FROM note_links WHERE source_note_id = ? OR target_note_id = ?').run(id, id);
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: '删除笔记失败' });
  }
});

// 获取每日笔记
router.get('/daily/:date', (req, res) => {
  try {
    const { date } = req.params;
    let note = db.prepare(`
      SELECT * FROM notes
      WHERE is_daily = 1 AND date(created_at) = ?
    `).get(date);

    if (!note) {
      // 创建今日笔记
      const id = uuidv4();
      const title = `Daily Note - ${date}`;
      db.prepare(`
        INSERT INTO notes (id, title, content, is_daily)
        VALUES (?, ?, '', 1)
      `).run(id, title);
      note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    }

    res.json(note);
  } catch (error) {
    console.error('Get daily note error:', error);
    res.status(500).json({ error: '获取每日笔记失败' });
  }
});

// 获取笔记图谱数据
router.get('/graph/data', (req, res) => {
  try {
    const notes = db.prepare('SELECT id, title FROM notes').all();
    const links = db.prepare(`
      SELECT source_note_id as source, target_note_id as target
      FROM note_links
    `).all();

    res.json({
      nodes: notes.map((n: any) => ({ id: n.id, label: n.title })),
      edges: links
    });
  } catch (error) {
    console.error('Get note graph error:', error);
    res.status(500).json({ error: '获取笔记图谱失败' });
  }
});

export default router;
