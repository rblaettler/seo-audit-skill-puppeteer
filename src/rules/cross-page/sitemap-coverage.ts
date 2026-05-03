import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'SEOmator-crawler/1.0' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLocUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }
  return urls;
}

function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '');
    // Preserve query strings — sitemaps don't use them, but crawled pages might
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${path}${u.search}`;
  } catch {
    return raw;
  }
}

async function discoverSitemapUrls(origin: string): Promise<{ pageUrls: Set<string>; sitemapFound: boolean }> {
  // Collect candidate sitemap URLs from robots.txt, then fall back to /sitemap.xml
  const candidateSitemaps: string[] = [];

  const robotsTxt = await fetchText(`${origin}/robots.txt`);
  if (robotsTxt) {
    for (const line of robotsTxt.split('\n')) {
      const trimmed = line.trim();
      if (/^sitemap:/i.test(trimmed)) {
        const sitemapUrl = trimmed.replace(/^sitemap:\s*/i, '').trim();
        if (sitemapUrl) candidateSitemaps.push(sitemapUrl);
      }
    }
  }

  if (candidateSitemaps.length === 0) {
    candidateSitemaps.push(`${origin}/sitemap.xml`);
  }

  const pageUrls = new Set<string>();
  let sitemapFound = false;

  for (const sitemapUrl of candidateSitemaps) {
    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;
    sitemapFound = true;

    if (isSitemapIndex(xml)) {
      const subSitemapUrls = extractLocUrls(xml).slice(0, 10);
      const subXmls = await Promise.all(subSitemapUrls.map(u => fetchText(u)));
      for (const subXml of subXmls) {
        if (subXml) {
          for (const url of extractLocUrls(subXml)) pageUrls.add(url);
        }
      }
    } else {
      for (const url of extractLocUrls(xml)) pageUrls.add(url);
    }
  }

  return { pageUrls, sitemapFound };
}

registerCrossPageRule({
  id: 'cross-page/sitemap-coverage',
  name: 'Sitemap Coverage',
  description: 'Compares crawled pages against the sitemap to find uncovered or unlisted URLs.',
  weight: 20,
  async run(pages: CrossPagePageData[]): Promise<CrossPageRuleResult> {
    const rootPage = pages.find(p => p.depth === 0) ?? pages[0];
    if (!rootPage) {
      return {
        ruleId: 'cross-page/sitemap-coverage',
        score: 50,
        status: 'warn',
        message: 'No pages available for sitemap analysis.',
        details: { sitemapFound: false },
      };
    }

    let origin: string;
    try {
      origin = new URL(rootPage.url).origin;
    } catch {
      return {
        ruleId: 'cross-page/sitemap-coverage',
        score: 50,
        status: 'warn',
        message: 'Could not determine site origin for sitemap lookup.',
        details: { sitemapFound: false },
      };
    }

    const { pageUrls: sitemapUrls, sitemapFound } = await discoverSitemapUrls(origin);

    if (!sitemapFound) {
      return {
        ruleId: 'cross-page/sitemap-coverage',
        score: 40,
        status: 'warn',
        message: 'No sitemap found. Submit a sitemap.xml to help search engines discover all pages.',
        details: { sitemapFound: false, sitemapUrlCount: 0 },
      };
    }

    const normalizedSitemapUrls = new Set([...sitemapUrls].map(normalizeUrl));
    const validCrawledPages = pages.filter(p => !p.error);
    const normalizedCrawledUrls = validCrawledPages.map(p => normalizeUrl(p.url));

    const crawledNotInSitemap = normalizedCrawledUrls.filter(u => {
      // Ignore query-string URLs — sitemaps legitimately omit these
      const hasQuery = u.includes('?');
      return !hasQuery && !normalizedSitemapUrls.has(u);
    });

    const crawledSet = new Set(normalizedCrawledUrls);
    const inSitemapButNotCrawled = [...normalizedSitemapUrls].filter(u => !crawledSet.has(u));

    const crawledInSitemap = normalizedCrawledUrls.filter(u => normalizedSitemapUrls.has(u)).length;
    const eligibleCrawled = normalizedCrawledUrls.filter(u => !u.includes('?'));
    const coveragePct =
      eligibleCrawled.length > 0
        ? Math.round((crawledInSitemap / eligibleCrawled.length) * 100)
        : 100;

    const details = {
      sitemapFound: true,
      sitemapUrlCount: sitemapUrls.size,
      crawledUrlCount: validCrawledPages.length,
      crawledInSitemapCount: crawledInSitemap,
      coveragePct,
      crawledNotInSitemap,
      inSitemapButNotCrawled: inSitemapButNotCrawled.slice(0, 50), // cap for response size
      inSitemapButNotCrawledTotal: inSitemapButNotCrawled.length,
    };

    if (crawledNotInSitemap.length === 0) {
      return {
        ruleId: 'cross-page/sitemap-coverage',
        score: 100,
        status: 'pass',
        message: `All ${eligibleCrawled.length} crawled pages are listed in the sitemap (${sitemapUrls.size} total sitemap URLs).`,
        details,
      };
    }

    const missingRatio = crawledNotInSitemap.length / eligibleCrawled.length;
    if (missingRatio < 0.2) {
      return {
        ruleId: 'cross-page/sitemap-coverage',
        score: 70,
        status: 'warn',
        message: `${crawledNotInSitemap.length} crawled page${crawledNotInSitemap.length !== 1 ? 's are' : ' is'} missing from the sitemap (${coveragePct}% coverage).`,
        details,
      };
    }
    return {
      ruleId: 'cross-page/sitemap-coverage',
      score: 30,
      status: 'fail',
      message: `${crawledNotInSitemap.length} of ${eligibleCrawled.length} crawled pages (${100 - coveragePct}%) are missing from the sitemap.`,
      details,
    };
  },
});
