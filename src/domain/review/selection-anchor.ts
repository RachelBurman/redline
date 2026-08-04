import { createHash } from 'node:crypto'

const CONTEXT_LENGTH = 32

export interface TextSelectionAnchor {
  documentVersionId: string
  blockId: string
  startOffset: number
  endOffset: number
  offsetEncoding: 'utf16'
  quote: string
  prefix: string
  suffix: string
  contentHash: string
}

export class StaleSelectionError extends Error {
  constructor(message = 'The selected text no longer matches this document version.') {
    super(message)
    this.name = 'StaleSelectionError'
  }
}

export function hashText(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function createTextSelectionAnchor(input: {
  documentVersionId: string
  blockId: string
  blockText: string
  startOffset: number
  endOffset: number
}): TextSelectionAnchor {
  const { blockText, startOffset, endOffset } = input

  if (
    !Number.isInteger(startOffset) ||
    !Number.isInteger(endOffset) ||
    startOffset < 0 ||
    endOffset < startOffset ||
    endOffset > blockText.length
  ) {
    throw new RangeError('Selection offsets must describe a valid UTF-16 range within the block.')
  }

  return {
    documentVersionId: input.documentVersionId,
    blockId: input.blockId,
    startOffset,
    endOffset,
    offsetEncoding: 'utf16',
    quote: blockText.slice(startOffset, endOffset),
    prefix: blockText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
    suffix: blockText.slice(endOffset, endOffset + CONTEXT_LENGTH),
    contentHash: hashText(blockText),
  }
}

export function assertSelectionAnchorMatches(input: {
  anchor: TextSelectionAnchor
  documentVersionId: string
  blockId: string
  blockText: string
}) {
  const { anchor, blockText } = input
  const identityMatches =
    anchor.documentVersionId === input.documentVersionId && anchor.blockId === input.blockId
  const contentMatches =
    anchor.contentHash === hashText(blockText) &&
    blockText.slice(anchor.startOffset, anchor.endOffset) === anchor.quote

  if (!identityMatches || !contentMatches) {
    throw new StaleSelectionError()
  }
}
