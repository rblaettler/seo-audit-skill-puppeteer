import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

registerCrossPageRule({
  id: 'cross-page/orphan-pages',
  name: 'Orphan Pages',
  description: 'Finds pages that no other crawled page links to, making them invisible to link equity flow.',
  weight: 20,
  run(pages: CrossPagePageData[]): CrossPageRuleResult {
    const linkedUrls = new Set<string>();
    for (const page of pages) {
      for (const link of page.internalLinks) {
        linkedUrls.add(link);
      }
    }

    const validNonRoot = pages.filter(p => !p.error && p.depth > 0);
    const orphans = validNonRoot.filter(p => !linkedUrls.has(p.url));
    const ratio = validNonRoot.length > 0 ? orphans.length / validNonRoot.length : 0;

    const details = {
      orphanCount: orphans.length,
      totalNonRootPages: validNonRoot.length,
      orphanUrls: orphans.map(p => p.url),
    };

    if (orphans.length === 0) {
      return {
        ruleId: 'cross-page/orphan-pages',
        score: 100,
        status: 'pass',
        message: 'No orphan pages detected — all crawled pages receive at least one internal link.',
        details,
      };
    }
    if (ratio < 0.2) {
      return {
        ruleId: 'cross-page/orphan-pages',
        score: 65,
        status: 'warn',
        message: `${orphans.length} page${orphans.length !== 1 ? 's are' : ' is'} not linked from any other crawled page.`,
        details,
      };
    }
    return {
      ruleId: 'cross-page/orphan-pages',
      score: 20,
      status: 'fail',
      message: `${orphans.length} of ${validNonRoot.length} pages (${Math.round(ratio * 100)}%) are orphans with no inbound internal links.`,
      details,
    };
  },
});
