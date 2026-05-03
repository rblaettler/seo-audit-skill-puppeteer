# Introduction

> CLI Website Audits for Humans, Agents & LLMs

A comprehensive SEO audit tool with **253 rules** across **20 categories** that fits into your AI workflow. Built with Node.js, works with your system browser.

## Quick Links

- **npm**: https://www.npmjs.com/package/@seomator/seo-audit
- **GitHub**: https://github.com/seo-skills/seo-audit-skill
- **Web UI**: https://seomator.com/free-seo-audit-tool
- **Skills**: `npx skills add seo-skills/seo-audit-skill`

## Three Ways to Use SEOmator

### CLI for Humans

Run audits directly in your terminal with beautiful, human-readable output:

```bash
seomator audit https://example.com
```

Perfect for:
- Manual audits during development
- Quick site health checks
- Terminal-first workflows

### Pipe to AI

Pipe clean, LLM-optimized output to any AI assistant:

```bash
seomator audit https://example.com --format llm | claude
```

Perfect for:
- Ad-hoc AI assistance with audits
- Custom AI workflows and scripts
- Agents without skill support

### AI Agent Skills

Install the skill for fully autonomous AI workflows:

```bash
npx skills add seo-skills/seo-audit-skill
```

Then prompt your AI agent:

```
Use the seo-audit skill to audit this site and fix all issues
```

Perfect for:
- Autonomous fixing of SEO/accessibility issues
- Multi-step AI workflows with plan mode
- Continuous monitoring and regression detection

## Why SEOmator?

### AI-Native Design
Built for coding agents. LLM-optimized output works seamlessly with Claude Code, Cursor, and any AI assistant.

### Developer-First CLI
npm package with zero config needed. Works with your system Chrome/Chromium for Core Web Vitals.

### 148 Rules, 16 Categories
Comprehensive coverage across SEO, accessibility, performance, security, and E-E-A-T signals.

### Smart Incremental Crawling
SQLite-based storage with content hashing. Skip unchanged pages. Resume interrupted crawls.

### E-E-A-T Auditing
Dedicated rules for Experience, Expertise, Authority, and Trust—Google's top ranking signals.

### Multiple Output Formats
Console, JSON, HTML reports, Markdown, LLM-friendly output. Export exactly what you need.

## Works Where You Work

| Environment | Integration |
|-------------|-------------|
| **Terminal** | Run anywhere with a single command |
| **Claude Code** | Install the seo-audit skill for autonomous workflows |
| **Cursor** | Native skill integration with composer mode |
| **Any AI Agent** | Pipe text/JSON/markdown/llm to any LLM |
| **CI/CD** | Fail pipelines on audit errors with exit codes |
| **Shell Scripts** | Integrate into your automation workflows |

## Rule Categories

SEOmator runs **253 rules** across **20 categories** (+ 6 cross-page rules run after full site crawl):

| Category | Weight | Rules | Description |
|----------|--------|-------|-------------|
| **Core SEO** | 12% | 19 | Meta tags, canonical, H1, indexing directives |
| **Performance** | 12% | 22 | Core Web Vitals + performance optimization hints |
| **Links** | 8% | 19 | Internal/external links, anchor text, validation |
| **Images** | 8% | 14 | Alt text, dimensions, lazy loading, optimization |
| **Security** | 8% | 16 | HTTPS, security headers, mixed content, SSL |
| **Technical SEO** | 7% | 13 | Robots.txt, sitemap, status codes, URL structure |
| **Crawlability** | 5% | 18 | Indexability signals, sitemap conflicts, pagination |
| **Structured Data** | 5% | 14 | JSON-LD, Schema.org markup |
| **Content** | 5% | 18 | Text quality, readability, headings, freshness |
| **JavaScript Rendering** | 5% | 13 | SSR validation, JS-dependent SEO elements |
| **Accessibility** | 4% | 12 | WCAG compliance, ARIA, keyboard navigation |
| **Social** | 3% | 9 | Open Graph, Twitter Cards, social profiles |
| **E-E-A-T** | 3% | 14 | Experience, Expertise, Authority, Trust signals |
| **URL Structure** | 3% | 14 | Slug keywords, formatting, parameters |
| **Redirects** | 3% | 8 | Redirect types, chains, loops |
| **Mobile** | 2% | 5 | Font size, viewport, responsive layout |
| **Internationalization** | 2% | 10 | Language declarations, hreflang validation |
| **HTML Validation** | 2% | 9 | DOCTYPE, charset, head structure |
| **AI/GEO Readiness** | 2% | 6 | Semantic HTML, 13 AI bots, llms.txt, ai-plugin.json |
| **Legal Compliance** | 1% | 1 | Cookie consent |

## Resources

- **GitHub**: https://github.com/seo-skills/seo-audit-skill - View source, report issues, contribute
- **npm**: https://www.npmjs.com/package/@seomator/seo-audit - Package details and versions
- **Website**: https://seomator.com - Learn more about SEOmator
