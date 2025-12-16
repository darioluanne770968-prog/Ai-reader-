import { useState, useEffect } from 'react';
import {
  PenTool,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface Draft {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Highlight {
  id: string;
  text: string;
  article_title: string;
}

export default function WritingPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [style, setStyle] = useState('专业');
  const [copied, setCopied] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDrafts();
    fetchHighlights();
  }, []);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/advanced/writing/drafts');
      if (res.ok) {
        setDrafts(await res.json());
      }
    } catch (err) {
      console.error('Fetch drafts error:', err);
    }
  };

  const fetchHighlights = async () => {
    try {
      const res = await fetch('/api/highlights');
      if (res.ok) {
        setHighlights(await res.json());
      }
    } catch (err) {
      console.error('Fetch highlights error:', err);
    }
  };

  const generateContent = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/advanced/writing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          highlight_ids: selectedHighlights,
          style
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedContent(data.content);
      } else {
        const err = await res.json();
        alert(err.error || '生成失败');
      }
    } catch (err) {
      console.error('Generate error:', err);
      alert('生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draftTitle.trim() || !generatedContent.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/advanced/writing/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          content: generatedContent,
          source_highlights: selectedHighlights
        })
      });

      if (res.ok) {
        setDraftTitle('');
        fetchDrafts();
        alert('草稿已保存');
      }
    } catch (err) {
      console.error('Save draft error:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('确定删除这个草稿吗？')) return;

    try {
      await fetch(`/api/advanced/writing/drafts/${id}`, { method: 'DELETE' });
      fetchDrafts();
    } catch (err) {
      console.error('Delete draft error:', err);
    }
  };

  const copyContent = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadDraft = (draft: Draft) => {
    setGeneratedContent(draft.content);
    setDraftTitle(draft.title);
  };

  const styles = ['专业', '轻松', '学术', '创意', '简洁'];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PenTool size={28} />
          AI写作助手
        </h1>
        <p className="text-gray-500 mt-1">基于你的阅读笔记，AI帮你创作内容</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧：输入区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 写作提示 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写作提示
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想写的内容，例如：基于最近阅读的文章，写一篇关于AI发展趋势的总结..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />

            {/* 风格选择 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                写作风格
              </label>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      style === s
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 选择高亮作为素材 */}
            {highlights.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择高亮笔记作为素材（可选）
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                  {highlights.slice(0, 10).map((h) => (
                    <label
                      key={h.id}
                      className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHighlights.includes(h.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHighlights([...selectedHighlights, h.id]);
                          } else {
                            setSelectedHighlights(selectedHighlights.filter(id => id !== h.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-2">{h.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{h.article_title}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateContent}
              disabled={generating || !prompt.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Sparkles size={20} />
              )}
              {generating ? '生成中...' : '生成内容'}
            </button>
          </div>

          {/* 生成结果 */}
          {generatedContent && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">生成结果</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyContent}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none mb-4 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                {generatedContent}
              </div>

              {/* 保存草稿 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="草稿标题"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={saveDraft}
                  disabled={saving || !draftTitle.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  保存草稿
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：草稿列表 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} />
            我的草稿
          </h3>

          {drafts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              暂无草稿
            </p>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => loadDraft(draft)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {draft.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(draft.updated_at).toLocaleDateString('zh-CN')}
                      </p>
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
