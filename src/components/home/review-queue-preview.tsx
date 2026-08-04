import { Check, MessageSquareText, X } from 'lucide-react'

export function ReviewQueuePreview() {
  return (
    <aside
      aria-label="Example review decision queue"
      className="w-full border-t border-[#deddd7] bg-[#fbfaf7] sm:w-[310px] sm:border-t-0 sm:border-l"
    >
      <div className="border-b border-[#e4e2dc] px-5 py-4">
        <p className="text-[9px] font-bold tracking-[0.14em] text-[#8a918d] uppercase">
          Decision queue
        </p>
        <div className="mt-1 flex items-end justify-between">
          <h3 className="font-serif text-lg font-semibold text-[#1d2824]">Open reviews</h3>
          <span className="rounded-full bg-[#f1ded6] px-2 py-0.5 text-[10px] font-bold text-[#a44d35]">
            2 open
          </span>
        </div>
      </div>

      <div className="p-3.5">
        <article className="rounded-xl border border-[#dedbd3] bg-white p-4 shadow-[0_8px_24px_rgba(45,48,45,0.06)]">
          <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.08em] uppercase">
            <span className="size-2 rounded-full bg-[#d35c3f]" />
            <span className="text-[#8c4b3a]">Statistical issue</span>
            <span className="ml-auto rounded-full bg-[#fff0ea] px-2 py-1 text-[#a44d35]">High</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px]">
            <span className="grid size-7 place-items-center rounded-full bg-[#dcebe5] font-bold text-[#2d6955]">
              AR
            </span>
            <span className="font-semibold text-[#424c48]">Aisha Rahman</span>
            <span className="ml-auto text-[#989d9a]">12 min ago</span>
          </div>

          <div className="mt-4 space-y-2 text-[11px] leading-5">
            <div className="rounded-lg border border-[#eaded9] bg-[#fff7f4] p-2.5">
              <span className="mb-1 block text-[8px] font-bold tracking-[0.12em] text-[#a76b5b] uppercase">
                Current
              </span>
              multiple imputation
            </div>
            <div className="rounded-lg border border-[#d9e6df] bg-[#f4faf6] p-2.5">
              <span className="mb-1 block text-[8px] font-bold tracking-[0.12em] text-[#4f806d] uppercase">
                Proposed
              </span>
              multiple imputation using chained equations
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-4 text-[#69736e]">
            The imputation method must be specified for reproducibility.
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-[#eceae4] pt-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] text-[#808783]">
              <MessageSquareText aria-hidden="true" size={13} /> 3 replies
            </span>
            <div className="flex gap-1.5" aria-label="Example decision actions">
              <button
                aria-label="Reject example proposal"
                className="grid size-8 place-items-center rounded-lg border border-[#ddd9d2] text-[#8a5145] transition-colors hover:bg-[#fff5f1]"
                type="button"
              >
                <X aria-hidden="true" size={15} />
              </button>
              <button
                aria-label="Accept example proposal"
                className="grid size-8 place-items-center rounded-lg bg-[#27634f] text-white transition-colors hover:bg-[#1e503f]"
                type="button"
              >
                <Check aria-hidden="true" size={15} />
              </button>
            </div>
          </div>
        </article>
      </div>
    </aside>
  )
}
