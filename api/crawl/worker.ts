// Side-effect import: causes all 251 SEO rules to register at module init time
import '../../src/rules/loader.js';
// Side-effect import: registers all 5 cross-page rules
import '../../src/rules/cross-page/index.js';

import { Redis } from '@upstash/redis';
import { waitUntil } from '@vercel/functions';
import { fetchPage, createAuditContext, extractLinksFromHtml } from '../../src/crawler/fetcher.js';
import { fetchPageWithPuppeteer, closeBrowser } from '../../src/crawler/puppeteer-fetcher.js';
import { Auditor } from '../../src/auditor.js';
import { buildAuditResult } from '../../src/scoring.js';
import { categories } from '../../src/categories/index.js';
import { UrlFilter } from '../../src/crawler/url-filter.js';
import { analyzeSite } from '../../src/rules/cross-page/analyzer.js';
import type { CategoryResult, LinkInfo } from '../../src/types.js';
import type { CrossPagePageData } from '../../src/rules/cross-page/types.js';

export const maxDuration = 300;

const TTL = 86400;
const TIME_BUDGET_MS = 220_000; // leave ~80s headroom for cross-page analysis + browser close
const PUPPETEER_DEADLINE_MS = 30_000;
const AUDIT_DEADLINE_MS = 45_000;
const FETCH_TIMEOUT_MS = 25_000;
const PUPPETEER_FETCH_TIMEOUT_MS = 25_000;
const CLOSE_BROWSER_SLACK_MS = 5_000;
const ANALYSIS_RESERVE_MS = 20_000; // skip analysis if less than this remains

const urlFilter = new UrlFilter();

const NON_HTML_EXT =
  /\.(pdf|docx?|xlsx?|pptx?|zip|gz|tar|rar|7z|jpg|jpeg|png|gif|webp|avif|svg|ico|mp[34]|wav|avi|mov|woff2?|ttf|eot|otf|css|js|mjs|json|xml|csv|txt|sh|exe|dmg|pkg|deb|rpm|apk)$/i;

interface CrawlJob {
  jobId: string;
  startUrl: string;
  startHostname: string;
  status: 'running' | 'analyzing' | 'completed' | 'error';
  maxPages: number;
  maxDepth: number;
  totalQueued: number;
  completedPages: number;
  createdAt: string;
  updatedAt: string;
  cwv: boolean;
  siteScore?: number;
  combinedScore?: number;
  error?: string;
}

interface QueueItem {
  url: string;
  depth: number;
}

export interface PageTiming {
  fetchMs: number;
  puppeteerMs: number;
  auditMs: number;
  linkDiscoveryMs: number;
  totalMs: number;
}

export interface PageResult {
  url: string;
  depth: number;
  overallScore: number;
  categoryResults: CategoryResult[];
  timestamp: string;
  timing: PageTiming;
  // Per-page data used by cross-page analysis
  internalLinks: string[];
  title: string;
  metaDescription: string;
  canonical: string;
  statusCode: number;
  error?: string;
}

