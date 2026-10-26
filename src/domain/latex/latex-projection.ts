import type { DocumentBlockDetail } from '#/types/documents'

const MAX_LATEX_SOURCE_LENGTH = 120_000

const headingCommands = [
  'section',
  'subsection',
  'subsubsection',
  'paragraph',
  'subparagraph',
  'subparagraph',
] as const

const simpleEscapes: Record<string, string> = {
  '#': '#',
  $: '$',
  '%': '%',
  '&': '&',
  _: '_',
  '{': '{',
  '}': '}',
}

export interface LatexBlockProjection {
  editable: boolean
  source: string
  warning: string | null
}

export type LatexParagraphParseResult = { ok: true; text: string } | { ok: false; error: string }

export function escapeLatexText(text: string) {
  let source = ''
  for (const character of text) {
    if (character === '\\') source += '\\textbackslash{}'
    else if (character === '^') source += '\\textasciicircum{}'
    else if (character === '~') source += '\\textasciitilde{}'
    else if (character === '\n') source += '\\\\'
    else if (character in simpleEscapes) source += `\\${character}`
    else source += character
  }
  return source
}

export function projectBlockToLatex(block: DocumentBlockDetail): LatexBlockProjection {
  const escapedText = escapeLatexText(block.text)

  if (block.blockType === 'heading') {
    const level = Math.min(6, Math.max(1, block.headingLevel ?? 2))
    return {
      editable: false,
      source: `\\${headingCommands[level - 1]}{${escapedText}}`,
      warning:
        'Heading source is read-only because Redline currently anchors proposals to paragraphs.',
    }
  }

  if (block.blockType === 'paragraph') {
    return { editable: true, source: escapedText, warning: null }
  }

  if (block.blockType === 'list_item') {
    return {
      editable: false,
      source: `\\item ${escapedText}`,
      warning: 'List structure is preserved for display but is not editable in this release.',
    }
  }

  if (block.blockType === 'page_break') {
    return { editable: false, source: '\\newpage', warning: null }
  }

  return {
    editable: false,
    source: `% REDLINE_UNSUPPORTED ${block.blockType}\n\\begin{verbatim}\n${block.text}\n\\end{verbatim}`,
    warning: `${block.blockType.replaceAll('_', ' ')} content is preserved as a read-only placeholder; it is never silently discarded or compiled.`,
  }
}

export function projectDocumentToLatex(blocks: DocumentBlockDetail[]) {
  return blocks.map((block) => projectBlockToLatex(block).source).join('\n\n')
}

function unsupportedCommandError(command: string) {
  return `Unsupported LaTeX command \\${command}. Use plain paragraph text and escaped special characters only.`
}

export function parseLatexParagraphSource(source: string): LatexParagraphParseResult {
  if (source.length > MAX_LATEX_SOURCE_LENGTH) {
    return {
      ok: false,
      error: `LaTeX source exceeds the ${MAX_LATEX_SOURCE_LENGTH.toLocaleString('en')} character safety limit.`,
    }
  }

  let text = ''
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!

    if (character === '\0') {
      return { ok: false, error: 'LaTeX source cannot contain null characters.' }
    }

    if (character !== '\\') {
      if (character === '{' || character === '}') {
        return {
          ok: false,
          error: `Unescaped ${character} at character ${index + 1}. Escape it as \\${character}.`,
        }
      }
      if (character === '%') {
        return {
          ok: false,
          error: `Comments are not supported. Escape % as \\% at character ${index + 1}.`,
        }
      }
      text += character
      continue
    }

    const remainder = source.slice(index)
    if (remainder.startsWith('\\textbackslash{}')) {
      text += '\\'
      index += '\\textbackslash{}'.length - 1
      continue
    }
    if (remainder.startsWith('\\textasciicircum{}')) {
      text += '^'
      index += '\\textasciicircum{}'.length - 1
      continue
    }
    if (remainder.startsWith('\\textasciitilde{}')) {
      text += '~'
      index += '\\textasciitilde{}'.length - 1
      continue
    }

    const escaped = source[index + 1]
    if (escaped === '\\') {
      text += '\n'
      index += 1
      continue
    }
    if (escaped && escaped in simpleEscapes) {
      text += simpleEscapes[escaped]
      index += 1
      continue
    }

    const command = /^\\([A-Za-z@]+)/.exec(remainder)?.[1]
    return {
      ok: false,
      error: command
        ? unsupportedCommandError(command)
        : `Unsupported escape at character ${index + 1}.`,
    }
  }

  if (text.trim().length === 0) {
    return { ok: false, error: 'A replacement paragraph cannot be empty.' }
  }

  return { ok: true, text }
}
