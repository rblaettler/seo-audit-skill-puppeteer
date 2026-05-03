import './index.js';
import { getAllCrossPageRules } from './registry.js';
import type { CrossPagePageData, SiteAnalysis } from './types.js';

export async function analyzeSite(pages: CrossPagePageData[], avgPageScore: number): Promise<SiteAnalysis> {
  const rules = getAllCrossPageRules();
  const ruleResults = await Promise.all(rules.map(rule => rule.run(pages)));

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const siteScore =
    totalWeight === 0
      ? 0
      : Math.round(
          rules.reduce((sum, rule, i) => sum + ruleResults[i].score * rule.weight, 0) / totalWeight
        );

  const combinedScore = Math.round(0.7 * avgPageScore + 0.3 * siteScore);

  return {
    score: siteScore,
    combinedScore,
    avgPageScore,
    rules: ruleResults,
    pageCount: pages.length,
    analyzedAt: new Date().toISOString(),
  };
}
