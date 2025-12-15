import OpenAI from 'openai';

// 支持自定义API端点和密钥
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

const MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

export async function generateSummary(content: string, title: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  // 截取内容防止超出token限制
  const truncatedContent = content.substring(0, 8000);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文章摘要助手。请用中文提供简洁、准确的摘要和要点。'
        },
        {
          role: 'user',
          content: `请为以下文章生成摘要和关键要点。

标题：${title}

内容：${truncatedContent}

请以JSON格式返回，包含以下字段：
- summary: 100-200字的摘要
- keyPoints: 3-5个关键要点的数组`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content || '';

    // 尝试解析JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || text,
          keyPoints: parsed.keyPoints || []
        };
      }
    } catch {
      // JSON解析失败，返回原始文本
    }

    return {
      summary: text,
      keyPoints: []
    };
  } catch (error) {
    console.error('AI Summary error:', error);
    throw new Error('生成摘要失败，请检查AI配置');
  }
}

export async function askQuestion(content: string, question: string): Promise<string> {
  const truncatedContent = content.substring(0, 8000);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个智能阅读助手。基于提供的文章内容回答用户问题。如果问题与文章内容无关，请礼貌地说明。请用中文回答。'
        },
        {
          role: 'user',
          content: `文章内容：${truncatedContent}

问题：${question}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '抱歉，无法生成回答';
  } catch (error) {
    console.error('AI QA error:', error);
    throw new Error('AI问答失败，请检查AI配置');
  }
}

// 检查AI是否可用
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-placeholder';
}
