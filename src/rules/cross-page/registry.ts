import type { CrossPageRule } from './types.js';

const rules: Map<string, CrossPageRule> = new Map();

export function registerCrossPageRule(rule: CrossPageRule): void {
  if (rules.has(rule.id)) {
    throw new Error(`Duplicate cross-page rule ID: "${rule.id}"`);
  }
  rules.set(rule.id, rule);
}

export function getAllCrossPageRules(): CrossPageRule[] {
  return Array.from(rules.values());
}

export function getCrossPageRuleById(id: string): CrossPageRule | undefined {
  return rules.get(id);
}
