import { KeyRound, LogOut, Users } from 'lucide-react'

import { BrandMark } from '#/components/brand/brand-mark'

interface WorkspaceHeaderProps {
  organizationName: string
  userName: string
  onSignOut: () => void
  isSigningOut: boolean
  canManageReviewers?: boolean
}

export function WorkspaceHeader({
  organizationName,
  userName,
  onSignOut,
  isSigningOut,
  canManageReviewers = false,
}: WorkspaceHeaderProps) {
  return (
    <header className="border-b border-[#deddd7] bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <a aria-label="Redline home" href="/">
            <BrandMark />
          </a>
          <span aria-hidden="true" className="hidden h-6 w-px bg-[#deddd7] sm:block" />
          <p className="hidden truncate text-sm font-semibold text-[#59635f] sm:block">
            {organizationName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#65706b] sm:inline">{userName}</span>
          {canManageReviewers ? (
            <a
              aria-label="Manage reviewers"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d7d5ce] bg-white px-3 text-sm font-semibold text-[#47514d] transition-colors hover:bg-[#f5f4ef]"
              href="/app/reviewers"
            >
              <Users aria-hidden="true" size={15} />
              <span className="hidden sm:inline">Reviewers</span>
            </a>
          ) : null}
          <a
            aria-label="Change password"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d7d5ce] bg-white px-3 text-sm font-semibold text-[#47514d] transition-colors hover:bg-[#f5f4ef]"
            href="/app/account"
          >
            <KeyRound aria-hidden="true" size={15} />
            <span className="hidden sm:inline">Change password</span>
          </a>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d7d5ce] bg-white px-3 text-sm font-semibold text-[#47514d] transition-colors hover:bg-[#f5f4ef] disabled:opacity-55"
            disabled={isSigningOut}
            onClick={onSignOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={15} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
