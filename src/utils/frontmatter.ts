export type FrontmatterParseResult = {
  data: Record<string, string>
  content: string
}

import { JSON_SCHEMA, load as loadYaml } from 'js-yaml'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Lightweight frontmatter parser for browser usage.
 *
 * Supports the common pattern:
 * ---
 * key: value
 * other: "quoted value"
 * ---
 * markdown content...
 */
export function parseFrontmatter(raw: string): FrontmatterParseResult {
  const normalized = raw.replace(/\r\n?/g, '\n')
  const start = '---\n'

  if (!normalized.startsWith(start)) {
    return { data: {}, content: raw }
  }

  // Find closing marker. Support both:
  // - '---\n...\n---\n<content>'
  // - '---\n...\n---' (EOF)
  const endMarker = '\n---\n'
  let endIdx = normalized.indexOf(endMarker, start.length)
  let content: string

  if (endIdx !== -1) {
    content = normalized.slice(endIdx + endMarker.length)
  } else if (normalized.endsWith('\n---')) {
    endIdx = normalized.lastIndexOf('\n---')
    content = ''
  } else {
    // Not valid frontmatter, treat as plain markdown.
    return { data: {}, content: raw }
  }

  const fmBlock = normalized.slice(start.length, endIdx)

  // Parse YAML frontmatter in a browser-safe way.
  // We keep the return type narrow (string values) since the UI only needs
  // a few simple fields (title/date/description).
  let yamlData: unknown = {}
  try {
    // Use JSON schema to avoid implicit types (e.g. timestamps -> Date).
    yamlData = loadYaml(fmBlock, { schema: JSON_SCHEMA })
  } catch {
    yamlData = {}
  }

  const data: Record<string, string> = {}
  if (isRecord(yamlData)) {
    for (const [key, value] of Object.entries(yamlData)) {
      if (typeof value === 'string') data[key] = value
      else if (typeof value === 'number' || typeof value === 'boolean') data[key] = String(value)
    }
  }

  return { data, content }
}
