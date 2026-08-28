import { describe, expect, it } from 'vitest'

import { resetPasswordSchema } from './reset-password-schema'

describe('resetPasswordSchema', () => {
  it('accepts a matching password within the configured boundary', () => {
    expect(
      resetPasswordSchema.safeParse({
        newPassword: 'replacement-password',
        confirmPassword: 'replacement-password',
      }).success,
    ).toBe(true)
  })

  it('rejects a mismatched password confirmation', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'replacement-password',
      confirmPassword: 'different-password',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('The new passwords do not match.')
  })
})
