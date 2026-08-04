import { Link } from '@tanstack/react-router'

import { BrandMark } from '#/components/brand/brand-mark'

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-[76px] w-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
      <Link aria-label="Redline home" to="/">
        <BrandMark />
      </Link>

      <nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-7">
        <a
          className="hidden text-sm font-medium text-[#65706b] transition-colors hover:text-[#18201d] sm:inline"
          href="#principles"
        >
          How it works
        </a>
        <Link
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[#47514d] transition-colors hover:bg-white hover:text-[#18201d]"
          to="/sign-in"
        >
          Sign in
        </Link>
        <Link
          className="rounded-lg bg-[#18201d] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(24,32,29,0.14)] transition-transform hover:-translate-y-0.5"
          to="/sign-up"
        >
          Create workspace
        </Link>
      </nav>
    </header>
  )
}
