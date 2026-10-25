import { ArrowLeft, Columns2, Eye, Rows3 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'

import { useHasHydrated } from '#/hooks/use-has-hydrated'

import { useVersionComparisonLayout } from './use-version-comparison-layout'
import { VersionComparisonBlock } from './version-comparison-block'

import type { DocumentVersionComparison } from '#/types/document-versions'

interface VersionComparisonViewProps {
  comparison: DocumentVersionComparison
  onClose: () => void
  userId: string
}

const WordLevelVersionComparison = lazy(async () => {
  const module = await import('./word-level-version-comparison')
  return { default: module.WordLevelVersionComparison }
})

const wordLevelLoadingFallback = (
  <output className="flex min-h-32 items-center justify-center rounded-2xl border border-[#d8d5cc] bg-white text-sm font-semibold text-[#59635f]">
    Preparing word-level comparison…
  </output>
)

const wordLevelComparisonBlockBudget = 200
const wordLevelComparisonCharacterBudget = 500_000

export function VersionComparisonView({ comparison, onClose, userId }: VersionComparisonViewProps) {
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [useStructuredView, setUseStructuredView] = useState(false)
  const [layout, setLayout] = useVersionComparisonLayout(userId)
  const hasHydrated = useHasHydrated()
  const visibleBlocks = useMemo(
    () =>
      showUnchanged
        ? comparison.blocks
        : comparison.blocks.filter((block) => block.changeType !== 'unchanged'),
    [comparison.blocks, showUnchanged],
  )
  const changedBlockCount = useMemo(
    () => visibleBlocks.filter((block) => block.changeType !== 'unchanged').length,
    [visibleBlocks],
  )
  const changedCharacterCount = useMemo(
    () =>
      visibleBlocks.reduce(
        (total, block) =>
          block.changeType === 'unchanged'
            ? total
            : total + (block.base?.text.length ?? 0) + (block.target?.text.length ?? 0),
        0,
      ),
    [visibleBlocks],
  )
  const exceedsBlockBudget = changedBlockCount > wordLevelComparisonBlockBudget
  const exceedsCharacterBudget = changedCharacterCount > wordLevelComparisonCharacterBudget
  const exceedsWordLevelBudget = exceedsBlockBudget || exceedsCharacterBudget

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
              Word-level changes are rendered locally from these two immutable versions. This
              display cannot edit content or change proposal decisions, and unsupported content
              automatically uses the structured block view.
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e2] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div aria-label="Comparison layout" className="flex rounded-lg bg-[#efede7] p-1">
              <button
                aria-pressed={layout === 'unified'}
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-[#52605a] aria-pressed:bg-white aria-pressed:text-[#284f43] aria-pressed:shadow-sm"
                onClick={() => setLayout('unified')}
                type="button"
              >
                <Rows3 aria-hidden="true" size={14} /> Unified
              </button>
              <button
                aria-pressed={layout === 'split'}
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-[#52605a] aria-pressed:bg-white aria-pressed:text-[#284f43] aria-pressed:shadow-sm"
                onClick={() => setLayout('split')}
                type="button"
              >
                <Columns2 aria-hidden="true" size={14} /> Split
              </button>
            </div>
            <button
              className="min-h-9 rounded-lg border border-[#d4d0c7] bg-white px-3 text-xs font-bold text-[#52605a] hover:bg-[#f7f5ef]"
              disabled={exceedsWordLevelBudget}
              onClick={() => setUseStructuredView((current) => !current)}
              type="button"
            >
              {exceedsWordLevelBudget
                ? 'Word-level view unavailable'
                : useStructuredView
                  ? 'Use word-level view'
                  : 'Use structured view'}
            </button>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#52605a] hover:bg-[#f7f5ef]">
            <input
              checked={showUnchanged}
              className="size-4 accent-[#365f52]"
              onChange={(event) => setShowUnchanged(event.target.checked)}
              type="checkbox"
            />
            <Eye aria-hidden="true" size={15} /> Show unchanged blocks
          </label>
        </div>
        {exceedsWordLevelBudget ? (
          <output className="mt-3 block rounded-lg bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#745c2d]">
            {exceedsBlockBudget
              ? `This comparison has ${changedBlockCount} changed blocks.`
              : 'This comparison contains more than 500,000 changed characters.'}{' '}
            Redline is using the structured view to keep selection, browser find, and
            assistive-technology navigation responsive.
          </output>
        ) : null}
      </div>

      {visibleBlocks.length > 0 ? (
        useStructuredView || !hasHydrated || exceedsWordLevelBudget ? (
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
          <Suspense fallback={wordLevelLoadingFallback}>
            <WordLevelVersionComparison
              comparison={comparison}
              layout={layout}
              visibleBlocks={visibleBlocks}
            />
          </Suspense>
        )
      ) : (
        <div className="rounded-2xl border border-[#d8d5cc] bg-white p-8 text-center">
          <h3 className="font-serif text-xl font-semibold text-[#2f3935]">No block changes</h3>
          <p className="mt-2 text-sm text-[#6c7571]">These versions contain the same content.</p>
        </div>
      )}
    </section>
  )
}
