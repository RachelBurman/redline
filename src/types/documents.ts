export interface DocumentListItem {
  id: string
  title: string
  versionId: string
  versionNumber: number
  blockCount: number
  createdAt: string
}

export interface DocumentDetail {
  document: {
    id: string
    title: string
    createdAt: string
  }
  version: {
    id: string
    versionNumber: number
    parserWarnings: string[]
    createdAt: string
  }
  reviewRound: {
    id: string
    name: string
  }
  blocks: Array<{
    id: string
    stableKey: string
    ordinal: number
    blockType:
      | 'heading'
      | 'paragraph'
      | 'list_item'
      | 'table'
      | 'table_row'
      | 'table_cell'
      | 'page_break'
      | 'unsupported'
    text: string
    headingLevel: number | null
    contentHash: string
  }>
}

export interface UploadedDocument {
  documentId: string
  documentVersionId: string
  reviewRoundId: string
  title: string
  blockCount: number
  parserWarnings: string[]
}
