import { CircleAlert, Download, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

interface ExportDocumentButtonProps {
  canExport: boolean
  documentId: string
  title: string
}

type ExportState = 'idle' | 'exporting' | 'downloaded' | 'error'

export function ExportDocumentButton({ canExport, documentId, title }: ExportDocumentButtonProps) {
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    setExportState('exporting')
    setMessage(null)

    try {
      const response = await fetch(`/api/v1/documents/${documentId}/exports`, { method: 'POST' })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        throw new Error(body?.error?.message ?? 'The resolved document could not be exported.')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = objectUrl
      link.download = `${title.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'document'}-resolved.docx`
      link.click()
      URL.revokeObjectURL(objectUrl)
      setExportState('downloaded')
      setMessage('Resolved document downloaded.')
    } catch (error) {
      setExportState('error')
      setMessage(error instanceof Error ? error.message : 'The export failed.')
    }
  }

  if (!canExport) return null

  return (
    <div>
      <button
        className="inline-flex min-h-10 min-w-[226px] items-center justify-center gap-2 rounded-lg border border-[#d4d1c9] bg-white px-3 text-xs font-bold text-[#48534e] shadow-sm hover:bg-[#faf9f5] disabled:opacity-55"
        disabled={exportState === 'exporting'}
        onClick={() => void handleExport()}
        type="button"
      >
        {exportState === 'exporting' ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
        ) : exportState === 'error' ? (
          <CircleAlert aria-hidden="true" size={15} />
        ) : (
          <Download aria-hidden="true" size={15} />
        )}
        {exportState === 'exporting'
          ? 'Downloading...'
          : exportState === 'downloaded'
            ? 'DOCX downloaded'
            : exportState === 'error'
              ? 'Download failed - try again'
              : 'Download resolved .docx'}
      </button>
      {message ? (
        <output aria-live="polite" className="sr-only">
          {message}
        </output>
      ) : null}
    </div>
  )
}
