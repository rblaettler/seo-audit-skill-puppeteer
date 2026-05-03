import type { AuditContext } from '../../types.js';
import { defineRule, pass, warn } from '../define-rule.js';

interface DeprecatedType {
  type: string;
  reason: string;
}

const DEPRECATED_TYPES: DeprecatedType[] = [
  {
    type: 'HowTo',
    reason: 'Google removed HowTo rich results support in 2024',
  },
  {
    type: 'FAQPage',
    reason: 'Google removed FAQPage rich results in 2023 (limited to gov/health sites)',
  },
  {
    type: 'BookAction',
    reason: 'Google no longer supports BookAction rich results',
  },
  {
    type: 'SpecialAnnouncement',
    reason: 'SpecialAnnouncement support ended (COVID-era feature, now retired)',
  },
  {
    type: 'ClaimReview',
    reason: 'ClaimReview has limited and inconsistent rich result support',
  },
];

const DEPRECATED_TYPE_NAMES = new Set(DEPRECATED_TYPES.map(d => d.type));

function extractTypes(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const rec = data as Record<string, unknown>;
  const types: string[] = [];

  const rawType = rec['@type'];
  if (typeof rawType === 'string') {
    types.push(rawType);
  } else if (Array.isArray(rawType)) {
    for (const t of rawType) {
      if (typeof t === 'string') types.push(t);
    }
  }

  if (Array.isArray(rec['@graph'])) {
    for (const item of rec['@graph']) {
      types.push(...extractTypes(item));
    }
  }

  return types;
}

export const deprecatedSchemaRule = defineRule({
  id: 'schema-deprecated',
  name: 'Deprecated Schema Types',
  description:
    'Detects JSON-LD schema types that Google no longer supports for rich results (HowTo, FAQPage, BookAction, etc.)',
  category: 'schema',
  weight: 15,
  run: async (context: AuditContext) => {
    const { $ } = context;

    const foundDeprecated: Array<{ type: string; reason: string }> = [];
    const allTypesFound: string[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        const types = extractTypes(parsed);
        allTypesFound.push(...types);
        for (const type of types) {
          if (DEPRECATED_TYPE_NAMES.has(type)) {
            const info = DEPRECATED_TYPES.find(d => d.type === type);
            if (info && !foundDeprecated.some(d => d.type === type)) {
              foundDeprecated.push(info);
            }
          }
        }
      } catch { /* invalid JSON */ }
    });

    if (foundDeprecated.length === 0) {
      return pass(
        'schema-deprecated',
        'No deprecated schema types detected',
        {
          schemaTypesFound: [...new Set(allTypesFound)],
          checkedTypes: DEPRECATED_TYPES.map(d => d.type),
        }
      );
    }

    return warn(
      'schema-deprecated',
      `${foundDeprecated.length} deprecated schema type${foundDeprecated.length !== 1 ? 's' : ''} detected: ${foundDeprecated.map(d => d.type).join(', ')}`,
      {
        deprecatedTypes: foundDeprecated,
        schemaTypesFound: [...new Set(allTypesFound)],
        recommendation:
          'Remove or replace deprecated schema types — they no longer generate rich results and may waste crawl budget',
      }
    );
  },
});
