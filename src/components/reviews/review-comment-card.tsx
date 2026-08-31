import type { ReviewCommentSummary } from '#/types/reviews'

const commentTimestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ReviewCommentCard({ comment }: { comment: ReviewCommentSummary }) {
  return (
    <article className="rounded-xl border border-[#e0ded7] bg-[#faf9f5] px-3 py-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-bold text-[#37423d]">{comment.author.name}</p>
        <time
          className="text-[10px] text-[#7a837f]"
          dateTime={comment.createdAt}
          title={new Date(comment.createdAt).toISOString()}
        >
          {commentTimestampFormatter.format(new Date(comment.createdAt))}
        </time>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 break-words text-[#4e5954]">
        {comment.body}
      </p>
      {comment.editedAt ? <p className="mt-1 text-[10px] text-[#7a837f]">Edited</p> : null}
    </article>
  )
}
