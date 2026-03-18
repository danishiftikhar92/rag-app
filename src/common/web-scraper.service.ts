import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);

  async scrapeUrl(url: string): Promise<{ text: string; title: string; metadata: Record<string, any> }> {
    this.logger.log(`Scraping URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; RAGBot/1.0; +https://github.com/rag-app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 30000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $(
      'script, style, nav, footer, header, aside, iframe, noscript, .advertisement, .ads, .cookie-banner, .popup',
    ).remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || url;

    const metaDescription =
      $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';

    // Extract main content
    let mainContent = '';

    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-body',
      '#content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContent = element.text();
        break;
      }
    }

    if (!mainContent) {
      mainContent = $('body').text();
    }

    const cleanText = this.cleanText(mainContent);

    this.logger.log(
      `Scraped "${title}" - ${cleanText.length} characters extracted`,
    );

    return {
      text: cleanText,
      title,
      metadata: {
        url,
        title,
        description: metaDescription,
        keywords: metaKeywords,
        scrapedAt: new Date().toISOString(),
        contentLength: cleanText.length,
      },
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\t/g, ' ')
      .trim();
  }
}
