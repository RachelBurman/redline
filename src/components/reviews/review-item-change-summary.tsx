import type { ReviewItemSummary } from '#/types/reviews'

export function ReviewItemChangeSummary({ item }: { item: ReviewItemSummary }) {
  if (item.changeType.startsWith('media_')) {
    const media = item.proposedMedia
    const labels = {
      media_insert: 'Add this image to the document.',
      media_replace: 'Replace the current image with this immutable asset.',
      media_delete: 'Remove this image from the resolved document.',
      media_caption: `Change the caption to: ${item.proposedContent || 'No caption'}`,
      media_alt_text: `Change the accessible description to: ${item.proposedContent}`,
      media_reorder: 'Move this image to the proposed document position.',
    } as const

    return (
      <>
        <div>
          <dt className="font-bold text-[#68716d]">Media action</dt>
          <dd className="mt-1 rounded-lg bg-[#edf5f0] px-3 py-2 leading-5 text-[#315845]">
            {labels[item.changeType as keyof typeof labels]}
          </dd>
        </div>
        {media ? (
          <div>
            <dt className="font-bold text-[#68716d]">Immutable asset</dt>
            <dd className="mt-1 rounded-lg bg-[#f1f0eb] px-3 py-2 leading-5 text-[#5f6964]">
              <span className="block">Description: {media.altText}</span>
              {media.caption ? <span className="block">Caption: {media.caption}</span> : null}
              {media.contentHash ? (
                <span className="block font-mono text-[10px] break-all">
                  SHA-256: {media.contentHash}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </>
    )
  }

  if (item.changeType === 'insert') {
    return (
      <>
        <div>
          <dt className="font-bold text-[#68716d]">Insertion point</dt>
          <dd className="mt-1 rounded-lg bg-[#f1f0eb] px-3 py-2 leading-5 text-[#5f6964]">
            End of document
          </dd>
        </div>
        <div>
          <dt className="font-bold text-[#68716d]">New paragraph</dt>
          <dd className="mt-1 rounded-lg bg-[#edf5f0] px-3 py-2 leading-5 text-[#315845]">
            {item.proposedContent}
          </dd>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <dt className="font-bold text-[#68716d]">Original</dt>
        <dd className="mt-1 rounded-lg bg-[#f1f0eb] px-3 py-2 leading-5 text-[#5f6964]">
          {item.originalContent}
        </dd>
      </div>
      <div>
        <dt className="font-bold text-[#68716d]">
          {item.changeType === 'delete' ? 'Proposed action' : 'Proposed'}
        </dt>
        <dd
          className={
            item.changeType === 'delete'
              ? 'mt-1 rounded-lg border border-[#e5d6bd] bg-[#fff9ee] px-3 py-2 leading-5 text-[#6f542b]'
              : 'mt-1 rounded-lg bg-[#edf5f0] px-3 py-2 leading-5 text-[#315845]'
          }
        >
          {item.changeType === 'delete'
            ? 'Remove this paragraph from the clean resolved document.'
            : item.proposedContent}
        </dd>
      </div>
    </>
  )
}
