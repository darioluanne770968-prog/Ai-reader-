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

// ========== 超级高级功能 ==========

// 多模态理解 - 分析图片内容
export async function analyzeImage(imageUrl: string, context?: string): Promise<{
  description: string;
  extractedText: string;
  chartData?: object;
  insights: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: '你是一个图像分析专家。请详细分析图片内容，提取关键信息。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `请分析这张图片${context ? `（上下文：${context}）` : ''}，返回JSON格式：
{
  "description": "图片描述",
  "extractedText": "图片中的文字",
  "chartData": 如果是图表则提取数据，否则null,
  "insights": ["洞见1", "洞见2"]
}` },
            { type: 'image_url', image_url: { url: imageUrl } }
          ] as any
        }
      ],
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content || '';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {}

    return {
      description: text,
      extractedText: '',
      insights: []
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      description: '图片分析功能需要GPT-4 Vision模型',
      extractedText: '',
      insights: []
    };
  }
}

// 对话式阅读 - 多轮对话
export async function chatWithArticle(
  articleContent: string,
  articleTitle: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<string> {
  const truncatedContent = articleContent.substring(0, 6000);

  try {
    const messages: any[] = [
      {
        role: 'system',
        content: `你是一个智能阅读助手，正在帮助用户深入理解以下文章：

标题：${articleTitle}
内容摘要：${truncatedContent}

请像一个耐心的导师一样，回答用户的问题，引导深入思考，并在适当时提出追问。如果用户的问题超出文章范围，可以适当延伸但要说明。`
      }
    ];

    // 添加历史对话
    chatHistory.slice(-10).forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    messages.push({ role: 'user', content: userMessage });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || '抱歉，无法生成回复';
  } catch (error) {
    console.error('Chat error:', error);
    throw new Error('对话生成失败');
  }
}

// 自动生成思维导图
export async function generateMindMap(content: string, title: string): Promise<{
  root: {
    text: string;
    children: Array<{
      text: string;
      children?: Array<{ text: string; children?: any[] }>;
    }>;
  };
}> {
  const truncatedContent = content.substring(0, 6000);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个结构化思维专家。请将文章内容转换为思维导图结构。'
        },
        {
          role: 'user',
          content: `请将以下文章转换为思维导图JSON结构：

标题：${title}
内容：${truncatedContent}

返回格式：
{
  "root": {
    "text": "中心主题",
    "children": [
      {
        "text": "主要分支1",
        "children": [
          { "text": "子节点1" },
          { "text": "子节点2" }
        ]
      }
    ]
  }
}

注意：
- 层级不超过4层
- 每个分支的子节点不超过5个
- 文字简洁，每个节点不超过20字`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { root: { text: title, children: [] } };
  } catch (error) {
    console.error('Mind map error:', error);
    return { root: { text: title, children: [] } };
  }
}

// 观点冲突检测
export async function detectConflicts(articles: Array<{
  id: string;
  title: string;
  content: string;
}>): Promise<Array<{
  topic: string;
  positions: Array<{
    articleId: string;
    articleTitle: string;
    stance: string;
    quote: string;
  }>;
  analysis: string;
}>> {
  if (articles.length < 2) return [];

  const articlesInfo = articles.map((a, i) =>
    `[${a.id}] ${a.title}:\n${a.content.substring(0, 1500)}`
  ).join('\n\n---\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个批判性思维专家。请分析多篇文章中的观点差异和冲突。'
        },
        {
          role: 'user',
          content: `请分析以下文章中的观点冲突或差异：

${articlesInfo}

返回JSON数组格式：
[{
  "topic": "争议话题",
  "positions": [
    {
      "articleId": "文章ID",
      "articleTitle": "文章标题",
      "stance": "支持/反对/中立",
      "quote": "关键引用"
    }
  ],
  "analysis": "冲突分析和可能的调和方案"
}]`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (error) {
    console.error('Conflict detection error:', error);
    return [];
  }
}

// AI事实核查
export async function factCheck(claims: string[], articleContext?: string): Promise<Array<{
  claim: string;
  verdict: 'verified' | 'false' | 'partially_true' | 'unverifiable';
  confidence: number;
  explanation: string;
  suggestedSources: string[];
}>> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个事实核查专家。请基于你的知识库对声明进行核查。
注意：
1. 如果无法确定，标记为unverifiable
2. 提供置信度(0-1)
3. 建议用户查阅权威来源`
        },
        {
          role: 'user',
          content: `请核查以下声明：

${claims.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${articleContext ? `上下文：${articleContext.substring(0, 1000)}` : ''}

返回JSON数组：
[{
  "claim": "声明内容",
  "verdict": "verified/false/partially_true/unverifiable",
  "confidence": 0.0-1.0,
  "explanation": "解释说明",
  "suggestedSources": ["建议查阅的来源"]
}]`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch (error) {
    console.error('Fact check error:', error);
    return [];
  }
}

