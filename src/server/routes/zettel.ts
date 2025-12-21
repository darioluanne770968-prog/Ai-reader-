import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 生成Zettelkasten ID (时间戳格式)
function generateZettelId(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
}

// 获取所有卡片
router.get('/', (req, res) => {
  try {
    const { type, search, parentId } = req.query;
    let query = 'SELECT * FROM zettel_cards WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND card_type = ?';
      params.push(type);
    }

    if (parentId) {
      query += ' AND parent_id = ?';
      params.push(parentId);
    }

    if (search) {
      query = `
        SELECT zc.* FROM zettel_cards zc
        JOIN zettel_fts fts ON zc.id = fts.card_id
        WHERE zettel_fts MATCH ?
      `;
      params.length = 0;
      params.push(search);
    }

    query += ' ORDER BY sequence, created_at DESC';
    const cards = db.prepare(query).all(...params);

    res.json(cards);
  } catch (error) {
    console.error('Get zettel cards error:', error);
    res.status(500).json({ error: '获取卡片失败' });
  }
});

// 获取单个卡片及其关联
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const card = db.prepare('SELECT * FROM zettel_cards WHERE id = ?').get(id);

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 获取子卡片
    const children = db.prepare(`
      SELECT * FROM zettel_cards
      WHERE parent_id = ?
      ORDER BY sequence
    `).all(id);

    // 获取关联卡片
    const linkedCards = db.prepare(`
      SELECT zl.*, zc.title, zc.uid
      FROM zettel_links zl
      JOIN zettel_cards zc ON zl.target_card_id = zc.id
      WHERE zl.source_card_id = ?
    `).all(id);

    // 获取反向链接
    const backlinks = db.prepare(`
      SELECT zl.*, zc.title, zc.uid
      FROM zettel_links zl
      JOIN zettel_cards zc ON zl.source_card_id = zc.id
      WHERE zl.target_card_id = ?
    `).all(id);

    res.json({
      ...card,
      children,
      linkedCards,
      backlinks
    });
  } catch (error) {
    console.error('Get zettel card error:', error);
    res.status(500).json({ error: '获取卡片失败' });
  }
});

// 创建卡片
router.post('/', (req, res) => {
  try {
    const { title, content, cardType, sourceId, sourceType, parentId, sequence } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const id = uuidv4();
    const uid = generateZettelId();

    db.prepare(`
      INSERT INTO zettel_cards (id, uid, title, content, card_type, source_id, source_type, parent_id, sequence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, uid, title, content, cardType || 'permanent', sourceId, sourceType, parentId, sequence || '');

    // 添加到全文搜索
    db.prepare(`
      INSERT INTO zettel_fts (card_id, title, content)
      VALUES (?, ?, ?)
    `).run(id, title, content);

    const card = db.prepare('SELECT * FROM zettel_cards WHERE id = ?').get(id);
    res.status(201).json(card);
  } catch (error) {
    console.error('Create zettel card error:', error);
    res.status(500).json({ error: '创建卡片失败' });
  }
});

// 从高亮创建卡片
router.post('/from-highlight', (req, res) => {
  try {
    const { highlightId, title, additionalContent } = req.body;

    const highlight = db.prepare(`
      SELECT h.*, a.title as article_title
      FROM highlights h
      JOIN articles a ON h.article_id = a.id
      WHERE h.id = ?
    `).get(highlightId) as any;

    if (!highlight) {
      return res.status(404).json({ error: '高亮不存在' });
    }

    const id = uuidv4();
    const uid = generateZettelId();
    const cardTitle = title || `从「${highlight.article_title}」提取`;
    const content = `${highlight.text}\n\n${additionalContent || ''}\n\n---\n来源：${highlight.article_title}`;

    db.prepare(`
      INSERT INTO zettel_cards (id, uid, title, content, card_type, source_id, source_type)
      VALUES (?, ?, ?, ?, 'literature', ?, 'highlight')
    `).run(id, uid, cardTitle, content, highlightId);

    db.prepare(`
      INSERT INTO zettel_fts (card_id, title, content)
      VALUES (?, ?, ?)
    `).run(id, cardTitle, content);

    const card = db.prepare('SELECT * FROM zettel_cards WHERE id = ?').get(id);
    res.status(201).json(card);
  } catch (error) {
    console.error('Create card from highlight error:', error);
    res.status(500).json({ error: '创建卡片失败' });
  }
});

// 更新卡片
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, cardType, parentId, sequence } = req.body;

    db.prepare(`
      UPDATE zettel_cards
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          card_type = COALESCE(?, card_type),
          parent_id = ?,
          sequence = COALESCE(?, sequence),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, cardType, parentId, sequence, id);

    // 更新全文搜索
    if (title || content) {
      db.prepare('DELETE FROM zettel_fts WHERE card_id = ?').run(id);
      const card = db.prepare('SELECT title, content FROM zettel_cards WHERE id = ?').get(id) as any;
      db.prepare(`
        INSERT INTO zettel_fts (card_id, title, content)
        VALUES (?, ?, ?)
      `).run(id, card.title, card.content);
    }

    const card = db.prepare('SELECT * FROM zettel_cards WHERE id = ?').get(id);
    res.json(card);
  } catch (error) {
    console.error('Update zettel card error:', error);
    res.status(500).json({ error: '更新卡片失败' });
  }
});

// 创建卡片链接
router.post('/:id/link', (req, res) => {
  try {
    const { id } = req.params;
    const { targetCardId, linkType, description } = req.body;

    if (!targetCardId) {
      return res.status(400).json({ error: '目标卡片ID不能为空' });
    }

    const linkId = uuidv4();
    db.prepare(`
      INSERT INTO zettel_links (id, source_card_id, target_card_id, link_type, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(linkId, id, targetCardId, linkType || 'reference', description);

    res.status(201).json({ id: linkId, sourceCardId: id, targetCardId, linkType, description });
  } catch (error) {
    console.error('Create zettel link error:', error);
    res.status(500).json({ error: '创建链接失败' });
  }
});

// 删除卡片链接
router.delete('/link/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    db.prepare('DELETE FROM zettel_links WHERE id = ?').run(linkId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete zettel link error:', error);
    res.status(500).json({ error: '删除链接失败' });
  }
});

// 删除卡片
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 更新子卡片的parent_id为null
    db.prepare('UPDATE zettel_cards SET parent_id = NULL WHERE parent_id = ?').run(id);

    db.prepare('DELETE FROM zettel_fts WHERE card_id = ?').run(id);
    db.prepare('DELETE FROM zettel_links WHERE source_card_id = ? OR target_card_id = ?').run(id, id);
    db.prepare('DELETE FROM zettel_cards WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete zettel card error:', error);
    res.status(500).json({ error: '删除卡片失败' });
  }
});

// 获取卡片类型统计
router.get('/stats/types', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT card_type, COUNT(*) as count
      FROM zettel_cards
      GROUP BY card_type
    `).all();

    res.json(stats);
  } catch (error) {
    console.error('Get zettel stats error:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

export default router;
