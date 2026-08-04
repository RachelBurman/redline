import { createFileRoute } from '@tanstack/react-router'

import { DocumentReviewPage } from '#/features/documents/document-review-page'

export const Route = createFileRoute('/app/documents/$documentId')({
  component: DocumentRoute,
})

function DocumentRoute() {
  const { documentId } = Route.useParams()
  return <DocumentReviewPage documentId={documentId} />
}
