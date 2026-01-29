export type FrontmatterParseResult = {
  data: Record<string, string>
  content: string
}

import { load as loadYaml } from 'js-yaml'

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

  const endMarker = '\n---\n'
  const endIdx = normalized.indexOf(endMarker, start.length)
  if (endIdx === -1) {
    // Not valid frontmatter, treat as plain markdown.
    return { data: {}, content: raw }
  }

  const fmBlock = normalized.slice(start.length, endIdx)
  const content = normalized.slice(endIdx + endMarker.length)

  // Parse YAML frontmatter in a browser-safe way.
  // We keep the return type narrow (string values) since the UI only needs
  // a few simple fields (title/date/description).
  let yamlData: unknown = {}
  try {
    yamlData = loadYaml(fmBlock)
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
