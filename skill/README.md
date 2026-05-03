# SEOmator Audit Skill for Claude Code

A Claude Code skill for running comprehensive SEO audits and providing actionable recommendations.

## What This Skill Does

When you ask Claude to audit a website, this skill:

1. **Runs the SEOmator CLI or REST API** with appropriate options
2. **Parses the JSON results** to identify issues
3. **Evaluates findings** by severity and category
4. **Provides recommendations** with specific fixes
5. **Prioritizes actions** based on SEO impact

## Capabilities

- **253 SEO Rules** across 20 categories
- **6 Cross-Page Rules** run after full site crawl (broken links, duplicate titles, orphan pages, link graph, canonical conflicts, sitemap coverage)
- **Core Web Vitals** measurement (LCP, CLS, FCP, TTFB, INP — INP via synthetic click simulation)
- **Multi-page crawling** via REST API with async job queue and cross-page analysis
- **AI/GEO Readiness** — checks 13 AI bots, fetches llms.txt, validates ai-plugin.json
- **Actionable fixes** for every issue found

## Categories Analyzed

| Category | Weight | What It Checks |
|----------|--------|----------------|
| Core SEO | 12% | Title, description, canonical, H1, viewport |
| Performance | 12% | LCP, CLS, FCP, TTFB, INP (synthetic), DOM size, render-blocking |
| Links | 8% | Broken links, anchor text, depth, redirect chains |
| Images | 8% | Alt text, dimensions, lazy loading, modern formats |
| Security | 8% | HTTPS, HSTS, CSP, mixed content, SSL |
| Technical SEO | 7% | robots.txt, sitemap, status codes, URL structure |
| Crawlability | 5% | Indexability, pagination, sitemap conflicts |
| Structured Data | 5% | JSON-LD validation, schema types, deprecated schemas |
| Content | 5% | Word count, readability, headings, duplicates, freshness |
| JavaScript Rendering | 5% | SSR validation, JS-injected SEO elements |
| Accessibility | 4% | WCAG, ARIA, keyboard navigation |
| Social | 3% | Open Graph, Twitter Cards |
| E-E-A-T | 3% | Trust signals, author expertise, citations |
| URL Structure | 3% | Slug keywords, stop words, formatting |
| Redirects | 3% | Types, chains, loops |
| Mobile | 2% | Font size, viewport, horizontal scroll |
| Internationalization | 2% | Language, hreflang |
| HTML Validation | 2% | DOCTYPE, charset, head structure |
| AI/GEO Readiness | 2% | 13 AI bots, llms.txt, ai-plugin.json, schema drift |
| Legal Compliance | 1% | Cookie consent |

## Example Prompts

```
"Run an SEO audit on https://example.com"
"Audit https://mysite.com and tell me what to fix first"
"Check the SEO health of https://example.com with a 20-page crawl"
"What SEO issues does https://example.com have?"
```

## Installation

The skill will guide Claude to install the CLI if needed:

```bash
npm install -g @seomator/seo-audit
npx playwright install chromium
```

## Output

Claude will provide:

- **Overall Score** (0-100)
- **Category Breakdown** with individual scores
- **Priority Fixes** sorted by impact
- **Specific Instructions** for each issue

## Links

- **npm**: https://www.npmjs.com/package/@seomator/seo-audit
- **GitHub**: https://github.com/seo-skills/seo-audit-skill
- **Web UI**: https://seomator.com/free-seo-audit-tool
