import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Check,
  Trash2,
  Download,
  MessageSquare,
  Sparkles,
  Loader2,
  Tag,
  Plus,
  X,
  Send,
  ExternalLink,
  Volume2,
  Clock,
  BookOpen,
  Keyboard,
} from 'lucide-react';
import TTSPlayer from '../components/TTSPlayer';
import type { Article, QAItem } from '../types';
import { articlesApi, tagsApi, highlightsApi, exportApi } from '../api';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showTTSPlayer, setShowTTSPlayer] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArticle();
      fetchQAHistory();
    }
  }, [id]);

  // 保存阅读进度
  useEffect(() => {
    const saveProgress = () => {
      if (!contentRef.current || !id || !article) return;

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      articlesApi.update(id, {
        read_progress: Math.min(100, progress),
        scroll_position: scrollTop,
      }).catch(console.error);
    };

    const debouncedSave = debounce(saveProgress, 1000);
    window.addEventListener('scroll', debouncedSave);

    return () => {
      window.removeEventListener('scroll', debouncedSave);
      saveProgress(); // Save on unmount
    };
  }, [id, article]);

  // 恢复阅读位置
  useEffect(() => {
    if (article?.scroll_position) {
      setTimeout(() => {
        window.scrollTo(0, article.scroll_position);
      }, 100);
    }
  }, [article]);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在输入则忽略
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape':
          if (showTTSPlayer) setShowTTSPlayer(false);
          else if (showAIPanel) setShowAIPanel(false);
          else if (showShortcuts) setShowShortcuts(false);
          break;
        case 't': // 切换 TTS
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowTTSPlayer(prev => !prev);
          }
          break;
        case 'a': // 切换 AI 面板
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowAIPanel(prev => !prev);
          }
          break;
        case 'f': // 收藏
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleToggleFavorite();
          }
          break;
        case 'r': // 标记已读
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleMarkRead();
          }
          break;
        case 's': // 生成摘要
          if (!e.metaKey && !e.ctrlKey && !article?.summary) {
            e.preventDefault();
            handleGenerateSummary();
          }
          break;
        case '?': // 显示快捷键帮助
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'backspace': // 返回
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('/');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [article, showTTSPlayer, showAIPanel, showShortcuts]);

  const fetchArticle = async () => {
    try {
      const data = await articlesApi.getById(id!);
      setArticle(data);
    } catch (err) {
      console.error('Failed to fetch article:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQAHistory = async () => {
    try {
      const data = await articlesApi.getQAHistory(id!);
      setQaHistory(data);
    } catch (err) {
      console.error('Failed to fetch QA history:', err);
    }
  };

  const handleGenerateSummary = async () => {
    if (!id || article?.summary) return;

    setSummaryLoading(true);
    try {
      const result = await articlesApi.generateSummary(id);
      setArticle((prev) =>
        prev
          ? {
              ...prev,
              summary: {
                id: result.id,
                article_id: id,
                summary: result.summary,
                key_points: JSON.stringify(result.key_points),
                created_at: new Date().toISOString(),
              },
            }
          : null
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '生成摘要失败');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !question.trim()) return;

    setAskingQuestion(true);
    try {
      const result = await articlesApi.askQuestion(id, question.trim());
      setQaHistory((prev) => [result, ...prev]);
      setQuestion('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '提问失败');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id || !article) return;
    try {
      await articlesApi.update(id, { is_favorite: article.is_favorite ? 0 : 1 });
      setArticle((prev) => (prev ? { ...prev, is_favorite: prev.is_favorite ? 0 : 1 } : null));
    } catch (err) {
      console.error('Toggle favorite failed:', err);
    }
  };

  const handleMarkRead = async () => {
    if (!id || !article) return;
    try {
      await articlesApi.update(id, { is_read: article.is_read ? 0 : 1 });
      setArticle((prev) => (prev ? { ...prev, is_read: prev.is_read ? 0 : 1 } : null));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('确定要删除这篇文章吗？')) return;
    try {
      await articlesApi.delete(id);
      navigate('/');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTag.trim()) return;

    try {
      await tagsApi.addToArticle(id, newTag.trim());
      fetchArticle();
      setNewTag('');
      setShowTagInput(false);
    } catch (err) {
      console.error('Add tag failed:', err);
    }
  };

  const handleHighlight = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !id) return;

    const text = selection.toString().trim();
    if (!text) return;

    try {
      await highlightsApi.create({
        article_id: id,
        text,
        color: 'yellow',
      });
      fetchArticle();
      selection.removeAllRanges();
    } catch (err) {
      console.error('Create highlight failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-600" size={40} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">文章不存在</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-primary-600 hover:underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  const tags = article.tags?.split(',').filter(Boolean) || [];
  const keyPoints = article.summary?.key_points
    ? JSON.parse(article.summary.key_points)
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            返回
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTTSPlayer(!showTTSPlayer)}
              className={`p-2 rounded-lg transition-colors ${
                showTTSPlayer ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
              }`}
              title="朗读 (T)"
            >
              <Volume2 size={20} />
            </button>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showAIPanel ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
              }`}
              title="AI助手 (A)"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                article.is_favorite
                  ? 'text-yellow-500 bg-yellow-50'
                  : 'hover:bg-gray-100'
              }`}
              title="收藏"
            >
              <Star size={20} fill={article.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleMarkRead}
              className={`p-2 rounded-lg transition-colors ${
                article.is_read ? 'text-green-500 bg-green-50' : 'hover:bg-gray-100'
              }`}
              title="标记已读"
            >
              <Check size={20} />
            </button>
            <a
              href={exportApi.articleMarkdown(article.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="导出Markdown"
            >
              <Download size={20} />
            </a>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="快捷键 (?)"
            >
              <Keyboard size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main content */}
        <article className="flex-1 px-6 py-8" ref={contentRef}>
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500 mb-6">
            {article.author && <span>作者: {article.author}</span>}
            {article.site_name && (
              <a
                href={article.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:underline"
              >
                <ExternalLink size={14} />
                {article.site_name}
              </a>
            )}
            <span>{article.reading_time} 分钟阅读</span>
            <span>{article.word_count} 字</span>
          </div>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-2 mb-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-primary-50 text-primary-600 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
            {showTagInput ? (
              <form onSubmit={handleAddTag} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="标签名"
                  className="px-3 py-1 border border-gray-200 rounded-full text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button type="submit" className="text-primary-600">
                  <Check size={16} />
                </button>
                <button type="button" onClick={() => setShowTagInput(false)} className="text-gray-400">
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-1 px-3 py-1 border border-dashed border-gray-300 text-gray-500 text-sm rounded-full hover:border-primary-500 hover:text-primary-600"
              >
                <Tag size={14} />
                添加标签
              </button>
            )}
          </div>

          {/* AI Summary */}
          {article.summary ? (
            <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-primary-600 font-semibold mb-3">
                <Sparkles size={18} />
                AI 摘要
              </div>
              <p className="text-gray-700 leading-relaxed">{article.summary.summary}</p>
              {keyPoints.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">关键要点:</p>
                  <ul className="space-y-1">
                    {keyPoints.map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-primary-500">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="mb-8 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {summaryLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {summaryLoading ? '生成中...' : '生成AI摘要'}
            </button>
          )}

          {/* Highlights */}
          {article.highlights && article.highlights.length > 0 && (
            <div className="mb-8 p-4 bg-yellow-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">高亮 ({article.highlights.length})</h3>
              <div className="space-y-3">
                {article.highlights.map((h) => (
                  <div key={h.id} className="pl-4 border-l-4 border-yellow-400">
                    <p className="text-gray-700">{h.text}</p>
                    {h.note && (
                      <p className="text-sm text-gray-500 mt-1">笔记: {h.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article content */}
          <div
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
            onMouseUp={handleHighlight}
          />
        </article>

        {/* AI Panel */}
        {showAIPanel && (
          <aside className="w-80 border-l border-gray-200 bg-gray-50 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={18} />
              AI 问答
            </h3>

            <form onSubmit={handleAskQuestion} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="对文章提问..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={askingQuestion || !question.trim()}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {askingQuestion ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {qaHistory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Q: {item.question}
                  </p>
                  <p className="text-sm text-gray-600">{item.answer}</p>
                </div>
              ))}
              {qaHistory.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  试着对这篇文章提问吧
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* TTS 悬浮播放器 */}
      {showTTSPlayer && article && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <TTSPlayer text={article.content} title={article.title} />
        </div>
      )}

      {/* 快捷键帮助弹窗 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Keyboard size={24} />
                  快捷键
                </h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'T', action: '切换朗读播放器' },
                  { key: 'A', action: '切换AI助手面板' },
                  { key: 'F', action: '收藏/取消收藏' },
                  { key: 'R', action: '标记已读/未读' },
                  { key: 'S', action: '生成AI摘要' },
                  { key: '?', action: '显示快捷键帮助' },
                  { key: 'Esc', action: '关闭面板/弹窗' },
                  { key: '⌫', action: '返回首页' },
                ].map(({ key, action }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{action}</span>
                    <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-mono text-sm border border-gray-200 dark:border-gray-600">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-gray-500 text-center">
                按 Esc 或点击外部关闭
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
