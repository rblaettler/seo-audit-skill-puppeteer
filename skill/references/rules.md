# SEOmator Audit Rules Reference

253 per-page rules + 6 cross-page rules. Full details: [docs/SEO-AUDIT-RULES.md](../../docs/SEO-AUDIT-RULES.md)

## Core SEO (19 rules) — 12% weight

| Rule ID | Thresholds / Notes |
|---------|-------------------|
| `core-title-present` | fail if missing |
| `core-title-length` | warn if <30 or >60 chars |
| `core-description-present` | fail if missing |
| `core-description-length` | warn if <120 or >160 chars |
| `core-canonical-present` | fail if missing |
| `core-canonical-valid` | warn if not absolute or not 200 |
| `core-viewport-present` | fail if missing |
| `core-favicon-present` | warn if missing |
| `core-h1-present` | fail if missing |
| `core-h1-single` | warn if >1 H1 |
| `core-canonical-header` | warn if HTML/Link header mismatch |
| `core-nosnippet` | warn if nosnippet/max-snippet:0 |
| `core-robots-meta` | warn if noindex/nofollow/noarchive |
| `core-title-unique` | warn/fail if duplicate titles (crawl mode) |
| `core-canonical-conflicting` | fail if multiple sources disagree |
| `core-canonical-to-homepage` | warn if deep pages point to homepage |
| `core-canonical-http-mismatch` | warn if protocol differs |
| `core-canonical-loop` | fail if circular canonicals |
| `core-canonical-to-noindex` | fail if canonical targets noindexed page |

## Performance (22 rules) — 12% weight

| Rule ID | Thresholds |
|---------|-----------|
| `cwv-lcp` | pass <2.5s · warn 2.5–4s · fail >4s |
| `cwv-cls` | pass <0.1 · warn 0.1–0.25 · fail >0.25 |
| `cwv-inp` | pass <200ms · warn 200–500ms · fail >500ms — **synthetic measurement** |
| `cwv-ttfb` | pass <800ms · warn 800–1800ms · fail >1800ms |
| `cwv-fcp` | pass <1.8s · warn 1.8–3s · fail >3s |
| `perf-dom-size` | warn >800 nodes · fail >1500 nodes |
| `perf-css-file-size` | warns on large inline CSS or many external CSS files |
| `perf-font-loading` | checks font-display, preload, display=swap |
| `perf-preconnect` | warns if missing preconnect to critical 3rd parties |
| `perf-render-blocking` | warns on sync scripts in `<head>` |
| `perf-lazy-above-fold` | warns on lazy-loaded above-fold images |
| `perf-lcp-hints` | warns if LCP element missing preload/fetchpriority |
| `perf-text-compression` | checks gzip/brotli on text resources |
| `perf-brotli` | checks Brotli over gzip |
| `perf-cache-policy` | validates Cache-Control on static assets |
| `perf-minify-css` | checks CSS files are minified |
| `perf-minify-js` | checks JS files are minified |
| `perf-response-time` | warns >800ms · fail >2000ms |
| `perf-http2` | warns if not HTTP/2 or HTTP/3 |
| `perf-page-weight` | warns >3MB total |
| `perf-js-file-size` | warns on large individual JS files |
| `perf-video-for-animations` | suggests `<video>` over animated GIF |

## Links (19 rules) — 8% weight

| Rule ID | Notes |
|---------|-------|
| `links-broken-internal` | fail if 4xx/5xx |
| `links-external-valid` | warn if unreachable |
| `links-internal-present` | warn if no internal links |
| `links-nofollow-appropriate` | validates nofollow usage |
| `links-anchor-text` | warns on "click here", "read more" etc. |
| `links-depth` | warn if >3 clicks from homepage |
| `links-dead-end-pages` | warn if no outgoing internal links |
| `links-https-downgrade` | warn if HTTPS page links to HTTP |
| `links-external-count` | warn if >100 external links |
| `links-invalid` | warns on empty/javascript:/malformed hrefs |
| `links-tel-mailto` | validates tel: and mailto: format |
| `links-redirect-chains` | warn 1–2 hops · fail 3+ hops |
| `links-orphan-pages` | info — pages with no incoming links |
| `links-localhost` | fail if localhost/127.0.0.1 links |
| `links-local-file` | fail if file:// links |
| `links-broken-fragment` | warn if #anchor has no matching ID |
| `links-excessive` | warn if too many total links |
| `links-onclick` | warn if onclick used for navigation |
| `links-whitespace-href` | warn on leading/trailing whitespace in href |

## Images (14 rules) — 8% weight

