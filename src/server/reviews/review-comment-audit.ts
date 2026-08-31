import { createHash } from 'node:crypto'

export function buildReviewCommentAuditPayload(input: {
  body: string
  commentId: string
  parentCommentId: string | null
}) {
  return {
    commentId: input.commentId,
    parentCommentId: input.parentCommentId,
    bodyLength: input.body.length,
    bodyHash: createHash('sha256').update(input.body, 'utf8').digest('hex'),
  }
}
