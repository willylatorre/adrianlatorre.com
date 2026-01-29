export type FrontmatterParseResult = {
  data: Record<string, string>
  content: string
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

  const data: Record<string, string> = {}
  for (const line of fmBlock.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sep = trimmed.indexOf(':')
    if (sep === -1) continue

    const key = trimmed.slice(0, sep).trim()
    if (!key) continue

    let value = trimmed.slice(sep + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    data[key] = value
  }

  return { data, content }
}