| Rule ID | Notes |
|---------|-------|
| `images-alt-present` | fail if missing alt |
| `images-alt-quality` | warn on generic alt text |
| `images-dimensions` | warn if no width/height |
| `images-lazy-loading` | warn if below-fold images not lazy |
| `images-modern-format` | warn if not WebP/AVIF |
| `images-size` | warn >200KB per image |
| `images-responsive` | warn if no srcset |
| `images-filename-quality` | warn on generic filenames |
| `images-lazy-above-fold` | see perf section |
| `images-figure-captions` | checks figcaption in figure elements |
| `images-inline-svg-size` | warns on oversized inline SVGs |
| `images-picture-element` | checks picture/source/srcset usage |
| `images-alt-length` | warns on excessively long alt text |
| `images-background-seo` | warns on CSS background for content images |

## Security (16 rules) — 8% weight

| Rule ID | Notes |
|---------|-------|
| `security-https` | fail if not HTTPS |
| `security-https-redirect` | fail if HTTP→HTTPS redirect missing |
| `security-hsts` | warn if no HSTS header |
| `security-csp` | warn if no CSP header |
| `security-x-frame-options` | warn if missing |
| `security-x-content-type-options` | warn if missing nosniff |
| `security-mixed-content` | warn/fail if HTTP resources on HTTPS page |
| `security-referrer-policy` | checks Referrer-Policy header |
| `security-permissions-policy` | checks Permissions-Policy header |
| `security-ssl-expiry` | warns if SSL cert expires soon |
| `security-ssl-protocol` | warns if TLS <1.2 |
| `security-form-https` | fail if forms submit to HTTP |
| `security-password-http` | fail if password fields on HTTP |
| `security-leaked-secrets` | checks for API keys/tokens in HTML |
| `security-external-links-security` | checks rel="noopener noreferrer" |
| `security-http-refresh` | warns on meta refresh redirects |

## Technical SEO (13 rules) — 7% weight

| Rule ID | Notes |
|---------|-------|
| `technical-robots-txt-exists` | fail if 404 |
| `technical-robots-txt-valid` | fail if invalid syntax |
| `technical-sitemap-exists` | fail if no sitemap.xml |
| `technical-sitemap-valid` | fail if invalid XML |
| `technical-sitemap-in-robotstxt` | warn if not referenced |
| `technical-sitemap-domain` | warn if sitemap URL mismatches domain |
| `technical-sitemap-url-limit` | warn if >50,000 URLs |
| `technical-sitemap-size-limit` | warn if >50MB |
| `technical-sitemap-duplicate-urls` | warns on duplicate sitemap entries |
| `technical-sitemap-orphan-urls` | warns on sitemap URLs not in crawl |
| `technical-url-structure` | checks hyphens, lowercase |
| `technical-trailing-slash` | consistent trailing slash |
| `technical-www-redirect` | www/non-www consistency |

## Crawlability (18 rules) — 5% weight

| Rule ID | Notes |
|---------|-------|
| `crawl-404-page` | checks custom 404 |
| `crawl-4xx-non-404` | warns on 410, 403 etc. |
| `crawl-server-error` | fail on 5xx |
| `crawl-noindex-mismatch` | warns if sitemap/robots conflict with noindex |
| `crawl-indexability-conflict` | detects conflicting indexability signals |
| `crawl-schema-noindex-conflict` | rich results schema on noindexed pages |
| `crawl-http-https-duplicate` | warns on www/http duplicate content |
| `crawl-robots-meta` | see core section |
| `crawl-crawl-delay` | warns on excessive crawl-delay |
| `crawl-noindex-in-sitemap` | warns on noindexed pages in sitemap |
| `crawl-soft-404` | detects soft 404 pages |
| `crawl-timeout` | warns on slow/timing-out pages |
| `crawl-javascript-redirect` | detects JS-based redirects |
| `crawl-meta-refresh` | detects meta refresh |
| `crawl-interstitials` | warns on intrusive interstitials |
| `crawl-internal-search` | warns on faceted/search URLs in crawl |
| `crawl-session-ids` | warns on session IDs in URLs |
| `crawl-bad-content-type` | warns on non-HTML content-type |

## Structured Data (14 rules) — 5% weight

| Rule ID | Notes |
|---------|-------|
| `schema-present` | warn if no JSON-LD |
| `schema-valid` | fail if invalid JSON |
| `schema-type` | warn if no @type |
| `schema-required-fields` | warn if missing required properties |
| `schema-article` | validates Article/BlogPosting |
| `schema-breadcrumb` | checks BreadcrumbList on non-homepage |
| `schema-faq` | validates FAQPage structure |
| `schema-local-business` | validates LocalBusiness |
| `schema-organization` | validates Organization |
| `schema-product` | validates Product |
| `schema-review` | validates Review/AggregateRating |
| `schema-video` | validates VideoObject |
| `schema-website-search` | checks sitelinks searchbox |
| `schema-deprecated` | **new** — detects HowTo, FAQPage, BookAction, SpecialAnnouncement, ClaimReview (no longer generate rich results) |

