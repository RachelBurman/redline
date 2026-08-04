import { GitBranch, ListChecks, ScanText } from 'lucide-react'

const principles = [
  {
    icon: ScanText,
    number: '01',
    title: 'The document stays readable',
    copy: 'Suggestions are anchored to the text but processed in a separate queue. The page never becomes a wall of red marks.',
  },
  {
    icon: ListChecks,
    number: '02',
    title: 'Every change becomes a decision',
    copy: 'Replacement, insertion, deletion, question, and comment proposals carry a reason, category, priority, owner, and status.',
  },
  {
    icon: GitBranch,
    number: '03',
    title: 'History is a first-class feature',
    copy: 'Immutable versions and a tamper-evident audit trail make it clear who changed what, why it changed, and who approved it.',
  },
]

export function PrinciplesSection() {
  return (
    <section className="border-y border-[#deddd6] bg-[#eeeee8]" id="principles">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#b4543c] uppercase">
            Built for accountable work
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.04em] text-[#1d2824] sm:text-5xl">
            Review should reduce uncertainty, not create it.
          </h2>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[#d7d6cf] bg-[#d7d6cf] lg:grid-cols-3">
          {principles.map((principle) => {
            const Icon = principle.icon
            return (
              <article className="min-h-[285px] bg-[#f8f7f3] p-7 sm:p-9" key={principle.number}>
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#e2ebe6] text-[#356a57]">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#9ca19e]">
                    {principle.number}
                  </span>
                </div>
                <h3 className="mt-9 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#202a26]">
                  {principle.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#68726e]">{principle.copy}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
