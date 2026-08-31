import type { DocumentDetail } from '#/types/documents'
import type { ReviewItemSummary } from '#/types/reviews'

export interface ReviewQueueSection {
  id: string
  label: string
}

export interface ReviewQueueEntry {
  item: ReviewItemSummary
  reviewerId: string
  category: string
  status: string
  sectionId: string
  sectionLabel: string
  priority: string
  priorityRank: number
  createdAt: number
  documentOrder: number
}

export interface ReviewQueueModel {
  entries: ReviewQueueEntry[]
  sections: ReviewQueueSection[]
}

const openingSection: ReviewQueueSection = {
  id: 'section:document-opening',
  label: 'Before first heading',
}

const unsectionedSection: ReviewQueueSection = {
  id: 'section:unsectioned',
  label: 'Unsectioned',
}

const priorityRanks: Record<ReviewItemSummary['priority'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

interface BlockLocation {
  documentOrder: number
  section: ReviewQueueSection
}

export function buildReviewQueueModel(
  blocks: DocumentDetail['blocks'],
  items: ReviewItemSummary[],
): ReviewQueueModel {
  const locations = new Map<string, BlockLocation>()
  const orderedSections: ReviewQueueSection[] = [openingSection]
  let currentSection = openingSection

  for (const block of blocks) {
    if (block.blockType === 'heading') {
      currentSection = {
        id: `section:${block.id}`,
        label: block.text.trim() || 'Untitled heading',
      }
      orderedSections.push(currentSection)
    }
    locations.set(block.id, {
      documentOrder: block.ordinal,
      section: currentSection,
    })
  }

  const entries = items.map((item) => {
    const location = locations.get(item.targetBlockId)
    return {
      item,
      reviewerId: item.author.id,
      category: item.category,
      status: item.status,
      sectionId: location?.section.id ?? unsectionedSection.id,
      sectionLabel: location?.section.label ?? unsectionedSection.label,
      priority: item.priority,
      priorityRank: priorityRanks[item.priority],
      createdAt: Date.parse(item.createdAt),
      documentOrder: location?.documentOrder ?? Number.MAX_SAFE_INTEGER,
    }
  })
  const usedSectionIds = new Set(entries.map((entry) => entry.sectionId))
  const sections = orderedSections.filter((section) => usedSectionIds.has(section.id))
  if (usedSectionIds.has(unsectionedSection.id)) sections.push(unsectionedSection)

  return { entries, sections }
}
