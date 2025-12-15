import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import FeedsPage from './pages/FeedsPage';
import HighlightsPage from './pages/HighlightsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="article/:id" element={<ArticlePage />} />
        <Route path="feeds" element={<FeedsPage />} />
        <Route path="highlights" element={<HighlightsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
