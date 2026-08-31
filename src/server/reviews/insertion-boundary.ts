import { ReviewTargetError } from './review-errors'

export function assertInsertionBoundary(input: {
  beforeBlockId: string | null
  followingBlockId: string | null
}) {
  if (input.beforeBlockId !== input.followingBlockId) {
    throw new ReviewTargetError(
      'The insertion position no longer matches this immutable document version.',
    )
  }
}
