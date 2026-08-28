import { LoaderCircle } from 'lucide-react'

export function DocumentLoadingState() {
  return (
    <main className="grid min-h-screen place-items-center" id="main-content">
      <output className="flex items-center gap-3 text-sm font-semibold text-[#59635f]">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> Loading document…
      </output>
    </main>
  )
}
