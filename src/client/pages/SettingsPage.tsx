import { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Tag,
  Trash2,
  Loader2,
  Moon,
  Sun,
  Type,
  Volume2,
  Webhook,
  Bell,
  Smartphone
} from 'lucide-react';
import type { Tag as TagType } from '../types';
import { tagsApi, exportApi, healthCheck } from '../api';

interface AppSettings {
  theme: string;
  font_size: string;
  font_family: string;
  line_height: string;
  tts_voice: string;
  tts_rate: string;
  review_enabled: string;
  daily_review_count: string;
}

export default function SettingsPage() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    font_size: '16',
    font_family: 'system',
    line_height: '1.8',
    tts_voice: 'default',
    tts_rate: '1.0',
    review_enabled: 'true',
    daily_review_count: '5'
  });
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    fetchTags();
    checkHealth();
    fetchSettings();

    // Check for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, ...data });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      setSettings({ ...settings, [key]: value });
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

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

  const installPWA = async () => {
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt as { prompt: () => void };
    promptEvent.prompt();
    setPwaInstallable(false);
    setDeferredPrompt(null);
  };

  const colorPresets = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280',
  ];

  const fontSizes = ['14', '16', '18', '20', '22'];
  const fontFamilies = [
    { value: 'system', label: '系统默认' },
    { value: 'serif', label: '衬线字体' },
    { value: 'sans-serif', label: '无衬线字体' },
    { value: 'mono', label: '等宽字体' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={28} />
          设置
        </h1>
      </div>

      {/* PWA Install */}
      {pwaInstallable && (
        <section className="mb-8 bg-gradient-to-r from-primary-500 to-blue-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={24} />
              <div>
                <h2 className="font-semibold">安装 AI Reader 应用</h2>
                <p className="text-white/80 text-sm">获得更好的离线体验和快速访问</p>
              </div>
            </div>
            <button
              onClick={installPWA}
              className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-white/90"
            >
              安装
            </button>
          </div>
        </section>
      )}

      {/* AI Status */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 功能状态</h2>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${aiConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={aiConfigured ? 'text-green-600' : 'text-red-600'}>
            {aiConfigured ? 'AI功能已配置' : 'AI功能未配置'}
          </span>
        </div>
        {!aiConfigured && (
          <p className="mt-3 text-sm text-gray-500">
            请设置环境变量 <code className="bg-gray-100 px-2 py-0.5 rounded">OPENAI_API_KEY</code> 以启用AI功能。
          </p>
        )}
      </section>

      {/* Reading Settings */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Type size={20} />
          阅读设置
        </h2>

        <div className="space-y-4">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-gray-700">主题模式</span>
            </div>
            <div className="flex gap-2">
              {['light', 'dark'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    updateSetting('theme', theme);
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                      localStorage.setItem('theme', 'dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                      localStorage.setItem('theme', 'light');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    settings.theme === theme
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {theme === 'light' ? '浅色' : '深色'}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">字体大小</span>
            <div className="flex gap-2">
              {fontSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => updateSetting('font_size', size)}
                  className={`w-10 h-10 rounded-lg text-sm ${
                    settings.font_size === size
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">字体</span>
            <select
              value={settings.font_family}
              onChange={(e) => updateSetting('font_family', e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* TTS Settings */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Volume2 size={20} />
          语音朗读设置
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">朗读速度</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.tts_rate}
                onChange={(e) => updateSetting('tts_rate', e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-gray-500 w-12">{settings.tts_rate}x</span>
            </div>
          </div>
        </div>
      </section>

      {/* Review Settings */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell size={20} />
          复习设置
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">启用间隔复习</span>
            <button
              onClick={() => updateSetting('review_enabled', settings.review_enabled === 'true' ? 'false' : 'true')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.review_enabled === 'true' ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.review_enabled === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-700">每日复习数量</span>
            <select
              value={settings.daily_review_count}
              onChange={(e) => updateSetting('daily_review_count', e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {['5', '10', '15', '20', '30'].map((count) => (
                <option key={count} value={count}>{count}条</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Tags management */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Tag size={20} />
          标签管理
        </h2>

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
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm text-gray-700">{tag.name}</span>
                <span className="text-xs text-gray-400">({tag.article_count || 0})</span>
                <button onClick={() => handleDeleteTag(tag.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Export */}
      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
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
      <section className="text-center text-sm text-gray-400">
        <p>AI Reader v2.0.0</p>
        <p className="mt-1">智能阅读助手 - 让阅读更高效</p>
      </section>
    </div>
  );
}
