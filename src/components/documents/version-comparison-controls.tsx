import { GitCompareArrows } from 'lucide-react'
import { useState } from 'react'

import type { DocumentVersionSummary } from '#/types/document-versions'
import type { FormEvent } from 'react'

interface VersionComparisonControlsProps {
  onCompare: (baseVersionId: string, targetVersionId: string) => void
  versions: DocumentVersionSummary[]
}

export function VersionComparisonControls({ onCompare, versions }: VersionComparisonControlsProps) {
  const [baseVersionId, setBaseVersionId] = useState(versions[1]?.id ?? versions[0]?.id ?? '')
  const [targetVersionId, setTargetVersionId] = useState(versions[0]?.id ?? '')
  const canCompare = versions.length >= 2 && baseVersionId !== targetVersionId

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canCompare) onCompare(baseVersionId, targetVersionId)
  }

  if (versions.length < 2) {
    return (
      <p className="mb-5 rounded-xl bg-[#f6f4ee] px-4 py-3 text-xs text-[#68726e]">
        Create another version to compare changes.
      </p>
    )
  }

  return (
    <form
      className="mb-5 rounded-xl border border-[#d8d4ca] bg-[#faf9f5] p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-36 flex-1 gap-1.5 text-xs font-bold text-[#4a5550]">
          Earlier version
          <select
            className="min-h-10 rounded-lg border border-[#cbc7bd] bg-white px-3 font-normal text-[#303a36]"
            onChange={(event) => setBaseVersionId(event.target.value)}
            value={baseVersionId}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-36 flex-1 gap-1.5 text-xs font-bold text-[#4a5550]">
          Later version
          <select
            className="min-h-10 rounded-lg border border-[#cbc7bd] bg-white px-3 font-normal text-[#303a36]"
            onChange={(event) => setTargetVersionId(event.target.value)}
            value={targetVersionId}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber}
              </option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#26332e] px-4 text-xs font-bold text-white hover:bg-[#17201c] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canCompare}
          type="submit"
        >
          <GitCompareArrows aria-hidden="true" size={15} /> Compare versions
        </button>
      </div>
      {!canCompare ? (
        <p className="mt-2 text-xs font-semibold text-[#75604f]">Choose two different versions.</p>
      ) : null}
    </form>
  )
}
