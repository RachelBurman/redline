import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equals,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { ReviewItemDetail } from './review-item-detail'
import { ReviewQueueControls } from './review-queue-controls'
import { buildReviewQueueModel } from './review-queue-model'
import { ReviewQueueRowContent } from './review-queue-row-content'
import {
  countReviewQueueFilters,
  createReviewQueueColumnFilters,
  createReviewQueueSorting,
  emptyReviewQueueFilters,
} from './review-queue-state'

import type { DocumentDetail } from '#/types/documents'
import type { ReviewCommentSummary, ReviewItemSummary } from '#/types/reviews'
import type { ReviewQueueEntry } from './review-queue-model'
import type { ReviewQueueFilters, ReviewQueueSort } from './review-queue-state'

const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})
const columnHelper = createColumnHelper<typeof features, ReviewQueueEntry>()
const columns = columnHelper.columns([
  columnHelper.display({
    id: 'proposal',
    header: 'Review proposals',
    cell: ({ row }) => (
      <ReviewQueueRowContent item={row.original.item} sectionLabel={row.original.sectionLabel} />
    ),
  }),
  columnHelper.accessor('reviewerId', { filterFn: filterFn_equals }),
  columnHelper.accessor('category', { filterFn: filterFn_equals }),
  columnHelper.accessor('status', { filterFn: filterFn_equals }),
  columnHelper.accessor('sectionId', { filterFn: filterFn_equals }),
  columnHelper.accessor('priority', { filterFn: filterFn_equals }),
  columnHelper.accessor('priorityRank', { sortFn: sortFn_basic }),
  columnHelper.accessor('createdAt', { sortFn: sortFn_basic }),
  columnHelper.accessor('documentOrder', { sortFn: sortFn_basic }),
])

interface ReviewQueueProps {
  blocks: DocumentDetail['blocks']
  items: ReviewItemSummary[]
  documentId: string
  selectedItemId: string | null
  canComment: boolean
  canResolve: boolean
  onSelect: (item: ReviewItemSummary) => void
  onCommentCreated: (comment: ReviewCommentSummary) => void
  onResolve: (item: ReviewItemSummary, decision: 'accept' | 'reject') => Promise<void>
}

export function ReviewQueue({
  blocks,
  items,
  documentId,
  selectedItemId,
  canComment,
  canResolve,
  onSelect,
  onCommentCreated,
  onResolve,
}: ReviewQueueProps) {
  const [filters, setFilters] = useState<ReviewQueueFilters>({ ...emptyReviewQueueFilters })
  const [sort, setSort] = useState<ReviewQueueSort>('newest')
  const model = useMemo(() => buildReviewQueueModel(blocks, items), [blocks, items])
  const columnFilters = useMemo(() => createReviewQueueColumnFilters(filters), [filters])
  const sorting = useMemo(() => createReviewQueueSorting(sort), [sort])
  const reviewers = useMemo(() => {
    const reviewerIds = new Set<string>()
    return model.entries.flatMap((entry) => {
      if (reviewerIds.has(entry.reviewerId)) return []
      reviewerIds.add(entry.reviewerId)
      return [{ id: entry.reviewerId, name: entry.item.author.name }]
    })
  }, [model.entries])
  const table = useTable({
    features,
    columns,
    data: model.entries,
    state: { columnFilters, sorting },
  })
  const rows = table.getRowModel().rows
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedItemIsVisible = rows.some((row) => row.original.item.id === selectedItemId)
  const activeFilterCount = countReviewQueueFilters(filters)

  function handleFilterChange(filter: keyof ReviewQueueFilters, value: string) {
    setFilters((current) => ({ ...current, [filter]: value }))
  }

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
        <>
          <ReviewQueueControls
            activeFilterCount={activeFilterCount}
            filters={filters}
            onClear={() => setFilters({ ...emptyReviewQueueFilters })}
            onFilterChange={handleFilterChange}
            onSortChange={setSort}
            reviewers={reviewers}
            sections={model.sections}
            sort={sort}
            totalCount={items.length}
            visibleCount={rows.length}
          />

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#f3f2ed] px-3 py-3 text-xs leading-5 text-[#68726d]">
              No proposals match the current filters. Clear or change a filter to see more of the
              queue.
            </p>
          ) : (
            <table className="mt-2 w-full border-separate border-spacing-y-2">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Review proposals</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const proposalCell = row.getAllCells()[0]
                  if (!proposalCell) return null
                  return (
                    <tr key={row.id}>
                      <td>
                        <button
                          aria-label={`Select ${row.original.item.category} proposal by ${row.original.item.author.name}`}
                          aria-pressed={selectedItemId === row.original.item.id}
                          className="w-full rounded-xl border border-[#dfddd6] bg-[#faf9f5] px-3 py-3 transition-colors hover:border-[#d2a699] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315845] aria-pressed:border-[#d06d53] aria-pressed:bg-[#fff5f1]"
                          onClick={() => onSelect(row.original.item)}
                          type="button"
                        >
                          <table.FlexRender cell={proposalCell} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {selectedItem && !selectedItemIsVisible ? (
        <p className="mt-3 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs text-[#765724]">
          The selected proposal is outside the current filters. Its details remain open below.
        </p>
      ) : null}

      {selectedItem ? (
        <ReviewItemDetail
          canComment={canComment}
          canResolve={canResolve}
          documentId={documentId}
          item={selectedItem}
          onCommentCreated={onCommentCreated}
          onResolve={onResolve}
        />
      ) : null}
    </section>
  )
}
