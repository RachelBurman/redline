import { Radio, ShieldCheck } from 'lucide-react'

import { DocumentPreview } from './document-preview'
import { ReviewQueuePreview } from './review-queue-preview'

export function ProductPreview() {
  return (
    <section
      aria-label="Redline review workspace preview"
      className="overflow-hidden rounded-2xl border border-[#d8d6cf] bg-white shadow-[0_30px_90px_rgba(29,38,34,0.13)]"
      id="product-preview"
    >
      <div className="flex h-12 items-center border-b border-[#e0ded8] bg-[#fbfaf7] px-4">
        <div aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#e8b2a5]" />
          <span className="size-2.5 rounded-full bg-[#ead9a8]" />
          <span className="size-2.5 rounded-full bg-[#b7d5c8]" />
        </div>
        <span className="ml-4 text-[10px] font-semibold text-[#5b6661]">
          Analysis plan · Round 2
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#34705c]">
          <Radio aria-hidden="true" size={12} /> 4 reviewing now
        </span>
      </div>
      <div className="flex flex-col sm:flex-row">
        <DocumentPreview />
        <ReviewQueuePreview />
      </div>
      <div className="flex items-center gap-2 border-t border-[#dfddd7] bg-white px-4 py-2.5 text-[9px] font-medium text-[#727b77]">
        <ShieldCheck aria-hidden="true" className="text-[#34705c]" size={13} />
        Every proposal, discussion, and decision is attributed and retained.
      </div>
    </section>
  )
}
