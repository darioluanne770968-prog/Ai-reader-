import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { factCheck } from '../services/ai.js';

const router = Router();

// 获取文章的事实核查结果
router.get('/article/:articleId', (req, res) => {
  try {
    const { articleId } = req.params;
    const results = db.prepare(`
      SELECT * FROM fact_checks
      WHERE article_id = ?
      ORDER BY created_at DESC
    `).all(articleId);

    res.json(results.map((r: any) => ({
      ...r,
      sources: r.sources ? JSON.parse(r.sources) : []
    })));
  } catch (error) {
    console.error('Get fact checks error:', error);
    res.status(500).json({ error: '获取事实核查结果失败' });
  }
});

// 对文章进行事实核查
router.post('/article/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { claims } = req.body;

    if (!claims || !Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({ error: '请提供要核查的声明' });
    }

    // 获取文章内容作为上下文
    const article = db.prepare('SELECT content FROM articles WHERE id = ?').get(articleId) as any;

    // 进行事实核查
    const results = await factCheck(claims, article?.content);

    // 保存结果
    const savedResults = results.map(result => {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO fact_checks (id, article_id, claim, verdict, confidence, sources, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        articleId,
        result.claim,
        result.verdict,
        result.confidence,
        JSON.stringify(result.suggestedSources),
        result.explanation
      );
      return { id, ...result };
    });

    res.json(savedResults);
  } catch (error) {
    console.error('Fact check error:', error);
    res.status(500).json({ error: '事实核查失败' });
  }
});

// 自动提取并核查文章中的声明
router.post('/article/:articleId/auto', async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = db.prepare('SELECT content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 使用AI提取可核查的声明（简化实现）
    const content = article.content.substring(0, 3000);
    const sentences = content.split(/[。！？.!?]/).filter((s: string) => s.length > 20 && s.length < 200);
    const claims = sentences.slice(0, 5);

    if (claims.length === 0) {
      return res.json({ message: '未找到可核查的声明', results: [] });
    }

    const results = await factCheck(claims, content);

    // 保存结果
    const savedResults = results.map(result => {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO fact_checks (id, article_id, claim, verdict, confidence, sources, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        articleId,
        result.claim,
        result.verdict,
        result.confidence,
        JSON.stringify(result.suggestedSources),
        result.explanation
      );
      return { id, ...result };
    });

    res.json(savedResults);
  } catch (error) {
    console.error('Auto fact check error:', error);
    res.status(500).json({ error: '自动事实核查失败' });
  }
});

// 删除事实核查结果
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM fact_checks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete fact check error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
