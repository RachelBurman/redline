import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileCheck2, LoaderCircle, Users } from 'lucide-react'
import { useState } from 'react'

import { useLiveUpdatesConnected } from '#/features/documents/document-live-updates-context'
import { apiRequest } from '#/lib/api-client'
import { DEFAULT_SIGNATURE_PURPOSE } from '#/server/signatures/signature-policy'

import { DeclineSignatureDialog } from './decline-signature-dialog'
import { SignConfirmationDialog } from './sign-confirmation-dialog'
import { SignatureRequestCard } from './signature-request-card'

import type { SignatureRequestList, SignatureRequestSummary } from '#/types/signatures'

export function SignaturePanel({
  canManage,
  documentId,
  documentTitle,
  documentVersionId,
  userId,
  versionNumber,
}: {
  canManage: boolean
  documentId: string
  documentTitle: string
  documentVersionId: string
  userId: string
  versionNumber: number
}) {
  const queryClient = useQueryClient()
  const liveUpdatesConnected = useLiveUpdatesConnected()
  const [signingRequest, setSigningRequest] = useState<SignatureRequestSummary | null>(null)
  const [decliningRequest, setDecliningRequest] = useState<SignatureRequestSummary | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const endpoint = `/api/v1/documents/${documentId}/signature-requests`
  const queryKey = ['signature-requests', documentId, documentVersionId]
  const requests = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<SignatureRequestList>(
        `${endpoint}?documentVersionId=${encodeURIComponent(documentVersionId)}`,
      ),
    refetchInterval: liveUpdatesConnected ? false : 10_000,
    refetchIntervalInBackground: false,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey })
  const createRequest = useMutation({
    mutationFn: (scope: 'individual' | 'everyone') =>
      apiRequest<{ id: string; notificationFailures: number }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentVersionId, scope, purpose: DEFAULT_SIGNATURE_PURPOSE }),
      }),
    onSuccess: invalidate,
  })
  const sign = useMutation({
    mutationFn: (requestId: string) =>
      apiRequest(`${endpoint}/${requestId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true, idempotencyKey: crypto.randomUUID() }),
      }),
    onSuccess: async () => {
      setSigningRequest(null)
      await invalidate()
    },
  })
  const decline = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      apiRequest(`${endpoint}/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      setDecliningRequest(null)
      setDeclineReason('')
      await invalidate()
    },
  })
  const cancel = useMutation({
    mutationFn: (requestId: string) =>
      apiRequest(`${endpoint}/${requestId}/cancel`, { method: 'POST' }),
    onSuccess: invalidate,
  })
  const actionError = createRequest.error ?? sign.error ?? decline.error ?? cancel.error
  const hasPendingRequest = Boolean(
    requests.data?.requests.some((request) => request.status === 'pending'),
  )

  return (
    <section className="mb-5 rounded-2xl border border-[#cddbd5] bg-[#f8fcfa] px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#315a4e]">
            <FileCheck2 aria-hidden="true" size={15} /> Electronic sign-off
          </p>
          <h2 className="mt-1 text-base font-bold text-[#26312d]">
            Signatures for version {versionNumber}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#68736e]">
            Baseline electronic sign-off tied to this exact immutable version. Redline does not
            claim AdES or QES compliance.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#b9cec5] bg-white px-3 text-xs font-bold text-[#315a4e] disabled:opacity-50"
              disabled={createRequest.isPending || hasPendingRequest}
              onClick={() => createRequest.mutate('individual')}
              type="button"
            >
              <Check aria-hidden="true" size={15} /> Sign just me
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#315a4e] px-3 text-xs font-bold text-white disabled:opacity-50"
              disabled={
                createRequest.isPending ||
                requests.data?.availableSigners.length === 0 ||
                hasPendingRequest
              }
              onClick={() => createRequest.mutate('everyone')}
              type="button"
            >
              {createRequest.isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Users aria-hidden="true" size={15} />
              )}
              Everyone sign
            </button>
          </div>
        ) : null}
      </div>

      {requests.isPending ? (
        <output className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#68736e]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> Loading signature
          status&hellip;
        </output>
      ) : requests.error ? (
        <p className="mt-4 text-sm text-[#934530]" role="alert">
          {requests.error.message}
        </p>
      ) : requests.data?.requests.length ? (
        <ul className="mt-4 grid gap-3">
          {requests.data.requests.map((request) => (
            <SignatureRequestCard
              canManage={canManage}
              endpoint={endpoint}
              isCancelling={cancel.isPending}
              key={request.id}
              onCancel={() => cancel.mutate(request.id)}
              onDecline={() => setDecliningRequest(request)}
              onSign={() => setSigningRequest(request)}
              request={request}
              userId={userId}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-[#68736e]">
          This version is unsigned. Create a request when it is final and ready for approval.
        </p>
      )}

      {actionError ? (
        <p className="mt-3 text-sm text-[#934530]" role="alert">
          {actionError.message}
        </p>
      ) : null}

      <SignConfirmationDialog
        documentTitle={documentTitle}
        isSigning={sign.isPending}
        onClose={() => setSigningRequest(null)}
        onConfirm={() => signingRequest && sign.mutate(signingRequest.id)}
        request={signingRequest}
        versionNumber={versionNumber}
      />
      <DeclineSignatureDialog
        documentTitle={documentTitle}
        isDeclining={decline.isPending}
        onClose={() => setDecliningRequest(null)}
        onConfirm={() =>
          decliningRequest &&
          decline.mutate({ requestId: decliningRequest.id, reason: declineReason.trim() })
        }
        onReasonChange={setDeclineReason}
        open={decliningRequest !== null}
        reason={declineReason}
        versionNumber={versionNumber}
      />
    </section>
  )
}
