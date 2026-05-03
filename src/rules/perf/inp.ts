import type { AuditContext } from '../../types.js';
import { defineRule, pass, warn, fail } from '../define-rule.js';

/**
 * INP thresholds in milliseconds
 * Good: < 200ms
 * Needs Improvement: 200ms - 500ms
 * Poor: > 500ms
 */
const INP_GOOD = 200;
const INP_POOR = 500;

/**
 * Rule: Check Interaction to Next Paint (INP) metric
 * INP measures responsiveness - the time from when a user interacts
 * with the page to when the next frame is painted.
 */
export const inpRule = defineRule({
  id: 'cwv-inp',
  name: 'Interaction to Next Paint (INP)',
  description:
    'Measures responsiveness by checking the latency of user interactions',
  category: 'perf',
  weight: 20,
  run: async (context: AuditContext) => {
    const { cwv } = context;
    const inp = cwv.inp;
    const synthetic = cwv.inpSynthetic ?? false;
    const label = synthetic ? ' (synthetic measurement)' : '';

    if (inp === undefined) {
      return warn(
        'cwv-inp',
        'Could not measure INP — no interactive elements found in viewport for synthetic testing',
        {
          metric: 'INP',
          inpSynthetic: synthetic,
          reason: 'No clickable elements found in viewport',
        }
      );
    }

    const details = {
      metric: 'INP',
      value: inp,
      valueFormatted: `${inp}ms`,
      inpSynthetic: synthetic,
      threshold: { good: INP_GOOD, poor: INP_POOR },
    };

    if (inp < INP_GOOD) {
      return pass('cwv-inp', `INP is ${inp}ms — good${label}`, details);
    }

    if (inp <= INP_POOR) {
      return warn('cwv-inp', `INP is ${inp}ms — needs improvement${label}`, details);
    }

    return fail('cwv-inp', `INP is ${inp}ms — poor${label}`, details);
  },
});
