import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { ExportReviewQueueButton } from '#/components/reviews/export-review-queue-button'
import { PresenceBar } from '#/components/reviews/presence-bar'

import { ExportDocumentButton } from './export-document-button'

import type { PresenceParticipant } from '#/types/presence'

interface DocumentReviewHeaderProps {
  documentId: string
  documentTitle: string
  exportPermissions: { document: boolean; reviewQueue: boolean }
  participants: PresenceParticipant[]
  reviewRoundName: string
  userId: string
  viewMode: 'comparison' | 'current' | 'historical'
  versionNumber: number
}

export function DocumentReviewHeader({
  documentId,
  documentTitle,
  exportPermissions,
  participants,
  reviewRoundName,
  userId,
  viewMode,
  versionNumber,
}: DocumentReviewHeaderProps) {
  const isCurrent = viewMode === 'current'
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-xs font-bold text-[#69736e] hover:text-[#26312d]"
          to="/app"
        >
          <ArrowLeft aria-hidden="true" size={14} /> Workspace
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-[#202b27]">
          {documentTitle}
        </h1>
      </div>
      <div className="flex flex-wrap items-end justify-end gap-4">
        {isCurrent ? <PresenceBar currentUserId={userId} participants={participants} /> : null}
        <div className="text-right text-xs text-[#707a75]">
          <p className="font-bold text-[#49534f]">
            {viewMode === 'comparison' ? 'Version comparison' : `Version ${versionNumber}`}
          </p>
          <p>
            {viewMode === 'comparison'
              ? 'Read-only comparison'
              : viewMode === 'historical'
                ? 'Historical — read only'
                : reviewRoundName}
          </p>
        </div>
        {isCurrent ? (
          <ExportDocumentButton
            canExport={exportPermissions.document}
            documentId={documentId}
            title={documentTitle}
          />
        ) : null}
        <ExportReviewQueueButton
          canExport={exportPermissions.reviewQueue}
          documentId={documentId}
          title={documentTitle}
        />
      </div>
    </div>
  )
}
