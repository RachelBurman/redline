import type { ReviewCommentSummary } from '#/types/reviews'

export interface ReviewCommentThreadData {
  comment: ReviewCommentSummary
  replies: ReviewCommentSummary[]
}

function compareComments(left: ReviewCommentSummary, right: ReviewCommentSummary) {
  const timestampDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt)
  return timestampDifference || left.id.localeCompare(right.id)
}

function orderByComment<T>(items: T[], getComment: (item: T) => ReviewCommentSummary) {
  const orderedItems: T[] = []
  for (const item of items) {
    const insertionIndex = orderedItems.findIndex(
      (orderedItem) => compareComments(getComment(item), getComment(orderedItem)) < 0,
    )
    if (insertionIndex === -1) orderedItems.push(item)
    else orderedItems.splice(insertionIndex, 0, item)
  }
  return orderedItems
}

export function groupReviewComments(comments: ReviewCommentSummary[]): ReviewCommentThreadData[] {
  const chronologicalComments = orderByComment(comments, (comment) => comment)
  const threads = chronologicalComments
    .filter((comment) => comment.parentCommentId === null)
    .map((comment) => ({ comment, replies: [] as ReviewCommentSummary[] }))
  const threadsById = new Map(threads.map((thread) => [thread.comment.id, thread]))
  const unlinkedReplies: ReviewCommentThreadData[] = []

  for (const reply of chronologicalComments) {
    if (!reply.parentCommentId) continue
    const parentThread = threadsById.get(reply.parentCommentId)
    if (parentThread) {
      parentThread.replies.push(reply)
    } else {
      // Defensive fallback for legacy or corrupted data: never hide discussion content.
      unlinkedReplies.push({ comment: reply, replies: [] })
    }
  }

  return orderByComment([...threads, ...unlinkedReplies], (thread) => thread.comment)
}
