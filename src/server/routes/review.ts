import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { format, addDays } from 'date-fns';

const router = Router();

// SM-2算法参数
function calculateNextReview(quality: number, easinessFactor: number, intervalDays: number, reviewCount: number) {
  // quality: 0-5, 0-2表示忘记，3-5表示记住
  let newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF); // EF最小值为1.3

  let newInterval: number;
  if (quality < 3) {
    // 忘记了，重新开始
    newInterval = 1;
  } else if (reviewCount === 0) {
    newInterval = 1;
  } else if (reviewCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalDays * newEF);
  }

  return {
    easinessFactor: newEF,
    intervalDays: newInterval,
    nextReviewAt: format(addDays(new Date(), newInterval), 'yyyy-MM-dd')
  };
}

// 获取待复习的高亮
router.get('/due', (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const today = format(new Date(), 'yyyy-MM-dd');

    const highlights = db.prepare(`
      SELECT h.*, a.title as article_title
      FROM highlights h
      JOIN articles a ON h.article_id = a.id
      WHERE h.next_review_at IS NOT NULL AND h.next_review_at <= ?
      ORDER BY h.next_review_at ASC
      LIMIT ?
    `).all(today, Number(limit));

    // 如果没有到期的，获取一些新的
    if (highlights.length === 0) {
      const newHighlights = db.prepare(`
        SELECT h.*, a.title as article_title
        FROM highlights h
        JOIN articles a ON h.article_id = a.id
        WHERE h.next_review_at IS NULL
        ORDER BY h.created_at DESC
        LIMIT ?
      `).all(Number(limit));

      // 初始化复习时间
      newHighlights.forEach((h: { id: string }) => {
        db.prepare(`
          UPDATE highlights
          SET next_review_at = ?, interval_days = 1, review_count = 0
          WHERE id = ?
        `).run(today, h.id);
      });

      return res.json(newHighlights);
    }

    res.json(highlights);
  } catch (error) {
    console.error('Get due reviews error:', error);
    res.status(500).json({ error: '获取待复习内容失败' });
  }
});

// 提交复习结果
router.post('/:id/review', (req: Request, res: Response) => {
  try {
    const { quality } = req.body; // 0-5, 用户对记忆程度的评分

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ error: '请提供有效的评分 (0-5)' });
    }

    const highlight = db.prepare(`
      SELECT easiness_factor, interval_days, review_count
      FROM highlights WHERE id = ?
    `).get(req.params.id) as {
      easiness_factor: number;
      interval_days: number;
      review_count: number;
    } | undefined;

    if (!highlight) {
      return res.status(404).json({ error: '高亮不存在' });
    }

    const result = calculateNextReview(
      quality,
      highlight.easiness_factor,
      highlight.interval_days,
      highlight.review_count
    );

    db.prepare(`
      UPDATE highlights
      SET easiness_factor = ?,
          interval_days = ?,
          next_review_at = ?,
          review_count = review_count + 1
      WHERE id = ?
    `).run(result.easinessFactor, result.intervalDays, result.nextReviewAt, req.params.id);

    res.json({
      next_review_at: result.nextReviewAt,
      interval_days: result.intervalDays,
      easiness_factor: result.easinessFactor
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: '提交复习结果失败' });
  }
});

// 获取复习统计
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const dueCount = db.prepare(`
      SELECT COUNT(*) as count FROM highlights
      WHERE next_review_at IS NOT NULL AND next_review_at <= ?
    `).get(today) as { count: number };

    const totalReviewed = db.prepare(`
      SELECT COUNT(*) as count FROM highlights
      WHERE review_count > 0
    `).get() as { count: number };

    const avgEF = db.prepare(`
      SELECT AVG(easiness_factor) as avg FROM highlights
      WHERE review_count > 0
    `).get() as { avg: number };

    // 未来7天的复习计划
    const upcomingReviews = [];
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(new Date(), i), 'yyyy-MM-dd');
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM highlights
        WHERE next_review_at = ?
      `).get(date) as { count: number };
      upcomingReviews.push({ date, count: count.count });
    }

    res.json({
      due_today: dueCount.count,
      total_reviewed: totalReviewed.count,
      average_easiness: avgEF.avg || 2.5,
      upcoming: upcomingReviews
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: '获取复习统计失败' });
  }
});

// 跳过复习（稍后再复习）
router.post('/:id/skip', (req: Request, res: Response) => {
  try {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    db.prepare(`
      UPDATE highlights SET next_review_at = ? WHERE id = ?
    `).run(tomorrow, req.params.id);

    res.json({ next_review_at: tomorrow });
  } catch (error) {
    console.error('Skip review error:', error);
    res.status(500).json({ error: '跳过失败' });
  }
});

// 重置复习进度
router.post('/:id/reset', (req: Request, res: Response) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    db.prepare(`
      UPDATE highlights
      SET easiness_factor = 2.5,
          interval_days = 1,
          next_review_at = ?,
          review_count = 0
      WHERE id = ?
    `).run(today, req.params.id);

    res.json({ message: '已重置' });
  } catch (error) {
    console.error('Reset review error:', error);
    res.status(500).json({ error: '重置失败' });
  }
});

export default router;
