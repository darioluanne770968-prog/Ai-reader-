import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const router = Router();

// 获取阅读统计概览
router.get('/overview', (_req: Request, res: Response) => {
  try {
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
    const readArticles = db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_read = 1').get() as { count: number };
    const totalHighlights = db.prepare('SELECT COUNT(*) as count FROM highlights').get() as { count: number };
    const totalWords = db.prepare('SELECT SUM(word_count) as total FROM articles WHERE is_read = 1').get() as { total: number };

    // 今日统计
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayStats = db.prepare('SELECT * FROM reading_stats WHERE date = ?').get(today) as {
      articles_read: number;
      total_reading_time: number;
      highlights_created: number;
      words_read: number;
    } | undefined;

    // 本周统计
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const weekStats = db.prepare(`
      SELECT
        SUM(articles_read) as articles_read,
        SUM(total_reading_time) as total_reading_time,
        SUM(highlights_created) as highlights_created,
        SUM(words_read) as words_read
      FROM reading_stats
      WHERE date BETWEEN ? AND ?
    `).get(weekStart, weekEnd) as {
      articles_read: number;
      total_reading_time: number;
      highlights_created: number;
      words_read: number;
    };

    res.json({
      total: {
        articles: totalArticles.count,
        read: readArticles.count,
        highlights: totalHighlights.count,
        words: totalWords.total || 0
      },
      today: {
        articles_read: todayStats?.articles_read || 0,
        reading_time: todayStats?.total_reading_time || 0,
        highlights: todayStats?.highlights_created || 0,
        words: todayStats?.words_read || 0
      },
      week: {
        articles_read: weekStats?.articles_read || 0,
        reading_time: weekStats?.total_reading_time || 0,
        highlights: weekStats?.highlights_created || 0,
        words: weekStats?.words_read || 0
      }
    });
  } catch (error) {
    console.error('Get stats overview error:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取每日统计（热力图数据）
router.get('/daily', (req: Request, res: Response) => {
  try {
    const { days = 365 } = req.query;
    const startDate = format(subDays(new Date(), Number(days)), 'yyyy-MM-dd');

    const stats = db.prepare(`
      SELECT date, articles_read, total_reading_time, words_read
      FROM reading_stats
      WHERE date >= ?
      ORDER BY date ASC
    `).all(startDate);

    res.json(stats);
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({ error: '获取每日统计失败' });
  }
});

// 获取标签统计
router.get('/tags', (_req: Request, res: Response) => {
  try {
    const tagStats = db.prepare(`
      SELECT t.name, t.color, COUNT(at.article_id) as count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 20
    `).all();

    res.json(tagStats);
  } catch (error) {
    console.error('Get tag stats error:', error);
    res.status(500).json({ error: '获取标签统计失败' });
  }
});

// 记录阅读会话
router.post('/session/start', (req: Request, res: Response) => {
  try {
    const { article_id, start_progress = 0 } = req.body;

    const id = uuidv4();
    const startTime = new Date().toISOString();

    db.prepare(`
      INSERT INTO reading_sessions (id, article_id, start_time, start_progress)
      VALUES (?, ?, ?, ?)
    `).run(id, article_id, startTime, start_progress);

    res.json({ session_id: id });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: '开始会话失败' });
  }
});

// 结束阅读会话
router.post('/session/:id/end', (req: Request, res: Response) => {
  try {
    const { end_progress = 0 } = req.body;
    const endTime = new Date().toISOString();

    // 获取会话信息
    const session = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(req.params.id) as {
      id: string;
      article_id: string;
      start_time: string;
      start_progress: number;
    } | undefined;

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 计算持续时间
    const duration = Math.floor((new Date(endTime).getTime() - new Date(session.start_time).getTime()) / 1000);

    // 更新会话
    db.prepare(`
      UPDATE reading_sessions
      SET end_time = ?, end_progress = ?, duration_seconds = ?
      WHERE id = ?
    `).run(endTime, end_progress, duration, req.params.id);

    // 更新每日统计
    const today = format(new Date(), 'yyyy-MM-dd');
    const article = db.prepare('SELECT word_count FROM articles WHERE id = ?').get(session.article_id) as { word_count: number } | undefined;
    const wordsRead = article ? Math.floor(article.word_count * (end_progress - session.start_progress) / 100) : 0;

    db.prepare(`
      INSERT INTO reading_stats (id, date, total_reading_time, words_read)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_reading_time = total_reading_time + excluded.total_reading_time,
        words_read = words_read + excluded.words_read
    `).run(uuidv4(), today, duration, wordsRead);

    res.json({ duration, words_read: wordsRead });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: '结束会话失败' });
  }
});

// 记录文章阅读完成
router.post('/article-read', (req: Request, res: Response) => {
  try {
    const { article_id, word_count } = req.body;
    const today = format(new Date(), 'yyyy-MM-dd');

    db.prepare(`
      INSERT INTO reading_stats (id, date, articles_read, words_read)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(date) DO UPDATE SET
        articles_read = articles_read + 1,
        words_read = words_read + excluded.words_read
    `).run(uuidv4(), today, word_count || 0);

    res.json({ success: true });
  } catch (error) {
    console.error('Record article read error:', error);
    res.status(500).json({ error: '记录失败' });
  }
});

// 记录高亮创建
router.post('/highlight-created', (_req: Request, res: Response) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    db.prepare(`
      INSERT INTO reading_stats (id, date, highlights_created)
      VALUES (?, ?, 1)
      ON CONFLICT(date) DO UPDATE SET
        highlights_created = highlights_created + 1
    `).run(uuidv4(), today);

    res.json({ success: true });
  } catch (error) {
    console.error('Record highlight error:', error);
    res.status(500).json({ error: '记录失败' });
  }
});

// 获取阅读趋势
router.get('/trends', (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query;
    const days = period === 'month' ? 30 : period === 'year' ? 365 : 7;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const trends = db.prepare(`
      SELECT
        date,
        articles_read,
        total_reading_time,
        highlights_created,
        words_read
      FROM reading_stats
      WHERE date >= ?
      ORDER BY date ASC
    `).all(startDate);

    res.json(trends);
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: '获取趋势失败' });
  }
});

export default router;
