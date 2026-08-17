import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url))
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

describe('ExperimentHeader source contract', () => {
  const source = readSource('./ExperimentHeader.vue')

  it('owns the shared Playground hierarchy', () => {
    expect(source.match(/<h1\b/g)).toHaveLength(1)
    expect(source).toContain('Playground')
    expect(source).toContain('{{ title }}')
    expect(source).toContain('{{ description }}')
  })

  it('requires title and description copy', () => {
    expect(source).toMatch(/title:\s*string/)
    expect(source).toMatch(/description:\s*string/)
  })
})

describe('ExperimentFooter source contract', () => {
  const source = readSource('./ExperimentFooter.vue')

  it('owns the shared conclusion and resource headings', () => {
    expect(source).toContain('What I learned')
    expect(source).toContain('Notes &amp; links')
    expect(source).toContain('{{ conclusion }}')
  })

  it('renders internal and external destinations safely', () => {
    expect(source).toContain('<RouterLink')
    expect(source).toContain(':to="link.href"')
    expect(source).toContain('target="_blank"')
    expect(source).toContain('rel="noopener noreferrer"')
    expect(source).toContain('i-lucide-external-link')
    expect(source).toContain('aria-hidden="true"')
  })

  it('requires one conclusion and a typed link list', () => {
    expect(source).toMatch(/conclusion:\s*string/)
    expect(source).toMatch(/links:\s*ExperimentLink\[\]/)
  })
})

describe('Playground page adoption', () => {
  const pagePaths = [
    '../../pages/AgentOrchestratorPage.vue',
    '../../pages/AIChatPage.vue',
    '../../pages/TiptapPlaygroundPage.vue',
    '../../pages/WatermarkPlaygroundPage.vue',
    '../../pages/VueGoPage.vue',
  ]

  for (const pagePath of pagePaths) {
    it(`${pagePath} uses one shared header and footer`, () => {
      const source = readSource(pagePath)

      expect(source).toContain("import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'")
      expect(source).toContain("import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'")
      expect(source.match(/<ExperimentHeader\b/g)).toHaveLength(1)
      expect(source.match(/<ExperimentFooter\b/g)).toHaveLength(1)
      expect(source).not.toMatch(/<h1\b/)
      expect(source).not.toMatch(/Experiment\s+\d+/)
    })
  }
})
