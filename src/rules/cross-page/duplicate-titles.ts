import { registerCrossPageRule } from './registry.js';
import type { CrossPagePageData, CrossPageRuleResult } from './types.js';

registerCrossPageRule({
  id: 'cross-page/duplicate-titles',
  name: 'Duplicate Titles & Meta Descriptions',
  description: 'Flags pages that share identical title tags or meta descriptions.',
  weight: 20,
  run(pages: CrossPagePageData[]): CrossPageRuleResult {
    const validPages = pages.filter(p => !p.error);

    const titleMap = new Map<string, string[]>();
    const metaMap = new Map<string, string[]>();

    for (const page of validPages) {
      if (page.title) {
        const existing = titleMap.get(page.title) ?? [];
        existing.push(page.url);
        titleMap.set(page.title, existing);
      }
      if (page.metaDescription) {
        const existing = metaMap.get(page.metaDescription) ?? [];
        existing.push(page.url);
        metaMap.set(page.metaDescription, existing);
      }
    }

    const dupTitles = [...titleMap.entries()]
      .filter(([, urls]) => urls.length > 1)
      .map(([title, urls]) => ({ title, urls }));
    const dupMetas = [...metaMap.entries()]
      .filter(([, urls]) => urls.length > 1)
      .map(([description, urls]) => ({ description, urls }));

    const affectedPages = new Set([
      ...dupTitles.flatMap(d => d.urls),
      ...dupMetas.flatMap(d => d.urls),
    ]);
    const ratio = validPages.length > 0 ? affectedPages.size / validPages.length : 0;

    const details = {
      duplicateTitleCount: dupTitles.length,
      duplicateMetaCount: dupMetas.length,
      affectedPageCount: affectedPages.size,
      duplicateTitles: dupTitles,
      duplicateMetas: dupMetas,
    };

    if (dupTitles.length === 0 && dupMetas.length === 0) {
      return {
        ruleId: 'cross-page/duplicate-titles',
        score: 100,
        status: 'pass',
        message: 'All crawled pages have unique titles and meta descriptions.',
        details,
      };
    }
    if (ratio < 0.2) {
      return {
        ruleId: 'cross-page/duplicate-titles',
        score: 65,
        status: 'warn',
        message: `${dupTitles.length} duplicate title${dupTitles.length !== 1 ? 's' : ''} and ${dupMetas.length} duplicate meta description${dupMetas.length !== 1 ? 's' : ''} found.`,
        details,
      };
    }
    return {
      ruleId: 'cross-page/duplicate-titles',
      score: 20,
      status: 'fail',
      message: `${affectedPages.size} pages (${Math.round(ratio * 100)}%) share duplicate titles or meta descriptions.`,
      details,
    };
  },
});
