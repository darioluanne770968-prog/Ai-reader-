import { Router, Request, Response } from 'express';
import db from '../db/index.js';

const router = Router();

// 获取所有设置
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const result: Record<string, string> = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });

    res.json(result);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 获取单个设置
router.get('/:key', (req: Request, res: Response) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key) as {
      value: string;
    } | undefined;

    if (!setting) {
      return res.status(404).json({ error: '设置不存在' });
    }

    res.json({ key: req.params.key, value: setting.value });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新设置
router.put('/:key', (req: Request, res: Response) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: '请提供值' });
    }

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(req.params.key, String(value));

    res.json({ key: req.params.key, value: String(value) });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: '更新设置失败' });
  }
});

// 批量更新设置
router.put('/', (req: Request, res: Response) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: '请提供设置对象' });
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value));
    }

    res.json({ message: '设置已更新', settings });
  } catch (error) {
    console.error('Batch update settings error:', error);
    res.status(500).json({ error: '更新设置失败' });
  }
});

// 重置设置为默认值
router.post('/reset', (_req: Request, res: Response) => {
  try {
    const defaults: Record<string, string> = {
      theme: 'light',
      font_size: '16',
      font_family: 'system',
      line_height: '1.8',
      tts_voice: 'default',
      tts_rate: '1.0',
      review_enabled: 'true',
      daily_review_count: '5'
    };

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(defaults)) {
      stmt.run(key, value);
    }

    res.json({ message: '设置已重置', settings: defaults });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: '重置设置失败' });
  }
});

export default router;
