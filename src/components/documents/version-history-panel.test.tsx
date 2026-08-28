import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VersionHistoryPanel } from './version-history-panel'

import type { DocumentVersionSummary, VersionActionResult } from '#/types/document-versions'

const versions: DocumentVersionSummary[] = [
  {
    id: 'version-2',
    versionNumber: 2,
    origin: 'checkpoint',
    note: 'Approved statistical corrections',
    parentVersionId: 'version-1',
    restoredFromVersion: null,
    createdBy: { id: 'user-1', name: 'Aisha Rahman' },
    createdAt: '2026-08-25T10:00:00.000Z',
    publishedAt: '2026-08-25T10:00:00.000Z',
    isCurrent: true,
    blockCount: 3,
    acceptedChangeCount: 1,
    unresolvedReviewItemCount: 2,
  },
  {
    id: 'version-1',
    versionNumber: 1,
    origin: 'upload',
    note: null,
    parentVersionId: null,
    restoredFromVersion: null,
    createdBy: { id: 'user-1', name: 'Aisha Rahman' },
    createdAt: '2026-08-24T10:00:00.000Z',
    publishedAt: '2026-08-24T10:00:00.000Z',
    isCurrent: false,
    blockCount: 3,
    acceptedChangeCount: 1,
    unresolvedReviewItemCount: 0,
  },
]

const createdVersion: VersionActionResult = {
  documentId: 'document-1',
  previousVersionId: 'version-2',
  documentVersionId: 'version-3',
  versionNumber: 3,
  reviewRoundId: 'round-3',
  acceptedChangeCount: 1,
  supersededReviewItemCount: 2,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderPanel(onVersionChanged = vi.fn<(result: VersionActionResult) => Promise<void>>()) {
  render(
    <VersionHistoryPanel
      canManageVersions
      currentVersionId="version-2"
      documentId="document-1"
      onCompareVersions={vi.fn<(baseVersionId: string, targetVersionId: string) => void>()}
      onVersionChanged={onVersionChanged}
      onViewVersion={vi.fn<(versionId: string | null) => void>()}
      versions={versions}
      viewedVersionId={null}
    />,
  )
  return onVersionChanged
}

describe('VersionHistoryPanel', () => {
  it('creates a version explicitly from accepted changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: createdVersion }, { status: 201 })),
    )
    const onVersionChanged = renderPanel()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Version history/ }))
    await user.click(screen.getByRole('button', { name: 'Create version' }))
    await user.type(screen.getByLabelText('Version note (optional)'), 'Round one approved')
    await user.click(screen.getByRole('button', { name: 'Create version from accepted changes' }))

    expect(onVersionChanged).toHaveBeenCalledWith(createdVersion)
    expect(screen.getByText('Version 3 created.')).toBeInTheDocument()
  })

  it('requires and submits a reason when restoring an old version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: createdVersion }, { status: 201 })),
    )
    const onVersionChanged = renderPanel()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Version history/ }))
    await user.click(screen.getByRole('button', { name: 'Restore version 1' }))
    await user.type(screen.getByLabelText('Reason for restoring'), 'Undo an incorrect revision')
    await user.click(screen.getByRole('button', { name: 'Restore as a new version' }))

    expect(onVersionChanged).toHaveBeenCalledWith(createdVersion)
    expect(screen.getByText('Version 3 created from the restored content.')).toBeInTheDocument()
  })

  it('opens a comparison with the previous and current versions selected by default', async () => {
    const onCompareVersions = vi.fn<(baseVersionId: string, targetVersionId: string) => void>()
    render(
      <VersionHistoryPanel
        canManageVersions
        currentVersionId="version-2"
        documentId="document-1"
        onCompareVersions={onCompareVersions}
        onVersionChanged={vi.fn<(result: VersionActionResult) => Promise<void>>()}
        onViewVersion={vi.fn<(versionId: string | null) => void>()}
        versions={versions}
        viewedVersionId={null}
      />,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Version history/ }))
    await user.click(screen.getByRole('button', { name: 'Compare versions' }))

    expect(onCompareVersions).toHaveBeenCalledWith('version-1', 'version-2')
  })
})
