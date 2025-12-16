import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Loader2,
  Sparkles,
  Calendar
} from 'lucide-react';

interface ReviewHighlight {
  id: string;
  article_id: string;
  article_title: string;
  text: string;
  note: string | null;
  color: string;
  review_count: number;
  next_review_at: string;
}

interface ReviewStats {
  due_today: number;
  total_reviewed: number;
  average_easiness: number;
  upcoming: Array<{ date: string; count: number }>;
}

export default function ReviewPage() {
  const [highlights, setHighlights] = useState<ReviewHighlight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [highlightsRes, statsRes] = await Promise.all([
        fetch('/api/review/due?limit=20'),
        fetch('/api/review/stats')
      ]);

      if (highlightsRes.ok) {
        setHighlights(await highlightsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Fetch review data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (quality: number) => {
    if (!highlights[currentIndex]) return;

    setSubmitting(true);
    try {
      await fetch(`/api/review/${highlights[currentIndex].id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality })
      });

      // 移到下一个
      if (currentIndex < highlights.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // 重新获取
        fetchData();
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    } catch (err) {
      console.error('Submit review error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const skipReview = async () => {
    if (!highlights[currentIndex]) return;

    try {
      await fetch(`/api/review/${highlights[currentIndex].id}/skip`, {
        method: 'POST'
      });

      if (currentIndex < highlights.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      }
    } catch (err) {
      console.error('Skip review error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-600" size={40} />
      </div>
    );
  }

  const currentHighlight = highlights[currentIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={28} />
            间隔复习
          </h1>
          <p className="text-gray-500 mt-1">基于SM-2算法的高效记忆复习</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">今日待复习</p>
          <p className="text-2xl font-bold text-primary-600">{stats?.due_today || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">已复习总数</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_reviewed || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">平均熟练度</p>
          <p className="text-2xl font-bold text-green-600">
            {((stats?.average_easiness || 2.5) / 5 * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">当前进度</p>
          <p className="text-2xl font-bold text-gray-900">
            {currentIndex + 1} / {highlights.length}
          </p>
        </div>
      </div>

      {/* Upcoming reviews */}
      {stats?.upcoming && stats.upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Calendar size={16} />
            未来7天复习计划
          </h3>
          <div className="flex gap-2">
            {stats.upcoming.map((day, i) => (
              <div
                key={day.date}
                className={`flex-1 text-center p-2 rounded-lg ${
                  i === 0 ? 'bg-primary-50 text-primary-600' : 'bg-gray-50'
                }`}
              >
                <p className="text-xs text-gray-500">{day.date.substring(5)}</p>
                <p className="font-bold">{day.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review card */}
      {highlights.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <Sparkles className="mx-auto text-yellow-500 mb-4" size={48} />
          <p className="text-xl font-semibold text-gray-900">今日复习已完成！</p>
          <p className="text-gray-500 mt-2">继续阅读新文章，创建更多高亮笔记吧</p>
          <Link
            to="/"
            className="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            去阅读
          </Link>
        </div>
      ) : currentHighlight ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Article title */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <Link
              to={`/article/${currentHighlight.article_id}`}
              className="text-sm text-primary-600 hover:underline"
            >
              {currentHighlight.article_title}
            </Link>
          </div>

          {/* Highlight content */}
          <div className="p-8">
            <div
              className={`p-6 rounded-xl text-lg leading-relaxed ${
                currentHighlight.color === 'yellow'
                  ? 'bg-yellow-50 border-l-4 border-yellow-400'
                  : currentHighlight.color === 'green'
                  ? 'bg-green-50 border-l-4 border-green-400'
                  : currentHighlight.color === 'blue'
                  ? 'bg-blue-50 border-l-4 border-blue-400'
                  : 'bg-pink-50 border-l-4 border-pink-400'
              }`}
            >
              {currentHighlight.text}
            </div>

            {/* Note (answer) */}
            {showAnswer && currentHighlight.note && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg animate-fadeIn">
                <p className="text-sm text-gray-500 mb-1">你的笔记:</p>
                <p className="text-gray-700">{currentHighlight.note}</p>
              </div>
            )}

            {/* Review count */}
            <p className="text-sm text-gray-400 mt-4">
              已复习 {currentHighlight.review_count} 次
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                显示笔记 / 我想起来了
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-600">你对这条内容的记忆程度如何？</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => submitReview(1)}
                    disabled={submitting}
                    className="py-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    <X size={20} className="mx-auto mb-1" />
                    <span className="text-xs">完全忘记</span>
                  </button>
                  <button
                    onClick={() => submitReview(3)}
                    disabled={submitting}
                    className="py-3 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                  >
                    <RotateCcw size={20} className="mx-auto mb-1" />
                    <span className="text-xs">有点模糊</span>
                  </button>
                  <button
                    onClick={() => submitReview(4)}
                    disabled={submitting}
                    className="py-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                  >
                    <Check size={20} className="mx-auto mb-1" />
                    <span className="text-xs">记得清楚</span>
                  </button>
                  <button
                    onClick={() => submitReview(5)}
                    disabled={submitting}
                    className="py-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    <Sparkles size={20} className="mx-auto mb-1" />
                    <span className="text-xs">非常熟悉</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                  setShowAnswer(false);
                }
              }}
              disabled={currentIndex === 0}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={skipReview}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              跳过这条
            </button>

            <button
              onClick={() => {
                if (currentIndex < highlights.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                  setShowAnswer(false);
                }
              }}
              disabled={currentIndex === highlights.length - 1}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
