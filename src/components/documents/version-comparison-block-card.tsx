import type { VersionComparisonBlockSnapshot } from '#/types/document-versions'

interface VersionComparisonBlockCardProps {
  label: string
  snapshot: VersionComparisonBlockSnapshot
}

function blockDescription(snapshot: VersionComparisonBlockSnapshot) {
  if (snapshot.blockType === 'heading') return `Heading level ${snapshot.headingLevel ?? 1}`
  return snapshot.blockType.replaceAll('_', ' ')
}

export function VersionComparisonBlockCard({ label, snapshot }: VersionComparisonBlockCardProps) {
  return (
    <div className="rounded-xl border border-[#d8d5cd] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7772]">
        <span>{label}</span>
        <span>{blockDescription(snapshot)}</span>
      </div>
      <p
        className={`whitespace-pre-wrap text-[#25302c] ${
          snapshot.blockType === 'heading'
            ? 'font-serif text-lg font-semibold leading-7'
            : 'text-sm leading-6'
        }`}
      >
        {snapshot.text || 'Empty block'}
      </p>
    </div>
  )
}
