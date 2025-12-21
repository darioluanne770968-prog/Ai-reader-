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
  language TEXT DEFAULT 'zh',
  translated_content TEXT,
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
  golden_quotes TEXT,
  auto_tags TEXT,
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
  next_review_at TEXT,
  review_count INTEGER DEFAULT 0,
  easiness_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  is_auto INTEGER DEFAULT 0,
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

-- 阅读统计表
CREATE TABLE IF NOT EXISTS reading_stats (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  articles_read INTEGER DEFAULT 0,
  total_reading_time INTEGER DEFAULT 0,
  highlights_created INTEGER DEFAULT 0,
  words_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 阅读会话表（记录每次阅读）
CREATE TABLE IF NOT EXISTS reading_sessions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER DEFAULT 0,
  start_progress REAL DEFAULT 0,
  end_progress REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 文章关联表（知识图谱）
CREATE TABLE IF NOT EXISTS article_links (
  id TEXT PRIMARY KEY,
  source_article_id TEXT NOT NULL,
  target_article_id TEXT NOT NULL,
  link_type TEXT DEFAULT 'related',
  strength REAL DEFAULT 0.5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (target_article_id) REFERENCES articles(id) ON DELETE CASCADE,
  UNIQUE(source_article_id, target_article_id)
);

-- AI写作草稿表
CREATE TABLE IF NOT EXISTS writing_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_article_ids TEXT,
  source_highlights TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 分享链接表
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  article_id TEXT,
  highlight_ids TEXT,
  share_type TEXT DEFAULT 'article',
  is_public INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Webhook配置表
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  secret TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 用户设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_favorite ON articles(is_favorite);
CREATE INDEX IF NOT EXISTS idx_highlights_article_id ON highlights(article_id);
CREATE INDEX IF NOT EXISTS idx_highlights_next_review ON highlights(next_review_at);
CREATE INDEX IF NOT EXISTS idx_summaries_article_id ON summaries(article_id);
CREATE INDEX IF NOT EXISTS idx_reading_stats_date ON reading_stats(date);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_article ON reading_sessions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_source ON article_links(source_article_id);
CREATE INDEX IF NOT EXISTS idx_article_links_target ON article_links(target_article_id);

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

-- 对话式阅读历史表
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 思维导图表
CREATE TABLE IF NOT EXISTS mindmaps (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  data TEXT NOT NULL,
  layout TEXT DEFAULT 'tree',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 事实核查表
CREATE TABLE IF NOT EXISTS fact_checks (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  claim TEXT NOT NULL,
  verdict TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  sources TEXT,
  explanation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 双向链接笔记表
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  article_id TEXT,
  is_daily INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- 笔记链接表（双向链接）
CREATE TABLE IF NOT EXISTS note_links (
  id TEXT PRIMARY KEY,
  source_note_id TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  link_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  UNIQUE(source_note_id, target_note_id)
);

-- Zettelkasten卡片表
CREATE TABLE IF NOT EXISTS zettel_cards (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  card_type TEXT DEFAULT 'permanent',
  source_id TEXT,
  source_type TEXT,
  parent_id TEXT,
  sequence TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES zettel_cards(id) ON DELETE SET NULL
);

-- 卡片链接表
CREATE TABLE IF NOT EXISTS zettel_links (
  id TEXT PRIMARY KEY,
  source_card_id TEXT NOT NULL,
  target_card_id TEXT NOT NULL,
  link_type TEXT DEFAULT 'reference',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_card_id) REFERENCES zettel_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (target_card_id) REFERENCES zettel_cards(id) ON DELETE CASCADE
);

-- 知识问答历史表
CREATE TABLE IF NOT EXISTS knowledge_qa (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_article_ids TEXT,
  source_note_ids TEXT,
  confidence REAL DEFAULT 0.5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 学习路径表
CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL,
  difficulty TEXT DEFAULT 'intermediate',
  estimated_hours INTEGER DEFAULT 0,
  progress REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 学习路径节点表
CREATE TABLE IF NOT EXISTS learning_path_nodes (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL,
  article_id TEXT,
  external_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  node_order INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- 阅读小组表
CREATE TABLE IF NOT EXISTS reading_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_private INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  created_by TEXT DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 小组成员表
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE
);

-- 协作标注表
CREATE TABLE IF NOT EXISTS collaborative_annotations (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Anonymous',
  annotation_type TEXT DEFAULT 'highlight',
  content TEXT NOT NULL,
  comment TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE
);

-- 阅读挑战表
CREATE TABLE IF NOT EXISTS reading_challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT DEFAULT 'articles',
  target_value INTEGER DEFAULT 0,
  current_value INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  is_completed INTEGER DEFAULT 0,
  reward_badge TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 挑战打卡记录表
CREATE TABLE IF NOT EXISTS challenge_checkins (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL,
  value INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES reading_challenges(id) ON DELETE CASCADE
);

-- AI播客表
CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  speakers TEXT DEFAULT '["主持人A", "主持人B"]',
  style TEXT DEFAULT 'conversational',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 专注会话表
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  article_id TEXT,
  session_type TEXT DEFAULT 'pomodoro',
  duration_minutes INTEGER DEFAULT 25,
  break_minutes INTEGER DEFAULT 5,
  ambient_sound TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  is_completed INTEGER DEFAULT 0,
  distractions_blocked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- 邮件订阅表
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  folder TEXT DEFAULT 'inbox',
  is_newsletter INTEGER DEFAULT 0,
  last_summary TEXT,
  last_summarized_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 智能收件箱表
CREATE TABLE IF NOT EXISTS smart_inbox (
  id TEXT PRIMARY KEY,
  source_type TEXT DEFAULT 'email',
  source_id TEXT,
  title TEXT NOT NULL,
  preview TEXT,
  priority TEXT DEFAULT 'normal',
  reading_type TEXT DEFAULT 'quick',
  estimated_time INTEGER DEFAULT 5,
  is_processed INTEGER DEFAULT 0,
  processed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 阅读DNA画像表
CREATE TABLE IF NOT EXISTS reading_profile (
  id TEXT PRIMARY KEY,
  profile_type TEXT NOT NULL,
  data TEXT NOT NULL,
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 情绪追踪表
CREATE TABLE IF NOT EXISTS emotion_tracking (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  emotion TEXT NOT NULL,
  intensity REAL DEFAULT 0.5,
  trigger_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 引用管理表
CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  citation_key TEXT NOT NULL UNIQUE,
  authors TEXT,
  title TEXT NOT NULL,
  publication TEXT,
  year INTEGER,
  doi TEXT,
  url TEXT,
  citation_type TEXT DEFAULT 'article',
  bibtex TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 生成内容表
CREATE TABLE IF NOT EXISTS generated_content (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_ids TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  format TEXT DEFAULT 'markdown',
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 图片分析表
CREATE TABLE IF NOT EXISTS image_analyses (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  extracted_text TEXT,
  chart_data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 概念词典表
CREATE TABLE IF NOT EXISTS concept_dictionary (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  simple_explanation TEXT,
  examples TEXT,
  related_terms TEXT,
  difficulty_level TEXT DEFAULT 'intermediate',
  source_article_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- 遗忘曲线数据表
CREATE TABLE IF NOT EXISTS forgetting_curve (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  retention_rate REAL DEFAULT 1.0,
  last_reviewed_at TEXT,
  next_optimal_review TEXT,
  review_history TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 用户徽章表
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT NOT NULL,
  condition_value INTEGER DEFAULT 0,
  earned_at TEXT,
  is_earned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建新索引
CREATE INDEX IF NOT EXISTS idx_chat_history_article ON chat_history(article_id);
CREATE INDEX IF NOT EXISTS idx_notes_article ON notes(article_id);
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);
CREATE INDEX IF NOT EXISTS idx_zettel_cards_parent ON zettel_cards(parent_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_nodes ON learning_path_nodes(path_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_collab_annotations_article ON collaborative_annotations(article_id);
CREATE INDEX IF NOT EXISTS idx_challenge_checkins ON challenge_checkins(challenge_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_article ON focus_sessions(article_id);
CREATE INDEX IF NOT EXISTS idx_citations_article ON citations(article_id);
CREATE INDEX IF NOT EXISTS idx_emotion_tracking_article ON emotion_tracking(article_id);
CREATE INDEX IF NOT EXISTS idx_image_analyses_article ON image_analyses(article_id);
CREATE INDEX IF NOT EXISTS idx_forgetting_curve_item ON forgetting_curve(item_type, item_id);

-- 笔记全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, content, note_id UNINDEXED
);

-- 卡片全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS zettel_fts USING fts5(
  title, content, card_id UNINDEXED
);

-- 初始化默认设置
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('theme', 'light'),
  ('font_size', '16'),
  ('font_family', 'system'),
  ('line_height', '1.8'),
  ('tts_voice', 'default'),
  ('tts_rate', '1.0'),
  ('review_enabled', 'true'),
  ('daily_review_count', '5'),
  ('focus_duration', '25'),
  ('break_duration', '5'),
  ('ambient_sound', 'none'),
  ('auto_fact_check', 'false'),
  ('difficulty_adaptation', 'true'),
  ('reading_goal_daily', '30'),
  ('reading_goal_weekly', '5');

-- 初始化默认徽章
INSERT OR IGNORE INTO badges (id, name, description, icon, condition_type, condition_value) VALUES
  ('first_article', '初次阅读', '阅读第一篇文章', '📖', 'articles_read', 1),
  ('bookworm', '书虫', '阅读10篇文章', '🐛', 'articles_read', 10),
  ('scholar', '学者', '阅读50篇文章', '🎓', 'articles_read', 50),
  ('master', '大师', '阅读100篇文章', '👨‍🎓', 'articles_read', 100),
  ('highlighter', '划线达人', '创建50个高亮', '✨', 'highlights_created', 50),
  ('note_taker', '笔记达人', '创建20个笔记', '📝', 'notes_created', 20),
  ('streak_7', '连续7天', '连续阅读7天', '🔥', 'reading_streak', 7),
  ('streak_30', '连续30天', '连续阅读30天', '💪', 'reading_streak', 30),
  ('speed_reader', '速读者', '单日阅读超过1小时', '⚡', 'daily_reading_time', 60),
  ('deep_thinker', '深度思考者', '完成10次间隔复习', '🧠', 'reviews_completed', 10);
`;
