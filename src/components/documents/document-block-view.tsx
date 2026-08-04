import { createElement } from 'react'

import type { DocumentDetail } from '#/types/documents'

type Block = DocumentDetail['blocks'][number]

export function DocumentBlockView({ block }: { block: Block }) {
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

  return <p className="text-[15px] leading-7 text-[#303b36]">{block.text}</p>
}
