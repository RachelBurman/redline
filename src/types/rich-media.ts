export type RichMediaMimeType = 'image/jpeg' | 'image/png'

export type RichMediaProcessingStatus = 'pending' | 'ready' | 'quarantined' | 'failed'

export interface RichMediaBlockAttributes {
  assetId: string
  altText: string
  caption: string | null
  source: string | null
  provenance: Record<string, string>
  width: number
  height: number
  byteSize: number
  mimeType: RichMediaMimeType
  contentHash: string
  processingStatus: RichMediaProcessingStatus
}

export interface RichMediaBlockDetail extends RichMediaBlockAttributes {
  url: string
  previewUrl: string
}

export type RichMediaProposalPayload = Partial<RichMediaBlockAttributes> & {
  altText?: string
  caption?: string | null
  source?: string | null
  provenance?: Record<string, string>
  beforeBlockId?: string | null
}
