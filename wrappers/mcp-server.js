/**
 * MCP Server Wrapper for Browser Search
 * Exposes browser_search as an MCP tool over stdio JSON-RPC.
 */

import { createSearcher } from '../core/browser-search.js';
import { createInterface } from 'readline';

const searcher = createSearcher();

const TOOL_DEF = {
  name: 'browser_search',
  description: 'Search the web using browser automation. Returns titles, URLs, and snippets. Can optionally extract full content from result pages.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Number of results (1-20)', default: 5 },
      engine: { type: 'string', enum: ['duckduckgo', 'google'], default: 'duckduckgo' },
      fetch_content: { type: 'boolean', description: 'Extract full content from result pages', default: false },
      content_limit: { type: 'number', description: 'Number of results to extract content from (defaults to all)' },
      markdown: { type: 'boolean', description: 'Return content as markdown (if fetch_content=true)', default: true },
    },
    required: ['query'],
  },
};

function jsonrpc(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function jsonrpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handleRequest(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return jsonrpc(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'browser-search', version: '1.0.0' },
      });

    case 'tools/list':
      return jsonrpc(id, { tools: [TOOL_DEF] });

    case 'tools/call': {
      const { name, arguments: args } = params;
      if (name !== 'browser_search') {
        return jsonrpcError(id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const result = await searcher.search(args.query, {
          count: args.count || 5,
          engine: args.engine || 'duckduckgo',
          fetchContent: args.fetch_content || false,
          contentLimit: args.content_limit,
          markdown: args.markdown !== false,
        });
        return jsonrpc(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        return jsonrpc(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'notifications/initialized':
      return null; // no response needed

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}

// Stdio transport
const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  try {
    const msg = JSON.parse(line);
    const response = await handleRequest(msg);
    if (response) {
      process.stdout.write(response + '\n');
    }
  } catch (err) {
    process.stderr.write(`[mcp-error] ${err.message}\n`);
  }
});

process.on('SIGINT', async () => {
  await searcher.close();
  process.exit(0);
});
