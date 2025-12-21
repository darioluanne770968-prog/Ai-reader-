import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取所有挑战
router.get('/', (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM reading_challenges';

    if (active === 'true') {
      query += ' WHERE is_active = 1';
    } else if (active === 'false') {
      query += ' WHERE is_active = 0';
    }

    query += ' ORDER BY created_at DESC';
    const challenges = db.prepare(query).all();

    res.json(challenges);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: '获取挑战失败' });
  }
});

// 获取挑战详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const challenge = db.prepare('SELECT * FROM reading_challenges WHERE id = ?').get(id);

    if (!challenge) {
      return res.status(404).json({ error: '挑战不存在' });
    }

    const checkins = db.prepare(`
      SELECT * FROM challenge_checkins
      WHERE challenge_id = ?
      ORDER BY checkin_date DESC
    `).all(id);

    // 计算连续打卡天数
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = today;

    for (const checkin of checkins as any[]) {
      if (checkin.checkin_date === checkDate) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      } else {
        break;
      }
    }

    res.json({ ...challenge, checkins, streak });
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: '获取挑战详情失败' });
  }
});

// 创建挑战
router.post('/', (req, res) => {
  try {
    const { title, description, challengeType, targetValue, startDate, endDate, rewardBadge } = req.body;

    if (!title || !targetValue || !startDate || !endDate) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO reading_challenges (id, title, description, challenge_type, target_value, start_date, end_date, reward_badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, challengeType || 'articles', targetValue, startDate, endDate, rewardBadge);

    const challenge = db.prepare('SELECT * FROM reading_challenges WHERE id = ?').get(id);
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: '创建挑战失败' });
  }
});

// 打卡
router.post('/:id/checkin', (req, res) => {
  try {
    const { id } = req.params;
    const { value = 1, note } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已打卡
    const existing = db.prepare(`
      SELECT * FROM challenge_checkins
      WHERE challenge_id = ? AND checkin_date = ?
    `).get(id, today);

    if (existing) {
      return res.status(400).json({ error: '今天已经打卡过了' });
    }

    const checkinId = uuidv4();
    db.prepare(`
      INSERT INTO challenge_checkins (id, challenge_id, checkin_date, value, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(checkinId, id, today, value, note);

    // 更新挑战进度
    db.prepare(`
      UPDATE reading_challenges
      SET current_value = current_value + ?
      WHERE id = ?
    `).run(value, id);

    // 检查是否完成
    const challenge = db.prepare('SELECT * FROM reading_challenges WHERE id = ?').get(id) as any;
    if (challenge.current_value >= challenge.target_value && !challenge.is_completed) {
      db.prepare('UPDATE reading_challenges SET is_completed = 1, is_active = 0 WHERE id = ?').run(id);

      // 如果有奖励徽章，授予徽章
      if (challenge.reward_badge) {
        db.prepare(`
          UPDATE badges SET is_earned = 1, earned_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(challenge.reward_badge);
      }
    }

    res.json({ success: true, checkinId });
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ error: '打卡失败' });
  }
});

// 取消打卡
router.delete('/:id/checkin/:checkinId', (req, res) => {
  try {
    const { id, checkinId } = req.params;

    const checkin = db.prepare('SELECT value FROM challenge_checkins WHERE id = ?').get(checkinId) as any;
    if (checkin) {
      db.prepare('DELETE FROM challenge_checkins WHERE id = ?').run(checkinId);
      db.prepare('UPDATE reading_challenges SET current_value = current_value - ? WHERE id = ?').run(checkin.value, id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cancel checkin error:', error);
    res.status(500).json({ error: '取消打卡失败' });
  }
});

// 放弃挑战
router.post('/:id/abandon', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE reading_challenges SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Abandon challenge error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 删除挑战
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM challenge_checkins WHERE challenge_id = ?').run(id);
    db.prepare('DELETE FROM reading_challenges WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete challenge error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// ========== 徽章系统 ==========

// 获取所有徽章
router.get('/badges/all', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY is_earned DESC, created_at').all();
    res.json(badges);
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: '获取徽章失败' });
  }
});

// 获取已获得的徽章
router.get('/badges/earned', (req, res) => {
  try {
    const badges = db.prepare('SELECT * FROM badges WHERE is_earned = 1 ORDER BY earned_at DESC').all();
    res.json(badges);
  } catch (error) {
    console.error('Get earned badges error:', error);
    res.status(500).json({ error: '获取徽章失败' });
  }
});

// 检查并授予徽章
router.post('/badges/check', (req, res) => {
  try {
    const earnedBadges: any[] = [];

    // 检查文章阅读徽章
    const articlesRead = db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_read = 1').get() as any;
    const articleBadges = db.prepare(`
      SELECT * FROM badges
      WHERE condition_type = 'articles_read' AND is_earned = 0 AND condition_value <= ?
    `).all(articlesRead.count) as any[];

    for (const badge of articleBadges) {
      db.prepare('UPDATE badges SET is_earned = 1, earned_at = CURRENT_TIMESTAMP WHERE id = ?').run(badge.id);
      earnedBadges.push(badge);
    }

    // 检查高亮徽章
    const highlightsCount = db.prepare('SELECT COUNT(*) as count FROM highlights').get() as any;
    const highlightBadges = db.prepare(`
      SELECT * FROM badges
      WHERE condition_type = 'highlights_created' AND is_earned = 0 AND condition_value <= ?
    `).all(highlightsCount.count) as any[];

    for (const badge of highlightBadges) {
      db.prepare('UPDATE badges SET is_earned = 1, earned_at = CURRENT_TIMESTAMP WHERE id = ?').run(badge.id);
      earnedBadges.push(badge);
    }

    res.json({ newBadges: earnedBadges });
  } catch (error) {
    console.error('Check badges error:', error);
    res.status(500).json({ error: '检查徽章失败' });
  }
});

export default router;
