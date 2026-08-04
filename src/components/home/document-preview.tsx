import { CircleCheck } from 'lucide-react'

export function DocumentPreview() {
  return (
    <article
      aria-label="Example document being reviewed"
      className="min-h-[420px] flex-1 bg-[#f1f0ec] p-4 sm:p-7"
    >
      <div className="mx-auto min-h-[360px] max-w-[510px] rounded-sm border border-[#e7e4dc] bg-white px-7 py-8 shadow-[0_15px_45px_rgba(41,45,42,0.08)] sm:px-10">
        <div className="mb-8 flex items-center justify-between border-b border-[#eceae4] pb-3 text-[9px] font-bold tracking-[0.16em] text-[#9a9f9c] uppercase">
          <span>Version 4</span>
          <span className="inline-flex items-center gap-1.5 text-[#34705c]">
            <CircleCheck aria-hidden="true" size={12} /> Source preserved
          </span>
        </div>
        <h2 className="font-serif text-[22px] leading-tight font-semibold tracking-[-0.02em] text-[#1d2824]">
          4. Statistical methodology
        </h2>
        <p className="mt-4 font-serif text-[13px] leading-7 text-[#505955]">
          The primary analysis will include all randomised participants with at least one
          post-baseline assessment.
        </p>
        <p className="relative mt-3 rounded-md border-l-2 border-[#e86648] bg-[#fff5f0] px-3 py-2 font-serif text-[13px] leading-7 text-[#343e39]">
          Missing observations will be handled using{' '}
          <mark className="rounded-sm bg-[#f8d8cd] px-0.5 text-inherit">multiple imputation</mark>{' '}
          under a missing-at-random assumption.
          <span className="absolute -right-3 -top-2 grid size-6 place-items-center rounded-full bg-[#e86648] font-sans text-[10px] font-bold text-white shadow-sm">
            2
          </span>
        </p>
        <p className="mt-3 font-serif text-[13px] leading-7 text-[#505955]">
          Sensitivity analyses will assess the robustness of the primary conclusion.
        </p>
      </div>
    </article>
  )
}
