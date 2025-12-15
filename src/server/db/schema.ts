export const schema = `
-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  url TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author TEXT,
  site_name TEXT,
  image_url TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  read_progress REAL DEFAULT 0,
  scroll_position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT
);

-- AI摘要表
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- AI问答表
CREATE TABLE IF NOT EXISTS qa_history (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 高亮表
CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT,
  color TEXT DEFAULT 'yellow',
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 文章标签关联表
CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- RSS订阅源表
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  site_url TEXT,
  icon_url TEXT,
  last_fetched_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_favorite ON articles(is_favorite);
CREATE INDEX IF NOT EXISTS idx_highlights_article_id ON highlights(article_id);
CREATE INDEX IF NOT EXISTS idx_summaries_article_id ON summaries(article_id);

-- 全文搜索虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, content, article_id UNINDEXED
);

-- 触发器：文章插入时同步到FTS
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(article_id, title, content) VALUES (NEW.id, NEW.title, NEW.content);
END;

-- 触发器：文章更新时同步到FTS
CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  DELETE FROM articles_fts WHERE article_id = OLD.id;
  INSERT INTO articles_fts(article_id, title, content) VALUES (NEW.id, NEW.title, NEW.content);
END;

-- 触发器：文章删除时同步到FTS
CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  DELETE FROM articles_fts WHERE article_id = OLD.id;
END;
`;
