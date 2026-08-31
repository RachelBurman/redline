import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'

export interface ReviewQueueFilters {
  reviewerId: string
  category: string
  status: string
  sectionId: string
  priority: string
}

export type ReviewQueueSort =
  | 'newest'
  | 'oldest'
  | 'priority-high'
  | 'priority-low'
  | 'document-order'

export const emptyReviewQueueFilters: ReviewQueueFilters = {
  reviewerId: '',
  category: '',
  status: '',
  sectionId: '',
  priority: '',
}

export function createReviewQueueColumnFilters(filters: ReviewQueueFilters): ColumnFiltersState {
  return Object.entries(filters).flatMap(([id, value]) => (value ? [{ id, value }] : []))
}

export function createReviewQueueSorting(sort: ReviewQueueSort): SortingState {
  switch (sort) {
    case 'oldest':
      return [{ id: 'createdAt', desc: false }]
    case 'priority-high':
      return [{ id: 'priorityRank', desc: true }]
    case 'priority-low':
      return [{ id: 'priorityRank', desc: false }]
    case 'document-order':
      return [{ id: 'documentOrder', desc: false }]
    default:
      return [{ id: 'createdAt', desc: true }]
  }
}

export function countReviewQueueFilters(filters: ReviewQueueFilters) {
  return Object.values(filters).filter(Boolean).length
}