## Content (18 rules) — 5% weight

| Rule ID | Thresholds |
|---------|-----------|
| `content-word-count` | pass ≥300 · warn 100–299 · fail <100 |
| `content-reading-level` | optimal 60–70 Flesch-Kincaid |
| `content-keyword-stuffing` | warns on >3% keyword density |
| `content-article-links` | checks link-to-content ratio |
| `content-broken-html` | detects malformed HTML |
| `content-meta-in-body` | fail if meta tags in body |
| `content-mime-type` | validates Content-Type header |
| `content-duplicate-description` | warns on duplicate descriptions |
| `content-heading-hierarchy` | warns on skipped heading levels |
| `content-heading-length` | warns <3 or >100 chars |
| `content-heading-unique` | warns on duplicate headings |
| `content-text-html-ratio` | warns on low text-to-code ratio |
| `content-title-same-as-h1` | warns if title = H1 |
| `content-title-pixel-width` | warns if >580px (SERP truncation) |
| `content-description-pixel-width` | warns if >920px (SERP truncation) |
| `content-duplicate-exact` | fail if pages share identical content |
| `content-duplicate-near` | warn if near-duplicate content |
| `content-freshness` | **new** — warns if most recent date signal >12 months old; checks JSON-LD dateModified, OG article:modified_time, Last-Modified header |

## JavaScript Rendering (13 rules) — 5% weight

| Rule ID | Notes |
|---------|-------|
| `js-rendered-title` | fail if title requires JS |
| `js-rendered-description` | warn if description requires JS |
| `js-rendered-h1` | fail if H1 requires JS |
| `js-rendered-canonical` | fail if canonical requires JS |
| `js-canonical-mismatch` | fail if JS changes canonical |
| `js-noindex-mismatch` | fail if JS changes noindex |
| `js-title-modified` | warn if JS modifies title |
| `js-description-modified` | warn if JS modifies description |
| `js-h1-modified` | warn if JS modifies H1 |
| `js-rendered-content` | warn if main content JS-only |
| `js-rendered-links` | warn if internal links JS-only |
| `js-blocked-resources` | warn if JS/CSS blocked by robots.txt |
| `js-ssr-check` | warn/fail if no SSR detected |

## Accessibility (12 rules) — 4% weight

| Rule ID | Notes |
|---------|-------|
| `a11y-aria-labels` | ARIA labels on interactive elements |
| `a11y-color-contrast` | WCAG color contrast |
| `a11y-focus-visible` | visible focus indicators |
| `a11y-form-labels` | all form inputs have labels |
| `a11y-horizontal-scroll` | no horizontal scroll on mobile |
| `a11y-landmark-regions` | semantic landmark regions |
| `a11y-link-text` | descriptive link text |
| `a11y-skip-link` | skip-to-content link present |
| `a11y-table-headers` | data tables have headers |
| `a11y-touch-targets` | touch target size ≥44px |
| `a11y-video-captions` | video elements have captions |
| `a11y-zoom-disabled` | user-scalable=no not used |

## Social (9 rules) — 3% weight

| Rule ID | Notes |
|---------|-------|
| `social-og-title` | og:title present |
| `social-og-description` | og:description present |
| `social-og-image` | og:image with valid URL |
| `social-og-image-size` | og:image dimensions recommended |
| `social-og-url` | og:url present |
| `social-og-url-canonical` | og:url matches canonical |
| `social-twitter-card` | twitter:card present |
| `social-share-buttons` | social sharing buttons present |
| `social-social-profiles` | schema.org sameAs social links |

## E-E-A-T (14 rules) — 3% weight

| Rule ID | Notes |
|---------|-------|
| `eeat-about-page` | About page accessible from nav |
| `eeat-contact-page` | Contact page with methods |
| `eeat-author-expertise` | Author bio and credentials |
| `eeat-author-byline` | Author byline on articles |
| `eeat-citations` | External citations and references |
| `eeat-affiliate-disclosure` | Affiliate link disclosure |
| `eeat-physical-address` | Physical address in schema |
| `eeat-privacy-policy` | Privacy policy linked |
| `eeat-terms-of-service` | Terms of service linked |
| `eeat-editorial-policy` | Editorial/review policy |
| `eeat-trust-signals` | Trust badges, certificates |
| `eeat-disclaimers` | Medical/financial/legal disclaimers |
| `eeat-ymyl-detection` | Your Money/Your Life detection |
| `eeat-content-dates` | Date signals on articles |

## URL Structure (14 rules) — 3% weight

