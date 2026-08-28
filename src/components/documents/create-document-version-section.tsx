import { GitBranch, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'

import type { DocumentVersionSummary } from '#/types/document-versions'
import type { FormEvent } from 'react'

interface CreateDocumentVersionSectionProps {
  currentVersion: DocumentVersionSummary
  isSubmitting: boolean
  onCreate: (note: string) => Promise<boolean>
}

export function CreateDocumentVersionSection({
  currentVersion,
  isSubmitting,
  onCreate,
}: CreateDocumentVersionSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onCreate(note)) {
      setNote('')
      setShowForm(false)
    }
  }

  return (
    <section aria-labelledby="create-version-heading" className="mb-5 rounded-xl bg-[#f6f4ee] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#28332f]" id="create-version-heading">
            Publish accepted changes
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#68726d]">
            {currentVersion.acceptedChangeCount === 0
              ? 'Accept at least one proposal before creating the next immutable version.'
              : `${currentVersion.acceptedChangeCount} accepted ${currentVersion.acceptedChangeCount === 1 ? 'change is' : 'changes are'} ready. ${currentVersion.unresolvedReviewItemCount} unresolved ${currentVersion.unresolvedReviewItemCount === 1 ? 'item' : 'items'} will be superseded.`}
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1f4d42] px-4 text-xs font-bold text-white hover:bg-[#183d34] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentVersion.acceptedChangeCount === 0 || isSubmitting}
          onClick={() => setShowForm((visible) => !visible)}
          type="button"
        >
          <Plus aria-hidden="true" size={15} /> Create version
        </button>
      </div>
      {showForm ? (
        <form className="mt-4 grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <label className="grid gap-1 text-xs font-bold text-[#46514c]">
            Version note (optional)
            <input
              className="min-h-10 rounded-lg border border-[#cfcac0] bg-white px-3 font-normal"
              maxLength={500}
              minLength={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What changed in this version?"
              value={note}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1f4d42] px-4 text-xs font-bold text-white disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <GitBranch aria-hidden="true" size={15} />
              )}
              Create version from accepted changes
            </button>
            <button
              className="min-h-10 rounded-lg px-3 text-xs font-bold text-[#64706a] hover:bg-white"
              onClick={() => setShowForm(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
