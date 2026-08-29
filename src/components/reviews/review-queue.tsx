import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'

import { ReviewItemDetail } from './review-item-detail'
import { ReviewQueueRowContent } from './review-queue-row-content'

import type { ReviewItemSummary } from '#/types/reviews'

const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, ReviewItemSummary>()
const columns = columnHelper.columns([
  columnHelper.display({
    id: 'proposal',
    header: 'Review proposals',
    cell: ({ row }) => <ReviewQueueRowContent item={row.original} />,
  }),
])

interface ReviewQueueProps {
  items: ReviewItemSummary[]
  selectedItemId: string | null
  canResolve: boolean
  onSelect: (item: ReviewItemSummary) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
}

export function ReviewQueue({
  items,
  selectedItemId,
  canResolve,
  onSelect,
  onResolve,
}: ReviewQueueProps) {
  const table = useTable({ features, columns, data: items })
  const selectedItem = items.find((item) => item.id === selectedItemId)

  return (
    <section aria-labelledby="review-queue-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#a64e38] uppercase">
            Review queue
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#26312d]" id="review-queue-heading">
            {items.length === 0
              ? 'No proposals yet'
              : `${items.length} proposal${items.length === 1 ? '' : 's'}`}
          </h2>
        </div>
        <span className="text-xs font-bold text-[#727b77]">
          {items.filter((item) => item.status === 'open').length} open
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-[#6e7873]">
          Choose Replace or Propose deletion beside a paragraph, or Add paragraph at end, to create
          a review proposal.
        </p>
      ) : (
        <table className="mt-4 w-full border-separate border-spacing-y-2">
          <thead className="sr-only">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <button
                      aria-label={`Select ${row.original.category} proposal by ${row.original.author.name}`}
                      aria-pressed={selectedItemId === row.original.id}
                      className="w-full rounded-xl border border-[#dfddd6] bg-[#faf9f5] px-3 py-3 transition-colors hover:border-[#d2a699] aria-pressed:border-[#d06d53] aria-pressed:bg-[#fff5f1]"
                      onClick={() => onSelect(row.original)}
                      type="button"
                    >
                      <table.FlexRender cell={cell} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedItem ? (
        <ReviewItemDetail canResolve={canResolve} item={selectedItem} onResolve={onResolve} />
      ) : null}
    </section>
  )
}
