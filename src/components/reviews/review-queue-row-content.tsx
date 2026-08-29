import type { ReviewItemSummary } from '#/types/reviews'

const priorityStyles: Record<ReviewItemSummary['priority'], string> = {
  low: 'bg-[#eef0ed] text-[#64706a]',
  medium: 'bg-[#e7f0eb] text-[#35634f]',
  high: 'bg-[#fff0d6] text-[#8a5a12]',
  critical: 'bg-[#ffe3dd] text-[#9d3f2c]',
}

export function ReviewQueueRowContent({ item }: { item: ReviewItemSummary }) {
  return (
    <span className="block text-left">
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[10px] font-bold tracking-wide text-[#8a6540] uppercase">
            {item.changeType === 'delete' ? 'Deletion' : 'Replacement'}
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
        {item.changeType === 'delete' ? item.originalContent : item.proposedContent}
      </span>
      <span className="mt-2 flex items-center justify-between text-[10px] text-[#8a918e]">
        <span>{item.author.name}</span>
        <span className="font-bold capitalize">{item.status.replace('_', ' ')}</span>
      </span>
    </span>
  )
}
