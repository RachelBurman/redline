import { Download, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

interface ExportDocumentButtonProps {
  canExport: boolean
  documentId: string
  title: string
}

export function ExportDocumentButton({ canExport, documentId, title }: ExportDocumentButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    setIsExporting(true)
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
      setMessage('Resolved document downloaded.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The export failed.')
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
          <Download aria-hidden="true" size={15} />
        )}
        {isExporting ? 'Exporting…' : 'Download resolved .docx'}
      </button>
      {message ? <output className="text-[10px] text-[#66716b]">{message}</output> : null}
    </div>
  )
}
