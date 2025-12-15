import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Highlighter, Download, Trash2, Loader2, ExternalLink } from 'lucide-react';
import type { Highlight } from '../types';
import { highlightsApi, exportApi } from '../api';

interface HighlightWithArticle extends Highlight {
  article_title: string;
}

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<HighlightWithArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      const data = await highlightsApi.getAll();
      setHighlights(data);
    } catch (err) {
      console.error('Failed to fetch highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条高亮吗？')) return;

    try {
      await highlightsApi.delete(id);
      fetchHighlights();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 按文章分组
  const groupedHighlights = highlights.reduce((acc, highlight) => {
    if (!acc[highlight.article_id]) {
      acc[highlight.article_id] = {
        article_title: highlight.article_title,
        highlights: [],
      };
    }
    acc[highlight.article_id].highlights.push(highlight);
    return acc;
  }, {} as Record<string, { article_title: string; highlights: HighlightWithArticle[] }>);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">高亮笔记</h1>
          <p className="text-gray-500 mt-1">
            共 {highlights.length} 条高亮
          </p>
        </div>

        {highlights.length > 0 && (
          <a
            href={exportApi.highlightsMarkdown()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Download size={18} />
            导出全部
          </a>
        )}
      </div>

      {/* Highlights list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-600" size={40} />
        </div>
      ) : highlights.length === 0 ? (
        <div className="text-center py-20">
          <Highlighter className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">暂无高亮</p>
          <p className="text-gray-400 mt-2">阅读文章时选中文字即可创建高亮</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHighlights).map(([articleId, group]) => (
            <div
              key={articleId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Article header */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <Link
                  to={`/article/${articleId}`}
                  className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-primary-600"
                >
                  {group.article_title}
                  <ExternalLink size={16} />
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {group.highlights.length} 条高亮
                </p>
              </div>

              {/* Highlights */}
              <div className="divide-y divide-gray-100">
                {group.highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div
                          className={`pl-4 border-l-4 ${
                            highlight.color === 'yellow'
                              ? 'border-yellow-400'
                              : highlight.color === 'green'
                              ? 'border-green-400'
                              : highlight.color === 'blue'
                              ? 'border-blue-400'
                              : 'border-pink-400'
                          }`}
                        >
                          <p className="text-gray-700">{highlight.text}</p>
                          {highlight.note && (
                            <p className="mt-2 text-sm text-gray-500 italic">
                              笔记: {highlight.note}
                            </p>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(highlight.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(highlight.id)}
                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
