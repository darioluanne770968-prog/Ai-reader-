import { useState, useEffect } from 'react';
import { Settings, Download, Tag, Trash2, Loader2 } from 'lucide-react';
import type { Tag as TagType } from '../types';
import { tagsApi, exportApi, healthCheck } from '../api';

export default function SettingsPage() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  useEffect(() => {
    fetchTags();
    checkHealth();
  }, []);

  const fetchTags = async () => {
    try {
      const data = await tagsApi.getAll();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const data = await healthCheck();
      setAiConfigured(data.ai_configured);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await tagsApi.create({ name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      fetchTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;

    try {
      await tagsApi.delete(id);
      fetchTags();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const colorPresets = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#6b7280', // gray
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={28} />
          设置
        </h1>
      </div>

      {/* AI Status */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 功能状态</h2>
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              aiConfigured ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className={aiConfigured ? 'text-green-600' : 'text-red-600'}>
            {aiConfigured ? 'AI功能已配置' : 'AI功能未配置'}
          </span>
        </div>
        {!aiConfigured && (
          <p className="mt-3 text-sm text-gray-500">
            请设置环境变量 <code className="bg-gray-100 px-2 py-0.5 rounded">OPENAI_API_KEY</code> 以启用AI摘要和问答功能。
          </p>
        )}
      </section>

      {/* Tags management */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Tag size={20} />
          标签管理
        </h2>

        {/* Create tag form */}
        <form onSubmit={handleCreateTag} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="新标签名称"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex items-center gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    newTagColor === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </form>

        {/* Tags list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary-600" size={24} />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无标签</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-gray-700">{tag.name}</span>
                <span className="text-xs text-gray-400">({tag.article_count || 0})</span>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Export */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download size={20} />
          数据导出
        </h2>

        <div className="space-y-3">
          <a
            href={exportApi.allData()}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">导出所有数据</p>
              <p className="text-sm text-gray-500">包含文章、高亮、摘要、标签等全部数据 (JSON格式)</p>
            </div>
            <Download size={20} className="text-gray-400" />
          </a>

          <a
            href={exportApi.highlightsMarkdown()}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">导出所有高亮</p>
              <p className="text-sm text-gray-500">所有文章的高亮笔记 (Markdown格式)</p>
            </div>
            <Download size={20} className="text-gray-400" />
          </a>
        </div>
      </section>

      {/* About */}
      <section className="mt-8 text-center text-sm text-gray-400">
        <p>AI Reader v1.0.0</p>
        <p className="mt-1">智能阅读助手 - 让阅读更高效</p>
      </section>
    </div>
  );
}