// 难度自适应 - 简化或深化内容
export async function adaptDifficulty(
  content: string,
  targetLevel: 'beginner' | 'intermediate' | 'expert',
  currentLevel?: string
): Promise<string> {
  const levelDescriptions = {
    beginner: '入门级：使用简单词汇，通俗类比，避免专业术语',
    intermediate: '进阶级：保持专业性但解释关键术语',
    expert: '专家级：深入技术细节，假设读者有专业背景'
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个内容改编专家。请将内容调整为${levelDescriptions[targetLevel]}。保持原文的核心信息和逻辑结构。`
        },
        {
          role: 'user',
          content: content.substring(0, 6000)
        }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || content;
  } catch (error) {
    console.error('Difficulty adaptation error:', error);
    return content;
  }
}

// 概念解释器
export async function explainConcept(
  term: string,
  context?: string,
  userLevel: string = 'intermediate'
): Promise<{
  definition: string;
  simpleExplanation: string;
  examples: string[];
  relatedTerms: string[];
  analogy?: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个知识解释专家。请根据用户水平(${userLevel})解释概念。`
        },
        {
          role: 'user',
          content: `请解释概念"${term}"${context ? `（上下文：${context.substring(0, 500)}）` : ''}

返回JSON格式：
{
  "definition": "正式定义",
  "simpleExplanation": "通俗解释",
  "examples": ["例子1", "例子2"],
  "relatedTerms": ["相关概念1", "相关概念2"],
  "analogy": "生动的类比（可选）"
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      definition: term,
      simpleExplanation: '',
      examples: [],
      relatedTerms: []
    };
  } catch (error) {
    console.error('Concept explanation error:', error);
    return {
      definition: term,
      simpleExplanation: '',
      examples: [],
      relatedTerms: []
    };
  }
}

// AI知识问答（基于整个知识库）
export async function answerFromKnowledge(
  question: string,
  knowledgeBase: Array<{
    type: 'article' | 'note' | 'highlight';
    id: string;
    title?: string;
    content: string;
  }>
): Promise<{
  answer: string;
  sources: Array<{ type: string; id: string; title?: string; relevance: number }>;
  confidence: number;
  followUpQuestions: string[];
}> {
  // 构建知识上下文
  const contextParts = knowledgeBase.slice(0, 15).map((item, i) =>
    `[${item.type}:${item.id}] ${item.title || ''}\n${item.content.substring(0, 800)}`
  );

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是用户的个人知识助手。基于用户的阅读库回答问题。
如果知识库中没有相关信息，诚实说明。
引用具体来源时使用[类型:ID]格式。`
        },
        {
          role: 'user',
          content: `知识库内容：
${contextParts.join('\n\n---\n\n')}

问题：${question}

返回JSON：
{
  "answer": "详细回答，引用来源",
  "sources": [{"type": "article/note/highlight", "id": "ID", "title": "标题", "relevance": 0.0-1.0}],
  "confidence": 0.0-1.0,
  "followUpQuestions": ["可以追问的问题1", "问题2"]
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      answer: '无法在知识库中找到相关信息',
      sources: [],
      confidence: 0,
      followUpQuestions: []
    };
  } catch (error) {
    console.error('Knowledge QA error:', error);
    throw new Error('知识问答失败');
  }
}

// 生成学习路径
export async function generateLearningPath(
  goal: string,
  currentKnowledge: string[],
  availableArticles: Array<{ id: string; title: string; tags: string[] }>
): Promise<{
  title: string;
  description: string;
  estimatedHours: number;
  nodes: Array<{
    order: number;
    title: string;
    description: string;
    articleId?: string;
    externalUrl?: string;
    isOptional: boolean;
  }>;
}> {
  const articlesInfo = availableArticles.slice(0, 30).map(a =>
    `[${a.id}] ${a.title} (${a.tags.join(', ')})`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个学习规划专家。请为用户创建个性化的学习路径。'
        },
        {
          role: 'user',
          content: `学习目标：${goal}

已有知识：${currentKnowledge.join(', ') || '无'}

可用文章：
${articlesInfo}

请设计学习路径，返回JSON：
{
  "title": "路径标题",
  "description": "路径描述",
  "estimatedHours": 预计学习时长,
  "nodes": [
    {
      "order": 1,
      "title": "步骤标题",
      "description": "学习内容描述",
      "articleId": "推荐文章ID（如有）",
      "externalUrl": "外部资源URL（如需要）",
      "isOptional": false
    }
  ]
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      title: goal,
      description: '',
      estimatedHours: 0,
      nodes: []
    };
  } catch (error) {
    console.error('Learning path error:', error);
    throw new Error('生成学习路径失败');
  }
}

