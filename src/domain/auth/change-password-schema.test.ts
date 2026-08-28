import { describe, expect, it } from 'vitest'

import { changePasswordSchema } from './change-password-schema'

describe('changePasswordSchema', () => {
  it('accepts a new matching password', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'old-password',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      }).success,
    ).toBe(true)
  })

  it('rejects a mismatched confirmation', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmPassword: 'different-password',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('The new passwords do not match.')
  })

  it('rejects reuse of the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'same-password',
      newPassword: 'same-password',
      confirmPassword: 'same-password',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Your new password must be different from your current password.',
    )
  })

  it('enforces the Better Auth password length boundary', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'old-password',
        newPassword: 'short',
        confirmPassword: 'short',
      }).success,
    ).toBe(false)
  })
})
