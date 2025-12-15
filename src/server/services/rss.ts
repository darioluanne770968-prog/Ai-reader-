import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'description']
  }
});

export interface FeedItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  author: string | null;
}

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  items: FeedItem[];
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(url);

    return {
      title: feed.title || 'Unknown Feed',
      description: feed.description || '',
      link: feed.link || url,
      items: (feed.items || []).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        content: item['content:encoded'] || item.content || item.description || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        author: item.creator || item.author || null
      }))
    };
  } catch (error) {
    console.error('RSS parsing error:', error);
    throw new Error('无法解析RSS订阅源');
  }
}
