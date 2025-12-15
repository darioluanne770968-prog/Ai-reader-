import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { scrapeUrl } from '../services/scraper.js';
import { generateSummary, askQuestion, isAIConfigured } from '../services/ai.js';

const router = Router();

// 获取所有文章
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, tag, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
    `;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status === 'unread') {
      conditions.push('a.is_read = 0');
    } else if (status === 'read') {
      conditions.push('a.is_read = 1');
    } else if (status === 'favorite') {
      conditions.push('a.is_favorite = 1');
    }

    if (tag) {
      conditions.push('t.name = ?');
      params.push(tag as string);
    }

    if (search) {
      query = `
        SELECT a.*, GROUP_CONCAT(t.name) as tags
        FROM articles a
        LEFT JOIN article_tags at ON a.id = at.article_id
        LEFT JOIN tags t ON at.tag_id = t.id
        INNER JOIN articles_fts fts ON a.id = fts.article_id
        WHERE articles_fts MATCH ?
      `;
      params.unshift(search as string);
    } else if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY a.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const articles = db.prepare(query).all(...params);
    res.json(articles);
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 获取单篇文章
router.get('/:id', (req: Request, res: Response) => {
  try {
    const article = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(req.params.id);

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 获取高亮
    const highlights = db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at').all(req.params.id);

    // 获取摘要
    const summary = db.prepare('SELECT * FROM summaries WHERE article_id = ?').get(req.params.id);

    res.json({ ...article, highlights, summary });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 导入文章（URL抓取）
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: '请提供URL' });
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM articles WHERE url = ?').get(url);
    if (existing) {
      return res.status(400).json({ error: '该文章已存在', articleId: (existing as { id: string }).id });
    }

    // 抓取网页内容
    const scraped = await scrapeUrl(url);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO articles (id, url, title, content, excerpt, author, site_name, image_url, word_count, reading_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      scraped.url,
      scraped.title,
      scraped.content,
      scraped.excerpt,
      scraped.author,
      scraped.siteName,
      scraped.imageUrl,
      scraped.wordCount,
      scraped.readingTime
    );

    res.json({ id, message: '文章导入成功' });
  } catch (error) {
    console.error('Import article error:', error);
    res.status(500).json({ error: '导入文章失败' });
  }
});

// 手动添加文章
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, content, url, author } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const id = uuidv4();
    const wordCount = content.length;
    const readingTime = Math.ceil(wordCount / 500);
    const excerpt = content.substring(0, 200) + (content.length > 200 ? '...' : '');

    db.prepare(`
      INSERT INTO articles (id, url, title, content, excerpt, author, word_count, reading_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, url || null, title, content, excerpt, author || null, wordCount, readingTime);

    res.json({ id, message: '文章创建成功' });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: '创建文章失败' });
  }
});

// 更新文章状态
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { is_read, is_favorite, read_progress, scroll_position } = req.body;
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (is_read !== undefined) {
      updates.push('is_read = ?');
      params.push(is_read ? 1 : 0);
      if (is_read) {
        updates.push('read_at = CURRENT_TIMESTAMP');
      }
    }

    if (is_favorite !== undefined) {
      updates.push('is_favorite = ?');
      params.push(is_favorite ? 1 : 0);
    }

    if (read_progress !== undefined) {
      updates.push('read_progress = ?');
      params.push(read_progress);
    }

    if (scroll_position !== undefined) {
      updates.push('scroll_position = ?');
      params.push(scroll_position);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: '更新文章失败' });
  }
});

// 删除文章
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: '删除文章失败' });
  }
});

// AI摘要
router.post('/:id/summary', async (req: Request, res: Response) => {
  try {
    if (!isAIConfigured()) {
      return res.status(400).json({ error: 'AI未配置，请设置OPENAI_API_KEY环境变量' });
    }

    const article = db.prepare('SELECT id, title, content FROM articles WHERE id = ?').get(req.params.id) as {
      id: string;
      title: string;
      content: string;
    } | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 检查是否已有摘要
    const existing = db.prepare('SELECT * FROM summaries WHERE article_id = ?').get(req.params.id);
    if (existing) {
      return res.json(existing);
    }

    const result = await generateSummary(article.content, article.title);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO summaries (id, article_id, summary, key_points)
      VALUES (?, ?, ?, ?)
    `).run(id, req.params.id, result.summary, JSON.stringify(result.keyPoints));

    res.json({
      id,
      article_id: req.params.id,
      summary: result.summary,
      key_points: result.keyPoints
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: '生成摘要失败' });
  }
});

// AI问答
router.post('/:id/ask', async (req: Request, res: Response) => {
  try {
    if (!isAIConfigured()) {
      return res.status(400).json({ error: 'AI未配置，请设置OPENAI_API_KEY环境变量' });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

    const article = db.prepare('SELECT id, content FROM articles WHERE id = ?').get(req.params.id) as {
      id: string;
      content: string;
    } | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const answer = await askQuestion(article.content, question);

    // 保存问答历史
    const id = uuidv4();
    db.prepare(`
      INSERT INTO qa_history (id, article_id, question, answer)
      VALUES (?, ?, ?, ?)
    `).run(id, req.params.id, question, answer);

    res.json({ id, question, answer });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({ error: 'AI问答失败' });
  }
});

// 获取问答历史
router.get('/:id/qa-history', (req: Request, res: Response) => {
  try {
    const history = db.prepare('SELECT * FROM qa_history WHERE article_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(history);
  } catch (error) {
    console.error('Get QA history error:', error);
    res.status(500).json({ error: '获取问答历史失败' });
  }
});

export default router;
