/**
 * OpenClaw Tool Wrapper - Drop-in replacement for web_search (Brave Search)
 * Same input/output format as the Brave Search tool.
 * 
 * Usage: 
 *   import { webSearch } from './openclaw-tool.js';
 *   const results = await webSearch({ query: 'test', count: 5 });
 */

import { createSearcher } from '../core/browser-search.js';

let _searcher = null;
function getSearcher() {
  if (!_searcher) _searcher = createSearcher();
  return _searcher;
}

/**
 * Drop-in replacement for OpenClaw's web_search tool.
 * Matches the Brave Search API input/output format.
 * 
 * @param {Object} params
 * @param {string} params.query - Search query string
 * @param {number} [params.count=5] - Number of results (1-10)
 * @param {string} [params.country] - Ignored (compatibility)
 * @param {string} [params.search_lang] - Ignored (compatibility)
 * @param {string} [params.freshness] - Ignored (compatibility)
 * @param {boolean} [params.fetchContent=false] - Extract full content from results
 * @param {number} [params.contentLimit] - Number of results to extract content from
 * @param {boolean} [params.markdown=true] - Return content as markdown (if fetchContent=true)
 * @returns {Promise<{web:{results:Array<{title:string,url:string,description:string,content?:Object}>}}>}
 */
export async function webSearch(params) {
  const { 
    query, 
    count = 5,
    fetchContent = false,
    contentLimit,
    markdown = true,
  } = params;

  const searcher = getSearcher();
  const raw = await searcher.search(query, {
    count: Math.min(count || 5, 10),
    engine: 'google',
    fetchContent,
    contentLimit,
    markdown,
  });

  // Format to match Brave Search API output structure
  return {
    query: raw.query,
    web: {
      results: raw.results.map((r, i) => ({
        title: r.title,
        url: r.url,
        description: r.snippet,
        // Extra fields Brave includes
        meta_url: { hostname: new URL(r.url).hostname },
        age: '',
        language: '',
        family_friendly: true,
        // Include extracted content if available
        ...(r.content && { content: r.content }),
      })),
    },
    // Metadata
    _source: 'browser-search',
    _engine: raw.engine,
    _timestamp: raw.timestamp,
  };
}

/**
 * Cleanup - call when done
 */
export async function close() {
  if (_searcher) {
    await _searcher.close();
    _searcher = null;
  }
}

// CLI mode: run directly with query as argument
if (process.argv[1] && process.argv[1].endsWith('openclaw-tool.js') && process.argv[2]) {
  const query = process.argv.slice(2).join(' ');
  webSearch({ query, count: 5 })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      return close();
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}

export default { webSearch, close };
