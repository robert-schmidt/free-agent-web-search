# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes            |
| < 1.0   | ❌ No             |

## 🛡️ Security Features

### Zero External Dependencies (APIs)
- No API keys required
- No data sent to third-party services
- All processing happens locally

### Browser Sandboxing
- Chromium runs with `--no-sandbox` flag (required for most server environments)
- Each search uses an isolated browser context
- Automatic cleanup of browser instances

### Input Validation
- All search queries are properly URL-encoded
- No arbitrary code execution from user inputs
- DOM parsing happens in isolated contexts

### Resource Management
- Configurable timeouts prevent hanging processes
- Automatic browser cleanup on errors
- Graceful shutdown for long-running servers (HTTP/MCP)

## 🚨 Reporting a Vulnerability

**Please do not open public issues for security vulnerabilities.**

### How to Report

1. **Email:** security@openclaw.io (or create a private security advisory on GitHub)
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Initial Response:** Within 48 hours
- **Status Updates:** Every 5-7 days
- **Fix Timeline:** 
  - Critical: 1-7 days
  - High: 7-30 days
  - Medium: 30-90 days
  - Low: Best effort

### Disclosure Policy

- We will coordinate disclosure with you
- Security advisories will be published on GitHub
- Credit will be given to reporters (unless anonymity requested)

## ⚠️ Known Security Considerations

### Rate Limiting
**Issue:** No built-in rate limiting for search engines.

**Impact:** Excessive requests may trigger IP bans from Google/DuckDuckGo.

**Mitigation:** 
- Implement delays in high-volume applications
- Use rotating proxies for production use (see README)
- Monitor request patterns

### Headless Browser Detection
**Issue:** Some sites detect/block headless browsers.

**Impact:** Search results may fail on sites with advanced bot detection.

**Mitigation:**
- We disable automation flags (`--disable-blink-features=AutomationControlled`)
- Use realistic user agents
- Search engines (Google/DDG) generally don't block headless browsers

### DOM Selector Fragility
**Issue:** Search engine DOM changes can break selectors.

**Impact:** Search may return empty results until selectors are updated.

**Mitigation:**
- Selectors are easy to update (community can submit PRs)
- Multiple engines provide redundancy
- Test suite catches breakages quickly

### Content Extraction on Untrusted Sites
**Issue:** Extracting content from malicious sites could expose XSS.

**Impact:** JSDOM/Readability parse HTML, but don't execute JS.

**Mitigation:**
- Content extraction happens in isolated JSDOM (no browser context)
- No JavaScript execution during extraction
- Sanitize output if displaying in web UI

### Resource Exhaustion
**Issue:** Browser instances consume memory.

**Impact:** High-volume use without cleanup can exhaust memory.

**Mitigation:**
- Always call `.close()` on searchers
- Use persistent searchers for multiple queries
- Implement process monitoring in production

## 🔐 Best Practices for Users

### Production Deployments

1. **Resource Limits:**
   ```js
   // Use persistent searcher to limit browser instances
   const searcher = createSearcher();
   try {
     await searcher.search('query');
   } finally {
     await searcher.close();
   }
   ```

2. **Timeouts:**
   ```js
   // Set reasonable timeouts
   await search('query', { timeout: 10000 });
   ```

3. **Rate Limiting (HTTP API):**
   ```js
   import rateLimit from 'express-rate-limit';
   
   app.use('/search', rateLimit({
     windowMs: 60000,
     max: 10
   }));
   ```

4. **Input Validation:**
   ```js
   // Validate query length
   if (query.length > 500) {
     throw new Error('Query too long');
   }
   ```

5. **Error Handling:**
   ```js
   try {
     const results = await search(query);
   } catch (error) {
     // Don't expose internal errors to clients
     console.error('Search failed:', error);
     return { error: 'Search failed' };
   }
   ```

### Docker/Container Security

```dockerfile
# Use non-root user
RUN useradd -m -u 1001 appuser
USER appuser

# Install Chromium dependencies
RUN npx playwright install-deps chromium

# Limit resources
docker run --memory="2g" --cpus="2" browser-search
```

### Environment Variables

```bash
# HTTP API
PORT=3099  # Use non-privileged port

# Optional: Add authentication
API_KEY=your-secret-key
```

## 🔍 Security Audit Checklist

- [x] No hardcoded secrets or credentials
- [x] All dependencies audited (`npm audit` — 0 vulnerabilities)
- [x] Input sanitization via encodeURIComponent
- [x] No arbitrary code execution paths
- [x] Proper error handling (no stack traces to clients)
- [x] Resource cleanup (browsers, contexts)
- [x] Timeout protections
- [x] Isolated browser contexts per search
- [x] No external API calls (zero data exfiltration)
- [x] JSDOM used for extraction (no JS execution)

## 📚 Security Resources

- [Playwright Security](https://playwright.dev/docs/security)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🙏 Credits

We appreciate responsible disclosure from security researchers. Thank you for helping keep Browser Search secure!

---

**Last Updated:** 2026-03-05
