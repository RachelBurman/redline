import { Expand, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import type { DocumentBlockDetail } from '#/types/documents'

interface RichMediaBlockViewProps {
  block: DocumentBlockDetail
  onDelete?: () => void
  onEditAltText?: () => void
  onEditCaption?: () => void
  onMove?: () => void
  onReplace?: () => void
}

export function RichMediaBlockView({
  block,
  onDelete,
  onEditAltText,
  onEditCaption,
  onMove,
  onReplace,
}: RichMediaBlockViewProps) {
  const media = block.media
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [retry, setRetry] = useState(0)
  const [expanded, setExpanded] = useState(false)

  if (!media) {
    return (
      <output className="block rounded-xl border border-[#d8b4a7] bg-[#fff7f3] p-4">
        Image metadata is missing. Restore the asset record or replace this block.
      </output>
    )
  }

  if (media.processingStatus !== 'ready') {
    return (
      <output className="block rounded-xl border border-[#d8b4a7] bg-[#fff7f3] p-4">
        This image is {media.processingStatus}. Retry processing or replace it before export.
      </output>
    )
  }

  const imageUrl = `${media.previewUrl}${media.previewUrl.includes('?') ? '&' : '?'}retry=${retry}`
  const actionClass =
    'rounded-md border border-[#ddd9d1] bg-white px-2 py-1 text-[11px] font-bold text-[#68726d] transition-colors hover:border-[#d1735b] hover:text-[#91452f]'

  return (
    <figure className="rounded-2xl border border-[#dedbd3] bg-[#faf9f5] p-3">
      <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-[#eceae3]">
        {loadState === 'loading' ? (
          <output className="absolute text-xs font-semibold text-[#68726d]">Loading image…</output>
        ) : null}
        {loadState === 'failed' ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#fff7f3] px-5 text-center">
            <p className="text-sm font-semibold text-[#7e493a]" role="alert">
              The authorised image preview could not be loaded.
            </p>
            <button
              className={actionClass}
              onClick={() => {
                setLoadState('loading')
                setRetry((value) => value + 1)
              }}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="mr-1 inline" size={13} /> Retry preview
            </button>
          </div>
        ) : null}
        <img
          alt={media.altText}
          className={`max-h-[480px] max-w-full object-contain ${loadState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
          height={media.height}
          key={imageUrl}
          onError={() => setLoadState('failed')}
          onLoad={() => setLoadState('ready')}
          src={imageUrl}
          width={media.width}
        />
        {loadState === 'ready' ? (
          <button
            aria-label={`View full-size image: ${media.altText}`}
            className="absolute top-2 right-2 rounded-lg bg-[#17201dcc] p-2 text-white hover:bg-[#17201d]"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <Expand aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>
      {media.caption ? (
        <figcaption className="mt-3 text-sm leading-6 text-[#46514c]">{media.caption}</figcaption>
      ) : null}
      {media.source ? <p className="mt-1 text-xs text-[#68726d]">Source: {media.source}</p> : null}
      {onReplace ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Image review actions">
          <button className={actionClass} onClick={onReplace} type="button">
            Replace
          </button>
          <button className={actionClass} onClick={onEditAltText} type="button">
            Edit description
          </button>
          <button className={actionClass} onClick={onEditCaption} type="button">
            Edit caption
          </button>
          <button className={actionClass} onClick={onMove} type="button">
            Move
          </button>
          <button className={actionClass} onClick={onDelete} type="button">
            Propose deletion
          </button>
        </div>
      ) : null}

      {expanded ? (
        <dialog
          aria-label="Full-size image preview"
          className="fixed inset-0 z-50 flex flex-col bg-[#101713f2] p-4"
          onCancel={() => setExpanded(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setExpanded(false)
          }}
          open
        >
          <button
            autoFocus
            className="mb-3 self-end rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#26312d]"
            onClick={() => setExpanded(false)}
            type="button"
          >
            Close full-size view
          </button>
          <img
            alt={media.altText}
            className="min-h-0 flex-1 object-contain"
            height={media.height}
            src={media.url}
            width={media.width}
          />
        </dialog>
      ) : null}
    </figure>
  )
}
