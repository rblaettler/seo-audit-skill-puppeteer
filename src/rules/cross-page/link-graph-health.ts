import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

registerCrossPageRule({
  id: 'cross-page/link-graph-health',
  name: 'Internal Link Graph Health',
  description: 'Flags pages with weak inbound link counts, excessive outbound links, or excessive crawl depth.',
  weight: 20,
  run(pages: CrossPagePageData[]): CrossPageRuleResult {
    const inboundCount = new Map<string, number>();
    for (const page of pages) {
      for (const link of page.internalLinks) {
        inboundCount.set(link, (inboundCount.get(link) ?? 0) + 1);
      }
    }

    const validPages = pages.filter(p => !p.error);
    const validNonRoot = validPages.filter(p => p.depth > 0);

    const thinInbound = validNonRoot.filter(p => (inboundCount.get(p.url) ?? 0) < 2);
    const highOutbound = validPages.filter(p => p.internalLinks.length > 100);
    const deepPages = validPages.filter(p => p.depth > 3);

    const issues: Array<{ type: string; url: string; value: number }> = [
      ...thinInbound.map(p => ({ type: 'thin-inbound', url: p.url, value: inboundCount.get(p.url) ?? 0 })),
      ...highOutbound.map(p => ({ type: 'high-outbound', url: p.url, value: p.internalLinks.length })),
      ...deepPages.map(p => ({ type: 'deep-page', url: p.url, value: p.depth })),
    ];

    const details = {
      issueCount: issues.length,
      thinInboundCount: thinInbound.length,
      highOutboundCount: highOutbound.length,
      deepPageCount: deepPages.length,
      issues,
    };

    if (issues.length === 0) {
      return {
        ruleId: 'cross-page/link-graph-health',
        score: 100,
        status: 'pass',
        message: 'Internal link graph looks healthy — no thin inbound, high outbound, or deep pages detected.',
        details,
      };
    }
    if (issues.length <= 3) {
      return {
        ruleId: 'cross-page/link-graph-health',
        score: 65,
        status: 'warn',
        message: `${issues.length} link graph issue${issues.length !== 1 ? 's' : ''}: ${thinInbound.length} thin-inbound, ${highOutbound.length} high-outbound, ${deepPages.length} deep pages.`,
        details,
      };
    }
    return {
      ruleId: 'cross-page/link-graph-health',
      score: 20,
      status: 'fail',
      message: `${issues.length} link graph issues found across ${validPages.length} pages.`,
      details,
    };
  },
});
