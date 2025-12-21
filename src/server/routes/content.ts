import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  generatePPTOutline,
  generateVideoScript,
  generateSynthesis,
  extractCoreInsights,
  analyzeReadingProfile,
  explainConcept,
  adaptDifficulty,
  detectConflicts
} from '../services/ai.js';

const router = Router();

// ========== PPT生成 ==========

router.post('/ppt/generate', async (req, res) => {
  try {
    const { articleIds, title, slideCount = 10 } = req.body;

    if (!articleIds || articleIds.length === 0) {
      return res.status(400).json({ error: '请选择文章' });
    }

    // 获取文章内容
    const articles = db.prepare(`
      SELECT title, content FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')})
    `).all(...articleIds) as any[];

    const sourceContent = articles.map(a => `# ${a.title}\n${a.content}`).join('\n\n---\n\n');

    const pptData = await generatePPTOutline(sourceContent, title || articles[0]?.title || 'Presentation', slideCount);

    // 保存生成的内容
    const id = uuidv4();
    db.prepare(`
      INSERT INTO generated_content (id, source_type, source_ids, content_type, title, content, format, metadata)
      VALUES (?, 'articles', ?, 'ppt', ?, ?, 'json', ?)
    `).run(id, JSON.stringify(articleIds), pptData.title, JSON.stringify(pptData.slides), JSON.stringify({ slideCount }));

    res.json({ id, ...pptData });
  } catch (error) {
    console.error('Generate PPT error:', error);
    res.status(500).json({ error: '生成PPT失败' });
  }
});

// ========== 视频脚本生成 ==========

router.post('/video/generate', async (req, res) => {
  try {
    const { articleId, platform = 'douyin', duration = 60 } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: '请选择文章' });
    }

    const article = db.prepare('SELECT title, content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const videoData = await generateVideoScript(article.content, platform, duration);

    // 保存生成的内容
    const id = uuidv4();
    db.prepare(`
      INSERT INTO generated_content (id, source_type, source_ids, content_type, title, content, format, metadata)
      VALUES (?, 'article', ?, 'video_script', ?, ?, 'json', ?)
    `).run(id, articleId, videoData.title, JSON.stringify(videoData), JSON.stringify({ platform, duration }));

    res.json({ id, ...videoData });
  } catch (error) {
    console.error('Generate video script error:', error);
    res.status(500).json({ error: '生成视频脚本失败' });
  }
});

// ========== 综述文章生成 ==========

router.post('/synthesis/generate', async (req, res) => {
  try {
    const { articleIds, topic, style = 'blog' } = req.body;

    if (!articleIds || articleIds.length === 0 || !topic) {
      return res.status(400).json({ error: '请选择文章并输入主题' });
    }

    // 获取文章和高亮
    const sources = [];
    for (const articleId of articleIds) {
      const article = db.prepare('SELECT id, title FROM articles WHERE id = ?').get(articleId) as any;
      const summary = db.prepare('SELECT summary FROM summaries WHERE article_id = ?').get(articleId) as any;
      const highlights = db.prepare('SELECT text FROM highlights WHERE article_id = ?').all(articleId) as any[];

      if (article) {
        sources.push({
          title: article.title,
          summary: summary?.summary,
          highlights: highlights.map(h => h.text)
        });
      }
    }

    const synthesisData = await generateSynthesis(sources, topic, style);

    // 保存生成的内容
    const id = uuidv4();
    db.prepare(`
      INSERT INTO generated_content (id, source_type, source_ids, content_type, title, content, format, metadata)
      VALUES (?, 'articles', ?, 'synthesis', ?, ?, 'markdown', ?)
    `).run(id, JSON.stringify(articleIds), synthesisData.title, synthesisData.content, JSON.stringify({ style, references: synthesisData.references }));

    res.json({ id, ...synthesisData });
  } catch (error) {
    console.error('Generate synthesis error:', error);
    res.status(500).json({ error: '生成综述失败' });
  }
});

// ========== 核心观点提取 ==========

router.post('/insights/extract', async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || articleIds.length < 2) {
      return res.status(400).json({ error: '请选择至少2篇文章' });
    }

    const articles = db.prepare(`
      SELECT id, title, content FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')})
    `).all(...articleIds) as any[];

    const insights = await extractCoreInsights(articles);

    res.json(insights);
  } catch (error) {
    console.error('Extract insights error:', error);
    res.status(500).json({ error: '提取观点失败' });
  }
});

// ========== 观点冲突分析 ==========

router.post('/conflicts/detect', async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || articleIds.length < 2) {
      return res.status(400).json({ error: '请选择至少2篇文章' });
    }

    const articles = db.prepare(`
      SELECT id, title, content FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')})
    `).all(...articleIds) as any[];

    const conflicts = await detectConflicts(articles);

    res.json(conflicts);
  } catch (error) {
    console.error('Detect conflicts error:', error);
    res.status(500).json({ error: '检测观点冲突失败' });
  }
});

