import { Redis } from '@upstash/redis';
import type { PageResult } from './worker.js';

export const maxDuration = 30;

interface CrawlJob {
  jobId: string;
  startUrl: string;
  status: 'running' | 'analyzing' | 'completed' | 'error';
  maxPages: number;
  maxDepth: number;
  totalQueued: number;
  completedPages: number;
  createdAt: string;
  updatedAt: string;
  siteScore?: number;
  combinedScore?: number;
  error?: string;
}

interface SiteAnalysis {
  score: number;
  combinedScore: number;
  avgPageScore: number;
  rules: Array<{
    ruleId: string;
    score: number;
    status: string;
    message: string;
    details: unknown;
  }>;
  pageCount: number;
  analyzedAt: string;
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

  const [job, siteAnalysis, results] = await Promise.all([
    redis.get<CrawlJob>(`crawl:job:${jobId}`),
    redis.get<SiteAnalysis>(`crawl:site-analysis:${jobId}`),
    redis.lrange<PageResult>(`crawl:results:${jobId}`, 0, -1),
  ]);

  if (!job) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Job not found' }));
    return;
  }

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
      totalQueued: job.totalQueued,
      completedPages: job.completedPages,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      totalElapsedMs,
      ...(job.siteScore !== undefined ? { siteScore: job.siteScore } : {}),
      ...(job.combinedScore !== undefined ? { combinedScore: job.combinedScore } : {}),
      ...(job.error ? { error: job.error } : {}),
      ...(siteAnalysis ? { siteAnalysis } : {}),
      results: results ?? [],
    })
  );
}
