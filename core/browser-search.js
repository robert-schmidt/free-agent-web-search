/**
 * Core Browser Search Module
 * ZERO LLM calls - pure deterministic HTML parsing
 * 
 * Searches DuckDuckGo via Playwright and extracts structured results.
 * Falls back to Google if DDG fails.
 */

import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const ENGINES = {
  duckduckgo: {
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&t=h_&ia=web`,
    parse: parseDDG,
  },
  google: {
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&num=10&hl=en`,
    parse: parseGoogle,
  },
};

/**
 * Parse DuckDuckGo HTML results page
 * @param {import('playwright').Page} page
 * @param {number} count
 * @returns {Promise<Array<{title:string, url:string, snippet:string}>>}
 */
async function parseDDG(page, count) {
  // Wait for results to render (DDG JS app)
  try {
    await page.waitForSelector('[data-testid="result"], .react-results--main article, .result', { timeout: 8000 });
  } catch {}
  
  return page.evaluate((max) => {
    const results = [];
    
    // Try modern DDG selectors
    const items = document.querySelectorAll('[data-testid="result"], .react-results--main article, .result');
    for (const item of items) {
      if (results.length >= max) break;
      const linkEl = item.querySelector('a[href^="http"]');
      const titleEl = item.querySelector('h2, .result__a');
      const snippetEl = item.querySelector('[data-result="snippet"], .result__snippet, span:not(:has(a))');
      if (!linkEl || !titleEl) continue;
      const title = titleEl.textContent.trim();
      let url = linkEl.getAttribute('href') || '';
      if (url.includes('uddg=')) {
        try { url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]); } catch {}
      }
      if (!url.startsWith('http')) continue;
      const snippet = snippetEl ? snippetEl.textContent.trim() : '';
      if (title) results.push({ title, url, snippet });
    }
    return results;
  }, count);
}

/**
 * Parse Google search results page
 * @param {import('playwright').Page} page
 * @param {number} count
 * @returns {Promise<Array<{title:string, url:string, snippet:string}>>}
 */
async function parseGoogle(page, count) {
  return page.evaluate((max) => {
    const results = [];
    const seen = new Set();
    // Strategy: find all h3 in #search, walk up to find link + snippet
    const h3s = document.querySelectorAll('#search h3, #rso h3');
    for (const h3 of h3s) {
      if (results.length >= max) break;
      const a = h3.closest('a');
      if (!a) continue;
      const url = a.href;
      if (!url || !url.startsWith('http') || seen.has(url)) continue;
      seen.add(url);
      const title = h3.textContent.trim();
      // Find snippet: walk up to the result block, look for .VwiC3b or long text div
      let snippet = '';
      let container = a;
      for (let i = 0; i < 6; i++) {
        container = container.parentElement;
        if (!container) break;
      }
      if (container) {
        const snipEl = container.querySelector('.VwiC3b, [data-sncf], .IsZvec');
        if (snipEl) snippet = snipEl.textContent.trim();
      }
      if (title) results.push({ title, url, snippet });
    }
    return results;
  }, count);
}

/**
 * Extract clean content from a URL using Readability
 * 
 * @param {string} url - URL to extract content from
 * @param {Object} [options]
 * @param {boolean} [options.markdown=true] - Return markdown instead of HTML
 * @param {number} [options.timeout=15000] - Navigation timeout in ms
 * @param {import('playwright').Browser} [options.browser] - Reuse existing browser instance
 * @returns {Promise<{url:string, title:string, content:string, contentLength:number, extractedAt:string, author?:string, siteName?:string}>}
 */
