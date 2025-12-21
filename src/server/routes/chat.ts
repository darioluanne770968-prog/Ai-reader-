import { Router } from 'express';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { chatWithArticle } from '../services/ai.js';

const router = Router();

// 获取文章的对话历史
router.get('/:articleId/history', (req, res) => {
  try {
    const { articleId } = req.params;
    const history = db.prepare(`
      SELECT * FROM chat_history
      WHERE article_id = ?
      ORDER BY created_at ASC
    `).all(articleId);

    res.json(history);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: '获取对话历史失败' });
  }
});

// 发送消息并获取AI回复
router.post('/:articleId/message', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 获取文章内容
    const article = db.prepare('SELECT title, content FROM articles WHERE id = ?').get(articleId) as any;
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 获取历史对话
    const history = db.prepare(`
      SELECT role, content FROM chat_history
      WHERE article_id = ?
      ORDER BY created_at ASC
      LIMIT 20
    `).all(articleId) as Array<{ role: 'user' | 'assistant'; content: string }>;

    // 保存用户消息
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_history (id, article_id, role, content)
      VALUES (?, ?, 'user', ?)
    `).run(userMsgId, articleId, message);

    // 调用AI生成回复
    const aiResponse = await chatWithArticle(
      article.content,
      article.title,
      history,
      message
    );

    // 保存AI回复
    const aiMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_history (id, article_id, role, content)
      VALUES (?, ?, 'assistant', ?)
    `).run(aiMsgId, articleId, aiResponse);

    res.json({
      userMessage: { id: userMsgId, role: 'user', content: message },
      aiResponse: { id: aiMsgId, role: 'assistant', content: aiResponse }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: '对话失败' });
  }
});

// 清空对话历史
router.delete('/:articleId/history', (req, res) => {
  try {
    const { articleId } = req.params;
    db.prepare('DELETE FROM chat_history WHERE article_id = ?').run(articleId);
    res.json({ success: true });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: '清空对话历史失败' });
  }
});

export default router;
