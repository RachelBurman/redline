import { describe, expect, it } from 'vitest'

import {
  compareDocumentVersionsSchema,
  createDocumentVersionSchema,
  restoreDocumentVersionSchema,
} from './version-schemas'

const versionId = 'd9d8599c-78ac-488f-92d8-ee9f4ce5f624'

describe('document version schemas', () => {
  it('allows an explicit version creation request with an optional note', () => {
    expect(
      createDocumentVersionSchema.parse({
        expectedCurrentVersionId: versionId,
        note: 'Approved changes from round one',
      }),
    ).toEqual({
      expectedCurrentVersionId: versionId,
      note: 'Approved changes from round one',
    })
  })

  it('requires a meaningful reason when restoring an older version', () => {
    expect(
      restoreDocumentVersionSchema.safeParse({
        expectedCurrentVersionId: versionId,
        reason: '  ',
      }).success,
    ).toBe(false)
  })

  it('requires two different versions for comparison', () => {
    expect(
      compareDocumentVersionsSchema.safeParse({
        baseVersionId: versionId,
        targetVersionId: versionId,
      }).success,
    ).toBe(false)
  })
})
