import { X } from 'lucide-react'
import { useRef } from 'react'

import { Dialog } from '#/components/ui/dialog'

export function DeclineSignatureDialog({
  documentTitle,
  isDeclining,
  onClose,
  onConfirm,
  onReasonChange,
  open,
  reason,
  versionNumber,
}: {
  documentTitle: string
  isDeclining: boolean
  onClose: () => void
  onConfirm: () => void
  onReasonChange: (reason: string) => void
  open: boolean
  reason: string
  versionNumber: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Dialog
      description="Declining closes this request for every required signer and preserves the outcome in the audit record."
      initialFocusRef={inputRef}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      open={open}
      title={`Decline ${documentTitle}, version ${versionNumber}`}
    >
      <label className="block text-xs font-bold text-[#42504a]" htmlFor="signature-decline-reason">
        Reason for declining
      </label>
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-[#d7d4cc] px-3 text-sm"
        id="signature-decline-reason"
        onChange={(event) => onReasonChange(event.target.value)}
        ref={inputRef}
        value={reason}
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="min-h-10 rounded-lg border border-[#d6dcd9] px-4 text-xs font-bold text-[#52605a]"
          onClick={onClose}
          type="button"
        >
          Go back
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#854632] px-4 text-xs font-bold text-white disabled:opacity-50"
          disabled={isDeclining || reason.trim().length < 3}
          onClick={onConfirm}
          type="button"
        >
          <X aria-hidden="true" size={15} /> Confirm decline
        </button>
      </div>
    </Dialog>
  )
}
