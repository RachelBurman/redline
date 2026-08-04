import { Link } from '@tanstack/react-router'
import { ArrowRight, FileText } from 'lucide-react'

import type { DocumentListItem } from '#/types/documents'

export function DocumentList({ documents }: { documents: DocumentListItem[] }) {
  return (
    <ul className="divide-y divide-[#e2e0d9] overflow-hidden rounded-2xl border border-[#dcdad3] bg-white">
      {documents.map((document) => (
        <li key={document.id}>
          <Link
            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#faf8f4]"
            params={{ documentId: document.id }}
            to="/app/documents/$documentId"
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7e7e1] text-[#a95039]">
                <FileText aria-hidden="true" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#25312c]">
                  {document.title}
                </span>
                <span className="mt-1 block text-xs text-[#76807b]">
                  Version {document.versionNumber} · {document.blockCount} blocks
                </span>
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="shrink-0 text-[#8d9591] transition-transform group-hover:translate-x-1"
              size={17}
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
