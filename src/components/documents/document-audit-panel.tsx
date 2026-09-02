import { useQuery } from '@tanstack/react-query'
import { Fingerprint, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { apiRequest } from '#/lib/api-client'

import type { DocumentAuditEvent } from '#/types/audit'

const eventLabels: Record<string, string> = {
  'document.exported': 'Resolved document exported',
  'document.upload_failed': 'Document upload failed',
  'document.uploaded': 'Document uploaded',
  'document.version_created': 'Version created',
  'document.version_exported': 'Document version exported',
  'document.version_restored': 'Version restored',
  'review_assignment.created': 'Reviewer assigned',
  'review_assignment.revoked': 'Reviewer assignment revoked',
  'review_comment.created': 'Review comment added',
  'review_item.accepted': 'Proposal accepted',
  'review_item.created': 'Proposal created',
  'review_item.rejected': 'Proposal rejected',
  'review_queue.exported': 'Review queue exported',
  'review_round.completed': 'Review round completed',
}

function eventLabel(eventType: string) {
  return eventLabels[eventType] ?? eventType.replaceAll(/[._]/g, ' ')
}

export type ListDocumentAuditEventsAction = (documentId: string) => Promise<DocumentAuditEvent[]>

const listDocumentAuditEventsWithApi: ListDocumentAuditEventsAction = (documentId) =>
  apiRequest<DocumentAuditEvent[]>(`/api/v1/documents/${documentId}/audit-events`)

export function DocumentAuditPanel({
  documentId,
  listDocumentAuditEvents = listDocumentAuditEventsWithApi,
}: {
  documentId: string
  listDocumentAuditEvents?: ListDocumentAuditEventsAction
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const events = useQuery({
    queryKey: ['document-audit-events', documentId],
    queryFn: () => listDocumentAuditEvents(documentId),
    enabled: isExpanded,
    staleTime: 15_000,
  })

  return (
    <section className="mb-5 rounded-2xl border border-[#d9d6ce] bg-white shadow-sm">
      <button
        aria-controls="document-audit-events"
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 font-bold text-[#35413c] hover:bg-[#faf9f5]"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <Fingerprint aria-hidden="true" size={17} /> Audit trail
        </span>
        <span className="text-xs font-semibold text-[#717b76]">Latest 200 events</span>
      </button>

      {isExpanded ? (
        <div className="border-t border-[#ebe8e1] px-5 py-5" id="document-audit-events">
          <p className="mb-4 text-xs leading-5 text-[#69736e]">
            Append-only activity with chained event hashes. Full identifiers are available for
            verification and support investigations.
          </p>
          {events.isPending ? (
            <output className="inline-flex items-center gap-2 text-xs font-semibold text-[#69736e]">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> Loading audit
              events&hellip;
            </output>
          ) : events.isError ? (
            <div className="rounded-xl border border-[#e3c7be] bg-[#fff8f5] p-4 text-xs text-[#754b3f]">
              <p>{events.error.message}</p>
              <button
                className="mt-2 font-bold underline underline-offset-2"
                onClick={() => void events.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : events.data?.length ? (
            <ol aria-label="Document audit events" className="grid gap-3">
              {events.data.map((event) => (
                <li className="rounded-xl border border-[#e4e0d8] bg-[#fcfbf8] p-4" key={event.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-[#2f3a35]">
                      {eventLabel(event.eventType)}
                    </p>
                    <time
                      className="text-[11px] text-[#707a75]"
                      dateTime={event.occurredAt}
                      title={new Date(event.occurredAt).toISOString()}
                    >
                      {new Date(event.occurredAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-[#606b66]">
                    {event.actor.name} &middot; Event #{event.sequence}
                  </p>
                  <details className="mt-3 text-xs text-[#58635e]">
                    <summary className="cursor-pointer font-bold">Verification details</summary>
                    <dl className="mt-2 grid gap-1 break-all font-mono text-[10px]">
                      <div>
                        <dt className="inline font-bold">Event hash: </dt>
                        <dd className="inline">{event.eventHash}</dd>
                      </div>
                      <div>
                        <dt className="inline font-bold">Previous hash: </dt>
                        <dd className="inline">{event.previousHash ?? 'Chain origin'}</dd>
                      </div>
                    </dl>
                  </details>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-[#69736e]">No document activity has been recorded yet.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
