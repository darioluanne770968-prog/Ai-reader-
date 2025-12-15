import { useState, useEffect } from 'react';
import { Rss, Plus, RefreshCw, Trash2, Loader2, ExternalLink } from 'lucide-react';
import type { Feed } from '../types';
import { feedsApi } from '../api';

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const data = await feedsApi.getAll();
      setFeeds(data);
    } catch (err) {
      console.error('Failed to fetch feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    setAdding(true);
    try {
      await feedsApi.add(newFeedUrl.trim());
      setNewFeedUrl('');
      fetchFeeds();
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      const result = await feedsApi.refresh(feedId);
      alert(result.message);
      fetchFeeds();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      const result = await feedsApi.refreshAll();
      alert(result.message);
      fetchFeeds();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleDelete = async (feedId: string) => {
    if (!confirm('确定要删除这个订阅源吗？')) return;

    try {
      await feedsApi.delete(feedId);
      fetchFeeds();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RSS 订阅</h1>
          <p className="text-gray-500 mt-1">管理你的RSS订阅源</p>
        </div>

        {feeds.length > 0 && (
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={refreshingAll ? 'animate-spin' : ''} size={18} />
            全部刷新
          </button>
        )}
      </div>

      {/* Add feed form */}
      <form onSubmit={handleAddFeed} className="mb-8">
        <div className="flex gap-3">
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="输入RSS订阅源URL..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={adding || !newFeedUrl.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Plus size={20} />
            )}
            添加
          </button>
        </div>
      </form>

      {/* Feeds list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-600" size={40} />
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-20">
          <Rss className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">暂无订阅源</p>
          <p className="text-gray-400 mt-2">添加你喜欢的RSS订阅源</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Rss className="text-orange-500 flex-shrink-0" size={20} />
                    <h3 className="font-semibold text-gray-900 truncate">
                      {feed.title || 'Unknown Feed'}
                    </h3>
                  </div>

                  {feed.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {feed.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    {feed.site_url && (
                      <a
                        href={feed.site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        <ExternalLink size={12} />
                        {new URL(feed.site_url).hostname}
                      </a>
                    )}
                    {feed.last_fetched_at && (
                      <span>
                        上次更新: {new Date(feed.last_fetched_at).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleRefresh(feed.id)}
                    disabled={refreshing === feed.id}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="刷新"
                  >
                    <RefreshCw
                      className={refreshing === feed.id ? 'animate-spin' : ''}
                      size={18}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
