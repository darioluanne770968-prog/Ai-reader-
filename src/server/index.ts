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
// 超级高级功能路由
import chatRouter from './routes/chat.js';
import mindmapRouter from './routes/mindmap.js';
import factcheckRouter from './routes/factcheck.js';
import notesRouter from './routes/notes.js';
import zettelRouter from './routes/zettel.js';
import knowledgeRouter from './routes/knowledge.js';
import socialRouter from './routes/social.js';
import challengesRouter from './routes/challenges.js';
import podcastRouter from './routes/podcast.js';
import focusRouter from './routes/focus.js';
import contentRouter from './routes/content.js';

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
// 超级高级功能路由
app.use('/api/chat', chatRouter);
app.use('/api/mindmap', mindmapRouter);
app.use('/api/factcheck', factcheckRouter);
app.use('/api/notes', notesRouter);
app.use('/api/zettel', zettelRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/social', socialRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/podcast', podcastRouter);
app.use('/api/focus', focusRouter);
app.use('/api/content', contentRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    ai_configured: !!process.env.OPENAI_API_KEY,
    features: {
      // 基础功能
      tts: true,
      translation: true,
      review: true,
      knowledge_graph: true,
      writing_assistant: true,
      share: true,
      webhooks: true,
      pwa: true,
      // 超级高级功能
      chat: true,
      mindmap: true,
      fact_check: true,
      bidirectional_notes: true,
      zettelkasten: true,
      knowledge_qa: true,
      learning_paths: true,
      reading_groups: true,
      challenges: true,
      podcast: true,
      focus_mode: true,
      ppt_generator: true,
      video_script: true,
      reading_profile: true
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
  const aiEnabled = !!process.env.OPENAI_API_KEY;
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           AI Reader Server v3.0 - 超级高级版 Started          ║
╠═══════════════════════════════════════════════════════════════╣
║  Local:      http://localhost:${PORT}                            ║
║  API:        http://localhost:${PORT}/api                        ║
╠═══════════════════════════════════════════════════════════════╣
║  基础功能:                                                     ║
║  ├─ AI功能:      ${aiEnabled ? '✓ 已配置' : '✗ 未配置'}                                 ║
║  ├─ TTS朗读:     ✓ 已启用                                     ║
║  ├─ 间隔复习:    ✓ 已启用 (SM-2算法)                          ║
║  └─ PWA离线:     ✓ 已启用                                     ║
╠═══════════════════════════════════════════════════════════════╣
║  超级高级功能:                                                 ║
║  ├─ 对话式阅读:  ${aiEnabled ? '✓' : '✗'} 多轮对话深入理解文章                  ║
║  ├─ 思维导图:    ${aiEnabled ? '✓' : '✗'} AI自动生成文章结构图                  ║
║  ├─ 事实核查:    ${aiEnabled ? '✓' : '✗'} AI验证文章声明真实性                  ║
║  ├─ 双向笔记:    ✓ Obsidian风格双向链接                       ║
║  ├─ Zettelkasten: ✓ 卡片盒笔记法                               ║
║  ├─ 知识问答:    ${aiEnabled ? '✓' : '✗'} 基于阅读库的AI问答                    ║
║  ├─ 学习路径:    ${aiEnabled ? '✓' : '✗'} AI生成个性化学习计划                  ║
║  ├─ 阅读小组:    ✓ 协作阅读和标注                             ║
║  ├─ 阅读挑战:    ✓ 打卡和徽章系统                             ║
║  ├─ AI播客:      ${aiEnabled ? '✓' : '✗'} 文章转播客脚本                        ║
║  ├─ 专注模式:    ✓ 番茄钟+环境音                              ║
║  ├─ PPT生成:     ${aiEnabled ? '✓' : '✗'} 阅读笔记转演示文稿                    ║
║  ├─ 视频脚本:    ${aiEnabled ? '✓' : '✗'} 抖音/B站/小红书脚本                   ║
║  └─ 阅读画像:    ${aiEnabled ? '✓' : '✗'} AI分析阅读DNA                         ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
