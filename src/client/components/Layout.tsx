import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Rss,
  Highlighter,
  Settings,
  Plus,
  Search,
  Menu,
  X,
  BarChart3,
  Brain,
  PenTool,
  Network,
  Moon,
  Sun,
  FileText,
  Target,
  Trophy,
  Palette,
  Eye,
} from 'lucide-react';
import ImportModal from './ImportModal';

type ThemeMode = 'light' | 'dark' | 'sepia';

const themeModes: { value: ThemeMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'light', label: '白天模式', icon: <Sun size={16} />, description: '明亮清晰' },
  { value: 'dark', label: '夜间模式', icon: <Moon size={16} />, description: '护眼深色' },
  { value: 'sepia', label: '护眼模式', icon: <Eye size={16} />, description: '暖色调' },
];

const navItems = [
  { to: '/', icon: BookOpen, label: '阅读列表' },
  { to: '/review', icon: Brain, label: '间隔复习' },
  { to: '/notes', icon: FileText, label: '双向笔记' },
  { to: '/focus', icon: Target, label: '专注模式' },
  { to: '/challenges', icon: Trophy, label: '阅读挑战' },
  { to: '/stats', icon: BarChart3, label: '阅读统计' },
  { to: '/feeds', icon: Rss, label: 'RSS订阅' },
  { to: '/highlights', icon: Highlighter, label: '高亮笔记' },
  { to: '/writing', icon: PenTool, label: '写作助手' },
  { to: '/graph', icon: Network, label: '知识图谱' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'sepia'].includes(savedTheme)) {
      setThemeMode(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // 点击外部关闭主题菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const html = document.documentElement;
    // 移除所有主题类
    html.classList.remove('dark', 'sepia');

    if (mode === 'dark') {
      html.classList.add('dark');
    } else if (mode === 'sepia') {
      html.classList.add('sepia');
    }
  };

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyTheme(mode);
    localStorage.setItem('theme', mode);
    setShowThemeMenu(false);
  };

  const isDark = themeMode === 'dark';
  const isSepia = themeMode === 'sepia';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getBgClass = () => {
    if (isDark) return 'dark bg-gray-900';
    if (isSepia) return 'bg-amber-50';
    return 'bg-gray-50';
  };

  const getHeaderBgClass = () => {
    if (isDark) return 'bg-gray-800 border-gray-700';
    if (isSepia) return 'bg-amber-100 border-amber-200';
    return 'bg-white border-gray-200';
  };

  return (
    <div className={`min-h-screen ${getBgClass()}`}>
      {/* Mobile header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 ${getHeaderBgClass()} border-b z-50 flex items-center px-4`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100'}`}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="ml-4 text-xl font-bold text-primary-600">AI Reader</h1>

        {/* 主题切换按钮 - 移动端 */}
        <div className="ml-auto relative" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <Palette size={20} />
          </button>
          {showThemeMenu && (
            <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : isSepia ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'} py-2 z-50`}>
              {themeModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => changeTheme(mode.value)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    themeMode === mode.value
                      ? 'bg-primary-50 text-primary-600'
                      : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {mode.icon}
                  <div>
                    <p className="font-medium text-sm">{mode.label}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{mode.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 ${getHeaderBgClass()} border-r z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`h-16 flex items-center justify-between px-6 ${isDark ? 'border-gray-700' : isSepia ? 'border-amber-200' : 'border-gray-200'} border-b`}>
          <div className="flex items-center">
            <BookOpen className="text-primary-600" size={28} />
            <h1 className={`ml-3 text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Reader</h1>
          </div>

          {/* 主题切换按钮 - 桌面端 */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-600'}`}
              title="切换主题"
            >
              <Palette size={18} />
            </button>
            {showThemeMenu && (
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : isSepia ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'} py-2 z-50`}>
                {themeModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => changeTheme(mode.value)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      themeMode === mode.value
                        ? 'bg-primary-50 text-primary-600'
                        : isDark
                        ? 'text-gray-300 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {mode.icon}
                    <div>
                      <p className="font-medium text-sm">{mode.label}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{mode.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="p-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : isSepia
                  ? 'bg-amber-100 border-amber-200 text-amber-900 placeholder-amber-500'
                  : 'border border-gray-200'
              }`}
            />
          </div>
        </form>

        {/* Add button */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setImportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            添加文章
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-primary-900/30 text-primary-400'
                      : 'bg-primary-50 text-primary-600'
                    : isDark
                    ? 'text-gray-300 hover:bg-gray-700'
                    : isSepia
                    ? 'text-amber-800 hover:bg-amber-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Version */}
        <div className={`absolute bottom-4 left-0 right-0 px-6 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          AI Reader v3.0
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className={`lg:ml-64 pt-16 lg:pt-0 min-h-screen ${isDark ? 'bg-gray-900 text-gray-100' : isSepia ? 'bg-amber-50 text-amber-900' : ''}`}>
        <Outlet />
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}
