import { diffWordsWithSpace } from 'diff'
import { useId, useMemo } from 'react'

import { mapVersionComparisonBlockToRenderer } from './map-version-comparison-block-to-renderer'
import { VersionComparisonBlock } from './version-comparison-block'
import { VersionComparisonRendererBoundary } from './version-comparison-renderer-boundary'

import type { VersionComparisonBlock as ComparisonBlock } from '#/types/document-versions'
import type { VersionComparisonLayout } from './version-comparison-layout'
import type { Change } from 'diff'
import type { ReactNode } from 'react'

interface WordLevelVersionComparisonBlockProps {
  baseVersion: { id: string; versionNumber: number }
  block: ComparisonBlock
  layout: VersionComparisonLayout
  targetVersion: { id: string; versionNumber: number }
}

function WordChanges({ changes, version }: { changes: Change[]; version: 'new' | 'old' }) {
  const content: ReactNode[] = []

  changes.forEach((change, index) => {
    const key = `${index}:${change.value.length}`
    if (change.added) {
      if (version === 'new') {
        content.push(
          <ins
            className="rounded-sm bg-[#d9eee7] px-0.5 text-[#174c3d] no-underline decoration-2"
            key={key}
          >
            <span className="sr-only">Added: </span>
            {change.value}
          </ins>,
        )
      }
      return
    }
    if (change.removed) {
      if (version === 'old') {
        content.push(
          <del
            className="rounded-sm bg-[#f7e4df] px-0.5 text-[#713b32] decoration-[#8b5147] decoration-2"
            key={key}
          >
            <span className="sr-only">Removed: </span>
            {change.value}
          </del>,
        )
      }
      return
    }
    content.push(<span key={key}>{change.value}</span>)
  })

  return content
}

function VersionText({
  changes,
  label,
  missing,
  version,
}: {
  changes: Change[]
  label: string
  missing: boolean
  version: 'new' | 'old'
}) {
  return (
    <section aria-label={label} className="min-w-0 rounded-xl border border-[#d8d5cd] bg-white p-4">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#5f6c66]">
        {label}
      </h4>
      {missing ? (
        <p className="text-sm italic leading-6 text-[#66706b]">Not present in this version.</p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#25302c] [overflow-wrap:anywhere]">
          <WordChanges changes={changes} version={version} />
        </p>
      )}
    </section>
  )
}

export function WordLevelVersionComparisonBlock({
  baseVersion,
  block,
  layout,
  targetVersion,
}: WordLevelVersionComparisonBlockProps) {
  const rendererInput = useMemo(
    () =>
      mapVersionComparisonBlockToRenderer({
        baseVersionNumber: baseVersion.versionNumber,
        block,
        targetVersionNumber: targetVersion.versionNumber,
      }),
    [baseVersion.versionNumber, block, targetVersion.versionNumber],
  )
  const changes = useMemo(
    () => (rendererInput ? diffWordsWithSpace(rendererInput.oldText, rendererInput.newText) : null),
    [rendererInput],
  )
  const headingId = useId()
  const descriptionId = useId()

  if (!rendererInput || !changes) {
    return (
      <VersionComparisonBlock
        baseVersionNumber={baseVersion.versionNumber}
        block={block}
        targetVersionNumber={targetVersion.versionNumber}
      />
    )
  }

  return (
    <VersionComparisonRendererBoundary
      baseVersionNumber={baseVersion.versionNumber}
      fallbackBlock={block}
      targetVersionNumber={targetVersion.versionNumber}
    >
      <article
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        className="rounded-2xl border border-[#cbd5df] bg-white p-4 shadow-sm"
        data-comparison-layout={layout}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-[0.08em] text-[#405a73]"
              id={headingId}
            >
              {rendererInput.changeLabel} {rendererInput.blockDescription}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#64716c]" id={descriptionId}>
              {rendererInput.accessibleDescription}
            </p>
          </div>
          <p className="text-[11px] font-semibold leading-5 text-[#55625c]">
            Removed and added words are labelled and marked independently of colour.
          </p>
        </div>
        <div className={layout === 'split' ? 'grid gap-3 md:grid-cols-2' : 'grid gap-3'}>
          <VersionText
            changes={changes}
            label={`Old version ${baseVersion.versionNumber}`}
            missing={!block.base}
            version="old"
          />
          <VersionText
            changes={changes}
            label={`New version ${targetVersion.versionNumber}`}
            missing={!block.target}
            version="new"
          />
        </div>
      </article>
    </VersionComparisonRendererBoundary>
  )
}
