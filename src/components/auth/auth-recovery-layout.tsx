import { Link } from '@tanstack/react-router'
import { KeyRound, ShieldCheck } from 'lucide-react'

import { BrandMark } from '#/components/brand/brand-mark'

import type { ReactNode } from 'react'

interface AuthRecoveryLayoutProps {
  children: ReactNode
  description: string
  eyebrow?: string
  title: string
}

export function AuthRecoveryLayout({
  children,
  description,
  eyebrow = 'Account recovery',
  title,
}: AuthRecoveryLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f3f2ed] px-5 py-8 sm:px-8 sm:py-12" id="main-content">
      <div className="mx-auto max-w-lg">
        <Link aria-label="Redline home" className="inline-flex" to="/">
          <BrandMark />
        </Link>
        <section className="mt-10 rounded-2xl border border-[#dcd9d1] bg-white p-6 shadow-sm sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-[#e7f0ec] text-[#315a4e]">
            <KeyRound aria-hidden="true" size={20} />
          </span>
          <p className="mt-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#4c6d62]">
            <ShieldCheck aria-hidden="true" size={14} /> {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-[#202b27]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#68726d]">{description}</p>
          {children}
        </section>
      </div>
    </main>
  )
}