function getWorkerUrl(req: import('http').IncomingMessage): string {
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    (req.headers['host'] as string) ||
    'localhost:3000';
  const proto =
    (req.headers['x-forwarded-proto'] as string) ||
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}/api/crawl/worker`;
}

async function discoverAndEnqueueLinks(
  redis: Redis,
  jobId: string,
  job: CrawlJob,
  links: LinkInfo[],
  currentDepth: number
): Promise<number> {
  if (currentDepth >= job.maxDepth || links.length === 0) return 0;

  let urlsQueued = 0;

  for (const link of links) {
    if (job.totalQueued + urlsQueued >= job.maxPages) break;
    if (!link.isInternal || link.isNoFollow) continue;

    try {
      const { pathname } = new URL(link.href);
      if (NON_HTML_EXT.test(pathname)) continue;
    } catch {
      continue;
    }

    let normalized: string;
    try {
      normalized = urlFilter.normalizeUrl(link.href);
      const linkHost = new URL(normalized).hostname;
      if (linkHost !== job.startHostname) continue;
    } catch {
      continue;
    }

    const added = await redis.sadd(`crawl:visited:${jobId}`, normalized);
    if ((added as number) > 0) {
      const item: QueueItem = { url: normalized, depth: currentDepth + 1 };
      await redis.rpush(`crawl:queue:${jobId}`, item);
      urlsQueued++;
    }
  }

  if (urlsQueued > 0) {
    await redis.expire(`crawl:queue:${jobId}`, TTL);
    await redis.expire(`crawl:visited:${jobId}`, TTL);
  }

  return urlsQueued;
}

function normalizeInternalLinks(links: LinkInfo[]): string[] {
  const out: string[] = [];
  for (const link of links) {
    if (!link.isInternal) continue;
    try {
      out.push(urlFilter.normalizeUrl(link.href));
    } catch {
      out.push(link.href);
    }
  }
  return out;
}

async function processPage(
  redis: Redis,
  job: CrawlJob,
  jobId: string,
  url: string,
  depth: number
): Promise<CrawlJob> {
  let pageResult: PageResult;
  let discoveredLinks: LinkInfo[] = [];
  const pageStart = performance.now();
  const timing: PageTiming = {
    fetchMs: 0,
    puppeteerMs: 0,
    auditMs: 0,
    linkDiscoveryMs: 0,
    totalMs: 0,
  };

  try {
    console.log(`[worker] step=fetch url=${url}`);
    const fetchStart = performance.now();
    const fetchResult = await fetchPage(url, FETCH_TIMEOUT_MS);
    timing.fetchMs = Math.round(performance.now() - fetchStart);

    const context = createAuditContext(url, fetchResult);

    console.log(`[worker] step=audit url=${url}`);
    const auditStart = performance.now();
    const auditor = new Auditor();
    const auditDeadline = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Audit deadline exceeded')), AUDIT_DEADLINE_MS)
    );
    const categoryResults = await Promise.race([
      auditor.runAllCategories(context),
      auditDeadline,
    ]);
    timing.auditMs = Math.round(performance.now() - auditStart);

    const timestamp = new Date().toISOString();
    const auditResult = buildAuditResult(url, categoryResults, categories, timestamp, 1);

    pageResult = {
      url,
      depth,
      overallScore: auditResult.overallScore,
      categoryResults: auditResult.categoryResults,
      timestamp,
      timing,
      statusCode: context.statusCode,
      title: context.$('title').first().text().trim(),
      metaDescription: context.$('meta[name="description"]').attr('content') ?? '',
      canonical: context.$('link[rel="canonical"]').attr('href') ?? '',
      internalLinks: [], // set after link discovery below
    };

    if (job.cwv) {
      console.log(`[worker] step=puppeteer-start url=${url}`);
      const puppeteerStart = performance.now();
      let puppeteerFailed = false;
      try {
        const puppeteerDeadline = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Puppeteer deadline exceeded')), PUPPETEER_DEADLINE_MS)
        );
        const pwResult = await Promise.race([
          fetchPageWithPuppeteer(url, PUPPETEER_FETCH_TIMEOUT_MS),
          puppeteerDeadline,
        ]);
        const linkDiscoveryStart = performance.now();
        discoveredLinks = extractLinksFromHtml(pwResult.html, url);
        timing.linkDiscoveryMs = Math.round(performance.now() - linkDiscoveryStart);
      } catch (err) {
        puppeteerFailed = true;
        console.error(`[worker] Puppeteer link extraction failed for ${url}:`, err);
        discoveredLinks = context.links;
      } finally {
        timing.puppeteerMs = Math.round(performance.now() - puppeteerStart);
      }
      if (puppeteerFailed) {
        await Promise.race([
          closeBrowser().catch(() => {}),
          new Promise<void>(resolve => setTimeout(resolve, CLOSE_BROWSER_SLACK_MS)),
        ]);
      }
    } else {
      const linkDiscoveryStart = performance.now();
      discoveredLinks = context.links;
      timing.linkDiscoveryMs = Math.round(performance.now() - linkDiscoveryStart);
    }

    pageResult.internalLinks = normalizeInternalLinks(discoveredLinks);
  } catch (err: unknown) {
    console.error(`[worker] Failed to audit ${url}:`, err);
    pageResult = {
      url,
      depth,
      overallScore: 0,
      categoryResults: [],
      timestamp: new Date().toISOString(),
      timing,
      statusCode: 0,
      title: '',
      metaDescription: '',
      canonical: '',
      internalLinks: [],
      error: err instanceof Error ? err.message : 'Fetch or audit failed',
    };
  }

  timing.totalMs = Math.round(performance.now() - pageStart);
  pageResult.timing = timing;
  console.log(
    `[worker] step=page-done url=${url} score=${pageResult.overallScore} totalMs=${timing.totalMs}`
  );

  const pipeline = redis.pipeline();
  pipeline.rpush(`crawl:results:${jobId}`, pageResult);
  pipeline.expire(`crawl:results:${jobId}`, TTL);
  await pipeline.exec();

  let urlsQueued = 0;
  try {
    urlsQueued = await discoverAndEnqueueLinks(redis, jobId, job, discoveredLinks, depth);
  } catch (err) {
    console.error(`[worker] Link discovery failed for ${url}:`, err);
  }

  const updatedJob: CrawlJob = {
    ...job,
    completedPages: job.completedPages + 1,
    totalQueued: job.totalQueued + urlsQueued,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(`crawl:job:${jobId}`, updatedJob, { ex: TTL });
  return updatedJob;
}

async function runCrossPageAnalysis(
  redis: Redis,
  jobId: string,
  job: CrawlJob,
  startTime: number
): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (maxDuration * 1000 - elapsed < ANALYSIS_RESERVE_MS) {
    console.log(`[worker] step=analysis-skipped reason=time-budget elapsed=${elapsed}`);
    await redis.set(
      `crawl:job:${jobId}`,
      { ...job, status: 'completed', updatedAt: new Date().toISOString() },
      { ex: TTL }
    );
    return;
  }

  console.log(`[worker] step=analysis-start elapsed=${elapsed}`);
  await redis.set(
    `crawl:job:${jobId}`,
    { ...job, status: 'analyzing', updatedAt: new Date().toISOString() },
    { ex: TTL }
  );

  const allResults = (await redis.lrange<PageResult>(`crawl:results:${jobId}`, 0, -1)) ?? [];

  const pages: CrossPagePageData[] = allResults.map(r => ({
    url: r.url,
    depth: r.depth,
    overallScore: r.overallScore,
    internalLinks: r.internalLinks ?? [],
    title: r.title ?? '',
    metaDescription: r.metaDescription ?? '',
    canonical: r.canonical ?? '',
    statusCode: r.statusCode ?? 0,
    error: r.error,
  }));

  const validPages = pages.filter(p => !p.error);
  const avgPageScore =
    validPages.length > 0
      ? Math.round(validPages.reduce((sum, p) => sum + p.overallScore, 0) / validPages.length)
      : 0;

  const siteAnalysis = await analyzeSite(pages, avgPageScore);
  console.log(
    `[worker] step=analysis-done siteScore=${siteAnalysis.score} combined=${siteAnalysis.combinedScore}`
  );

  const pipeline = redis.pipeline();
  pipeline.set(`crawl:site-analysis:${jobId}`, siteAnalysis, { ex: TTL });
  pipeline.set(
    `crawl:job:${jobId}`,
    {
      ...job,
      status: 'completed',
      siteScore: siteAnalysis.score,
      combinedScore: siteAnalysis.combinedScore,
      updatedAt: new Date().toISOString(),
    },
    { ex: TTL }
  );
  await pipeline.exec();
}

async function processQueue(
  redis: Redis,
  jobId: string,
  initialJob: CrawlJob,
  workerUrl: string
): Promise<void> {
  const startTime = Date.now();
  console.log(`[worker] step=worker-start jobId=${jobId}`);
  let job = initialJob;
  let pagesThisInvocation = 0;

  try {
    while (Date.now() - startTime < TIME_BUDGET_MS) {
      const latest = await redis.get<CrawlJob>(`crawl:job:${jobId}`);
      if (!latest) {
        console.log(`[worker] step=loop-job-missing jobId=${jobId}`);
        return;
      }
      if (latest.status !== 'running') {
        console.log(`[worker] step=loop-status-changed status=${latest.status}`);
        return;
      }
      job = latest;

      const queueItem = await redis.lpop<QueueItem>(`crawl:queue:${jobId}`);
      if (!queueItem) {
        console.log(`[worker] step=loop-queue-empty pages=${pagesThisInvocation}`);
        await runCrossPageAnalysis(redis, jobId, job, startTime);
        return;
      }

      try {
        job = await processPage(redis, job, jobId, queueItem.url, queueItem.depth);
        pagesThisInvocation++;
      } catch (err) {
        console.error(`[worker] processPage threw for ${queueItem.url}:`, err);
        const failResult: PageResult = {
          url: queueItem.url,
          depth: queueItem.depth,
          overallScore: 0,
          categoryResults: [],
          timestamp: new Date().toISOString(),
          timing: { fetchMs: 0, puppeteerMs: 0, auditMs: 0, linkDiscoveryMs: 0, totalMs: 0 },
          statusCode: 0,
          title: '',
          metaDescription: '',
          canonical: '',
          internalLinks: [],
          error: err instanceof Error ? err.message : 'Unhandled worker error',
        };
        try {
          const pipeline = redis.pipeline();
          pipeline.rpush(`crawl:results:${jobId}`, failResult);
          pipeline.expire(`crawl:results:${jobId}`, TTL);
          await pipeline.exec();
        } catch (persistErr) {
          console.error('[worker] Failed to persist error result:', persistErr);
        }
      }
    }

    // Time budget hit — check if queue is now empty
    console.log(`[worker] step=time-budget-hit pages=${pagesThisInvocation}`);
    const queueLen = await redis.llen(`crawl:queue:${jobId}`);
    if (queueLen <= 0) {
      await runCrossPageAnalysis(redis, jobId, job, startTime);
      return;
    }

    // Queue still has items — chain to fresh invocation
    console.log(`[worker] step=chain-handoff queueLen=${queueLen}`);
    try {
      const resp = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      await resp.body?.cancel();
      if (resp.status >= 400) throw new Error(`Chain handoff returned ${resp.status}`);
      console.log(`[worker] step=chain-handoff-ok status=${resp.status}`);
    } catch (err) {
      console.error('[worker] Chain handoff failed:', err);
      const current = await redis.get<CrawlJob>(`crawl:job:${jobId}`);
      if (current?.status === 'running') {
        await redis.set(
          `crawl:job:${jobId}`,
          {
            ...current,
            status: 'error',
            error: err instanceof Error ? err.message : 'Chain handoff failed',
            updatedAt: new Date().toISOString(),
          },
          { ex: TTL }
        );
      }
    }
  } finally {
    console.log(`[worker] step=close-browser-final pages=${pagesThisInvocation}`);
    await Promise.race([
      closeBrowser().catch(() => {}),
      new Promise<void>(resolve => setTimeout(resolve, CLOSE_BROWSER_SLACK_MS)),
    ]);
  }
}

export default async function handler(
  req: import('http').IncomingMessage & { body?: Record<string, unknown> },
  res: import('http').ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_KV_REST_API_URL;
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Redis not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.',
      })
    );
    return;
  }

  const jobId = (req.body as { jobId?: string } | undefined)?.jobId;
  if (!jobId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'jobId is required in request body' }));
    return;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  const job = await redis.get<CrawlJob>(`crawl:job:${jobId}`);
  if (!job) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Job not found' }));
    return;
  }

  if (job.status !== 'running') {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Job is not running', status: job.status }));
    return;
  }

  const workerUrl = getWorkerUrl(req);

  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'accepted', jobId }));

  waitUntil(processQueue(redis, jobId, job, workerUrl));
}
