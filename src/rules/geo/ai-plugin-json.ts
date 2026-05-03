import type { AuditContext } from '../../types.js';
import { defineRule, pass, warn } from '../define-rule.js';
import { fetchPage } from '../../crawler/fetcher.js';

const AI_PLUGIN_PATH = '/.well-known/ai-plugin.json';

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export const aiPluginJsonRule = defineRule({
  id: 'geo-ai-plugin-json',
  name: 'AI Plugin Manifest',
  description:
    'Checks for /.well-known/ai-plugin.json used by AI agent frameworks (ChatGPT plugins, etc.)',
  category: 'geo',
  weight: 10,
  run: async (context: AuditContext) => {
    const origin = getOrigin(context.url);
    const manifestUrl = `${origin}${AI_PLUGIN_PATH}`;

    try {
      const result = await fetchPage(manifestUrl, 8000);

      if (result.statusCode !== 200) {
        return warn(
          'geo-ai-plugin-json',
          `No ai-plugin.json found at ${AI_PLUGIN_PATH} (HTTP ${result.statusCode})`,
          {
            manifestUrl,
            statusCode: result.statusCode,
            found: false,
            note: 'ai-plugin.json enables AI agent frameworks to discover and use your site as a plugin',
          }
        );
      }

      // Validate it's parseable JSON
      try {
        const parsed = JSON.parse(result.html) as Record<string, unknown>;
        return pass(
          'geo-ai-plugin-json',
          `Valid ai-plugin.json found at ${AI_PLUGIN_PATH}`,
          {
            manifestUrl,
            statusCode: result.statusCode,
            found: true,
            nameInManifest: typeof parsed.name_for_human === 'string' ? parsed.name_for_human : undefined,
            schemaVersion: typeof parsed.schema_version === 'string' ? parsed.schema_version : undefined,
          }
        );
      } catch {
        return warn(
          'geo-ai-plugin-json',
          `ai-plugin.json found at ${AI_PLUGIN_PATH} but contains invalid JSON`,
          {
            manifestUrl,
            statusCode: result.statusCode,
            found: true,
            valid: false,
            recommendation: 'Fix JSON syntax errors in ai-plugin.json',
          }
        );
      }
    } catch {
      return warn(
        'geo-ai-plugin-json',
        `ai-plugin.json not found at ${AI_PLUGIN_PATH} (informational)`,
        {
          manifestUrl,
          found: false,
          note: 'Not required — only relevant if you intend to expose your site as an AI plugin or agent tool',
        }
      );
    }
  },
});
