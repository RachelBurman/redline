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
  const isOldVersion = version === 'old'

  return (
    <section
      aria-label={label}
      className={`min-w-0 ${isOldVersion ? 'bg-[#fff8f7]' : 'bg-[#f5fbf7]'}`}
    >
      <div className="flex items-center gap-2 border-b border-[#d8dee4] bg-white px-3 py-2">
        <span
          aria-hidden="true"
          className={`flex size-5 items-center justify-center rounded text-sm font-bold ${
            isOldVersion ? 'bg-[#f6d8d3] text-[#8c342b]' : 'bg-[#ccebd7] text-[#216e45]'
          }`}
        >
          {isOldVersion ? '−' : '+'}
        </span>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#57625d]">
          {label}
        </h4>
      </div>
      <div className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)]">
        <span
          aria-hidden="true"
          className={`flex justify-center border-r border-[#d8dee4] pt-3 text-sm select-none ${
            isOldVersion ? 'bg-[#f9e4e1] text-[#9a4b42]' : 'bg-[#daf0e2] text-[#287a55]'
          }`}
        >
          {isOldVersion ? '−' : '+'}
        </span>
        {missing ? (
          <p className="px-4 py-3 text-sm italic leading-7 text-[#66706b]">
            Not present in this version.
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-7 text-[#25302c] [overflow-wrap:anywhere]">
            <WordChanges changes={changes} version={version} />
          </p>
        )}
      </div>
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
        className="bg-white"
        data-comparison-layout={layout}
      >
        <div className="border-b border-[#d8dee4] bg-[#eef2f5] px-3 py-2">
          <h3 className="text-xs font-semibold text-[#40505d]" id={headingId}>
            {rendererInput.changeLabel} {rendererInput.blockDescription}
          </h3>
          <p className="sr-only" id={descriptionId}>
            {rendererInput.accessibleDescription}
          </p>
        </div>
        <div
          className={
            layout === 'split'
              ? 'grid divide-y divide-[#d8dee4] md:grid-cols-2 md:divide-x md:divide-y-0'
              : 'grid divide-y divide-[#d8dee4]'
          }
        >
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
