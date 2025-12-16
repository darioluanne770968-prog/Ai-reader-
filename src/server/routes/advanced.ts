import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import {
  translateContent,
  generateWriting,
  findRelatedContent,
  generateDailySummary,
  isAIConfigured
} from '../services/ai.js';
import { format } from 'date-fns';

const router = Router();

// ============ 翻译功能 ============

// 翻译文章
router.post('/translate/:articleId', async (req: Request, res: Response) => {
  try {
    if (!isAIConfigured()) {
      return res.status(400).json({ error: 'AI未配置' });
    }

    const { target_lang = 'zh' } = req.body;
    const article = db.prepare('SELECT content FROM articles WHERE id = ?').get(req.params.articleId) as {
      content: string;
    } | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const translated = await translateContent(article.content, target_lang);

    // 保存翻译结果
    db.prepare('UPDATE articles SET translated_content = ? WHERE id = ?').run(translated, req.params.articleId);

    res.json({ translated_content: translated });
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: '翻译失败' });
  }
});

// ============ 智能推荐 ============

// 获取相关文章推荐
router.get('/recommendations/:articleId', async (req: Request, res: Response) => {
  try {
    const article = db.prepare('SELECT id, title, content FROM articles WHERE id = ?').get(req.params.articleId) as {
      id: string;
      title: string;
      content: string;
    } | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 先检查缓存的关联
    const cachedLinks = db.prepare(`
      SELECT al.*, a.title, a.excerpt
      FROM article_links al
      JOIN articles a ON al.target_article_id = a.id
      WHERE al.source_article_id = ?
      ORDER BY al.strength DESC
      LIMIT 5
    `).all(req.params.articleId) as Array<{
      target_article_id: string;
      strength: number;
      title: string;
      excerpt: string;
    }>;

    if (cachedLinks.length > 0) {
      return res.json(cachedLinks.map(l => ({
        id: l.target_article_id,
        title: l.title,
        excerpt: l.excerpt,
        score: l.strength
      })));
    }

    // 如果没有缓存且AI可用，生成推荐
    if (isAIConfigured()) {
      const otherArticles = db.prepare(`
        SELECT id, title, excerpt FROM articles
        WHERE id != ?
        ORDER BY created_at DESC
        LIMIT 30
      `).all(req.params.articleId) as Array<{ id: string; title: string; excerpt: string }>;

      const recommendations = await findRelatedContent(article, otherArticles);

      // 缓存结果
      for (const rec of recommendations) {
        db.prepare(`
          INSERT OR REPLACE INTO article_links (id, source_article_id, target_article_id, strength)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), req.params.articleId, rec.id, rec.score);
      }

      const result = recommendations.map(rec => {
        const art = otherArticles.find(a => a.id === rec.id);
        return {
          id: rec.id,
          title: art?.title || '',
          excerpt: art?.excerpt || '',
          score: rec.score,
          reason: rec.reason
        };
      });

      return res.json(result);
    }

    res.json([]);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

// ============ AI写作助手 ============

// 生成写作内容
router.post('/writing/generate', async (req: Request, res: Response) => {
  try {
    if (!isAIConfigured()) {
      return res.status(400).json({ error: 'AI未配置' });
    }

    const { prompt, highlight_ids, article_ids, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '请提供写作提示' });
    }

    // 获取高亮内容
    let highlights: string[] = [];
    if (highlight_ids && highlight_ids.length > 0) {
      const placeholders = highlight_ids.map(() => '?').join(',');
      highlights = db.prepare(`
        SELECT text FROM highlights WHERE id IN (${placeholders})
      `).all(...highlight_ids).map((h: { text: string }) => h.text);
    }

    // 获取文章摘要
    let articleExcerpts: string[] = [];
    if (article_ids && article_ids.length > 0) {
      const placeholders = article_ids.map(() => '?').join(',');
      articleExcerpts = db.prepare(`
        SELECT title, excerpt FROM articles WHERE id IN (${placeholders})
      `).all(...article_ids).map((a: { title: string; excerpt: string }) => `${a.title}: ${a.excerpt}`);
    }

    const content = await generateWriting({
      prompt,
      highlights,
      articleExcerpts,
      style
    });

    res.json({ content });
  } catch (error) {
    console.error('Generate writing error:', error);
    res.status(500).json({ error: '生成内容失败' });
  }
});

// 保存写作草稿
router.post('/writing/drafts', (req: Request, res: Response) => {
  try {
    const { title, content, source_article_ids, source_highlights } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO writing_drafts (id, title, content, source_article_ids, source_highlights)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      content,
      JSON.stringify(source_article_ids || []),
      JSON.stringify(source_highlights || [])
    );

    res.json({ id, message: '草稿保存成功' });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: '保存草稿失败' });
  }
});

// 获取所有草稿
router.get('/writing/drafts', (_req: Request, res: Response) => {
  try {
    const drafts = db.prepare(`
      SELECT * FROM writing_drafts ORDER BY updated_at DESC
    `).all();

    res.json(drafts);
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: '获取草稿失败' });
  }
});

// 删除草稿
router.delete('/writing/drafts/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM writing_drafts WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: '删除草稿失败' });
  }
});

// ============ 每日摘要 ============

// 生成每日阅读摘要
router.post('/daily-summary', async (req: Request, res: Response) => {
  try {
    if (!isAIConfigured()) {
      return res.status(400).json({ error: 'AI未配置' });
    }

    const { date } = req.body;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    // 获取当天阅读的文章
    const articles = db.prepare(`
      SELECT a.id, a.title, s.summary, s.key_points
      FROM articles a
      LEFT JOIN summaries s ON a.id = s.article_id
      WHERE DATE(a.read_at) = ? OR DATE(a.updated_at) = ?
      ORDER BY a.read_at DESC
    `).all(targetDate, targetDate) as Array<{
      id: string;
      title: string;
      summary: string;
      key_points: string;
    }>;

    if (articles.length === 0) {
      return res.json({ summary: '今日暂无阅读记录', articles_count: 0 });
    }

    const articlesData = articles.map(a => ({
      title: a.title,
      summary: a.summary,
      keyPoints: a.key_points ? JSON.parse(a.key_points) : []
    }));

    const summary = await generateDailySummary(articlesData);

    res.json({
      date: targetDate,
      articles_count: articles.length,
      summary
    });
  } catch (error) {
    console.error('Generate daily summary error:', error);
    res.status(500).json({ error: '生成每日总结失败' });
  }
});

// ============ 知识图谱 ============

// 获取知识图谱数据
router.get('/knowledge-graph', (_req: Request, res: Response) => {
  try {
    // 获取所有文章作为节点
    const articles = db.prepare(`
      SELECT id, title, excerpt FROM articles ORDER BY created_at DESC LIMIT 100
    `).all() as Array<{ id: string; title: string; excerpt: string }>;

    // 获取所有关联作为边
    const links = db.prepare(`
      SELECT source_article_id, target_article_id, strength, link_type
      FROM article_links
    `).all() as Array<{
      source_article_id: string;
      target_article_id: string;
      strength: number;
      link_type: string;
    }>;

    // 获取标签关联
    const tagLinks = db.prepare(`
      SELECT at1.article_id as source, at2.article_id as target, t.name as tag
      FROM article_tags at1
      JOIN article_tags at2 ON at1.tag_id = at2.tag_id AND at1.article_id < at2.article_id
      JOIN tags t ON at1.tag_id = t.id
    `).all() as Array<{ source: string; target: string; tag: string }>;

    res.json({
      nodes: articles.map(a => ({
        id: a.id,
        label: a.title.substring(0, 30),
        title: a.title
      })),
      edges: [
        ...links.map(l => ({
          source: l.source_article_id,
          target: l.target_article_id,
          weight: l.strength,
          type: l.link_type
        })),
        ...tagLinks.map(l => ({
          source: l.source,
          target: l.target,
          weight: 0.3,
          type: 'tag',
          label: l.tag
        }))
      ]
    });
  } catch (error) {
    console.error('Get knowledge graph error:', error);
    res.status(500).json({ error: '获取知识图谱失败' });
  }
});

// ============ 分享功能 ============

// 创建分享链接
router.post('/share', (req: Request, res: Response) => {
  try {
    const { article_id, highlight_ids, share_type = 'article', expires_days } = req.body;

    const id = uuidv4().substring(0, 8); // 短ID更友好
    const expiresAt = expires_days
      ? format(new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      : null;

    db.prepare(`
      INSERT INTO shares (id, article_id, highlight_ids, share_type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, article_id, JSON.stringify(highlight_ids || []), share_type, expiresAt);

    res.json({
      share_id: id,
      share_url: `/share/${id}`,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ error: '创建分享失败' });
  }
});

// 获取分享内容
router.get('/share/:id', (req: Request, res: Response) => {
  try {
    const share = db.prepare('SELECT * FROM shares WHERE id = ?').get(req.params.id) as {
      id: string;
      article_id: string;
      highlight_ids: string;
      share_type: string;
      is_public: number;
      expires_at: string;
    } | undefined;

    if (!share) {
      return res.status(404).json({ error: '分享不存在' });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: '分享已过期' });
    }

    // 增加浏览次数
    db.prepare('UPDATE shares SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

    // 获取文章内容
    const article = db.prepare(`
      SELECT id, title, content, author, site_name, created_at
      FROM articles WHERE id = ?
    `).get(share.article_id);

    // 获取高亮
    let highlights: unknown[] = [];
    const highlightIds = JSON.parse(share.highlight_ids || '[]');
    if (highlightIds.length > 0) {
      const placeholders = highlightIds.map(() => '?').join(',');
      highlights = db.prepare(`
        SELECT text, note, color FROM highlights WHERE id IN (${placeholders})
      `).all(...highlightIds);
    }

    res.json({
      article,
      highlights,
      share_type: share.share_type
    });
  } catch (error) {
    console.error('Get share error:', error);
    res.status(500).json({ error: '获取分享失败' });
  }
});

// ============ Webhook ============

// 获取所有Webhook
router.get('/webhooks', (_req: Request, res: Response) => {
  try {
    const webhooks = db.prepare('SELECT id, name, url, events, is_active, created_at FROM webhooks').all();
    res.json(webhooks);
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ error: '获取Webhook失败' });
  }
});

// 创建Webhook
router.post('/webhooks', (req: Request, res: Response) => {
  try {
    const { name, url, events, secret } = req.body;

    if (!name || !url || !events) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO webhooks (id, name, url, events, secret)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, url, JSON.stringify(events), secret || null);

    res.json({ id, message: 'Webhook创建成功' });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: '创建Webhook失败' });
  }
});

// 删除Webhook
router.delete('/webhooks/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: '删除Webhook失败' });
  }
});

// 触发Webhook（内部使用）
export async function triggerWebhooks(event: string, data: unknown) {
  try {
    const webhooks = db.prepare(`
      SELECT url, secret FROM webhooks
      WHERE is_active = 1 AND events LIKE ?
    `).all(`%${event}%`) as Array<{ url: string; secret: string }>;

    for (const webhook of webhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {})
          },
          body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
        });
      } catch (err) {
        console.error(`Webhook ${webhook.url} failed:`, err);
      }
    }
  } catch (error) {
    console.error('Trigger webhooks error:', error);
  }
}

export default router;
