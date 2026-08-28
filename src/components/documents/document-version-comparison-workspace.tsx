import { useQuery } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'

import { apiRequest } from '#/lib/api-client'

import { VersionComparisonView } from './version-comparison-view'

import type { DocumentVersionComparison } from '#/types/document-versions'

interface DocumentVersionComparisonWorkspaceProps {
  baseVersionId: string
  documentId: string
  onClose: () => void
  targetVersionId: string
}

export function DocumentVersionComparisonWorkspace({
  baseVersionId,
  documentId,
  onClose,
  targetVersionId,
}: DocumentVersionComparisonWorkspaceProps) {
  const comparison = useQuery({
    queryKey: ['document-version-comparison', documentId, baseVersionId, targetVersionId],
    queryFn: () => {
      const search = new URLSearchParams({ baseVersionId, targetVersionId })
      return apiRequest<DocumentVersionComparison>(
        `/api/v1/documents/${documentId}/versions/compare?${search.toString()}`,
      )
    },
  })

  if (comparison.isPending) {
    return (
      <output className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-[#d8d5cc] bg-white text-sm font-semibold text-[#59635f]">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> Comparing versions…
      </output>
    )
  }

  if (!comparison.data) {
    return (
      <section className="rounded-2xl border border-[#dcc9a3] bg-[#fffbf1] p-6 text-center">
        <h2 className="font-serif text-xl font-semibold text-[#443b29]">Comparison unavailable</h2>
        <p className="mt-2 text-sm text-[#75684d]">
          {comparison.error?.message ?? 'The selected versions could not be compared.'}
        </p>
        <button
          className="mt-4 min-h-10 rounded-lg bg-[#443b29] px-4 text-xs font-bold text-white"
          onClick={onClose}
          type="button"
        >
          Return to document
        </button>
      </section>
    )
  }

  return <VersionComparisonView comparison={comparison.data} onClose={onClose} />
}