| Rule ID | Notes |
|---------|-------|
| `url-slug-keywords` | Meaningful words in URL path |
| `url-stop-words` | Stop words in URL |
| `url-uppercase` | Lowercase URLs |
| `url-underscores` | Hyphens vs underscores |
| `url-non-ascii` | ASCII-only URLs |
| `url-spaces` | No spaces in URLs |
| `url-double-slash` | No double slashes |
| `url-parameters` | Query parameter usage |
| `url-tracking-params` | UTM/tracking params in canonical |
| `url-protocol-relative` | No protocol-relative URLs |
| `url-repetitive-path` | Repeated path segments |
| `url-case-normalization` | Consistent URL casing |
| `url-length` | URL length check |
| `url-url-structure` | Overall URL structure quality |

## Redirects (8 rules) — 3% weight

| Rule ID | Notes |
|---------|-------|
| `redirect-chains` | warn 1–2 hops · fail 3+ hops |
| `redirect-loop` | fail on redirect loops |
| `redirect-type` | prefer 301 over 302 for permanent redirects |
| `redirect-broken` | fail on redirect to 4xx/5xx |
| `redirect-to-http` | warn if redirect goes HTTP→HTTPS backward |
| `redirect-resource` | static resources should not redirect |
| `redirect-rendered-canonical` | JS canonical vs initial canonical |
| `redirect-pagination-broken` | pagination redirect issues |

## Mobile (5 rules) — 2% weight

| Rule ID | Notes |
|---------|-------|
| `mobile-font-size` | minimum 16px body text |
| `mobile-viewport-width` | no fixed-width viewport |
| `mobile-responsive` | responsive layout check |
| `mobile-horizontal-scroll` | no horizontal overflow |
| `mobile-touch-targets` | see accessibility section |

## Internationalization (10 rules) — 2% weight

| Rule ID | Notes |
|---------|-------|
| `i18n-lang-attribute` | HTML lang attribute present |
| `i18n-hreflang` | hreflang tags valid |
| `i18n-hreflang-conflicting` | conflicting hreflang signals |
| `i18n-hreflang-lang-mismatch` | hreflang lang vs content language |
| `i18n-hreflang-multiple-methods` | multiple hreflang implementation methods |
| `i18n-hreflang-return-links` | all hreflang URLs link back |
| `i18n-hreflang-to-broken` | hreflang pointing to 4xx |
| `i18n-hreflang-to-noindex` | hreflang pointing to noindexed page |
| `i18n-hreflang-to-non-canonical` | hreflang pointing to non-canonical |
| `i18n-hreflang-to-redirect` | hreflang pointing to redirect |

## HTML Validation (9 rules) — 2% weight

| Rule ID | Notes |
|---------|-------|
| `htmlval-missing-doctype` | fail if no DOCTYPE |
| `htmlval-missing-charset` | fail if no charset |
| `htmlval-invalid-head` | fail if invalid head elements |
| `htmlval-noscript-in-head` | warns on noscript in head |
| `htmlval-multiple-heads` | warns on multiple head elements |
| `htmlval-size-limit` | warn if HTML >5MB |
| `htmlval-lorem-ipsum` | fail if Lorem ipsum found |
| `htmlval-multiple-titles` | fail if multiple title tags |
| `htmlval-multiple-descriptions` | fail if multiple descriptions |

## AI/GEO Readiness (6 rules) — 2% weight

| Rule ID | Notes |
|---------|-------|
| `geo-semantic-html` | semantic HTML5 elements |
| `geo-content-structure` | structured content for AI extraction |
| `geo-ai-bot-access` | **13 bots checked:** GPTBot, ChatGPT-User, Google-Extended, CCBot, anthropic-ai, Claude-Web, Bytespider, PerplexityBot, Amazonbot, OAI-SearchBot, cohere-ai, Meta-ExternalAgent, DuckAssistBot |
| `geo-llms-txt` | **fetches** `/llms.txt` and `/.well-known/llms.txt` — pass if file found and non-empty |
| `geo-schema-drift` | schema.org content matches visible page |
| `geo-ai-plugin-json` | **new** — fetches `/.well-known/ai-plugin.json`; pass if valid JSON |

## Legal Compliance (1 rule) — 1% weight

| Rule ID | Notes |
|---------|-------|
| `legal-cookie-consent` | cookie consent mechanism detected |

---

## Cross-Page Analysis (6 rules — separate scoring)

Run after full site crawl. `combinedScore = 0.70 × avgPageScore + 0.30 × siteScore`

| Rule ID | Weight | Notes |
|---------|--------|-------|
| `cross-page/broken-internal-links` | 25 | 4xx/5xx internal links across site |
| `cross-page/duplicate-titles` | 20 | identical titles across pages |
| `cross-page/orphan-pages` | 20 | pages with no incoming links |
| `cross-page/link-graph-health` | 15 | avg links/page, dead-end ratio |
| `cross-page/canonical-conflicts` | 15 | conflicting canonicals site-wide |
| `cross-page/sitemap-coverage` | 20 | sitemap vs crawled URL gap analysis |
