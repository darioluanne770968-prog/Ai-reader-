import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Loader2 } from 'lucide-react';
import type { Article, Tag, FilterStatus } from '../types';
import { articlesApi, tagsApi } from '../api';
import ArticleCard from '../components/ArticleCard';

const filters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
  { value: 'favorite', label: '收藏' },
];

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FilterStatus>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const search = searchParams.get('search') || '';

  const fetchArticles = async () => {
    try {
      const data = await articlesApi.getAll({
        status,
        tag: selectedTag,
        search,
      });
      setArticles(data);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [status, selectedTag, search]);

  useEffect(() => {
    fetchTags();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {search ? `搜索: "${search}"` : '阅读列表'}
        </h1>
        <p className="text-gray-500 mt-1">
          共 {articles.length} 篇文章
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Status filter */}
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">所有标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name} ({tag.article_count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Article list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-600" size={40} />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">暂无文章</p>
          <p className="text-gray-400 mt-2">点击"添加文章"导入你的第一篇文章</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onUpdate={fetchArticles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
