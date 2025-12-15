import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { parseFeed } from '../services/rss.js';

const router = Router();

// 获取所有订阅源
router.get('/', (_req: Request, res: Response) => {
  try {
    const feeds = db.prepare('SELECT * FROM feeds ORDER BY created_at DESC').all();
    res.json(feeds);
  } catch (error) {
    console.error('Get feeds error:', error);
    res.status(500).json({ error: '获取订阅源失败' });
  }
});

// 添加订阅源
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL不能为空' });
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(url);
    if (existing) {
      return res.status(400).json({ error: '订阅源已存在' });
    }

    // 解析RSS获取信息
    const feedInfo = await parseFeed(url);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO feeds (id, url, title, description, site_url, last_fetched_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, url, feedInfo.title, feedInfo.description, feedInfo.link);

    res.json({
      id,
      url,
      title: feedInfo.title,
      description: feedInfo.description,
      site_url: feedInfo.link,
      items_count: feedInfo.items.length
    });
  } catch (error) {
    console.error('Add feed error:', error);
    res.status(500).json({ error: '添加订阅源失败' });
  }
});

// 刷新订阅源（获取新文章）
router.post('/:id/refresh', async (req: Request, res: Response) => {
  try {
    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(req.params.id) as {
      id: string;
      url: string;
      title: string;
    } | undefined;

    if (!feed) {
      return res.status(404).json({ error: '订阅源不存在' });
    }

    const feedData = await parseFeed(feed.url);
    let importedCount = 0;

    for (const item of feedData.items) {
      // 检查文章是否已存在
      const existing = db.prepare('SELECT id FROM articles WHERE url = ?').get(item.link);
      if (existing) continue;

      const id = uuidv4();
      const wordCount = item.content.length;
      const readingTime = Math.ceil(wordCount / 500);
      const excerpt = item.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';

      db.prepare(`
        INSERT INTO articles (id, url, title, content, excerpt, author, site_name, word_count, reading_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        item.link,
        item.title,
        item.content,
        excerpt,
        item.author,
        feed.title,
        wordCount,
        readingTime,
        item.pubDate
      );

      importedCount++;
    }

    // 更新最后获取时间
    db.prepare('UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

    res.json({
      message: `成功导入 ${importedCount} 篇文章`,
      imported_count: importedCount,
      total_items: feedData.items.length
    });
  } catch (error) {
    console.error('Refresh feed error:', error);
    res.status(500).json({ error: '刷新订阅源失败' });
  }
});

// 删除订阅源
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM feeds WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete feed error:', error);
    res.status(500).json({ error: '删除订阅源失败' });
  }
});

// 刷新所有订阅源
router.post('/refresh-all', async (_req: Request, res: Response) => {
  try {
    const feeds = db.prepare('SELECT * FROM feeds').all() as Array<{
      id: string;
      url: string;
      title: string;
    }>;

    let totalImported = 0;

    for (const feed of feeds) {
      try {
        const feedData = await parseFeed(feed.url);

        for (const item of feedData.items) {
          const existing = db.prepare('SELECT id FROM articles WHERE url = ?').get(item.link);
          if (existing) continue;

          const id = uuidv4();
          const wordCount = item.content.length;
          const readingTime = Math.ceil(wordCount / 500);
          const excerpt = item.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';

          db.prepare(`
            INSERT INTO articles (id, url, title, content, excerpt, author, site_name, word_count, reading_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            item.link,
            item.title,
            item.content,
            excerpt,
            item.author,
            feed.title,
            wordCount,
            readingTime,
            item.pubDate
          );

          totalImported++;
        }

        db.prepare('UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?').run(feed.id);
      } catch (err) {
        console.error(`Failed to refresh feed ${feed.url}:`, err);
      }
    }

    res.json({
      message: `成功导入 ${totalImported} 篇文章`,
      imported_count: totalImported
    });
  } catch (error) {
    console.error('Refresh all feeds error:', error);
    res.status(500).json({ error: '刷新订阅源失败' });
  }
});

export default router;
