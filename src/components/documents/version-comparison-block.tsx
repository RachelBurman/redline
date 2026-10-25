import { VersionComparisonBlockCard } from './version-comparison-block-card'

import type { VersionComparisonBlock as ComparisonBlock } from '#/types/document-versions'

const changeLabels = {
  added: 'Added',
  modified: 'Changed',
  removed: 'Absent from later version',
  unchanged: 'Unchanged',
} as const

const changeStyles = {
  added: 'bg-[#e8f4ed] text-[#28584b]',
  modified: 'bg-[#eef2f5] text-[#405a73]',
  removed: 'bg-[#f8ece9] text-[#7a4038]',
  unchanged: 'bg-[#f3f4f2] text-[#68716d]',
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
    <article aria-label={`${changeLabels[block.changeType]} document block`} className="bg-white">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-[#d8dee4] px-3 py-2 ${changeStyles[block.changeType]}`}
      >
        <h3 className="text-xs font-semibold">{changeLabels[block.changeType]}</h3>
        {block.changeType === 'removed' ? (
          <p className="text-xs font-semibold">Not present in version {targetVersionNumber}</p>
        ) : null}
      </div>
      <div
        className={
          block.changeType === 'modified'
            ? 'grid divide-y divide-[#d8dee4] lg:grid-cols-2 lg:divide-x lg:divide-y-0'
            : 'grid'
        }
      >
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
