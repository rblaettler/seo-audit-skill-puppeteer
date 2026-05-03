import { Redis } from '@upstash/redis';
import { waitUntil } from '@vercel/functions';
import { UrlFilter } from '../src/crawler/url-filter.js';

export const maxDuration = 30;

const TTL = 86400; // 24 hours
const MAX_PAGES_LIMIT = 500;

export interface CrawlJob {
  jobId: string;
  startUrl: string;
  startHostname: string;
  status: 'running' | 'completed' | 'error';
  maxPages: number;
  maxDepth: number;
  /** Total URLs added to queue, including the seed URL */
  totalQueued: number;
  completedPages: number;
  createdAt: string;
  updatedAt: string;
  /** When true, worker renders pages with Puppeteer before extracting links */
  cwv: boolean;
  error?: string;
}

export interface QueueItem {
  url: string;
  depth: number;
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

export default async function handler(
  req: import('http').IncomingMessage & {
    body?: Record<string, unknown>;
    query?: Record<string, string>;
  },
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
        error:
          'Redis not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or UPSTASH_KV_REST_API_URL + UPSTASH_KV_REST_API_TOKEN for Vercel Marketplace).',
      })
    );
    return;
  }

  const body = req.body as
    | { url?: string; maxPages?: number | string; maxDepth?: number | string; cwv?: boolean }
    | undefined;
  const url = body?.url;

  if (!url || typeof url !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'url is required in request body' }));
    return;
  }

  const rawMaxPages = Number(body?.maxPages ?? 1);
  const rawMaxDepth = Number(body?.maxDepth ?? 0);
  const maxPages = Math.min(
    Math.max(1, isNaN(rawMaxPages) ? 1 : rawMaxPages),
    MAX_PAGES_LIMIT
  );
  const maxDepth = Math.max(0, isNaN(rawMaxDepth) ? 0 : rawMaxDepth);
  const cwv = body?.cwv === true;

  let normalizedUrl: string;
  let startHostname: string;
  try {
    const urlObj = new URL(url);
    startHostname = urlObj.hostname;
    const filter = new UrlFilter();
    normalizedUrl = filter.normalizeUrl(url);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL' }));
    return;
  }

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job: CrawlJob = {
    jobId,
    startUrl: normalizedUrl,
    startHostname,
    status: 'running',
    maxPages,
    maxDepth,
    cwv,
    totalQueued: 1,
    completedPages: 0,
    createdAt: now,
    updatedAt: now,
  };

  const redis = new Redis({ url: redisUrl, token: redisToken });

  const seedItem: QueueItem = { url: normalizedUrl, depth: 0 };

  const pipeline = redis.pipeline();
  pipeline.set(`crawl:job:${jobId}`, job, { ex: TTL });
  pipeline.rpush(`crawl:queue:${jobId}`, seedItem);
  pipeline.expire(`crawl:queue:${jobId}`, TTL);
  pipeline.sadd(`crawl:visited:${jobId}`, normalizedUrl);
  pipeline.expire(`crawl:visited:${jobId}`, TTL);
  await pipeline.exec();

  // waitUntil keeps the function alive until the outgoing fetch completes,
  // preventing Vercel from killing the request before the worker receives it.
  const workerUrl = getWorkerUrl(req);
  waitUntil(
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    }).catch((err: unknown) => {
      console.error('[crawl] Failed to trigger first worker:', err);
    })
  );

  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ jobId, status: 'running' }));
}
