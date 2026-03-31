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
  bing: {
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=10`,
    parse: parseBing,
  },
};

/**
 * Handle Google's EU cookie consent wall.
 * Navigates to consent.google.com first and accepts all cookies,
 * then returns so the actual search can proceed with cookies set.
 */
async function handleGoogleConsent(page) {
  try {
    // Navigate to Google first to trigger consent
    await page.goto('https://www.google.com/', { waitUntil: 'load', timeout: 10000 });

    // Check for consent form — multiple possible selectors across EU regions
    const consentSelectors = [
      'button#L2AGLb',                    // "Accept all" on consent.google.com
      'button[aria-label="Accept all"]',
      'button:has-text("Accept all")',
      'button:has-text("Alle akzeptieren")', // German
      'button:has-text("Tout accepter")',    // French
      'button:has-text("Accepteer alles")',  // Dutch
      'form[action*="consent"] button',
      '#yDmH0d button',                     // Consent dialog button container
    ];

    for (const selector of consentSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(1000);
          return; // Consent accepted
        }
      } catch {}
    }

    // Fallback: try to set the consent cookie directly
    await page.context().addCookies([{
      name: 'SOCS',
      value: 'CAISHAgBEhJnd3NfMjAyNDA1MTUtMF9SQzEaAmRlIAEaBgiA_LmzBg',
      domain: '.google.com',
      path: '/',
    }, {
      name: 'CONSENT',
      value: 'PENDING+987',
      domain: '.google.com',
      path: '/',
    }]);
  } catch (err) {
    // Non-fatal — search may still work without consent in some regions
  }
}

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
 * Parse Bing search results page
 * @param {import('playwright').Page} page
 * @param {number} count
 * @returns {Promise<Array<{title:string, url:string, snippet:string}>>}
 */
async function parseBing(page, count) {
  return page.evaluate((max) => {
    const results = [];
    const seen = new Set();
    const items = document.querySelectorAll('#b_results .b_algo');
    for (const item of items) {
      if (results.length >= max) break;
      const h2 = item.querySelector('h2');
      const a = h2 ? h2.querySelector('a') : null;
      if (!a) continue;
      let url = a.href;
      // Decode Bing redirect URLs (/ck/a?...&u=a1<base64>&...)
      if (url.includes('/ck/a') && url.includes('&u=a1')) {
        try {
          const encoded = url.split('&u=a1')[1].split('&')[0];
          url = decodeURIComponent(atob(encoded));
        } catch {}
      }
      if (!url || !url.startsWith('http') || seen.has(url)) continue;
      seen.add(url);
      const title = a.textContent.trim();
      const snippetEl = item.querySelector('.b_caption p, .b_lineclamp2');
      const snippet = snippetEl ? snippetEl.textContent.trim() : '';
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
    engine: engineName = 'bing',
    headless = true,
    timeout = 15000,
    browser: externalBrowser = null,
    fetchContent = false,
    contentLimit,
    markdown = true,
  } = options;

  // Auto-fallback: if a specific engine is requested, try it first, then fallback to others
  const FALLBACK_ORDER = { google: ['google', 'bing'], bing: ['bing', 'google'], duckduckgo: ['duckduckgo', 'bing'] };
  const engines = engineName === 'all'
    ? ['google', 'bing', 'duckduckgo']
    : (FALLBACK_ORDER[engineName] || [engineName]);

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

      // Pre-set Google consent cookies to bypass EU consent wall
      if (eng === 'google') {
        await context.addCookies([
          { name: 'SOCS', value: 'CAISHAgBEhJnd3NfMjAyNDA1MTUtMF9SQzEaAmRlIAEaBgiA_LmzBg', domain: '.google.com', path: '/' },
          { name: 'CONSENT', value: 'YES+cb.20240515-04-p0.en+FX+', domain: '.google.com', path: '/' },
        ]);
      }

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
