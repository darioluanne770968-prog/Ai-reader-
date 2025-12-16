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
  goldenQuotes: string[];
  autoTags: string[];
}> {
  const truncatedContent = content.substring(0, 8000);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文章分析助手。请用中文提供全面的文章分析。'
        },
        {
          role: 'user',
          content: `请为以下文章生成完整分析。

标题：${title}

内容：${truncatedContent}

请以JSON格式返回，包含以下字段：
- summary: 100-200字的摘要
- keyPoints: 3-5个关键要点的数组
- goldenQuotes: 2-3个值得收藏的金句/精彩段落
- autoTags: 3-5个推荐标签（简短词语）`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const text = response.choices[0]?.message?.content || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          keyPoints: parsed.keyPoints || [],
          goldenQuotes: parsed.goldenQuotes || [],
          autoTags: parsed.autoTags || []
        };
      }
    } catch {
      // JSON解析失败
    }

    return {
      summary: text,
      keyPoints: [],
      goldenQuotes: [],
      autoTags: []
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

// 翻译文章
export async function translateContent(content: string, targetLang: string = 'zh'): Promise<string> {
  const truncatedContent = content.substring(0, 8000);
  const langMap: Record<string, string> = {
    'zh': '中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch'
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的翻译助手。请将内容翻译成${langMap[targetLang] || targetLang}，保持原文的格式和语气。`
        },
        {
          role: 'user',
          content: truncatedContent
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('翻译失败，请检查AI配置');
  }
}

// 生成写作内容
export async function generateWriting(params: {
  prompt: string;
  highlights?: string[];
  articleExcerpts?: string[];
  style?: string;
}): Promise<string> {
  const { prompt, highlights = [], articleExcerpts = [], style = '专业' } = params;

  let context = '';
  if (highlights.length > 0) {
    context += `\n\n参考高亮:\n${highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
  }
  if (articleExcerpts.length > 0) {
    context += `\n\n参考文章摘要:\n${articleExcerpts.join('\n---\n')}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个${style}的写作助手。基于用户提供的素材和提示，帮助生成高质量的内容。`
        },
        {
          role: 'user',
          content: `${prompt}${context}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Writing generation error:', error);
    throw new Error('生成内容失败，请检查AI配置');
  }
}

// 检测文章语言
export async function detectLanguage(content: string): Promise<string> {
  const sample = content.substring(0, 500);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '检测文本语言，只返回语言代码（如：zh, en, ja, ko, es, fr, de）'
        },
        {
          role: 'user',
          content: sample
        }
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const lang = response.choices[0]?.message?.content?.trim().toLowerCase() || 'zh';
    return lang.substring(0, 2);
  } catch {
    return 'zh';
  }
}

// 生成文章关联推荐
export async function findRelatedContent(
  currentArticle: { title: string; content: string },
  otherArticles: Array<{ id: string; title: string; excerpt: string }>
): Promise<Array<{ id: string; score: number; reason: string }>> {
  if (otherArticles.length === 0) return [];

  const truncatedContent = currentArticle.content.substring(0, 2000);
  const articlesInfo = otherArticles.slice(0, 20).map((a, i) =>
    `${i + 1}. [ID:${a.id}] ${a.title}: ${a.excerpt.substring(0, 100)}`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '分析文章相关性，返回JSON数组格式的推荐结果。'
        },
        {
          role: 'user',
          content: `当前文章：${currentArticle.title}
${truncatedContent}

候选文章列表：
${articlesInfo}

请选出3-5篇最相关的文章，返回JSON数组：
[{"id": "文章ID", "score": 0.0-1.0的相关度, "reason": "简短说明相关原因"}]`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content || '[]';
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // 解析失败
    }
    return [];
  } catch (error) {
    console.error('Related content error:', error);
    return [];
  }
}

// 生成每日摘要
export async function generateDailySummary(articles: Array<{
  title: string;
  summary?: string;
  keyPoints?: string[];
}>): Promise<string> {
  const articlesInfo = articles.map((a, i) => {
    let info = `${i + 1}. ${a.title}`;
    if (a.summary) info += `\n   摘要: ${a.summary}`;
    if (a.keyPoints && a.keyPoints.length > 0) {
      info += `\n   要点: ${a.keyPoints.join('; ')}`;
    }
    return info;
  }).join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个阅读总结助手。请为用户的每日阅读生成一份简洁的总结报告。'
        },
        {
          role: 'user',
          content: `今日阅读了以下文章：

${articlesInfo}

请生成一份每日阅读总结，包括：
1. 今日阅读概览（1-2句话）
2. 主要收获和洞见（3-5点）
3. 值得深入思考的问题（1-2个）`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Daily summary error:', error);
    throw new Error('生成每日总结失败');
  }
}

// 检查AI是否可用
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-placeholder';
}
