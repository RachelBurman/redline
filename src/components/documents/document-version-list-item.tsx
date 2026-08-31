import { ArchiveRestore, Download, LoaderCircle, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'

import { Dialog } from '#/components/ui/dialog'

import type { DocumentVersionSummary } from '#/types/document-versions'
import type { FormEvent } from 'react'

interface DocumentVersionListItemProps {
  access: 'manager' | 'reader'
  actionState: 'downloading' | 'idle' | 'restoring'
  currentVersionNumber: number
  onDownload: (version: DocumentVersionSummary) => void
  onRestore: (versionId: string, reason: string) => Promise<boolean>
  onView: (versionId: string | null) => void
  version: DocumentVersionSummary
  viewState: 'available' | 'viewing'
}

const versionDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
})

function versionOrigin(version: DocumentVersionSummary) {
  if (version.origin === 'restore' && version.restoredFromVersion) {
    return `Restored from v${version.restoredFromVersion.versionNumber}`
  }
  if (version.origin === 'checkpoint') return 'Accepted changes'
  if (version.origin === 'upload') return 'Uploaded document'
  return 'Imported document'
}

export function DocumentVersionListItem({
  access,
  actionState,
  currentVersionNumber,
  onDownload,
  onRestore,
  onView,
  version,
  viewState,
}: DocumentVersionListItemProps) {
  const [showRestoreForm, setShowRestoreForm] = useState(false)
  const [restoreReason, setRestoreReason] = useState('')
  const restoreReasonRef = useRef<HTMLTextAreaElement>(null)

  async function handleRestore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onRestore(version.id, restoreReason)) {
      setRestoreReason('')
      setShowRestoreForm(false)
    }
  }

  return (
    <li
      className={`rounded-xl border p-4 ${
        viewState === 'viewing' ? 'border-[#d8785f] bg-[#fff8f5]' : 'border-[#e2ded6] bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[#28332f]">Version {version.versionNumber}</h3>
            {version.isCurrent ? (
              <span className="rounded-full bg-[#dcece6] px-2 py-0.5 text-[10px] font-bold text-[#28584b]">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[#69736e]">
            {versionOrigin(version)} · {versionDateFormatter.format(new Date(version.createdAt))} ·{' '}
            {version.createdBy.name}
          </p>
          {version.note ? (
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#4f5a55]">{version.note}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            aria-label={`${viewState === 'viewing' ? 'Viewing' : 'View'} version ${version.versionNumber}`}
            className="min-h-9 rounded-lg border border-[#d2cec5] bg-white px-3 text-xs font-bold text-[#4e5954] hover:bg-[#f7f5ef]"
            onClick={() => onView(version.isCurrent ? null : version.id)}
            type="button"
          >
            {viewState === 'viewing' ? 'Viewing' : 'View'}
          </button>
          <button
            aria-label={`Download version ${version.versionNumber}`}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2cec5] bg-white px-3 text-xs font-bold text-[#4e5954] hover:bg-[#f7f5ef] disabled:opacity-50"
            disabled={actionState !== 'idle'}
            onClick={() => onDownload(version)}
            type="button"
          >
            {actionState === 'downloading' ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
            ) : (
              <Download aria-hidden="true" size={14} />
            )}
            Download
          </button>
          {access === 'manager' && !version.isCurrent ? (
            <button
              aria-label={`Restore version ${version.versionNumber}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d9b5a9] bg-[#fff8f5] px-3 text-xs font-bold text-[#8a4937] hover:bg-[#fff0eb]"
              onClick={() => {
                setShowRestoreForm(true)
                setRestoreReason('')
              }}
              type="button"
            >
              <ArchiveRestore aria-hidden="true" size={14} /> Restore
            </button>
          ) : null}
        </div>
      </div>

      {access === 'manager' && !version.isCurrent ? (
        <Dialog
          description={
            <>
              This creates version {currentVersionNumber + 1} from version {version.versionNumber}.
              Nothing is deleted, but pending changes on the current version will be superseded.
            </>
          }
          initialFocusRef={restoreReasonRef}
          onOpenChange={(open) => {
            if (actionState !== 'restoring') setShowRestoreForm(open)
          }}
          open={showRestoreForm}
          title={`Restore version ${version.versionNumber}?`}
        >
          <form className="grid gap-5" onSubmit={(event) => void handleRestore(event)}>
            <label className="grid gap-2 text-sm font-bold text-[#57433d]">
              Reason for restoring
              <textarea
                className="min-h-28 resize-y rounded-lg border border-[#d9b5a9] bg-white px-3 py-2 font-normal"
                maxLength={500}
                minLength={3}
                onChange={(event) => setRestoreReason(event.target.value)}
                ref={restoreReasonRef}
                required
                value={restoreReason}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#8a4937] px-4 text-xs font-bold text-white disabled:opacity-50"
                disabled={actionState === 'restoring'}
                type="submit"
              >
                {actionState === 'restoring' ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <RotateCcw aria-hidden="true" size={15} />
                )}
                Restore as a new version
              </button>
              <button
                className="min-h-10 rounded-lg px-3 text-xs font-bold text-[#71605a] hover:bg-[#f7f5ef] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionState === 'restoring'}
                onClick={() => setShowRestoreForm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </li>
  )
}
