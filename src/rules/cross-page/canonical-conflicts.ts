import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

registerCrossPageRule({
  id: 'cross-page/canonical-conflicts',
  name: 'Canonical Conflicts',
  description: 'Detects canonical chains, multiple pages sharing a canonical, and self-conflicting canonicals.',
  weight: 15,
  run(pages: CrossPagePageData[]): CrossPageRuleResult {
    const validPages = pages.filter(p => !p.error);

    // url → effective canonical (self if missing)
    const canonicalOf = new Map<string, string>();
    for (const page of validPages) {
      canonicalOf.set(page.url, page.canonical || page.url);
    }

    // canonical → [pages pointing to it]
    const claimedBy = new Map<string, string[]>();
    for (const [url, canon] of canonicalOf.entries()) {
      const list = claimedBy.get(canon) ?? [];
      list.push(url);
      claimedBy.set(canon, list);
    }

    const conflicts: Array<{ type: string; pages: string[]; canonical?: string }> = [];

    // Multiple non-self pages claiming the same canonical
    for (const [canon, claimants] of claimedBy.entries()) {
      const nonSelf = claimants.filter(u => u !== canon);
      if (nonSelf.length > 1) {
        conflicts.push({ type: 'shared-canonical', pages: nonSelf, canonical: canon });
      }
    }

    // Canonical chains: page A → page B, but page B's canonical is C ≠ B
    for (const page of validPages) {
      const target = page.canonical;
      if (!target || target === page.url) continue;
      const targetCanon = canonicalOf.get(target);
      if (targetCanon && targetCanon !== target) {
        conflicts.push({ type: 'canonical-chain', pages: [page.url, target, targetCanon] });
      }
    }

    const details = {
      conflictCount: conflicts.length,
      conflicts,
    };

    if (conflicts.length === 0) {
      return {
        ruleId: 'cross-page/canonical-conflicts',
        score: 100,
        status: 'pass',
        message: 'No canonical conflicts detected among crawled pages.',
        details,
      };
    }
    if (conflicts.length <= 2) {
      return {
        ruleId: 'cross-page/canonical-conflicts',
        score: 60,
        status: 'warn',
        message: `${conflicts.length} canonical conflict${conflicts.length !== 1 ? 's' : ''} found (chains or shared targets).`,
        details,
      };
    }
    return {
      ruleId: 'cross-page/canonical-conflicts',
      score: 20,
      status: 'fail',
      message: `${conflicts.length} canonical conflicts detected — search engines may struggle to identify preferred URLs.`,
      details,
    };
  },
});
