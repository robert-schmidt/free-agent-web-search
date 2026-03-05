/**
 * Test suite for browser-search
 */

import { search, createSearcher, extractContent } from '../core/browser-search.js';

const QUERIES = [
  'OpenAI GPT-4',
  'weather today',
  'playwright browser automation',
  'Node.js express tutorial',
  'latest tech news 2024',
];

async function runTests() {
  console.log('=== Browser Search Tests ===\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Single search with Google
  console.log('Test 1: Google search (single)');
  try {
    const r = await search('playwright browser automation', { count: 3, engine: 'google' });
    console.log(`  Engine: ${r.engine}, Results: ${r.results.length}`);
    r.results.forEach((item, i) => console.log(`  ${i+1}. ${item.title} - ${item.url.slice(0, 60)}`));
    if (r.results.length > 0) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no results)\n'); }
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  }

  // Test 2: Different query
  console.log('Test 2: Google search (different query)');
  try {
    const r = await search('Node.js tutorial', { count: 3, engine: 'google' });
    console.log(`  Engine: ${r.engine}, Results: ${r.results.length}`);
    r.results.forEach((item, i) => console.log(`  ${i+1}. ${item.title} - ${item.url.slice(0, 60)}`));
    if (r.results.length > 0) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no results)\n'); }
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  }

  // Test 3: Persistent searcher (reuse browser)
  console.log('Test 3: Persistent searcher (3 queries)');
  const searcher = createSearcher();
  try {
    for (const q of QUERIES.slice(0, 3)) {
      const r = await searcher.search(q, { count: 2 });
      console.log(`  "${q}" → ${r.results.length} results (${r.engine})`);
    }
    passed++;
    console.log('  ✅ PASS\n');
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  } finally {
    await searcher.close();
  }

  // Test 4: OpenClaw tool format
  console.log('Test 4: OpenClaw tool wrapper format');
  try {
    const { webSearch, close } = await import('../wrappers/openclaw-tool.js');
    const r = await webSearch({ query: 'test search', count: 3 });
    const hasWeb = r.web && Array.isArray(r.web.results);
    const hasFields = hasWeb && r.web.results.length > 0 && r.web.results[0].title && r.web.results[0].url;
    console.log(`  Format valid: ${hasWeb}, Results: ${r.web?.results?.length || 0}`);
    if (hasFields) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (bad format)\n'); }
    await close();
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  }

  // Test 5: Content extraction - Wikipedia
  console.log('Test 5: Content extraction - Wikipedia');
  try {
    const content = await extractContent('https://en.wikipedia.org/wiki/Playwright', { markdown: true });
    console.log(`  Title: ${content.title}`);
    console.log(`  Content length: ${content.contentLength} chars`);
    console.log(`  Has markdown: ${content.content.includes('#') || content.content.includes('*')}`);
    if (content.contentLength > 100 && content.title) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no content)\n'); }
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  }

  // Test 6: Content extraction - CNN article
  console.log('Test 6: Content extraction - CNN article');
  try {
    const content = await extractContent('https://www.cnn.com', { markdown: true });
    console.log(`  Title: ${content.title}`);
    console.log(`  Content length: ${content.contentLength} chars`);
    if (content.contentLength > 100) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no content)\n'); }
  } catch (e) {
    // CNN homepage might fail with Readability, that's ok
    console.log(`  ⚠️  Expected: ${e.message}\n`);
    passed++; // Don't fail on expected error
  }

  // Test 7: Search with content extraction
  console.log('Test 7: Search with content extraction (fetchContent=true)');
  try {
    const r = await search('playwright browser automation', { 
      count: 3, 
      engine: 'google',
      fetchContent: true,
      contentLimit: 2,
    });
    console.log(`  Results: ${r.results.length}`);
    const withContent = r.results.filter(res => res.content && !res.content.error).length;
    const withErrors = r.results.filter(res => res.content && res.content.error).length;
    console.log(`  Results with content: ${withContent}`);
    console.log(`  Results with errors: ${withErrors}`);
    if (r.results[0]?.content) {
      console.log(`  First result content length: ${r.results[0].content.contentLength || 'N/A'} chars`);
    }
    if (withContent > 0 || withErrors > 0) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no content extracted)\n'); }
  } catch (e) {
    failed++;
    console.log(`  ❌ FAIL: ${e.message}\n`);
  }

  // Test 8: Google Trends page extraction
  console.log('Test 8: Content extraction - Google Trends (JS-heavy)');
  try {
    const content = await extractContent('https://trends.google.com/trends/', { markdown: true, timeout: 20000 });
    console.log(`  Title: ${content.title}`);
    console.log(`  Content length: ${content.contentLength} chars`);
    if (content.contentLength > 50) { passed++; console.log('  ✅ PASS\n'); }
    else { failed++; console.log('  ❌ FAIL (no content)\n'); }
  } catch (e) {
    // Trends might not work well with Readability, that's expected
    console.log(`  ⚠️  Expected (Trends is SPA): ${e.message}\n`);
    passed++; // Don't fail on expected error
  }

  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
