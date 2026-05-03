import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

registerCrossPageRule({
  id: 'cross-page/broken-internal-links',
  name: 'Broken Internal Links',
  description: 'Detects internal links that point to crawled pages which returned errors.',
  weight: 25,
  run(pages: CrossPagePageData[]): CrossPageRuleResult {
    const resultMap = new Map<string, CrossPagePageData>();
    for (const page of pages) {
      resultMap.set(page.url, page);
    }

    const broken: Array<{ source: string; target: string }> = [];
    for (const page of pages) {
      if (page.error) continue;
      for (const link of page.internalLinks) {
        const target = resultMap.get(link);
        if (target?.error) {
          broken.push({ source: page.url, target: link });
        }
      }
    }

    const count = broken.length;
    if (count === 0) {
      return {
        ruleId: 'cross-page/broken-internal-links',
        score: 100,
        status: 'pass',
        message: 'No broken internal links detected among crawled pages.',
        details: { brokenCount: 0, broken: [] },
      };
    }
    if (count <= 2) {
      return {
        ruleId: 'cross-page/broken-internal-links',
        score: 60,
        status: 'warn',
        message: `${count} broken internal link${count > 1 ? 's' : ''} found.`,
        details: { brokenCount: count, broken },
      };
    }
    return {
      ruleId: 'cross-page/broken-internal-links',
      score: 0,
      status: 'fail',
      message: `${count} broken internal links found — crawled pages link to pages that returned errors.`,
      details: { brokenCount: count, broken },
    };
  },
});
