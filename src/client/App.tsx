import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import FeedsPage from './pages/FeedsPage';
import HighlightsPage from './pages/HighlightsPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import ReviewPage from './pages/ReviewPage';
import WritingPage from './pages/WritingPage';
import GraphPage from './pages/GraphPage';
// 超级高级功能页面
import NotesPage from './pages/NotesPage';
import FocusPage from './pages/FocusPage';
import ChallengePage from './pages/ChallengePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="article/:id" element={<ArticlePage />} />
        <Route path="feeds" element={<FeedsPage />} />
        <Route path="highlights" element={<HighlightsPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="writing" element={<WritingPage />} />
        <Route path="graph" element={<GraphPage />} />
        {/* 超级高级功能 */}
        <Route path="notes" element={<NotesPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="challenges" element={<ChallengePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
