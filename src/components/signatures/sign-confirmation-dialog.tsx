import { Check, LoaderCircle } from 'lucide-react'
import { useRef } from 'react'

import { Dialog } from '#/components/ui/dialog'
import { buildConsentStatement } from '#/server/signatures/signature-policy'

import type { SignatureRequestSummary } from '#/types/signatures'

export function SignConfirmationDialog({
  documentTitle,
  isSigning,
  onClose,
  onConfirm,
  request,
  versionNumber,
}: {
  documentTitle: string
  isSigning: boolean
  onClose: () => void
  onConfirm: () => void
  request: SignatureRequestSummary | null
  versionNumber: number
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      description={
        request
          ? buildConsentStatement({ documentTitle, versionNumber, purpose: request.purpose })
          : ''
      }
      initialFocusRef={confirmButtonRef}
      onOpenChange={(open) => !open && onClose()}
      open={request !== null}
      title={`Sign ${documentTitle}, version ${versionNumber}`}
    >
      <p className="rounded-xl border border-[#dce7e2] bg-[#f8fcfa] p-4 text-xs leading-5 text-[#53605a]">
        By confirming, your authenticated identity, verified email, this exact version hash, and the
        server’s UTC timestamp will be recorded as evidence.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="min-h-10 rounded-lg border border-[#d6dcd9] px-4 text-xs font-bold text-[#52605a]"
          onClick={onClose}
          type="button"
        >
          Go back
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#315a4e] px-4 text-xs font-bold text-white disabled:opacity-50"
          disabled={isSigning}
          onClick={onConfirm}
          ref={confirmButtonRef}
          type="button"
        >
          {isSigning ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Check aria-hidden="true" size={15} />
          )}
          Confirm electronic signature
        </button>
      </div>
    </Dialog>
  )
}
