import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { DocumentBlockView } from './document-block-view'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewChangeType } from '#/types/reviews'

interface DocumentViewerProps {
  blocks: DocumentDetail['blocks']
  canReview: boolean
  canInsert: boolean
  selectedStableKey?: string
  onPropose: (block: DocumentDetail['blocks'][number], changeType: ReviewChangeType) => void
  onProposeInsertion: () => void
}

export function DocumentViewer({
  blocks,
  canReview,
  canInsert,
  selectedStableKey,
  onPropose,
  onProposeInsertion,
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
    <section className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[#dedbd3] bg-white shadow-[0_18px_50px_rgba(36,45,41,0.07)]">
      {canInsert ? (
        <div className="flex items-center justify-end border-b border-[#e7e4dd] bg-[#faf9f5] px-4 py-3 sm:px-6">
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d7d4cc] bg-white px-3 text-xs font-bold text-[#4f5b56] transition-colors hover:border-[#d1735b] hover:text-[#934630]"
            onClick={onProposeInsertion}
            type="button"
          >
            <Plus aria-hidden="true" size={15} />
            Add paragraph at end
          </button>
        </div>
      ) : null}
      <div
        aria-label="Document content"
        className="min-h-0 flex-1 overflow-auto"
        ref={scrollElementRef}
      >
        {blocks.length === 0 ? (
          <div className="mx-auto flex min-h-full max-w-[560px] items-center justify-center px-7 py-12 text-center">
            <p className="text-sm leading-6 text-[#68726d]">
              The resolved document is empty. You can still propose a new paragraph above.
            </p>
          </div>
        ) : (
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
                    onProposeDeletion={
                      canReview && block.blockType === 'paragraph'
                        ? () => onPropose(block, 'delete')
                        : undefined
                    }
                    onProposeReplacement={
                      canReview && block.blockType === 'paragraph'
                        ? () => onPropose(block, 'replace')
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
