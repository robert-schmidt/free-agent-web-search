/**
 * HTTP API Wrapper for Browser Search
 * GET /search?q=<query>&count=<num>&engine=<duckduckgo|google>
 */

import express from 'express';
import { createSearcher } from '../core/browser-search.js';

const PORT = process.env.PORT || 3099;
const app = express();
const searcher = createSearcher();

app.get('/search', async (req, res) => {
  const { 
    q, 
    query, 
    count = '5', 
    engine = 'google',
    fetchContent,
    contentLimit,
    markdown = 'true',
  } = req.query;
  const searchQuery = q || query;

  if (!searchQuery) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    const result = await searcher.search(searchQuery, {
      count: Math.min(parseInt(count) || 5, 20),
      engine,
      fetchContent: fetchContent === 'true',
      contentLimit: contentLimit ? parseInt(contentLimit) : undefined,
      markdown: markdown !== 'false',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = app.listen(PORT, () => {
  console.log(`[browser-search] HTTP API listening on :${PORT}`);
});

process.on('SIGINT', async () => {
  await searcher.close();
  server.close();
});

export default app;
