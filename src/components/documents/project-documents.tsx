import { DocumentList } from './document-list'
import { DocumentUploadForm } from './document-upload-form'

import type { DocumentListItem, UploadedDocument } from '#/types/documents'

interface ProjectDocumentsProps {
  projectName: string
  documents: DocumentListItem[]
  canUpload: boolean
  onUploaded: (document: UploadedDocument) => void
}

export function ProjectDocuments({
  projectName,
  documents,
  canUpload,
  onUploaded,
}: ProjectDocumentsProps) {
  return (
    <section
      aria-labelledby="project-heading"
      className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8"
    >
      <p className="text-[11px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">Project</p>
      <h1
        className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#1d2824]"
        id="project-heading"
      >
        {projectName}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-bold text-[#47514d]">Documents</h2>
          <DocumentList documents={documents} />
        </div>
        <aside className="h-fit rounded-2xl border border-[#dcdad3] bg-white p-5">
          <h2 className="text-sm font-bold text-[#25312c]">Start another review</h2>
          <p className="mt-1 mb-4 text-xs leading-5 text-[#75807a]">
            The source file is stored unchanged before its review copy is parsed.
          </p>
          <DocumentUploadForm canUpload={canUpload} onUploaded={onUploaded} />
        </aside>
      </div>
    </section>
  )
}
