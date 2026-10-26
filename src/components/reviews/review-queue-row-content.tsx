import type { ReviewItemSummary } from '#/types/reviews'

const priorityStyles: Record<ReviewItemSummary['priority'], string> = {
  low: 'bg-[#eef0ed] text-[#64706a]',
  medium: 'bg-[#e7f0eb] text-[#35634f]',
  high: 'bg-[#fff0d6] text-[#8a5a12]',
  critical: 'bg-[#ffe3dd] text-[#9d3f2c]',
}

const changeLabels: Record<ReviewItemSummary['changeType'], string> = {
  delete: 'Deletion',
  insert: 'New paragraph',
  replace: 'Replacement',
  media_insert: 'New image',
  media_replace: 'Image replacement',
  media_delete: 'Image deletion',
  media_caption: 'Caption change',
  media_alt_text: 'Description change',
  media_reorder: 'Image move',
}

function proposalSummary(item: ReviewItemSummary) {
  if (item.changeType === 'delete' || item.changeType === 'media_delete') {
    return item.changeType === 'media_delete'
      ? (item.proposedMedia?.altText ?? 'Delete image')
      : item.originalContent
  }
  if (item.changeType === 'media_reorder') return 'Move image to a new document position'
  return item.proposedMedia?.altText ?? item.proposedContent
}

export function ReviewQueueRowContent({
  item,
  sectionLabel,
}: {
  item: ReviewItemSummary
  sectionLabel: string
}) {
  return (
    <span className="block text-left">
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[10px] font-bold tracking-wide text-[#8a6540] uppercase">
            {changeLabels[item.changeType]}
          </span>
          <span className="block truncate text-xs font-bold text-[#37423d]">{item.category}</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${priorityStyles[item.priority]}`}
        >
          {item.priority}
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block text-xs leading-5 text-[#68726d]">
        {proposalSummary(item)}
      </span>
      <span className="mt-2 block truncate text-[10px] font-semibold text-[#65716b]">
        Section: {sectionLabel}
      </span>
      <span className="mt-2 flex items-center justify-between text-[10px] text-[#8a918e]">
        <span>{item.author.name}</span>
        <span className="font-bold capitalize">{item.status.replace('_', ' ')}</span>
      </span>
    </span>
  )
}
