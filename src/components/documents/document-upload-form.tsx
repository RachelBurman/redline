import { useForm } from '@tanstack/react-form'
import { FileUp, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { apiRequest } from '#/lib/api-client'

import type { UploadedDocument } from '#/types/documents'

interface DocumentUploadFormProps {
  canUpload: boolean
  onUploaded: (document: UploadedDocument) => void
}

export function DocumentUploadForm({ canUpload, onUploaded }: DocumentUploadFormProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      title: '',
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      if (!value.file) {
        setSubmissionError('Choose a Microsoft Word .docx file.')
        return
      }

      setSubmissionError(null)
      const formData = new FormData()
      formData.set('file', value.file)
      if (value.title.trim()) formData.set('title', value.title.trim())

      try {
        const uploaded = await apiRequest<UploadedDocument>('/api/v1/documents', {
          method: 'POST',
          body: formData,
        })
        onUploaded(uploaded)
      } catch (error) {
        setSubmissionError(error instanceof Error ? error.message : 'The document upload failed.')
      }
    },
  })

  if (!canUpload) {
    return (
      <p className="rounded-xl border border-[#dfddd5] bg-[#f8f7f3] px-4 py-3 text-sm text-[#68736e]">
        Your organisation role can review documents but cannot upload new ones.
      </p>
    )
  }

  return (
    <form
      className="grid gap-4"
      encType="multipart/form-data"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="file">
        {(field) => (
          <label className="block rounded-xl border border-dashed border-[#c7c5bc] bg-[#faf9f5] p-4 transition-colors hover:border-[#d2765e]">
            <span className="flex items-center gap-2 text-sm font-bold text-[#39443f]">
              <FileUp aria-hidden="true" size={17} /> Word document
            </span>
            <input
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-3 block w-full text-sm text-[#65706b] file:mr-3 file:rounded-lg file:border-0 file:bg-[#e9e7e0] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#35413c]"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
            <span className="mt-2 block text-xs text-[#7a827e]">.docx only, up to 15 MB</span>
          </label>
        )}
      </form.Field>

      <form.Field name="title">
        {(field) => (
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-[#47514d]">
              Review title <span className="font-normal text-[#858b88]">(optional)</span>
            </span>
            <input
              className="h-11 w-full rounded-xl border border-[#d7d5ce] bg-white px-4 text-sm text-[#18201d] focus:border-[#e86648] focus:outline-none"
              maxLength={300}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Defaults to the filename"
              type="text"
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>

      {submissionError ? (
        <p
          className="rounded-xl border border-[#e8c9c0] bg-[#fff3ef] px-4 py-3 text-sm text-[#934530]"
          role="alert"
        >
          {submissionError}
        </p>
      ) : null}

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#18201d] px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(24,32,29,0.16)] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <FileUp aria-hidden="true" size={16} />
            )}
            {isSubmitting ? 'Importing document…' : 'Upload and review'}
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
