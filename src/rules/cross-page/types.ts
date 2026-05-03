export interface CrossPagePageData {
  url: string;
  depth: number;
  overallScore: number;
  internalLinks: string[];
  title: string;
  metaDescription: string;
  canonical: string;
  statusCode: number;
  error?: string;
}

export interface CrossPageRuleResult {
  ruleId: string;
  score: number;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details: Record<string, unknown>;
}

export interface CrossPageRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  run: (pages: CrossPagePageData[]) => CrossPageRuleResult | Promise<CrossPageRuleResult>;
}

export interface SiteAnalysis {
  score: number;
  combinedScore: number;
  avgPageScore: number;
  rules: CrossPageRuleResult[];
  pageCount: number;
  analyzedAt: string;
}