// 生成AI播客脚本
export async function generatePodcastScript(
  articleTitle: string,
  articleContent: string,
  style: 'conversational' | 'debate' | 'interview' | 'storytelling' = 'conversational'
): Promise<{
  title: string;
  duration: number;
  speakers: string[];
  script: Array<{
    speaker: string;
    text: string;
    emotion?: string;
  }>;
}> {
  const truncatedContent = articleContent.substring(0, 5000);

  const stylePrompts = {
    conversational: '两位主持人轻松讨论，像朋友聊天',
    debate: '两位专家持不同观点进行辩论',
    interview: '一位主持人采访一位专家',
    storytelling: '一位讲述者娓娓道来'
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个播客脚本作家。风格：${stylePrompts[style]}`
        },
        {
          role: 'user',
          content: `请将以下文章转换为播客脚本：

标题：${articleTitle}
内容：${truncatedContent}

返回JSON：
{
  "title": "播客标题",
  "duration": 预计时长(分钟),
  "speakers": ["主持人A", "主持人B"],
  "script": [
    {"speaker": "主持人A", "text": "对话内容", "emotion": "开心/严肃/好奇等"},
    ...
  ]
}

注意：
- 脚本应该在5-10分钟
- 保持对话自然流畅
- 包含开场白和总结`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      title: articleTitle,
      duration: 5,
      speakers: ['主持人A', '主持人B'],
      script: []
    };
  } catch (error) {
    console.error('Podcast script error:', error);
    throw new Error('生成播客脚本失败');
  }
}

// 生成PPT大纲
export async function generatePPTOutline(
  sourceContent: string,
  title: string,
  slideCount: number = 10
): Promise<{
  title: string;
  slides: Array<{
    slideNumber: number;
    title: string;
    bulletPoints: string[];
    speakerNotes: string;
    suggestedVisual?: string;
  }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个演示文稿设计专家。请创建清晰、有吸引力的PPT结构。'
        },
        {
          role: 'user',
          content: `请将以下内容转换为${slideCount}页PPT大纲：

标题：${title}
内容：${sourceContent.substring(0, 5000)}

返回JSON：
{
  "title": "演示标题",
  "slides": [
    {
      "slideNumber": 1,
      "title": "幻灯片标题",
      "bulletPoints": ["要点1", "要点2", "要点3"],
      "speakerNotes": "演讲备注",
      "suggestedVisual": "建议的图片/图表描述"
    }
  ]
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { title, slides: [] };
  } catch (error) {
    console.error('PPT generation error:', error);
    throw new Error('生成PPT大纲失败');
  }
}

// 生成短视频脚本
export async function generateVideoScript(
  sourceContent: string,
  platform: 'douyin' | 'xiaohongshu' | 'bilibili' | 'youtube' = 'douyin',
  duration: number = 60
): Promise<{
  title: string;
  hook: string;
  scenes: Array<{
    sceneNumber: number;
    duration: number;
    narration: string;
    visualDescription: string;
    textOverlay?: string;
  }>;
  callToAction: string;
  hashtags: string[];
}> {
  const platformStyles = {
    douyin: '抖音风格：节奏快、抓眼球、15-60秒',
    xiaohongshu: '小红书风格：分享型、干货满满、2-5分钟',
    bilibili: 'B站风格：深度内容、互动性强、5-15分钟',
    youtube: 'YouTube风格：专业制作、价值导向'
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个短视频策划专家。风格：${platformStyles[platform]}`
        },
        {
          role: 'user',
          content: `将以下内容改编为${duration}秒短视频脚本：

${sourceContent.substring(0, 3000)}

返回JSON：
{
  "title": "视频标题",
  "hook": "开头吸引人的一句话",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 秒数,
      "narration": "旁白/口播内容",
      "visualDescription": "画面描述",
      "textOverlay": "字幕/文字特效"
    }
  ],
  "callToAction": "结尾引导语",
  "hashtags": ["话题标签1", "标签2"]
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      title: '',
      hook: '',
      scenes: [],
      callToAction: '',
      hashtags: []
    };
  } catch (error) {
    console.error('Video script error:', error);
    throw new Error('生成视频脚本失败');
  }
}