// ========== 概念解释 ==========

router.post('/concept/explain', async (req, res) => {
  try {
    const { term, context, userLevel } = req.body;

    if (!term) {
      return res.status(400).json({ error: '请输入要解释的概念' });
    }

    const explanation = await explainConcept(term, context, userLevel);

    // 保存到概念词典
    const existing = db.prepare('SELECT id FROM concept_dictionary WHERE term = ?').get(term);
    if (!existing) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO concept_dictionary (id, term, definition, simple_explanation, examples, related_terms, difficulty_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        term,
        explanation.definition,
        explanation.simpleExplanation,
        JSON.stringify(explanation.examples),
        JSON.stringify(explanation.relatedTerms),
        userLevel || 'intermediate'
      );
    }

    res.json(explanation);
  } catch (error) {
    console.error('Explain concept error:', error);
    res.status(500).json({ error: '解释概念失败' });
  }
});

// 获取概念词典
router.get('/concepts', (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM concept_dictionary';

    if (search) {
      query += ` WHERE term LIKE '%${search}%' OR definition LIKE '%${search}%'`;
    }

    query += ' ORDER BY created_at DESC';
    const concepts = db.prepare(query).all();

    res.json(concepts.map((c: any) => ({
      ...c,
      examples: JSON.parse(c.examples || '[]'),
      relatedTerms: JSON.parse(c.related_terms || '[]')
    })));
  } catch (error) {
    console.error('Get concepts error:', error);
    res.status(500).json({ error: '获取概念词典失败' });
  }
});

// ========== 难度自适应 ==========

router.post('/adapt-difficulty', async (req, res) => {
  try {
    const { articleId, targetLevel } = req.body;

    if (!articleId || !targetLevel) {
      return res.status(400).json({ error: '请选择文章和目标难度' });
    }

    const article = db.prepare('SELECT content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const adaptedContent = await adaptDifficulty(article.content, targetLevel);

    res.json({ content: adaptedContent });
  } catch (error) {
    console.error('Adapt difficulty error:', error);
    res.status(500).json({ error: '调整难度失败' });
  }
});

// ========== 阅读画像 ==========

router.get('/profile', async (req, res) => {
  try {
    // 获取阅读数据
    const articles = db.prepare(`
      SELECT a.title, a.word_count, rs.duration_seconds / 60 as read_time, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN reading_sessions rs ON a.id = rs.article_id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.is_read = 1
      GROUP BY a.id
      ORDER BY a.read_at DESC
      LIMIT 50
    `).all() as any[];

    const highlights = db.prepare('SELECT text FROM highlights ORDER BY created_at DESC LIMIT 100').all() as any[];

    const totalReadTime = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds) / 60, 0) as total
      FROM reading_sessions
    `).get() as any;

    // 计算连续阅读天数
    const readDates = db.prepare(`
      SELECT DISTINCT date(created_at) as date
      FROM reading_sessions
      ORDER BY date DESC
    `).all() as any[];

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < readDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (readDates[i].date === expected.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }

    const readingData = {
      articles: articles.map(a => ({
        title: a.title,
        tags: a.tags ? a.tags.split(',') : [],
        wordCount: a.word_count || 0,
        readTime: a.read_time || 0
      })),
      highlights,
      totalReadTime: totalReadTime?.total || 0,
      readingStreak: streak
    };

    const profile = await analyzeReadingProfile(readingData);

    // 保存画像
    const id = uuidv4();
    db.prepare(`
      INSERT INTO reading_profile (id, profile_type, data)
      VALUES (?, 'full', ?)
    `).run(id, JSON.stringify(profile));

    res.json(profile);
  } catch (error) {
    console.error('Get reading profile error:', error);
    res.status(500).json({ error: '分析阅读画像失败' });
  }
});

// 获取历史画像
router.get('/profile/history', (req, res) => {
  try {
    const profiles = db.prepare(`
      SELECT * FROM reading_profile
      ORDER BY calculated_at DESC
      LIMIT 10
    `).all();

    res.json(profiles.map((p: any) => ({
      ...p,
      data: JSON.parse(p.data)
    })));
  } catch (error) {
    console.error('Get profile history error:', error);
    res.status(500).json({ error: '获取历史画像失败' });
  }
});

// ========== 获取所有生成的内容 ==========

router.get('/generated', (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM generated_content';

    if (type) {
      query += ` WHERE content_type = '${type}'`;
    }

    query += ' ORDER BY created_at DESC LIMIT 50';
    const contents = db.prepare(query).all();

    res.json(contents.map((c: any) => ({
      ...c,
      metadata: JSON.parse(c.metadata || '{}')
    })));
  } catch (error) {
    console.error('Get generated content error:', error);
    res.status(500).json({ error: '获取生成内容失败' });
  }
});

// 删除生成的内容
router.delete('/generated/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM generated_content WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete generated content error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
