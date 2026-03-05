# Content Extraction Feature

## Overview

The browser-search module now supports full content extraction from web pages, in addition to search results. This handles JS-heavy sites properly using Playwright and extracts clean, readable content using Mozilla Readability.

## Features

- **Direct content extraction** from any URL
- **Automatic extraction** when searching (extract content from top N results)
- **Clean extraction** strips ads, navigation, and other clutter
- **Markdown or HTML output** (markdown by default)
- **Handles JS-heavy sites** properly (SPAs, dynamic content)
- **Configurable timeouts** and result limits
- **Error handling** per-result (one failure doesn't break others)

## API Usage

### Core Module

```javascript
import { extractContent, search } from './core/browser-search.js';

// Direct content extraction
const content = await extractContent('https://example.com/article', {
  markdown: true,      // Return markdown (default: true)
  timeout: 15000,      // Navigation timeout in ms (default: 15000)
  browser: null,       // Optional: reuse browser instance
});

console.log(content);
// {
//   url: 'https://example.com/article',
//   title: 'Article Title',
//   content: '# Article Title\n\nArticle content...',
//   contentLength: 1234,
//   extractedAt: '2024-01-01T12:00:00.000Z',
//   author: 'John Doe',        // Optional
//   siteName: 'Example Site',  // Optional
// }

// Search with automatic content extraction
const results = await search('query', {
  count: 5,
  fetchContent: true,    // Enable content extraction
  contentLimit: 3,       // Extract from top 3 results (default: all)
  markdown: true,        // Return markdown (default: true)
});

console.log(results.results[0].content);
// Same structure as extractContent() result
```

### HTTP API

```bash
# Search with content extraction
curl "http://localhost:3099/search?q=playwright&fetchContent=true&contentLimit=3"

# Parameters:
# - fetchContent=true     Enable content extraction
# - contentLimit=3        Extract from top N results (optional)
# - markdown=true         Return markdown (default: true)
```

### MCP Server

```json
{
  "name": "browser_search",
  "arguments": {
    "query": "playwright automation",
    "count": 5,
    "fetch_content": true,
    "content_limit": 3,
    "markdown": true
  }
}
```

### OpenClaw Tool

```javascript
import { webSearch } from './wrappers/openclaw-tool.js';

const results = await webSearch({
  query: 'test query',
  count: 5,
  fetchContent: true,
  contentLimit: 3,
  markdown: true,
});

// Results include content field when fetchContent=true
console.log(results.web.results[0].content);
```

## Testing

Run the full test suite (includes content extraction tests):

```bash
npm test
```

Run the content extraction demo:

```bash
node test/demo-content-extraction.js
```

## Tested Sites

The feature has been tested on:

- ✅ **Wikipedia** - Works great, clean extraction
- ✅ **CNN** - Works with warnings (CSS parse errors are harmless)
- ✅ **Google Trends** - Works but limited content (SPA)
- ✅ **GitHub** - Works great
- ✅ **Medium articles** - Works great
- ✅ **News sites** - Most work well

## Error Handling

When extraction fails for a result, the result includes an error object:

```javascript
{
  title: "Page Title",
  url: "https://example.com",
  snippet: "...",
  content: {
    error: "Failed to extract article content - page may not be an article",
    url: "https://example.com",
    extractedAt: "2024-01-01T12:00:00.000Z"
  }
}
```

This ensures one failed extraction doesn't break the entire search.

## Performance Considerations

- Content extraction adds ~1-3 seconds per URL (waits for JS to render)
- Use `contentLimit` to extract from only top N results
- Consider reusing browser instance for multiple extractions
- Extraction runs in parallel for search results

## Limitations

- Some sites block automated access (rare)
- SPAs with no server-side rendering may have limited content
- Extremely JS-heavy sites may timeout (increase timeout if needed)
- Some sites require cookies/login (not supported yet)

## Dependencies

- `@mozilla/readability` - Article extraction
- `jsdom` - DOM parsing for Readability
- `turndown` - HTML to Markdown conversion
- `playwright` - Browser automation (already required)
