import type { AuditContext } from '../../types.js';
import { defineRule, pass, warn } from '../define-rule.js';

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export const contentFreshnessRule = defineRule({
  id: 'content-freshness',
  name: 'Content Freshness',
  description:
    'Checks date signals (JSON-LD dateModified, Open Graph dates, Last-Modified header) and warns if content is older than 12 months',
  category: 'content',
  weight: 15,
  run: async (context: AuditContext) => {
    const { $, headers } = context;
    const signals: Array<{ type: string; value: string; date: Date | null }> = [];

    // JSON-LD dateModified / datePublished
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const checkObj = (obj: unknown): void => {
          if (!obj || typeof obj !== 'object') return;
          const rec = obj as Record<string, unknown>;
          if (typeof rec.dateModified === 'string') {
            signals.push({ type: 'Schema.org dateModified', value: rec.dateModified, date: parseDate(rec.dateModified) });
          } else if (typeof rec.datePublished === 'string') {
            signals.push({ type: 'Schema.org datePublished', value: rec.datePublished, date: parseDate(rec.datePublished) });
          }
          if (Array.isArray(rec['@graph'])) {
            for (const item of rec['@graph']) checkObj(item);
          }
        };
        checkObj(JSON.parse(raw));
      } catch { /* invalid JSON */ }
    });

    // Open Graph article dates — prefer modified over published
    const ogModified = $('meta[property="article:modified_time"], meta[name="article:modified_time"]').first().attr('content');
    if (ogModified) signals.push({ type: 'article:modified_time', value: ogModified, date: parseDate(ogModified) });

    const ogPublished = $('meta[property="article:published_time"], meta[name="article:published_time"]').first().attr('content');
    if (ogPublished) signals.push({ type: 'article:published_time', value: ogPublished, date: parseDate(ogPublished) });

    // Last-Modified HTTP header
    const lastModified = headers['last-modified'] ?? headers['Last-Modified'];
    if (lastModified) signals.push({ type: 'Last-Modified header', value: lastModified, date: parseDate(lastModified) });

    if (signals.length === 0) {
      return warn(
        'content-freshness',
        'No content freshness signals found — add dateModified to JSON-LD or article:modified_time meta tag',
        {
          signals: [],
          recommendation: 'Add datePublished and dateModified to Article schema or use <time datetime="..."> elements',
        }
      );
    }

    // Use the most recent valid date across all signals
    const now = Date.now();
    const validDates = signals.map(s => s.date).filter((d): d is Date => d !== null);
    const mostRecent = validDates.length > 0
      ? new Date(Math.max(...validDates.map(d => d.getTime())))
      : null;

    const detailSignals = signals.map(s => ({ type: s.type, value: s.value }));

    if (!mostRecent) {
      return warn(
        'content-freshness',
        'Date signals found but none could be parsed as a valid date',
        { signals: detailSignals }
      );
    }

    const ageMs = now - mostRecent.getTime();
    const ageMonths = Math.floor(ageMs / (30 * 24 * 60 * 60 * 1000));

    if (ageMs > TWELVE_MONTHS_MS) {
      return warn(
        'content-freshness',
        `Content was last updated ${ageMonths} months ago — consider refreshing to maintain freshness signals`,
        {
          signals: detailSignals,
          mostRecentDate: mostRecent.toISOString(),
          ageMonths,
          recommendation: 'Update dateModified in your schema and review whether the content itself needs refreshing',
        }
      );
    }

    return pass(
      'content-freshness',
      `Content freshness confirmed — last updated ${ageMonths === 0 ? 'this month' : `${ageMonths} month${ageMonths !== 1 ? 's' : ''} ago`}`,
      {
        signals: detailSignals,
        mostRecentDate: mostRecent.toISOString(),
        ageMonths,
      }
    );
  },
});
