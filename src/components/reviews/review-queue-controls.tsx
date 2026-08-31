import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'

import type { ReviewQueueSection } from './review-queue-model'
import type { ReviewQueueFilters, ReviewQueueSort } from './review-queue-state'

interface ReviewerOption {
  id: string
  name: string
}

interface ReviewQueueControlsProps {
  activeFilterCount: number
  filters: ReviewQueueFilters
  onClear: () => void
  onFilterChange: (filter: keyof ReviewQueueFilters, value: string) => void
  onSortChange: (sort: ReviewQueueSort) => void
  reviewers: ReviewerOption[]
  sections: ReviewQueueSection[]
  sort: ReviewQueueSort
  totalCount: number
  visibleCount: number
}

const statusOptions = [
  ['open', 'Open'],
  ['under_discussion', 'Under discussion'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['superseded', 'Superseded'],
  ['conflict', 'Conflict'],
  ['resolved', 'Resolved'],
] as const

const selectClassName =
  'mt-1 min-h-9 w-full rounded-lg border border-[#d5d3cc] bg-white px-2 text-xs text-[#37423d] focus:border-[#315845] focus:outline-2 focus:outline-offset-1 focus:outline-[#315845]'

export function ReviewQueueControls({
  activeFilterCount,
  filters,
  onClear,
  onFilterChange,
  onSortChange,
  reviewers,
  sections,
  sort,
  totalCount,
  visibleCount,
}: ReviewQueueControlsProps) {
  return (
    <fieldset className="mt-4 rounded-xl border border-[#e2e0d9] bg-[#f8f7f3] p-3">
      <legend className="px-1 text-xs font-bold text-[#4e5954]">Queue controls</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold text-[#68726d]">
          Reviewer
          <select
            className={selectClassName}
            onChange={(event) => onFilterChange('reviewerId', event.target.value)}
            value={filters.reviewerId}
          >
            <option value="">All reviewers</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-[#68726d]">
          Category
          <select
            className={selectClassName}
            onChange={(event) => onFilterChange('category', event.target.value)}
            value={filters.category}
          >
            <option value="">All categories</option>
            {reviewCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-[#68726d]">
          Status
          <select
            className={selectClassName}
            onChange={(event) => onFilterChange('status', event.target.value)}
            value={filters.status}
          >
            <option value="">All statuses</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-[#68726d]">
          Section
          <select
            className={selectClassName}
            onChange={(event) => onFilterChange('sectionId', event.target.value)}
            value={filters.sectionId}
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-[#68726d]">
          Priority
          <select
            className={selectClassName}
            onChange={(event) => onFilterChange('priority', event.target.value)}
            value={filters.priority}
          >
            <option value="">All priorities</option>
            {reviewPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority[0]?.toUpperCase()}
                {priority.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-[#68726d]">
          Sort
          <select
            className={selectClassName}
            onChange={(event) => onSortChange(event.target.value as ReviewQueueSort)}
            value={sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority-high">Highest priority</option>
            <option value="priority-low">Lowest priority</option>
            <option value="document-order">Document order</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <output aria-live="polite" className="text-[11px] font-semibold text-[#68726d]">
          {visibleCount} of {totalCount} proposals
        </output>
        <button
          className="min-h-8 rounded-lg px-2 text-[11px] font-bold text-[#315845] hover:bg-[#e8f1ec] disabled:cursor-not-allowed disabled:text-[#9aa19e] disabled:hover:bg-transparent"
          disabled={activeFilterCount === 0}
          onClick={onClear}
          type="button"
        >
          Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>
    </fieldset>
  )
}
