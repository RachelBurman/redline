import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { DocumentBlockView } from './document-block-view'

import type { DocumentDetail } from '#/types/documents'

interface DocumentViewerProps {
  blocks: DocumentDetail['blocks']
  canReview: boolean
  selectedStableKey?: string
  onPropose: (block: DocumentDetail['blocks'][number]) => void
}

export function DocumentViewer({
  blocks,
  canReview,
  selectedStableKey,
  onPropose,
}: DocumentViewerProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => (blocks[index]?.blockType === 'heading' ? 92 : 78),
    overscan: 8,
  })

  useEffect(() => {
    if (!selectedStableKey) return
    const index = blocks.findIndex((block) => block.stableKey === selectedStableKey)
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center' })
  }, [blocks, selectedStableKey, virtualizer])

  return (
    <div
      aria-label="Document content"
      className="h-[calc(100vh-12rem)] min-h-[520px] overflow-auto rounded-2xl border border-[#dedbd3] bg-white shadow-[0_18px_50px_rgba(36,45,41,0.07)]"
      ref={scrollElementRef}
    >
      <div
        className="relative mx-auto w-full max-w-[760px]"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const block = blocks[virtualItem.index]
          if (!block) return null

          return (
            <div
              className={`absolute top-0 left-0 w-full px-7 py-5 sm:px-12 ${
                selectedStableKey === block.stableKey
                  ? 'bg-[#fff3ee] ring-2 ring-inset ring-[#edb8a8]'
                  : ''
              }`}
              data-block-id={block.id}
              data-index={virtualItem.index}
              key={block.id}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <DocumentBlockView
                block={block}
                onPropose={
                  canReview && block.blockType === 'paragraph' ? () => onPropose(block) : undefined
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
