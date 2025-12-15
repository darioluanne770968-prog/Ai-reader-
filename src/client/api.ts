import type { Article, Tag, Feed, Highlight, QAItem, FilterStatus } from './types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  // 检查是否是下载响应
  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('text/markdown') || contentType?.includes('application/json')) {
    if (response.headers.get('Content-Disposition')?.includes('attachment')) {
      return response as unknown as T;
    }
  }

  return response.json();
}

// Articles API
export const articlesApi = {
  getAll: (params?: { status?: FilterStatus; tag?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return request<Article[]>(`/articles${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request<Article>(`/articles/${id}`),

  import: (url: string) =>
    request<{ id: string; message: string }>('/articles/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  create: (data: { title: string; content: string; url?: string; author?: string }) =>
    request<{ id: string; message: string }>('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Pick<Article, 'is_read' | 'is_favorite' | 'read_progress' | 'scroll_position'>>) =>
    request<{ message: string }>(`/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/articles/${id}`, { method: 'DELETE' }),

  generateSummary: (id: string) =>
    request<{ id: string; summary: string; key_points: string[] }>(`/articles/${id}/summary`, {
      method: 'POST',
    }),

  askQuestion: (id: string, question: string) =>
    request<{ id: string; question: string; answer: string }>(`/articles/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  getQAHistory: (id: string) => request<QAItem[]>(`/articles/${id}/qa-history`),
};

// Highlights API
export const highlightsApi = {
  getAll: () => request<(Highlight & { article_title: string })[]>('/highlights'),

  getByArticle: (articleId: string) => request<Highlight[]>(`/highlights/article/${articleId}`),

  create: (data: { article_id: string; text: string; note?: string; color?: string; start_offset?: number; end_offset?: number }) =>
    request<Highlight>('/highlights', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { note?: string; color?: string }) =>
    request<{ message: string }>(`/highlights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/highlights/${id}`, { method: 'DELETE' }),
};

// Tags API
export const tagsApi = {
  getAll: () => request<Tag[]>('/tags'),

  create: (data: { name: string; color?: string }) =>
    request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; color?: string }) =>
    request<{ message: string }>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/tags/${id}`, { method: 'DELETE' }),

  addToArticle: (articleId: string, tagName: string) =>
    request<{ message: string }>(`/tags/article/${articleId}`, {
      method: 'POST',
      body: JSON.stringify({ tag_name: tagName }),
    }),

  removeFromArticle: (articleId: string, tagId: string) =>
    request<{ message: string }>(`/tags/article/${articleId}/${tagId}`, {
      method: 'DELETE',
    }),
};

// Feeds API
export const feedsApi = {
  getAll: () => request<Feed[]>('/feeds'),

  add: (url: string) =>
    request<Feed & { items_count: number }>('/feeds', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  refresh: (id: string) =>
    request<{ message: string; imported_count: number }>(`/feeds/${id}/refresh`, {
      method: 'POST',
    }),

  refreshAll: () =>
    request<{ message: string; imported_count: number }>('/feeds/refresh-all', {
      method: 'POST',
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/feeds/${id}`, { method: 'DELETE' }),
};

// Export API
export const exportApi = {
  articleMarkdown: (id: string) => `${API_BASE}/export/article/${id}/markdown`,
  articleJson: (id: string) => `${API_BASE}/export/article/${id}/json`,
  highlightsMarkdown: () => `${API_BASE}/export/highlights/markdown`,
  allData: () => `${API_BASE}/export/all`,
};

// Health check
export const healthCheck = () =>
  request<{ status: string; timestamp: string; ai_configured: boolean }>('/health');
