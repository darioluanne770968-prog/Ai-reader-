import { useState, useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  Clock,
  Highlighter,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';

interface StatsOverview {
  total: {
    articles: number;
    read: number;
    highlights: number;
    words: number;
  };
  today: {
    articles_read: number;
    reading_time: number;
    highlights: number;
    words: number;
  };
  week: {
    articles_read: number;
    reading_time: number;
    highlights: number;
    words: number;
  };
}

interface DailyStats {
  date: string;
  articles_read: number;
  total_reading_time: number;
  words_read: number;
}

export default function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [overviewRes, dailyRes] = await Promise.all([
        fetch('/api/stats/overview'),
        fetch('/api/stats/daily?days=30')
      ]);

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      }
      if (dailyRes.ok) {
        setDailyStats(await dailyRes.json());
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  };

  const formatWords = (words: number) => {
    if (words < 1000) return `${words}`;
    if (words < 10000) return `${(words / 1000).toFixed(1)}k`;
    return `${Math.floor(words / 10000)}万`;
  };

  // 生成热力图数据
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count <= 3) return 'bg-green-400';
    if (count <= 5) return 'bg-green-500';
    return 'bg-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={28} />
          阅读统计
        </h1>
        <p className="text-gray-500 mt-1">追踪你的阅读习惯和进步</p>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="text-blue-500" />}
          label="总文章数"
          value={overview?.total.articles || 0}
          subValue={`已读 ${overview?.total.read || 0}`}
        />
        <StatCard
          icon={<Highlighter className="text-yellow-500" />}
          label="总高亮数"
          value={overview?.total.highlights || 0}
        />
        <StatCard
          icon={<TrendingUp className="text-green-500" />}
          label="总阅读字数"
          value={formatWords(overview?.total.words || 0)}
        />
        <StatCard
          icon={<Clock className="text-purple-500" />}
          label="本周阅读"
          value={formatTime(overview?.week.reading_time || 0)}
          subValue={`${overview?.week.articles_read || 0}篇文章`}
        />
      </div>

      {/* 今日统计 */}
      <div className="bg-gradient-to-r from-primary-500 to-blue-500 rounded-2xl p-6 text-white mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          今日阅读
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-bold">{overview?.today.articles_read || 0}</p>
            <p className="text-white/80 text-sm">篇文章</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatTime(overview?.today.reading_time || 0)}</p>
            <p className="text-white/80 text-sm">阅读时长</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{overview?.today.highlights || 0}</p>
            <p className="text-white/80 text-sm">条高亮</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatWords(overview?.today.words || 0)}</p>
            <p className="text-white/80 text-sm">字</p>
          </div>
        </div>
      </div>

      {/* 阅读热力图 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">阅读热力图（近30天）</h2>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dateStr = date.toISOString().split('T')[0];
            const stat = dailyStats.find(s => s.date === dateStr);
            const count = stat?.articles_read || 0;

            return (
              <div
                key={dateStr}
                className={`w-8 h-8 rounded ${getHeatmapColor(count)} cursor-pointer transition-transform hover:scale-110`}
                title={`${dateStr}: ${count}篇文章`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <span>少</span>
          <div className="w-4 h-4 rounded bg-gray-100" />
          <div className="w-4 h-4 rounded bg-green-200" />
          <div className="w-4 h-4 rounded bg-green-400" />
          <div className="w-4 h-4 rounded bg-green-500" />
          <div className="w-4 h-4 rounded bg-green-600" />
          <span>多</span>
        </div>
      </div>

      {/* 阅读趋势图 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">阅读趋势</h2>
        <div className="h-48 flex items-end gap-2">
          {dailyStats.slice(-14).map((stat, i) => {
            const maxWords = Math.max(...dailyStats.slice(-14).map(s => s.words_read || 1));
            const height = stat.words_read ? (stat.words_read / maxWords) * 100 : 5;

            return (
              <div
                key={stat.date || i}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${stat.date}: ${formatWords(stat.words_read || 0)}字`}
                />
                <span className="text-xs text-gray-400">
                  {stat.date?.substring(5) || ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}
