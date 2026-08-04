import { XMLParser } from 'fast-xml-parser'
import { strFromU8, unzipSync } from 'fflate'

import { hashText } from '#/domain/review/selection-anchor'

const MAX_UNCOMPRESSED_PACKAGE_BYTES = 80 * 1024 * 1024
export const DOCX_PARSER_VERSION = 'ooxml-blocks-v1'

type OrderedXmlNode = Record<string, unknown> & {
  ':@'?: Record<string, string>
}

export interface ParsedDocumentBlock {
  stableKey: string
  ordinal: number
  blockType: 'heading' | 'paragraph' | 'unsupported'
  text: string
  headingLevel: number | null
  contentHash: string
  attributes: Record<string, unknown>
}

export interface ParsedDocx {
  blocks: ParsedDocumentBlock[]
  warnings: string[]
  parserVersion: string
}

export class DocxParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocxParseError'
  }
}

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: false,
  trimValues: false,
})

function asNodes(value: unknown): OrderedXmlNode[] {
  return Array.isArray(value) ? (value as OrderedXmlNode[]) : []
}

function findFirstNode(nodes: OrderedXmlNode[], name: string): OrderedXmlNode | undefined {
  for (const node of nodes) {
    if (name in node) {
      return node
    }

    for (const [key, value] of Object.entries(node)) {
      if (key !== ':@' && Array.isArray(value)) {
        const found = findFirstNode(asNodes(value), name)
        if (found) return found
      }
    }
  }

  return undefined
}

function findNodes(nodes: OrderedXmlNode[], name: string, found: OrderedXmlNode[] = []) {
  for (const node of nodes) {
    if (name in node) {
      found.push(node)
    }

    for (const [key, value] of Object.entries(node)) {
      if (key !== ':@' && Array.isArray(value)) {
        findNodes(asNodes(value), name, found)
      }
    }
  }

  return found
}

function nodeChildren(node: OrderedXmlNode, name: string) {
  return asNodes(node[name])
}

function nodeAttribute(node: OrderedXmlNode | undefined, name: string) {
  return node?.[':@']?.[`@_${name}`]
}

function parseHeadingLevel(value: string | undefined) {
  if (!value) return null
  const match = /(?:heading|title)[^0-9]*([1-6])/i.exec(value)
  return match?.[1] ? Number(match[1]) : null
}

function createStyleHeadingMap(stylesXml: string | undefined) {
  const headingByStyle = new Map<string, number>()
  if (!stylesXml) return headingByStyle

  const styles = asNodes(xmlParser.parse(stylesXml))

  for (const styleNode of findNodes(styles, 'w:style')) {
    const styleId = nodeAttribute(styleNode, 'w:styleId')
    if (!styleId) continue

    const styleChildren = nodeChildren(styleNode, 'w:style')
    const styleName = nodeAttribute(findFirstNode(styleChildren, 'w:name'), 'w:val')
    const outlineValue = nodeAttribute(findFirstNode(styleChildren, 'w:outlineLvl'), 'w:val')
    const outlineLevel = outlineValue === undefined ? null : Number(outlineValue) + 1
    const headingLevel =
      parseHeadingLevel(styleName) ??
      parseHeadingLevel(styleId) ??
      (outlineLevel && outlineLevel >= 1 && outlineLevel <= 6 ? outlineLevel : null)

    if (headingLevel) headingByStyle.set(styleId, headingLevel)
  }

  return headingByStyle
}

interface TextState {
  trackedChanges: boolean
}

function collectVisibleText(nodes: OrderedXmlNode[], state: TextState): string {
  let text = ''

  for (const node of nodes) {
    if ('w:del' in node || 'w:moveFrom' in node) {
      state.trackedChanges = true
      continue
    }

    if ('w:ins' in node || 'w:moveTo' in node) {
      state.trackedChanges = true
    }

    if ('w:t' in node) {
      text += collectVisibleText(nodeChildren(node, 'w:t'), state)
      continue
    }

    if ('#text' in node) {
      text += String(node['#text'] ?? '')
      continue
    }

    if ('w:tab' in node) {
      text += '\t'
      continue
    }

    if ('w:br' in node || 'w:cr' in node) {
      text += '\n'
      continue
    }

    if ('w:noBreakHyphen' in node) {
      text += '‑'
      continue
    }

    for (const [key, value] of Object.entries(node)) {
      if (key !== ':@' && Array.isArray(value)) {
        text += collectVisibleText(asNodes(value), state)
      }
    }
  }

  return text
}

function uniqueStableKey(candidate: string, seen: Set<string>) {
  let key = candidate
  let duplicate = 2

  while (seen.has(key)) {
    key = `${candidate}-${duplicate}`
    duplicate += 1
  }

  seen.add(key)
  return key
}

