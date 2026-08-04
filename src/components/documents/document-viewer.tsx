import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { DocumentBlockView } from './document-block-view'

import type { DocumentDetail } from '#/types/documents'

export function DocumentViewer({ blocks }: { blocks: DocumentDetail['blocks'] }) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => (blocks[index]?.blockType === 'heading' ? 92 : 78),
    overscan: 8,
  })

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
              className="absolute top-0 left-0 w-full px-7 py-5 sm:px-12"
              data-block-id={block.id}
              data-index={virtualItem.index}
              key={block.id}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <DocumentBlockView block={block} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
