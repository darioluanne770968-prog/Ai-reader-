import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Filter,
  Loader2,
  BookOpen,
  Star,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Brain,
  Trophy,
  Headphones,
  PenTool
} from 'lucide-react';
import type { Article, Tag, FilterStatus } from '../types';
import { articlesApi, tagsApi } from '../api';
import ArticleCard from '../components/ArticleCard';

interface Stats {
  total: number;
  unread: number;
  read: number;
  favorite: number;
  todayRead: number;
  totalReadingTime: number;
}

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
  const [stats, setStats] = useState<Stats>({
    total: 0,
    unread: 0,
    read: 0,
    favorite: 0,
    todayRead: 0,
    totalReadingTime: 0
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);

  const search = searchParams.get('search') || '';

  // 计算统计数据
  const calculateStats = (articleList: Article[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRead = articleList.filter(a =>
      a.is_read && a.updated_at?.startsWith(today)
    ).length;

    setStats({
      total: articleList.length,
      unread: articleList.filter(a => !a.is_read).length,
      read: articleList.filter(a => a.is_read).length,
      favorite: articleList.filter(a => a.is_favorite).length,
      todayRead,
      totalReadingTime: articleList.reduce((acc, a) => acc + (a.reading_time || 0), 0)
    });

    // 设置最近阅读的文章（有阅读进度的）
    const recent = articleList
      .filter(a => a.read_progress > 0 && a.read_progress < 100)
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
      .slice(0, 3);
    setRecentArticles(recent);
  };

  const fetchArticles = async () => {
    try {
      const data = await articlesApi.getAll({
        status,
        tag: selectedTag,
        search,
      });
      setArticles(data);

      // 首次加载时获取全部文章来计算统计
      if (status === 'all' && !selectedTag && !search) {
        calculateStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取全量统计数据
  const fetchAllStats = async () => {
    try {
      const allArticles = await articlesApi.getAll({});
      calculateStats(allArticles);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
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
    fetchAllStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 统计概览卡片 */}
      {!search && (
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={20} />
                <span className="text-sm opacity-90">待阅读</span>
              </div>
              <p className="text-2xl font-bold">{stats.unread}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm opacity-90">今日阅读</span>
              </div>
              <p className="text-2xl font-bold">{stats.todayRead}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Star size={20} />
                <span className="text-sm opacity-90">收藏文章</span>
              </div>
              <p className="text-2xl font-bold">{stats.favorite}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} />
                <span className="text-sm opacity-90">阅读时长</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalReadingTime}<span className="text-sm font-normal ml-1">分钟</span></p>
            </div>
          </div>

          {/* 继续阅读 */}
          {recentArticles.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target size={18} className="text-primary-600" />
                继续阅读
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                {recentArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/article/${article.id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500"
                            style={{ width: `${article.read_progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(article.read_progress)}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 快捷功能入口 */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {[
              { to: '/review', icon: Brain, label: '间隔复习', color: 'text-purple-600 bg-purple-50' },
              { to: '/notes', icon: PenTool, label: '笔记', color: 'text-blue-600 bg-blue-50' },
              { to: '/challenges', icon: Trophy, label: '挑战', color: 'text-yellow-600 bg-yellow-50' },
              { to: '/focus', icon: Headphones, label: '专注', color: 'text-green-600 bg-green-50' },
              { to: '/stats', icon: TrendingUp, label: '统计', color: 'text-pink-600 bg-pink-50' },
              { to: '/graph', icon: Target, label: '图谱', color: 'text-indigo-600 bg-indigo-50' },
              { to: '/feeds', icon: Calendar, label: 'RSS', color: 'text-orange-600 bg-orange-50' },
              { to: '/writing', icon: PenTool, label: '写作', color: 'text-teal-600 bg-teal-50' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl hover:scale-105 transition-transform ${color}`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
