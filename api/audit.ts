import { createAuditor } from '../src/index.js';
import { renderHtmlReport } from '../src/reporters/html-reporter.js';

export const maxDuration = 60;

export default async function handler(
  req: import('http').IncomingMessage & { body?: { url?: string; cwv?: boolean }; query?: Record<string, string> },
  res: import('http').ServerResponse
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const query = (req as { query?: Record<string, string> }).query ?? {};

  // GET: params from query string. POST: params from body, query string overrides format.
  const isGet = req.method === 'GET';
  const url = isGet ? query['url'] : (req.body as { url?: string })?.url;
  const cwv = isGet
    ? query['cwv'] === 'true'
    : ((req.body as { cwv?: boolean })?.cwv ?? false);

  if (!url || typeof url !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'url is required (query param for GET, body field for POST)' }));
    return;
  }

  const wantsHtml =
    query['format'] === 'html' ||
    (req.headers['accept'] ?? '').includes('text/html');

  try {
    const auditor = createAuditor({ measureCwv: cwv });
    const result = await auditor.audit(url);

    if (wantsHtml) {
      const html = renderHtmlReport(result);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
}
