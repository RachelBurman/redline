import { ArrowLeft, Columns2, Rows3 } from 'lucide-react'
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
  <output className="flex min-h-32 items-center justify-center bg-white text-sm font-semibold text-[#59635f]">
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
  const summaryItems = [
    {
      className: 'text-[#405a73]',
      count: comparison.summary.modified,
      label: 'changed',
    },
    {
      className: 'text-[#287a55]',
      count: comparison.summary.added,
      label: 'added',
    },
    {
      className: 'text-[#9a4b42]',
      count: comparison.summary.removed,
      label: 'removed',
    },
  ]

  return (
    <section aria-labelledby="version-comparison-heading">
      <div className="mb-4">
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-xs font-bold text-[#52605a] hover:text-[#284f43]"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={15} /> Return to document
        </button>
        <div className="mt-2">
          <h2
            className="font-serif text-2xl font-semibold text-[#26312d]"
            id="version-comparison-heading"
          >
            Version {comparison.baseVersion.versionNumber} to version{' '}
            {comparison.targetVersion.versionNumber}
          </h2>
          <p className="mt-1 text-sm text-[#66706b]">
            Read-only comparison. Word changes are calculated locally in your browser.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#cfd5dc] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd5dc] bg-[#f6f8fa] px-3 py-2.5">
          <dl
            aria-label="Comparison summary"
            className="flex flex-wrap items-center gap-x-4 gap-y-1"
          >
            {summaryItems.map(({ className, count, label }) => (
              <div className={`flex items-baseline gap-1 text-xs ${className}`} key={label}>
                <dt>{label}</dt>
                <dd className="order-first font-bold">{count}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <div
              aria-label="Comparison layout"
              className="inline-flex overflow-hidden rounded-md border border-[#b8c0c8] bg-white"
            >
              <button
                aria-pressed={layout === 'unified'}
                className="inline-flex min-h-8 items-center gap-1.5 border-r border-[#b8c0c8] px-2.5 text-xs font-semibold text-[#52605a] aria-pressed:bg-[#e7ebee] aria-pressed:text-[#26332e] disabled:opacity-50"
                disabled={useStructuredView || exceedsWordLevelBudget}
                onClick={() => setLayout('unified')}
                type="button"
              >
                <Rows3 aria-hidden="true" size={13} /> Unified
              </button>
              <button
                aria-pressed={layout === 'split'}
                className="inline-flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-semibold text-[#52605a] aria-pressed:bg-[#e7ebee] aria-pressed:text-[#26332e] disabled:opacity-50"
                disabled={useStructuredView || exceedsWordLevelBudget}
                onClick={() => setLayout('split')}
                type="button"
              >
                <Columns2 aria-hidden="true" size={13} /> Split
              </button>
            </div>
            <button
              aria-pressed={useStructuredView}
              className="min-h-8 rounded-md border border-[#b8c0c8] bg-white px-2.5 text-xs font-semibold text-[#52605a] hover:bg-[#eef1f3] disabled:cursor-not-allowed disabled:opacity-60"
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
            <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-xs font-semibold text-[#52605a] hover:bg-[#eef1f3]">
              <input
                aria-label="Show unchanged blocks"
                checked={showUnchanged}
                className="size-4 accent-[#365f52]"
                onChange={(event) => setShowUnchanged(event.target.checked)}
                type="checkbox"
              />
              Show unchanged
            </label>
          </div>
        </div>
        {exceedsWordLevelBudget ? (
          <output className="block border-b border-[#e6d7b8] bg-[#fff8e8] px-4 py-2 text-xs leading-5 text-[#745c2d]">
            {exceedsBlockBudget
              ? `This comparison has ${changedBlockCount} changed blocks.`
              : 'This comparison contains more than 500,000 changed characters.'}{' '}
            Redline is using the structured view to keep selection, browser find, and
            assistive-technology navigation responsive.
          </output>
        ) : null}
        {visibleBlocks.length > 0 ? (
          useStructuredView || !hasHydrated || exceedsWordLevelBudget ? (
            <div aria-live="polite" className="divide-y divide-[#d8dee4]">
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
          <div className="p-8 text-center">
            <h3 className="font-serif text-xl font-semibold text-[#2f3935]">No block changes</h3>
            <p className="mt-2 text-sm text-[#6c7571]">These versions contain the same content.</p>
          </div>
        )}
      </div>
    </section>
  )
}
