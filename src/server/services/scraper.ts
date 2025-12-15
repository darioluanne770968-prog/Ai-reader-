import * as cheerio from 'cheerio';

interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  author: string | null;
  siteName: string | null;
  imageUrl: string | null;
  wordCount: number;
  readingTime: number;
}

export async function scrapeUrl(url: string): Promise<ScrapedArticle> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AIReader/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 移除不需要的元素
  $('script, style, nav, header, footer, aside, .ads, .advertisement, .sidebar, .comments').remove();

  // 提取标题
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('h1').first().text() ||
    $('title').text() ||
    'Untitled';

  // 提取作者
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text() ||
    $('.author').first().text() ||
    null;

  // 提取网站名称
  const siteName =
    $('meta[property="og:site_name"]').attr('content') ||
    new URL(url).hostname.replace('www.', '');

  // 提取图片
  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('article img').first().attr('src') ||
    null;

  // 提取主要内容
  let content = '';
  const articleSelectors = ['article', '[role="main"]', '.post-content', '.article-content', '.entry-content', '.content', 'main'];

  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text().trim();
      break;
    }
  }

  // 如果没有找到文章内容，使用body
  if (!content) {
    content = $('body').text().trim();
  }

  // 清理内容
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 提取HTML内容（保留格式）
  let htmlContent = '';
  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      htmlContent = element.html() || '';
      break;
    }
  }

  if (!htmlContent) {
    htmlContent = $('body').html() || '';
  }

  // 计算字数和阅读时间
  const wordCount = content.length;
  const readingTime = Math.ceil(wordCount / 500); // 假设每分钟500字

  // 生成摘要
  const excerpt = content.substring(0, 200).trim() + (content.length > 200 ? '...' : '');

  return {
    url,
    title: title.trim(),
    content: htmlContent || content,
    excerpt,
    author: author?.trim() || null,
    siteName,
    imageUrl,
    wordCount,
    readingTime
  };
}
