import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/index.js';
import articlesRouter from './routes/articles.js';
import highlightsRouter from './routes/highlights.js';
import tagsRouter from './routes/tags.js';
import feedsRouter from './routes/feeds.js';
import exportRouter from './routes/export.js';
import statsRouter from './routes/stats.js';
import reviewRouter from './routes/review.js';
import advancedRouter from './routes/advanced.js';
import settingsRouter from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDatabase();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API路由
app.use('/api/articles', articlesRouter);
app.use('/api/highlights', highlightsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/feeds', feedsRouter);
app.use('/api/export', exportRouter);
app.use('/api/stats', statsRouter);
app.use('/api/review', reviewRouter);
app.use('/api/advanced', advancedRouter);
app.use('/api/settings', settingsRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    ai_configured: !!process.env.OPENAI_API_KEY,
    features: {
      tts: true,
      translation: true,
      review: true,
      knowledge_graph: true,
      writing_assistant: true,
      share: true,
      webhooks: true,
      pwa: true
    }
  });
});

// 生产环境提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              AI Reader Server v2.0 Started                ║
╠═══════════════════════════════════════════════════════════╣
║  Local:      http://localhost:${PORT}                        ║
║  API:        http://localhost:${PORT}/api                    ║
╠═══════════════════════════════════════════════════════════╣
║  功能状态:                                                 ║
║  ├─ AI功能:     ${process.env.OPENAI_API_KEY ? '✓ 已配置' : '✗ 未配置'}                              ║
║  ├─ TTS:        ✓ 已启用 (Web Speech API)                 ║
║  ├─ 翻译:       ${process.env.OPENAI_API_KEY ? '✓ 已启用' : '✗ 需要AI'}                              ║
║  ├─ 间隔复习:   ✓ 已启用 (SM-2算法)                       ║
║  ├─ 知识图谱:   ✓ 已启用                                  ║
║  ├─ 写作助手:   ${process.env.OPENAI_API_KEY ? '✓ 已启用' : '✗ 需要AI'}                              ║
║  ├─ 分享功能:   ✓ 已启用                                  ║
║  ├─ Webhooks:   ✓ 已启用                                  ║
║  └─ PWA:        ✓ 已启用                                  ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