// 分析阅读画像
export async function analyzeReadingProfile(
  readingData: {
    articles: Array<{ title: string; tags: string[]; wordCount: number; readTime: number }>;
    highlights: Array<{ text: string }>;
    totalReadTime: number;
    readingStreak: number;
  }
): Promise<{
  readerType: string;
  interests: Array<{ topic: string; score: number }>;
  readingStyle: {
    depth: 'skimmer' | 'balanced' | 'deep_reader';
    pace: 'fast' | 'moderate' | 'slow';
    consistency: 'sporadic' | 'regular' | 'dedicated';
  };
  strengths: string[];
  suggestions: string[];
  funFacts: string[];
}> {
  const articlesInfo = readingData.articles.slice(0, 20).map(a =>
    `${a.title} [${a.tags.join(', ')}] - ${a.wordCount}字/${a.readTime}分钟`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个阅读行为分析专家。请基于数据分析用户的阅读画像。'
        },
        {
          role: 'user',
          content: `分析以下阅读数据：

阅读文章(最近20篇)：
${articlesInfo}

高亮数量：${readingData.highlights.length}
总阅读时长：${readingData.totalReadTime}分钟
连续阅读天数：${readingData.readingStreak}天

返回JSON：
{
  "readerType": "给用户一个有趣的阅读者类型标签",
  "interests": [{"topic": "兴趣领域", "score": 0.0-1.0}],
  "readingStyle": {
    "depth": "skimmer/balanced/deep_reader",
    "pace": "fast/moderate/slow",
    "consistency": "sporadic/regular/dedicated"
  },
  "strengths": ["阅读优势1", "优势2"],
  "suggestions": ["建议1", "建议2"],
  "funFacts": ["有趣的阅读统计发现1", "发现2"]
}`
        }
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      readerType: '探索者',
      interests: [],
      readingStyle: { depth: 'balanced', pace: 'moderate', consistency: 'regular' },
      strengths: [],
      suggestions: [],
      funFacts: []
    };
  } catch (error) {
    console.error('Reading profile error:', error);
    throw new Error('分析阅读画像失败');
  }
}

