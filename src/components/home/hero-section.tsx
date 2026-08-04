import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, GitPullRequestArrow } from 'lucide-react'

import { ProductPreview } from './product-preview'

const outcomes = [
  'Original always preserved',
  'Logical changes, not markup noise',
  'Complete decision history',
]

export function HeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-[1240px] gap-12 px-5 pb-20 pt-12 lg:grid-cols-[0.83fr_1.17fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[#d7dfda] bg-white/70 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-[#326653] uppercase">
          <GitPullRequestArrow aria-hidden="true" size={14} /> Pull-request clarity for documents
        </p>
        <h1 className="mt-7 max-w-[650px] font-serif text-[clamp(3.4rem,7vw,6.3rem)] leading-[0.92] font-medium tracking-[-0.065em] text-[#18201d]">
          Review without the wreckage.
        </h1>
        <p className="mt-7 max-w-[590px] text-[17px] leading-8 text-[#626d68]">
          A clean document on the left. Every proposal, conversation, and decision in a structured
          queue on the right. No crossed-out maze. No mystery versions.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-[#e86648] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(190,78,51,0.25)] transition-transform hover:-translate-y-0.5"
            to="/sign-up"
          >
            Start a review <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <a
            className="inline-flex items-center rounded-xl border border-[#d2d2cb] bg-white px-5 py-3.5 text-sm font-bold text-[#39433f] transition-colors hover:border-[#aeb5b0]"
            href="#principles"
          >
            See how it works
          </a>
        </div>

        <ul className="mt-8 grid gap-2.5 text-[12px] font-medium text-[#69736e]">
          {outcomes.map((outcome) => (
            <li className="flex items-center gap-2" key={outcome}>
              <CheckCircle2 aria-hidden="true" className="text-[#39705d]" size={15} />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      <ProductPreview />
    </section>
  )
}
