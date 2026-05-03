import type { AuditContext } from '../../types.js';
import { defineRule, pass, warn } from '../define-rule.js';
import { fetchPage } from '../../crawler/fetcher.js';

const LLMS_PATHS = ['/llms.txt', '/.well-known/llms.txt'];

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

async function fetchLlmsTxt(origin: string): Promise<{ path: string; content: string } | null> {
  for (const path of LLMS_PATHS) {
    try {
      const result = await fetchPage(`${origin}${path}`, 8000);
      if (result.statusCode === 200 && result.html.trim().length > 0) {
        return { path, content: result.html };
      }
    } catch {
      // Try next path
    }
  }
  return null;
}

export const llmsTxtRule = defineRule({
  id: 'geo-llms-txt',
  name: 'llms.txt Reference',
  description:
    'Checks if the site has an llms.txt file (fetched and validated) or HTML references to one',
  category: 'geo',
  weight: 15,
  run: async (context: AuditContext) => {
    const { $ } = context;
    const origin = getOrigin(context.url);

    // Collect HTML references (existing logic)
    const references: string[] = [];

    const llmsLink = $('link[rel="llms"]');
    if (llmsLink.length > 0) {
      const href = llmsLink.first().attr('href');
      if (href) references.push(`<link rel="llms" href="${href}">`);
    }

    const llmsMeta = $('meta[name="llms"]');
    if (llmsMeta.length > 0) {
      const content = llmsMeta.first().attr('content');
      if (content) references.push(`<meta name="llms" content="${content}">`);
    }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      for (const path of LLMS_PATHS) {
        if (href === path || href.endsWith(path)) {
          references.push(`<a href="${href}"> link to ${path}`);
          return false;
        }
      }
    });

    $('link[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const rel = $(el).attr('rel') || '';
      if (rel === 'llms') return;
      for (const path of LLMS_PATHS) {
        if (href === path || href.endsWith(path)) {
          references.push(`<link rel="${rel}" href="${href}">`);
          return false;
        }
      }
    });

    // Attempt to fetch the actual file
    const fetched = await fetchLlmsTxt(origin);

    const details: Record<string, unknown> = {
      references,
      referenceCount: references.length,
      fileFound: fetched !== null,
      filePath: fetched?.path ?? null,
      fileContentLength: fetched ? fetched.content.length : 0,
      note: 'llms.txt is an emerging standard (llmstxt.org) — not yet required but recommended for AI visibility',
    };

    if (fetched !== null) {
      return pass(
        'geo-llms-txt',
        `llms.txt file found and validated at ${fetched.path} (${fetched.content.length} bytes)`,
        details
      );
    }

    if (references.length > 0) {
      return warn(
        'geo-llms-txt',
        `llms.txt referenced in HTML but file not accessible at ${LLMS_PATHS.join(' or ')}`,
        { ...details, recommendation: 'Ensure the llms.txt file is publicly accessible at the referenced path' }
      );
    }

    return warn(
      'geo-llms-txt',
      'No llms.txt file found and no HTML reference detected',
      {
        ...details,
        recommendation:
          'Create /llms.txt describing your site for LLMs and add <link rel="llms" href="/llms.txt"> in <head> (see llmstxt.org)',
      }
    );
  },
});
