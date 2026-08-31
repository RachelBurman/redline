import { Link } from '@tanstack/react-router'
import { FileCheck2, History, ShieldCheck } from 'lucide-react'

import { AuthForm } from '#/components/auth/auth-form'
import { BrandMark } from '#/components/brand/brand-mark'
import { buildAuthHref, getSafeAuthRedirect } from '#/domain/auth/safe-auth-redirect'

import type { AuthMode } from '#/components/auth/auth-form'

const assurances = [
  { icon: FileCheck2, text: 'Original files remain immutable' },
  { icon: History, text: 'Every decision is retained' },
  { icon: ShieldCheck, text: 'Roles are enforced on the server' },
]

export function AuthPage({ mode, redirectTo = '/app' }: { mode: AuthMode; redirectTo?: string }) {
  const isSignUp = mode === 'sign-up'
  const safeRedirect = getSafeAuthRedirect(redirectTo)

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]" id="main-content">
      <section className="hidden bg-[#1c2924] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link aria-label="Redline home" className="brightness-0 invert" to="/">
          <BrandMark />
        </Link>
        <div className="max-w-xl">
          <p className="text-xs font-bold tracking-[0.16em] text-[#9fc2b3] uppercase">
            A clearer record of review
          </p>
          <h1 className="mt-5 font-serif text-6xl leading-[1.02] font-medium tracking-[-0.05em]">
            Make each change explain itself.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#c2cec8]">
            Keep the document readable while proposals, discussions, decisions, and versions remain
            fully attributable.
          </p>
        </div>
        <ul className="grid gap-3 text-sm text-[#c6d2cc]">
          {assurances.map((assurance) => {
            const Icon = assurance.icon
            return (
              <li className="flex items-center gap-3" key={assurance.text}>
                <span className="grid size-8 place-items-center rounded-lg bg-white/8 text-[#a8cabb]">
                  <Icon aria-hidden="true" size={15} />
                </span>
                {assurance.text}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[430px]">
          <Link aria-label="Redline home" className="mb-12 inline-flex lg:hidden" to="/">
            <BrandMark />
          </Link>
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#b4543c] uppercase">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#1d2824]">
            {isSignUp ? 'Start your first review.' : 'Continue your reviews.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6b7570]">
            {isSignUp
              ? 'Your organisation and first project will be prepared automatically.'
              : 'Use the email and password associated with your Redline account.'}
          </p>

          <AuthForm mode={mode} redirectTo={safeRedirect} />

          <p className="mt-6 text-center text-sm text-[#737c78]">
            {isSignUp ? 'Already have an account?' : 'New to Redline?'}{' '}
            <a
              className="font-bold text-[#9f4b36] underline-offset-4 hover:underline"
              href={buildAuthHref(isSignUp ? '/sign-in' : '/sign-up', safeRedirect)}
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
