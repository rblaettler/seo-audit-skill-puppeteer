import { Redis } from '@upstash/redis';
import type { PageResult } from './worker.js';

export const maxDuration = 30;

interface CrawlJob {
  jobId: string;
  startUrl: string;
  status: 'running' | 'completed' | 'error';
  maxPages: number;
  maxDepth: number;
  totalQueued: number;
  completedPages: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export default async function handler(
  req: import('http').IncomingMessage & { query?: Record<string, string> },
  res: import('http').ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
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

  const query = (req as { query?: Record<string, string> }).query ?? {};
  const jobId = query['jobId'];
  if (!jobId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'jobId query parameter is required' }));
    return;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  const job = await redis.get<CrawlJob>(`crawl:job:${jobId}`);
  if (!job) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Job not found' }));
    return;
  }

  // Return lightweight per-page summaries (URL + score + timing + error), not full category data
  const rawResults = await redis.lrange<PageResult>(`crawl:results:${jobId}`, 0, -1);
  const results = (rawResults ?? []).map((r) => ({
    url: r.url,
    depth: r.depth,
    overallScore: r.overallScore,
    timestamp: r.timestamp,
    ...(r.timing ? { timing: r.timing } : {}),
    ...(r.error ? { error: r.error } : {}),
  }));

  const endTime =
    job.status === 'completed' || job.status === 'error'
      ? new Date(job.updatedAt).getTime()
      : Date.now();
  const totalElapsedMs = endTime - new Date(job.createdAt).getTime();

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      jobId: job.jobId,
      status: job.status,
      startUrl: job.startUrl,
      maxPages: job.maxPages,
      maxDepth: job.maxDepth,
      totalQueued: job.totalQueued,
      completedPages: job.completedPages,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      totalElapsedMs,
      ...(job.error ? { error: job.error } : {}),
      results,
    })
  );
}