export function parseDocx(bytes: Uint8Array): ParsedDocx {
  let packageFiles: Record<string, Uint8Array>

  try {
    packageFiles = unzipSync(bytes)
  } catch {
    throw new DocxParseError('The Word document ZIP package could not be opened.')
  }

  const uncompressedBytes = Object.values(packageFiles).reduce(
    (total, file) => total + file.byteLength,
    0,
  )
  if (uncompressedBytes > MAX_UNCOMPRESSED_PACKAGE_BYTES) {
    throw new DocxParseError('The expanded Word document is too large to process safely.')
  }

  if (!packageFiles['[Content_Types].xml'] || !packageFiles['word/document.xml']) {
    throw new DocxParseError('The ZIP package is missing required Word document content.')
  }

  const documentXml = strFromU8(packageFiles['word/document.xml'])
  const stylesXml = packageFiles['word/styles.xml']
    ? strFromU8(packageFiles['word/styles.xml'])
    : undefined

  let documentNodes: OrderedXmlNode[]
  try {
    documentNodes = asNodes(xmlParser.parse(documentXml))
  } catch {
    throw new DocxParseError('The main Word document XML could not be parsed.')
  }

  const bodyNode = findFirstNode(documentNodes, 'w:body')
  if (!bodyNode) {
    throw new DocxParseError('The Word document does not contain a document body.')
  }

  const headingByStyle = createStyleHeadingMap(stylesXml)
  const blocks: ParsedDocumentBlock[] = []
  const warnings = new Set<string>()
  const stableKeys = new Set<string>()
  const textState: TextState = { trackedChanges: false }
  let skippedEmptyParagraphs = 0

  for (const bodyChild of nodeChildren(bodyNode, 'w:body')) {
    if ('w:tbl' in bodyChild) {
      const text = '[Table omitted from this review preview]'
      blocks.push({
        stableKey: uniqueStableKey(`unsupported-table-${blocks.length}`, stableKeys),
        ordinal: blocks.length,
        blockType: 'unsupported',
        text,
        headingLevel: null,
        contentHash: hashText(text),
        attributes: { sourceType: 'table' },
      })
      warnings.add('Tables are represented as unsupported placeholders in this version.')
      continue
    }

    if (!('w:p' in bodyChild)) continue

    const paragraphNodes = nodeChildren(bodyChild, 'w:p')
    const text = collectVisibleText(paragraphNodes, textState).replace(/\r\n?/g, '\n').trim()
    const hasDrawing = Boolean(findFirstNode(paragraphNodes, 'w:drawing'))

    if (!text && !hasDrawing) {
      skippedEmptyParagraphs += 1
      continue
    }

    if (hasDrawing && !text) {
      const placeholder = '[Visual content omitted from this review preview]'
      blocks.push({
        stableKey: uniqueStableKey(`unsupported-visual-${blocks.length}`, stableKeys),
        ordinal: blocks.length,
        blockType: 'unsupported',
        text: placeholder,
        headingLevel: null,
        contentHash: hashText(placeholder),
        attributes: { sourceType: 'drawing' },
      })
      warnings.add('Visual content is represented as an unsupported placeholder in this version.')
      continue
    }

    if (hasDrawing) {
      warnings.add('Inline visual content is not shown in this version.')
    }

    const styleId = nodeAttribute(findFirstNode(paragraphNodes, 'w:pStyle'), 'w:val')
    const outlineValue = nodeAttribute(findFirstNode(paragraphNodes, 'w:outlineLvl'), 'w:val')
    const outlineLevel = outlineValue === undefined ? null : Number(outlineValue) + 1
    const headingLevel =
      (styleId ? headingByStyle.get(styleId) : undefined) ??
      parseHeadingLevel(styleId) ??
      (outlineLevel && outlineLevel >= 1 && outlineLevel <= 6 ? outlineLevel : null)
    const paraId = nodeAttribute(bodyChild, 'w14:paraId')
    const fallbackKey = `block-${blocks.length}-${hashText(text).slice(0, 12)}`

    blocks.push({
      stableKey: uniqueStableKey(paraId ? `para-${paraId.toLowerCase()}` : fallbackKey, stableKeys),
      ordinal: blocks.length,
      blockType: headingLevel ? 'heading' : 'paragraph',
      text,
      headingLevel,
      contentHash: hashText(text),
      attributes: styleId ? { sourceStyleId: styleId } : {},
    })
  }

  if (textState.trackedChanges) {
    warnings.add('Tracked revisions were flattened to the current visible text during import.')
  }
  if (skippedEmptyParagraphs > 0) {
    warnings.add(`${skippedEmptyParagraphs} empty layout paragraph(s) were omitted.`)
  }
  if (blocks.length === 0) {
    throw new DocxParseError('The Word document did not contain reviewable headings or paragraphs.')
  }

  return {
    blocks,
    warnings: [...warnings],
    parserVersion: DOCX_PARSER_VERSION,
  }
}