// 智能分类内容
export async function classifyContent(
  content: { title: string; preview: string }
): Promise<{
  priority: 'high' | 'normal' | 'low';
  readingType: 'deep' | 'quick' | 'reference' | 'skip';
  estimatedTime: number;
  reason: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个内容分类专家。请判断内容的优先级和阅读方式。'
        },
        {
          role: 'user',
          content: `分类以下内容：

标题：${content.title}
预览：${content.preview.substring(0, 500)}

返回JSON：
{
  "priority": "high/normal/low",
  "readingType": "deep(深度阅读)/quick(快速浏览)/reference(参考资料)/skip(可跳过)",
  "estimatedTime": 预计阅读分钟数,
  "reason": "分类原因"
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      priority: 'normal',
      readingType: 'quick',
      estimatedTime: 5,
      reason: ''
    };
  } catch (error) {
    console.error('Content classification error:', error);
    return {
      priority: 'normal',
      readingType: 'quick',
      estimatedTime: 5,
      reason: ''
    };
  }
}

// 生成综述文章
export async function generateSynthesis(
  sources: Array<{
    title: string;
    highlights: string[];
    summary?: string;
  }>,
  topic: string,
  style: 'academic' | 'blog' | 'report' = 'blog'
): Promise<{
  title: string;
  content: string;
  references: Array<{ title: string; citedIn: string }>;
}> {
  const sourcesInfo = sources.map((s, i) => {
    let info = `[${i + 1}] ${s.title}`;
    if (s.summary) info += `\n摘要：${s.summary}`;
    if (s.highlights.length > 0) {
      info += `\n精彩段落：\n${s.highlights.map(h => `- ${h}`).join('\n')}`;
    }
    return info;
  }).join('\n\n');

  const styleGuides = {
    academic: '学术论文风格，严谨引用，客观分析',
    blog: '博客风格，生动有趣，个人见解',
    report: '报告风格，结构清晰，数据支撑'
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的内容综合专家。请以${styleGuides[style]}写作。`
        },
        {
          role: 'user',
          content: `主题：${topic}

参考资料：
${sourcesInfo}

请基于以上资料撰写一篇综述文章，返回JSON：
{
  "title": "文章标题",
  "content": "完整的文章内容（Markdown格式）",
  "references": [{"title": "引用文章标题", "citedIn": "在正文中的引用位置描述"}]
}`
        }
      ],
      temperature: 0.6,
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { title: topic, content: '', references: [] };
  } catch (error) {
    console.error('Synthesis error:', error);
    throw new Error('生成综述失败');
  }
}

// 提取核心观点
export async function extractCoreInsights(
  articles: Array<{ title: string; content: string }>
): Promise<{
  consensus: Array<{ point: string; supportingArticles: string[] }>;
  controversies: Array<{ topic: string; perspectives: Array<{ stance: string; articles: string[] }> }>;
  uniqueInsights: Array<{ insight: string; source: string }>;
  overallTheme: string;
}> {
  const articlesInfo = articles.slice(0, 10).map(a =>
    `【${a.title}】\n${a.content.substring(0, 1000)}`
  ).join('\n\n---\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个批判性阅读专家。请从多篇文章中提取核心观点。'
        },
        {
          role: 'user',
          content: `分析以下文章的核心观点：

${articlesInfo}

返回JSON：
{
  "consensus": [{"point": "共识观点", "supportingArticles": ["支持的文章标题"]}],
  "controversies": [{"topic": "争议话题", "perspectives": [{"stance": "立场", "articles": ["持此立场的文章"]}]}],
  "uniqueInsights": [{"insight": "独特见解", "source": "来源文章"}],
  "overallTheme": "总体主题概括"
}`
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {
      consensus: [],
      controversies: [],
      uniqueInsights: [],
      overallTheme: ''
    };
  } catch (error) {
    console.error('Core insights error:', error);
    throw new Error('提取观点失败');
  }
}
