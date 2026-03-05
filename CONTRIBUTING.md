# Contributing to Browser Search

Thank you for considering contributing to Browser Search! This document provides guidelines and instructions for contributing.

## 🌟 Ways to Contribute

- **Bug Reports** — Report issues with search results, content extraction, or integration wrappers
- **Feature Requests** — Suggest new search engines, features, or improvements
- **Code Contributions** — Fix bugs, update selectors, add features
- **Documentation** — Improve README, add examples, write tutorials
- **Testing** — Report edge cases, add test coverage

## 🐛 Reporting Bugs

Before submitting a bug report:
1. Check [existing issues](https://github.com/openclaw/browser-search/issues) to avoid duplicates
2. Test with the latest version
3. Verify Playwright/Chromium is properly installed

**Good bug reports include:**
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Node.js version (`node --version`)
- Playwright version (`npm list playwright`)
- Error messages/stack traces
- Example query that fails

**Example:**

```
Title: Google search returns empty results for query "X"

Description:
When searching for "machine learning", the search returns 0 results.

Steps to reproduce:
1. Run: search('machine learning', { count: 5, engine: 'google' })
2. Results array is empty

Expected: 5 search results
Actual: []

Environment:
- Node.js: v18.17.0
- Playwright: 1.40.0
- OS: Ubuntu 22.04

Error output:
(paste error messages here)
```

## 💡 Suggesting Features

Feature requests are welcome! Please include:
- **Use case** — What problem does this solve?
- **Proposed solution** — How should it work?
- **Alternatives considered** — Other approaches you've thought of

**Examples of good feature requests:**
- Add Bing search engine support
- Support for custom user agents
- Proxy configuration options
- Better error messages

## 🔧 Development Setup

### Prerequisites
- Node.js >= 18.0.0
- Git

### Setup

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/browser-search.git
cd browser-search

# Install dependencies
npm install
npx playwright install chromium

# Run tests to verify setup
npm test
```

## 📝 Code Guidelines

### Style
- **ES Modules** — Use `import`/`export` (not CommonJS)
- **Async/Await** — Prefer over callbacks/raw promises
- **JSDoc Comments** — Document all exported functions
- **Descriptive Names** — `parseDDG()` over `parse1()`
- **Error Handling** — Always handle errors gracefully

### Code Quality Checklist
- [ ] No `console.log` in production code (tests are OK)
- [ ] All async resources properly cleaned up
- [ ] Input validation for user-facing functions
- [ ] JSDoc comments for exported functions
- [ ] Existing tests still pass
- [ ] No hardcoded secrets/credentials
- [ ] No TODO/FIXME in committed code

### Example Function

```js
/**
 * Parse search results from Google HTML
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {number} count - Maximum number of results to extract
 * @returns {Promise<Array<{title:string, url:string, snippet:string}>>}
 */
async function parseGoogle(page, count) {
  // Implementation
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run demo (content extraction examples)
npm run test:demo

# Run specific test file
node test/run-tests.js
```

### Writing Tests

Tests live in `test/`. Add tests for:
- New features
- Bug fixes
- Edge cases

**Example test structure:**

```js
console.log('Test X: Description');
try {
  const result = await yourFunction();
  if (result.isValid) {
    console.log('  ✅ PASS');
    passed++;
  } else {
    console.log('  ❌ FAIL');
    failed++;
  }
} catch (e) {
  console.log(`  ❌ FAIL: ${e.message}`);
  failed++;
}
```

## 🚀 Submitting Changes

### Pull Request Process

1. **Create a branch** for your feature/fix
   ```bash
   git checkout -b fix/google-selector-update
   ```

2. **Make your changes**
   - Follow code guidelines
   - Add/update tests
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "fix: update Google search selectors for new DOM structure"
   ```

   Commit message format:
   - `feat: add Bing search engine support`
   - `fix: handle timeout errors gracefully`
   - `docs: add proxy configuration example`
   - `test: add edge case for empty results`
   - `refactor: simplify content extraction logic`

5. **Push and create PR**
   ```bash
   git push origin fix/google-selector-update
   ```
   Then open a pull request on GitHub.

6. **PR Review**
   - Maintainers will review your code
   - Address feedback if requested
   - Once approved, your PR will be merged!

### Good PR Titles & Descriptions

**Good PR title:**
```
fix: update Google search result selectors (#42)
```

**Good PR description:**
```
## Problem
Google changed their DOM structure, causing search results to return empty arrays.

## Solution
Updated `.querySelectorAll()` selectors in `parseGoogle()` to match new DOM.

## Testing
- [x] Tested with 5 different queries
- [x] All existing tests pass
- [x] Added regression test

Fixes #42
```

## 🔍 Common Contribution Scenarios

### Updating Search Engine Selectors

Search engines change their DOM frequently. When results stop working:

1. **Inspect the page:**
   ```bash
   # Run with headless=false to see browser
   node -e "import('./core/browser-search.js').then(m => m.search('test', {headless: false}))"
   ```

2. **Update selectors** in `core/browser-search.js`:
   - `parseDDG()` for DuckDuckGo
   - `parseGoogle()` for Google

3. **Test thoroughly:**
   ```bash
   npm test
   ```

4. **Submit PR** with clear explanation of what changed.

### Adding a New Search Engine

1. Add engine config to `ENGINES` object:
   ```js
   bing: {
     url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
     parse: parseBing,
   }
   ```

2. Implement `parseBing()` function.

3. Add tests for the new engine.

4. Update README with new engine option.

### Improving Content Extraction

Content extraction uses Mozilla Readability. Improvements:
- Adjust `waitForTimeout` for JS-heavy sites
- Add fallback extraction methods
- Improve markdown conversion (Turndown config)

## 📋 Checklist Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] No console.log in production code
- [ ] JSDoc comments added/updated
- [ ] README updated (if adding features)
- [ ] Commit messages are clear
- [ ] PR description explains the change

## ❓ Questions?

- **Technical questions:** Open a [GitHub Discussion](https://github.com/openclaw/browser-search/discussions)
- **Bug reports:** Open an [Issue](https://github.com/openclaw/browser-search/issues)
- **Security issues:** See [SECURITY.md](SECURITY.md)

## 📜 Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the project
- Accept constructive criticism gracefully

## 🎉 Recognition

Contributors are listed in:
- GitHub contributors page
- Release notes for significant contributions

Thank you for helping make Browser Search better! 🚀