export async function extractContent(url, options = {}) {
  const {
    markdown = true,
    timeout = 15000,
    browser: externalBrowser = null,
  } = options;

  let browser = externalBrowser;
  let ownsBrowser = false;

  try {
    if (!browser) {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
      });
      ownsBrowser = true;
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout,
      });

      // Wait a bit for JS-heavy pages to render
      await page.waitForTimeout(1500);

      // Get the page HTML
      const html = await page.content();

      // Parse with Readability
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to extract article content - page may not be an article or is too complex');
      }

      let content = article.content;

      // Convert to markdown if requested
      if (markdown) {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
        });
        content = turndownService.turndown(content);
      }

      return {
        url,
        title: article.title || '',
        content,
        contentLength: content.length,
        extractedAt: new Date().toISOString(),
        ...(article.byline && { author: article.byline }),
        ...(article.siteName && { siteName: article.siteName }),
      };
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    if (ownsBrowser && browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Search the web using browser automation.
 * 
 * @param {string} query - Search query
 * @param {Object} [options]
 * @param {number} [options.count=5] - Number of results to return
 * @param {string} [options.engine='duckduckgo'] - Search engine ('duckduckgo' | 'google')
 * @param {boolean} [options.headless=true] - Run browser headless
 * @param {number} [options.timeout=15000] - Navigation timeout in ms
 * @param {import('playwright').Browser} [options.browser] - Reuse existing browser instance
 * @param {boolean} [options.fetchContent=false] - Extract full content from results
 * @param {number} [options.contentLimit] - Number of results to extract content from (defaults to all)
 * @param {boolean} [options.markdown=true] - Return content as markdown (if fetchContent=true)
 * @returns {Promise<{query:string, engine:string, results:Array<{title:string,url:string,snippet:string,content?:Object}>, timestamp:string}>}
 */
export async function search(query, options = {}) {
  const {
    count = 5,
    engine: engineName = 'google',
    headless = true,
    timeout = 15000,
    browser: externalBrowser = null,
    fetchContent = false,
    contentLimit,
    markdown = true,
  } = options;

  const engines = engineName === 'all'
    ? ['duckduckgo', 'google']
    : [engineName];

  let browser = externalBrowser;
  let ownsBrowser = false;

  try {
    if (!browser) {
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
      });
      ownsBrowser = true;
    }

    for (const eng of engines) {
      const config = ENGINES[eng];
      if (!config) continue;

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      try {
        await page.goto(config.url(query), {
          waitUntil: 'load',
          timeout,
        });

        const results = await config.parse(page, count);

        if (results.length > 0) {
          const finalResults = results.slice(0, count);

          // Extract content if requested
          if (fetchContent) {
            const limit = contentLimit !== undefined ? contentLimit : finalResults.length;
            const resultsToExtract = finalResults.slice(0, limit);

            // Extract content in parallel with error handling for each
            const contentPromises = resultsToExtract.map(async (result) => {
              try {
                const extracted = await extractContent(result.url, {
                  markdown,
                  timeout,
                  browser,
                });
                return { ...result, content: extracted };
              } catch (err) {
                // If extraction fails, include error but keep the result
                return { 
                  ...result, 
                  content: { 
                    error: err.message,
                    url: result.url,
                    extractedAt: new Date().toISOString(),
                  }
                };
              }
            });

            const extractedResults = await Promise.all(contentPromises);
            
            // Replace the results that had content extracted
            for (let i = 0; i < extractedResults.length; i++) {
              finalResults[i] = extractedResults[i];
            }
          }

          return {
            query,
            engine: eng,
            results: finalResults,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        // Try next engine (silent fallback)
        // Error will be returned if all engines fail
      } finally {
        await context.close().catch(() => {});
      }
    }

    // All engines failed
    return {
      query,
      engine: 'none',
      results: [],
      timestamp: new Date().toISOString(),
      error: 'All search engines failed to return results',
    };
  } finally {
    if (ownsBrowser && browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Create a persistent searcher that reuses one browser instance.
 * Call .close() when done.
 */
export function createSearcher(options = {}) {
  let browser = null;
  const { headless = true } = options;

  return {
    async search(query, opts = {}) {
      if (!browser) {
        browser = await chromium.launch({
          headless,
          args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
        });
      }
      return search(query, { ...opts, browser });
    },
    async close() {
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
      }
    },
  };
}

export default { search, createSearcher, extractContent };
