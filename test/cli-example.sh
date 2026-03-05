#!/bin/bash
# Example CLI usage for content extraction

echo "=== Browser Search with Content Extraction ==="
echo ""

echo "1. Basic search (no content extraction):"
echo ""
node wrappers/openclaw-tool.js "playwright automation" | jq '.web.results[] | {title, url, description}'
echo ""

echo "2. Search with content extraction:"
echo ""
node -e "
import { webSearch, close } from './wrappers/openclaw-tool.js';
const results = await webSearch({
  query: 'playwright browser automation',
  count: 3,
  fetchContent: true,
  contentLimit: 2,
  markdown: true
});
console.log(JSON.stringify(results, null, 2));
await close();
" | jq '.web.results[] | {title, url, hasContent: (.content != null), contentLength: .content.contentLength}'
echo ""

echo "3. Direct content extraction:"
echo ""
node -e "
import { extractContent } from './core/browser-search.js';
const content = await extractContent('https://playwright.dev/', { markdown: true });
console.log('Title:', content.title);
console.log('Length:', content.contentLength, 'chars');
console.log('Preview:', content.content.substring(0, 200) + '...');
"
echo ""

echo "=== HTTP API Examples ==="
echo ""
echo "Start the server:"
echo "  npm run serve"
echo ""
echo "Then test:"
echo "  curl 'http://localhost:3099/search?q=playwright&fetchContent=true&contentLimit=2'"
