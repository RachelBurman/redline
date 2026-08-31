export function reviewCommentFormId(reviewItemId: string, parentCommentId?: string) {
  return `comment-form-${reviewItemId}-${parentCommentId ?? 'top-level'}`
}
