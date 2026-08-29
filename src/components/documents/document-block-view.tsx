import { createElement } from 'react'

import type { DocumentDetail } from '#/types/documents'

type Block = DocumentDetail['blocks'][number]

interface DocumentBlockViewProps {
  block: Block
  onProposeDeletion?: () => void
  onProposeReplacement?: () => void
}

export function DocumentBlockView({
  block,
  onProposeDeletion,
  onProposeReplacement,
}: DocumentBlockViewProps) {
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
      <p className="pr-44 text-[15px] leading-7 text-[#303b36]">{block.text}</p>
      {onProposeReplacement && onProposeDeletion ? (
        <div className="absolute top-0 right-0 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            className="rounded-md border border-[#ddd9d1] bg-white px-2 py-1 text-[11px] font-bold text-[#68726d] transition-colors hover:border-[#d1735b] hover:text-[#9e4b37]"
            onClick={onProposeReplacement}
            type="button"
          >
            Replace
          </button>
          <button
            className="rounded-md border border-[#ddd9d1] bg-white px-2 py-1 text-[11px] font-bold text-[#68726d] transition-colors hover:border-[#b88b53] hover:text-[#765221]"
            onClick={onProposeDeletion}
            type="button"
          >
            Propose deletion
          </button>
        </div>
      ) : null}
    </div>
  )
}
