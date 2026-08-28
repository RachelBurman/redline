import { ArrowLeft, Eye } from 'lucide-react'
import { useState } from 'react'

import { VersionComparisonBlock } from './version-comparison-block'

import type { DocumentVersionComparison } from '#/types/document-versions'

interface VersionComparisonViewProps {
  comparison: DocumentVersionComparison
  onClose: () => void
}

export function VersionComparisonView({ comparison, onClose }: VersionComparisonViewProps) {
  const [showUnchanged, setShowUnchanged] = useState(false)
  const visibleBlocks = showUnchanged
    ? comparison.blocks
    : comparison.blocks.filter((block) => block.changeType !== 'unchanged')

  return (
    <section aria-labelledby="version-comparison-heading">
      <div className="mb-5 rounded-2xl border border-[#d8d5cc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#75807a]">
              Version comparison
            </p>
            <h2
              className="mt-1 font-serif text-2xl font-semibold text-[#26312d]"
              id="version-comparison-heading"
            >
              Version {comparison.baseVersion.versionNumber} to version{' '}
              {comparison.targetVersion.versionNumber}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66706b]">
              This is a clean block comparison, not a marked-up document. Content absent from the
              later version is listed separately and is never shown as crossed-out text.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbc7bd] bg-white px-4 text-xs font-bold text-[#4b5651] hover:bg-[#f7f5ef]"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={15} /> Return to document
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Changed', comparison.summary.modified],
            ['Added', comparison.summary.added],
            ['Absent', comparison.summary.removed],
            ['Unchanged', comparison.summary.unchanged],
          ].map(([label, count]) => (
            <div className="rounded-xl bg-[#f5f3ed] px-4 py-3" key={label}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#737c78]">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-bold text-[#2e3935]">{count}</dd>
            </div>
          ))}
        </dl>

        <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#52605a] hover:bg-[#f7f5ef]">
          <input
            checked={showUnchanged}
            className="size-4 accent-[#365f52]"
            onChange={(event) => setShowUnchanged(event.target.checked)}
            type="checkbox"
          />
          <Eye aria-hidden="true" size={15} /> Show unchanged blocks
        </label>
      </div>

      {visibleBlocks.length > 0 ? (
        <div aria-live="polite" className="grid gap-4">
          {visibleBlocks.map((block) => (
            <VersionComparisonBlock
              baseVersionNumber={comparison.baseVersion.versionNumber}
              block={block}
              key={block.stableKey}
              targetVersionNumber={comparison.targetVersion.versionNumber}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#d8d5cc] bg-white p-8 text-center">
          <h3 className="font-serif text-xl font-semibold text-[#2f3935]">No block changes</h3>
          <p className="mt-2 text-sm text-[#6c7571]">These versions contain the same content.</p>
        </div>
      )}
    </section>
  )
}
