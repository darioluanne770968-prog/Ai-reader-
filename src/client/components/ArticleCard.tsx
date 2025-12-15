import { Link } from 'react-router-dom';
import { Clock, Star, Check, ExternalLink } from 'lucide-react';
import type { Article } from '../types';
import { articlesApi } from '../api';

interface Props {
  article: Article;
  onUpdate?: () => void;
}

export default function ArticleCard({ article, onUpdate }: Props) {
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await articlesApi.update(article.id, { is_favorite: article.is_favorite ? 0 : 1 });
      onUpdate?.();
    } catch (err) {
      console.error('Toggle favorite failed:', err);
    }
  };

  const toggleRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await articlesApi.update(article.id, { is_read: article.is_read ? 0 : 1 });
      onUpdate?.();
    } catch (err) {
      console.error('Toggle read failed:', err);
    }
  };

  const tags = article.tags?.split(',').filter(Boolean) || [];

  return (
    <Link
      to={`/article/${article.id}`}
      className={`block bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all p-5 ${
        article.is_read ? 'opacity-75' : ''
      }`}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        {article.image_url && (
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-gray-900 line-clamp-2 ${article.is_read ? 'text-gray-600' : ''}`}>
              {article.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={toggleFavorite}
                className={`p-1.5 rounded-lg transition-colors ${
                  article.is_favorite
                    ? 'text-yellow-500 bg-yellow-50'
                    : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                }`}
              >
                <Star size={18} fill={article.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={toggleRead}
                className={`p-1.5 rounded-lg transition-colors ${
                  article.is_read
                    ? 'text-green-500 bg-green-50'
                    : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                }`}
              >
                <Check size={18} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>

          <div className="mt-3 flex items-center flex-wrap gap-2">
            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {article.site_name && (
                <span className="flex items-center gap-1">
                  <ExternalLink size={12} />
                  {article.site_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {article.reading_time} 分钟
              </span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                {tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{tags.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Reading progress */}
          {article.read_progress > 0 && article.read_progress < 100 && (
            <div className="mt-3">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${article.read_progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-1">
                已阅读 {Math.round(article.read_progress)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
