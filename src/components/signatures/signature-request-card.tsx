import { Download } from 'lucide-react'

import { SignatureDateTime } from './signature-date-time'

import type { SignatureRequestSummary } from '#/types/signatures'

function statusCopy(request: SignatureRequestSummary) {
  if (request.status === 'completed') return 'Fully signed'
  if (request.status === 'pending') {
    const signed = request.slots.filter((slot) => slot.status === 'signed').length
    return signed === 0
      ? 'Awaiting signatures'
      : `Partially signed · ${signed}/${request.slots.length}`
  }
  return request.status[0]!.toUpperCase() + request.status.slice(1)
}

export function SignatureRequestCard({
  canManage,
  endpoint,
  isCancelling,
  onCancel,
  onDecline,
  onSign,
  request,
  userId,
}: {
  canManage: boolean
  endpoint: string
  isCancelling: boolean
  onCancel: () => void
  onDecline: () => void
  onSign: () => void
  request: SignatureRequestSummary
  userId: string
}) {
  const ownSlot = request.slots.find((slot) => slot.signerId === userId)
  const canRespond = ownSlot?.status === 'pending' && request.status === 'pending'

  return (
    <li className="rounded-xl border border-[#dce7e2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#2d3a35]">{statusCopy(request)}</p>
          <p className="mt-1 text-xs text-[#68736e]">
            Requested by {request.requestedBy.name} ·{' '}
            <SignatureDateTime value={request.createdAt} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRespond ? (
            <>
              <button
                className="min-h-9 rounded-lg bg-[#315a4e] px-3 text-xs font-bold text-white"
                onClick={onSign}
                type="button"
              >
                Review and sign
              </button>
              <button
                className="min-h-9 rounded-lg border border-[#d9c8c1] bg-white px-3 text-xs font-bold text-[#854632]"
                onClick={onDecline}
                type="button"
              >
                Decline
              </button>
            </>
          ) : null}
          {canManage && request.status === 'pending' ? (
            <button
              className="min-h-9 rounded-lg border border-[#d9c8c1] bg-white px-3 text-xs font-bold text-[#854632] disabled:opacity-50"
              disabled={isCancelling}
              onClick={onCancel}
              type="button"
            >
              Cancel request
            </button>
          ) : null}
          <a
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d6dcd9] bg-white px-3 text-xs font-bold text-[#4c5a54]"
            href={`${endpoint}/${request.id}/evidence?format=certificate`}
          >
            <Download aria-hidden="true" size={14} /> Certificate
          </a>
          <a
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d6dcd9] bg-white px-3 text-xs font-bold text-[#4c5a54]"
            href={`${endpoint}/${request.id}/evidence?format=json`}
          >
            <Download aria-hidden="true" size={14} /> Manifest
          </a>
        </div>
      </div>
      <p className="mt-3 text-xs text-[#57645e]">{request.purpose}</p>
      <ul aria-label="Required signer status" className="mt-3 flex flex-wrap gap-2">
        {request.slots.map((slot) => (
          <li
            className="rounded-full border border-[#dde4e0] bg-[#f8faf9] px-3 py-1.5 text-[11px] text-[#53605a]"
            key={slot.id}
          >
            <span className="font-bold">{slot.signerName}</span> · {slot.status}
            {slot.signedAt ? <SignatureDateTime className="ml-1" value={slot.signedAt} /> : null}
          </li>
        ))}
      </ul>
    </li>
  )
}
