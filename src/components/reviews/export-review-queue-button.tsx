import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

interface ExportReviewQueueButtonProps {
  canExport: boolean
  documentId: string
  title: string
}

function fallbackFilename(title: string) {
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${safeTitle || 'document'}-review-queue.csv`
}

export function ExportReviewQueueButton({
  canExport,
  documentId,
  title,
}: ExportReviewQueueButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    setIsExporting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/v1/documents/${documentId}/review-items/export`, {
        method: 'POST',
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        throw new Error(body?.error?.message ?? 'The review queue could not be exported.')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = objectUrl
      link.download = fallbackFilename(title)
      link.click()
      URL.revokeObjectURL(objectUrl)
      setMessage('Review queue CSV downloaded.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The review queue export failed.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!canExport) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d4d1c9] bg-white px-3 text-xs font-bold text-[#48534e] shadow-sm hover:bg-[#faf9f5] disabled:opacity-55"
        disabled={isExporting}
        onClick={() => void handleExport()}
        type="button"
      >
        {isExporting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
        ) : (
          <FileSpreadsheet aria-hidden="true" size={15} />
        )}
        {isExporting ? 'Exporting…' : 'Download review queue CSV'}
      </button>
      {message ? (
        <output aria-live="polite" className="text-[10px] text-[#66716b]">
          {message}
        </output>
      ) : null}
    </div>
  )
}
