/**
 * Demo: Content Extraction Feature
 * Shows the new fetchContent capability
 */

import { search, extractContent } from '../core/browser-search.js';

console.log('=== Content Extraction Demo ===\n');

// Demo 1: Direct content extraction
console.log('1. Direct content extraction from Wikipedia:');
try {
  const content = await extractContent('https://en.wikipedia.org/wiki/Playwright', {
    markdown: true,
  });
  console.log(`   Title: ${content.title}`);
  console.log(`   Author: ${content.author || 'N/A'}`);
  console.log(`   Content length: ${content.contentLength} chars`);
  console.log(`   Extracted at: ${content.extractedAt}`);
  console.log(`   Preview: ${content.content.substring(0, 200)}...\n`);
} catch (e) {
  console.log(`   Error: ${e.message}\n`);
}

// Demo 2: Search with automatic content extraction
console.log('2. Search with automatic content extraction:');
try {
  const results = await search('playwright browser automation', {
    count: 3,
    engine: 'google',
    fetchContent: true,
    contentLimit: 2, // Only extract content from top 2 results
    markdown: true,
  });
  
  console.log(`   Query: "${results.query}"`);
  console.log(`   Engine: ${results.engine}`);
  console.log(`   Total results: ${results.results.length}\n`);
  
  results.results.forEach((result, i) => {
    console.log(`   Result ${i + 1}:`);
    console.log(`     Title: ${result.title}`);
    console.log(`     URL: ${result.url}`);
    console.log(`     Snippet: ${result.snippet.substring(0, 100)}...`);
    if (result.content) {
      if (result.content.error) {
        console.log(`     Content: ❌ ${result.content.error}`);
      } else {
        console.log(`     Content: ✅ ${result.content.contentLength} chars extracted`);
        console.log(`     Preview: ${result.content.content.substring(0, 150)}...`);
      }
    } else {
      console.log(`     Content: Not extracted (beyond contentLimit)`);
    }
    console.log('');
  });
} catch (e) {
  console.log(`   Error: ${e.message}\n`);
}

// Demo 3: Extract from CNN article
console.log('3. Extract from CNN (JS-heavy site):');
try {
  const content = await extractContent('https://edition.cnn.com/2024/01/01/tech/tech-trends-2024/index.html', {
    markdown: true,
    timeout: 20000,
  });
  console.log(`   Title: ${content.title}`);
  console.log(`   Content length: ${content.contentLength} chars`);
  console.log(`   Site: ${content.siteName || 'N/A'}`);
  console.log(`   Preview: ${content.content.substring(0, 200)}...\n`);
} catch (e) {
  console.log(`   Error (expected for some articles): ${e.message}\n`);
}

console.log('=== Demo Complete ===');
process.exit(0);
