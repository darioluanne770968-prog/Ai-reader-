import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import ImportModal from './ImportModal';

const navItems = [
  { to: '/', icon: BookOpen, label: '阅读列表' },
  { to: '/review', icon: Brain, label: '间隔复习' },
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
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b z-50 flex items-center px-4`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100'}`}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="ml-4 text-xl font-bold text-primary-600">AI Reader</h1>
        <button
          onClick={toggleDarkMode}
          className={`ml-auto p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`h-16 flex items-center justify-between px-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
          <div className="flex items-center">
            <BookOpen className="text-primary-600" size={28} />
            <h1 className={`ml-3 text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AI Reader</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg hidden lg:block ${darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="p-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
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
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700'
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
        <div className={`absolute bottom-4 left-0 right-0 px-6 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          AI Reader v2.0
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
      <main className={`lg:ml-64 pt-16 lg:pt-0 min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : ''}`}>
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
