import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Link2, Calendar, Trash2, Edit3, ArrowLeft, ArrowRight } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  article_id?: string;
  is_daily: number;
  word_count: number;
  created_at: string;
  updated_at: string;
  outgoingLinks?: any[];
  backlinks?: any[];
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [searchQuery]);

  const fetchNotes = async () => {
    try {
      const url = searchQuery
        ? `/api/notes?search=${encodeURIComponent(searchQuery)}`
        : '/api/notes';
      const response = await fetch(url);
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const fetchNoteDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`);
      const data = await response.json();
      setSelectedNote(data);
    } catch (error) {
      console.error('Failed to fetch note:', error);
    }
  };

  const createNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新笔记',
          content: '开始写作...'
        })
      });
      const newNote = await response.json();
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const updateNote = async () => {
    if (!selectedNote) return;

    try {
      await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent
        })
      });
      await fetchNoteDetail(selectedNote.id);
      await fetchNotes();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('确定要删除这个笔记吗？')) return;

    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const getTodayNote = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await fetch(`/api/notes/daily/${today}`);
      const note = await response.json();
      setSelectedNote(note);
      await fetchNotes();
    } catch (error) {
      console.error('Failed to get daily note:', error);
    }
  };

  // 渲染带有双向链接的内容
  const renderContent = (content: string) => {
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    const parts = content.split(linkPattern);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // 这是链接部分
        const linkedNote = notes.find(n => n.title === part);
        return (
          <span
            key={index}
            className={`px-1 rounded cursor-pointer ${
              linkedNote
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
            }`}
            onClick={() => linkedNote && fetchNoteDetail(linkedNote.id)}
          >
            [[{part}]]
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex">
      {/* 侧边栏 - 笔记列表 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              双向链接笔记
            </h2>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={createNote}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
            <button
              onClick={getTodayNote}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Calendar className="w-4 h-4" />
              今日
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => fetchNoteDetail(note.id)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                selectedNote?.id === note.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{note.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {note.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{note.word_count} 字</span>
                    <span>·</span>
                    <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无笔记</p>
              <p className="text-sm mt-2">点击"新建"创建第一个笔记</p>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* 工具栏 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none"
                  />
                ) : (
                  <h1 className="text-xl font-semibold">{selectedNote.title}</h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={updateNote}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditTitle(selectedNote.title);
                      setEditContent(selectedNote.content);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                )}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 resize-none"
                  placeholder="使用 [[笔记标题]] 创建链接..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">
                    {renderContent(selectedNote.content)}
                  </div>
                </div>
              )}

              {/* 链接面板 */}
              {!isEditing && (selectedNote.outgoingLinks?.length > 0 || selectedNote.backlinks?.length > 0) && (
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid md:grid-cols-2 gap-6">
                    {selectedNote.outgoingLinks && selectedNote.outgoingLinks.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3">
                          <ArrowRight className="w-4 h-4" />
                          出链 ({selectedNote.outgoingLinks.length})
                        </h3>
                        <div className="space-y-2">
                          {selectedNote.outgoingLinks.map((link: any) => (
                            <button
                              key={link.id}
                              onClick={() => fetchNoteDetail(link.target_note_id)}
                              className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <Link2 className="w-4 h-4 inline mr-2 text-blue-500" />
                              {link.target_title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedNote.backlinks && selectedNote.backlinks.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3">
                          <ArrowLeft className="w-4 h-4" />
                          反向链接 ({selectedNote.backlinks.length})
                        </h3>
                        <div className="space-y-2">
                          {selectedNote.backlinks.map((link: any) => (
                            <button
                              key={link.id}
                              onClick={() => fetchNoteDetail(link.source_id)}
                              className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                              <Link2 className="w-4 h-4 inline mr-2 text-green-500" />
                              {link.source_title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>选择一个笔记开始阅读</p>
              <p className="text-sm mt-2">或创建新笔记</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
