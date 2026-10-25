import type { ReviewItemSummary } from '#/types/reviews'

export function ReviewItemChangeSummary({ item }: { item: ReviewItemSummary }) {
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
