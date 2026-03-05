# Quick Start: Content Extraction

## 🚀 TL;DR

The browser-search module now extracts full article content from web pages!

## Usage

### JavaScript API

```javascript
import { search, extractContent } from './core/browser-search.js';

// Extract content from a URL
const article = await extractContent('https://example.com/article');
console.log(article.content); // Clean markdown text

// Search + extract content from top 3 results
const results = await search('my query', {
  fetchContent: true,
  contentLimit: 3,
});
console.log(results.results[0].content.content); // Article text
```

### HTTP API

```bash
# Start server
npm run serve

# Search with content extraction
curl "http://localhost:3099/search?q=playwright&fetchContent=true&contentLimit=3"
```

### OpenClaw Tool

```javascript
import { webSearch } from './wrappers/openclaw-tool.js';

const results = await webSearch({
  query: 'playwright',
  fetchContent: true,
  contentLimit: 3,
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetchContent` | boolean | `false` | Enable content extraction |
| `contentLimit` | number | (all) | Extract from top N results |
| `markdown` | boolean | `true` | Return markdown instead of HTML |
| `timeout` | number | `15000` | Navigation timeout (ms) |

## What You Get

```javascript
{
  url: "https://example.com/article",
  title: "Article Title",
  content: "# Title\n\nClean article text...",
  contentLength: 1234,
  extractedAt: "2024-01-01T12:00:00.000Z",
  author: "John Doe",        // Optional
  siteName: "Example Site"   // Optional
}
```

## Examples

See:
- `test/demo-content-extraction.js` - Interactive demo
- `test/cli-example.sh` - CLI examples
- `CONTENT_EXTRACTION.md` - Full documentation

## Run Tests

```bash
npm test
```

All 8 tests should pass ✅

## What Works

- ✅ Wikipedia articles
- ✅ News sites (CNN, etc.)
- ✅ Technical blogs
- ✅ GitHub pages
- ✅ Most article-based sites
- ✅ JS-heavy sites (SPAs)

## Performance

- ~1-3 seconds per URL
- Parallel extraction (multiple URLs at once)
- Browser instance reuse supported

That's it! 🎉
