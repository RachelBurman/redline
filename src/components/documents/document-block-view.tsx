import { createElement } from 'react'

import type { DocumentDetail } from '#/types/documents'

type Block = DocumentDetail['blocks'][number]

interface DocumentBlockViewProps {
  block: Block
  onPropose?: () => void
}

export function DocumentBlockView({ block, onPropose }: DocumentBlockViewProps) {
  if (block.blockType === 'unsupported') {
    return (
      <aside className="rounded-xl border border-dashed border-[#d6b4a9] bg-[#fff8f5] px-4 py-3 text-sm text-[#865342]">
        {block.text}
      </aside>
    )
  }

  if (block.blockType === 'heading') {
    const level = Math.min(6, Math.max(1, block.headingLevel ?? 2))
    return createElement(
      `h${level}`,
      {
        className:
          level === 1
            ? 'font-serif text-3xl font-semibold tracking-[-0.03em] text-[#202b27]'
            : 'font-serif text-2xl font-semibold tracking-[-0.025em] text-[#26322d]',
      },
      block.text,
    )
  }

  return (
    <div className="group relative">
      <p className="pr-16 text-[15px] leading-7 text-[#303b36]">{block.text}</p>
      {onPropose ? (
        <button
          className="absolute top-0 right-0 rounded-md border border-[#ddd9d1] bg-white px-2 py-1 text-[11px] font-bold text-[#68726d] opacity-100 transition-colors hover:border-[#d1735b] hover:text-[#9e4b37] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          onClick={onPropose}
          type="button"
        >
          Review
        </button>
      ) : null}
    </div>
  )
}
