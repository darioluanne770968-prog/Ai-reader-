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

  // 提取封面图（增强版）
  let imageUrl: string | null = null;

  // 1. 首先尝试 Open Graph 和 Twitter Card
  imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:url"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image:src"]').attr('content') ||
    null;

  // 2. 如果没有，尝试查找文章中的主图
  if (!imageUrl) {
    // 查找 figure 标签中的图片（通常是主图）
    const figureImg = $('article figure img, .post-content figure img, .article-content figure img').first();
    if (figureImg.length) {
      imageUrl = figureImg.attr('src') || figureImg.attr('data-src') || null;
    }
  }

  // 3. 查找带有特定类名的图片
  if (!imageUrl) {
    const featuredImg = $('.featured-image img, .post-thumbnail img, .article-image img, .hero-image img, .cover-image img').first();
    if (featuredImg.length) {
      imageUrl = featuredImg.attr('src') || featuredImg.attr('data-src') || null;
    }
  }

  // 4. 查找文章中第一张足够大的图片
  if (!imageUrl) {
    const articleImages = $('article img, .post-content img, .article-content img, .entry-content img, main img');
    for (let i = 0; i < articleImages.length; i++) {
      const img = articleImages.eq(i);
      const src = img.attr('src') || img.attr('data-src');
      const width = parseInt(img.attr('width') || '0', 10);
      const height = parseInt(img.attr('height') || '0', 10);

      // 跳过太小的图片（图标、表情等）
      if (src && !src.includes('emoji') && !src.includes('icon') && !src.includes('avatar')) {
        // 如果有尺寸信息，检查是否足够大
        if (width && height) {
          if (width >= 200 && height >= 150) {
            imageUrl = src;
            break;
          }
        } else {
          // 没有尺寸信息，使用第一张非图标图片
          imageUrl = src;
          break;
        }
      }
    }
  }

  // 5. 处理相对路径
  if (imageUrl && !imageUrl.startsWith('http')) {
    try {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).href;
    } catch {
      imageUrl = null;
    }
  }

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
