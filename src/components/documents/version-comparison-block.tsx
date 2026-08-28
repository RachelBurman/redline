import { VersionComparisonBlockCard } from './version-comparison-block-card'

import type { VersionComparisonBlock as ComparisonBlock } from '#/types/document-versions'

const changeLabels = {
  added: 'Added',
  modified: 'Changed',
  removed: 'Absent from later version',
  unchanged: 'Unchanged',
} as const

const changeStyles = {
  added: 'border-[#b9d8ce] bg-[#f4fbf8] text-[#28584b]',
  modified: 'border-[#c7d2df] bg-[#f6f8fb] text-[#405a73]',
  removed: 'border-[#dcc99f] bg-[#fffbf1] text-[#725c2e]',
  unchanged: 'border-[#dedbd3] bg-[#faf9f6] text-[#68716d]',
} as const

interface VersionComparisonBlockProps {
  baseVersionNumber: number
  block: ComparisonBlock
  targetVersionNumber: number
}

export function VersionComparisonBlock({
  baseVersionNumber,
  block,
  targetVersionNumber,
}: VersionComparisonBlockProps) {
  return (
    <article
      aria-label={`${changeLabels[block.changeType]} document block`}
      className={`rounded-2xl border p-4 ${changeStyles[block.changeType]}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em]">
          {changeLabels[block.changeType]}
        </h3>
        {block.changeType === 'removed' ? (
          <p className="text-xs font-semibold">Not present in version {targetVersionNumber}</p>
        ) : null}
      </div>
      <div className={block.changeType === 'modified' ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
        {block.base ? (
          <VersionComparisonBlockCard
            label={
              block.changeType === 'unchanged'
                ? `Versions ${baseVersionNumber} and ${targetVersionNumber}`
                : `Version ${baseVersionNumber}`
            }
            snapshot={block.base}
          />
        ) : null}
        {block.target && block.changeType !== 'unchanged' ? (
          <VersionComparisonBlockCard
            label={`Version ${targetVersionNumber}`}
            snapshot={block.target}
          />
        ) : null}
      </div>
    </article>
  )
}
