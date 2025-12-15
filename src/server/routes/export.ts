import { Router, Request, Response } from 'express';
import db from '../db/index.js';

const router = Router();

interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  excerpt: string;
  author: string;
  site_name: string;
  word_count: number;
  reading_time: number;
  is_read: number;
  is_favorite: number;
  read_progress: number;
  created_at: string;
  read_at: string;
  tags: string;
}

interface Highlight {
  text: string;
  note: string;
  color: string;
  created_at: string;
}

interface Summary {
  summary: string;
  key_points: string;
}

// 导出单篇文章为Markdown
router.get('/article/:id/markdown', (req: Request, res: Response) => {
  try {
    const article = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(req.params.id) as Article | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const highlights = db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at').all(req.params.id) as Highlight[];
    const summary = db.prepare('SELECT * FROM summaries WHERE article_id = ?').get(req.params.id) as Summary | undefined;

    let markdown = `# ${article.title}\n\n`;

    if (article.url) {
      markdown += `> 原文链接: ${article.url}\n\n`;
    }

    if (article.author) {
      markdown += `> 作者: ${article.author}\n\n`;
    }

    if (article.tags) {
      markdown += `> 标签: ${article.tags}\n\n`;
    }

    markdown += `---\n\n`;

    if (summary) {
      markdown += `## AI摘要\n\n${summary.summary}\n\n`;

      if (summary.key_points) {
        try {
          const keyPoints = JSON.parse(summary.key_points);
          if (keyPoints.length > 0) {
            markdown += `### 关键要点\n\n`;
            keyPoints.forEach((point: string) => {
              markdown += `- ${point}\n`;
            });
            markdown += '\n';
          }
        } catch {
          // 忽略解析错误
        }
      }

      markdown += `---\n\n`;
    }

    if (highlights.length > 0) {
      markdown += `## 高亮笔记\n\n`;
      highlights.forEach((h) => {
        markdown += `> ${h.text}\n`;
        if (h.note) {
          markdown += `> \n> **笔记:** ${h.note}\n`;
        }
        markdown += '\n';
      });
      markdown += `---\n\n`;
    }

    // 内容（去除HTML标签）
    const plainContent = article.content.replace(/<[^>]*>/g, '');
    markdown += `## 原文内容\n\n${plainContent}\n`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(article.title)}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('Export markdown error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出单篇文章为JSON
router.get('/article/:id/json', (req: Request, res: Response) => {
  try {
    const article = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(req.params.id) as Article | undefined;

    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const highlights = db.prepare('SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at').all(req.params.id);
    const summary = db.prepare('SELECT * FROM summaries WHERE article_id = ?').get(req.params.id);
    const qaHistory = db.prepare('SELECT * FROM qa_history WHERE article_id = ? ORDER BY created_at').all(req.params.id);

    const exportData = {
      article: {
        ...article,
        tags: article.tags ? article.tags.split(',') : []
      },
      highlights,
      summary,
      qa_history: qaHistory,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(article.title)}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出所有高亮为Markdown
router.get('/highlights/markdown', (_req: Request, res: Response) => {
  try {
    const highlights = db.prepare(`
      SELECT h.*, a.title as article_title, a.url as article_url
      FROM highlights h
      JOIN articles a ON h.article_id = a.id
      ORDER BY h.created_at DESC
    `).all() as Array<Highlight & { article_title: string; article_url: string }>;

    let markdown = `# 我的高亮笔记\n\n`;
    markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    markdown += `---\n\n`;

    let currentArticle = '';
    highlights.forEach((h) => {
      if (h.article_title !== currentArticle) {
        currentArticle = h.article_title;
        markdown += `## ${h.article_title}\n\n`;
        if (h.article_url) {
          markdown += `[原文链接](${h.article_url})\n\n`;
        }
      }

      markdown += `> ${h.text}\n`;
      if (h.note) {
        markdown += `> \n> **笔记:** ${h.note}\n`;
      }
      markdown += '\n';
    });

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="highlights.md"');
    res.send(markdown);
  } catch (error) {
    console.error('Export highlights error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出所有数据
router.get('/all', (_req: Request, res: Response) => {
  try {
    const articles = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all() as Article[];

    const allHighlights = db.prepare('SELECT * FROM highlights').all();
    const allSummaries = db.prepare('SELECT * FROM summaries').all();
    const allQaHistory = db.prepare('SELECT * FROM qa_history').all();
    const allTags = db.prepare('SELECT * FROM tags').all();
    const allFeeds = db.prepare('SELECT * FROM feeds').all();

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      articles: articles.map(a => ({
        ...a,
        tags: a.tags ? a.tags.split(',') : []
      })),
      highlights: allHighlights,
      summaries: allSummaries,
      qa_history: allQaHistory,
      tags: allTags,
      feeds: allFeeds
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-reader-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

export default router;
