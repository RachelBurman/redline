import { GitBranch } from 'lucide-react'
import { useState } from 'react'

import { apiRequest } from '#/lib/api-client'

import { CreateDocumentVersionSection } from './create-document-version-section'
import { DocumentVersionListItem } from './document-version-list-item'
import { VersionComparisonControls } from './version-comparison-controls'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'

interface VersionHistoryPanelProps {
  canManageVersions: boolean
  currentVersionId: string
  documentId: string
  onCompareVersions: (baseVersionId: string, targetVersionId: string) => void
  onVersionChanged: (result: VersionActionResult) => Promise<void>
  onViewVersion: (versionId: string | null) => void
  versions: DocumentVersionSummary[]
  viewedVersionId: string | null
}

export function VersionHistoryPanel({
  canManageVersions,
  currentVersionId,
  documentId,
  onCompareVersions,
  onVersionChanged,
  onViewVersion,
  versions,
  viewedVersionId,
}: VersionHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pendingAction, setPendingAction] = useState<'create' | 'restore' | null>(null)
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const currentVersion = versions.find((version) => version.id === currentVersionId)

  async function handleCreateVersion(note: string) {
    setPendingAction('create')
    setMessage(null)
    try {
      const result = await apiRequest<VersionActionResult>(
        `/api/v1/documents/${documentId}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedCurrentVersionId: currentVersionId,
            note: note.trim() || undefined,
          }),
        },
      )
      await onVersionChanged(result)
      setMessage(`Version ${result.versionNumber} created.`)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The version could not be created.')
      return false
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRestoreVersion(versionId: string, reason: string) {
    setPendingAction('restore')
    setMessage(null)
    try {
      const result = await apiRequest<VersionActionResult>(
        `/api/v1/documents/${documentId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedCurrentVersionId: currentVersionId,
            reason,
          }),
        },
      )
      await onVersionChanged(result)
      setMessage(`Version ${result.versionNumber} created from the restored content.`)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The version could not be restored.')
      return false
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDownload(version: DocumentVersionSummary) {
    setDownloadingVersionId(version.id)
    setMessage(null)
    try {
      const response = await fetch(
        `/api/v1/documents/${documentId}/versions/${version.id}/exports`,
        { method: 'POST' },
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        throw new Error(body?.error?.message ?? 'The version could not be downloaded.')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = objectUrl
      link.download = `document-v${version.versionNumber}.docx`
      link.click()
      URL.revokeObjectURL(objectUrl)
      setMessage(`Version ${version.versionNumber} downloaded.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The version download failed.')
    } finally {
      setDownloadingVersionId(null)
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-[#d9d6ce] bg-white shadow-sm">
      <button
        aria-controls="document-version-history"
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 font-bold text-[#35413c] hover:bg-[#faf9f5]"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <GitBranch aria-hidden="true" size={17} /> Version history
        </span>
        <span className="text-xs font-semibold text-[#717b76]">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-[#ebe8e1] px-5 py-5" id="document-version-history">
          {canManageVersions && currentVersion ? (
            <CreateDocumentVersionSection
              currentVersion={currentVersion}
              isSubmitting={pendingAction === 'create'}
              onCreate={handleCreateVersion}
            />
          ) : null}

          <VersionComparisonControls onCompare={onCompareVersions} versions={versions} />

          <ol aria-label="Document versions" className="grid gap-3">
            {versions.map((version) => (
              <DocumentVersionListItem
                access={canManageVersions ? 'manager' : 'reader'}
                actionState={
                  downloadingVersionId === version.id
                    ? 'downloading'
                    : pendingAction === 'restore'
                      ? 'restoring'
                      : 'idle'
                }
                currentVersionNumber={currentVersion?.versionNumber ?? version.versionNumber}
                key={version.id}
                onDownload={(selectedVersion) => void handleDownload(selectedVersion)}
                onRestore={handleRestoreVersion}
                onView={onViewVersion}
                version={version}
                viewState={
                  viewedVersionId === version.id || (viewedVersionId === null && version.isCurrent)
                    ? 'viewing'
                    : 'available'
                }
              />
            ))}
          </ol>

          {message ? (
            <output aria-live="polite" className="mt-4 block text-xs font-semibold text-[#48534e]">
              {message}
            </output>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
