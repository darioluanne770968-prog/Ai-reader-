export interface Article {
  id: string;
  url: string | null;
  title: string;
  content: string;
  excerpt: string;
  author: string | null;
  site_name: string | null;
  image_url: string | null;
  word_count: number;
  reading_time: number;
  is_read: number;
  is_favorite: number;
  read_progress: number;
  scroll_position: number;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  tags: string | null;
  highlights?: Highlight[];
  summary?: Summary;
}

export interface Highlight {
  id: string;
  article_id: string;
  text: string;
  note: string | null;
  color: string;
  start_offset: number | null;
  end_offset: number | null;
  created_at: string;
}

export interface Summary {
  id: string;
  article_id: string;
  summary: string;
  key_points: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  article_count?: number;
  created_at: string;
}

export interface Feed {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  site_url: string | null;
  icon_url: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface QAItem {
  id: string;
  article_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export type FilterStatus = 'all' | 'unread' | 'read' | 'favorite';
