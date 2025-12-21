import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取专注会话历史
router.get('/sessions', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const sessions = db.prepare(`
      SELECT fs.*, a.title as article_title
      FROM focus_sessions fs
      LEFT JOIN articles a ON fs.article_id = a.id
      ORDER BY fs.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(sessions);
  } catch (error) {
    console.error('Get focus sessions error:', error);
    res.status(500).json({ error: '获取专注会话失败' });
  }
});

// 获取今日专注统计
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as session_count,
        SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END) as total_focus_time,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_count,
        SUM(distractions_blocked) as total_distractions_blocked
      FROM focus_sessions
      WHERE date(started_at) = ?
    `).get(today);

    res.json(stats);
  } catch (error) {
    console.error('Get today focus stats error:', error);
    res.status(500).json({ error: '获取今日统计失败' });
  }
});

// 开始专注会话
router.post('/start', (req, res) => {
  try {
    const { articleId, sessionType = 'pomodoro', durationMinutes = 25, breakMinutes = 5, ambientSound } = req.body;

    const id = uuidv4();
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO focus_sessions (id, article_id, session_type, duration_minutes, break_minutes, ambient_sound, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, articleId || null, sessionType, durationMinutes, breakMinutes, ambientSound || null, startedAt);

    res.status(201).json({
      id,
      articleId,
      sessionType,
      durationMinutes,
      breakMinutes,
      ambientSound,
      startedAt
    });
  } catch (error) {
    console.error('Start focus session error:', error);
    res.status(500).json({ error: '开始专注会话失败' });
  }
});

// 结束专注会话
router.post('/:id/end', (req, res) => {
  try {
    const { id } = req.params;
    const { completed = true, distractionsBlocked = 0 } = req.body;
    const endedAt = new Date().toISOString();

    db.prepare(`
      UPDATE focus_sessions
      SET ended_at = ?, is_completed = ?, distractions_blocked = ?
      WHERE id = ?
    `).run(endedAt, completed ? 1 : 0, distractionsBlocked, id);

    const session = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id);
    res.json(session);
  } catch (error) {
    console.error('End focus session error:', error);
    res.status(500).json({ error: '结束专注会话失败' });
  }
});

// 记录干扰
router.post('/:id/distraction', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare(`
      UPDATE focus_sessions
      SET distractions_blocked = distractions_blocked + 1
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Record distraction error:', error);
    res.status(500).json({ error: '记录干扰失败' });
  }
});

// 获取专注统计
router.get('/stats', (req, res) => {
  try {
    const { days = 7 } = req.query;

    // 按天统计
    const dailyStats = db.prepare(`
      SELECT
        date(started_at) as date,
        COUNT(*) as session_count,
        SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END) as focus_minutes,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_count
      FROM focus_sessions
      WHERE started_at >= date('now', '-${days} days')
      GROUP BY date(started_at)
      ORDER BY date DESC
    `).all();

    // 总体统计
    const overall = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END) as total_focus_time,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_sessions,
        AVG(CASE WHEN is_completed = 1 THEN duration_minutes ELSE NULL END) as avg_session_length,
        SUM(distractions_blocked) as total_distractions_blocked
      FROM focus_sessions
    `).get();

    // 最长连续天数
    const streakData = db.prepare(`
      SELECT DISTINCT date(started_at) as date
      FROM focus_sessions
      WHERE is_completed = 1
      ORDER BY date DESC
    `).all() as any[];

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const today = new Date();

    for (let i = 0; i < streakData.length; i++) {
      const date = new Date(streakData[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        tempStreak++;
        if (i === 0 || currentStreak === i) {
          currentStreak = tempStreak;
        }
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 0;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    res.json({
      daily: dailyStats,
      overall,
      currentStreak,
      maxStreak
    });
  } catch (error) {
    console.error('Get focus stats error:', error);
    res.status(500).json({ error: '获取专注统计失败' });
  }
});

// 获取环境音选项
router.get('/ambient-sounds', (req, res) => {
  const sounds = [
    { id: 'none', name: '无', icon: '🔇' },
    { id: 'rain', name: '雨声', icon: '🌧️' },
    { id: 'forest', name: '森林', icon: '🌲' },
    { id: 'ocean', name: '海浪', icon: '🌊' },
    { id: 'fire', name: '壁炉', icon: '🔥' },
    { id: 'cafe', name: '咖啡馆', icon: '☕' },
    { id: 'whitenoise', name: '白噪音', icon: '📻' },
    { id: 'birds', name: '鸟鸣', icon: '🐦' },
    { id: 'thunder', name: '雷雨', icon: '⛈️' },
    { id: 'wind', name: '风声', icon: '💨' }
  ];

  res.json(sounds);
});

// 删除专注会话
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM focus_sessions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete focus session error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
