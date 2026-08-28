import { z } from 'zod'

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Your new password must contain at least 8 characters.')
      .max(128, 'Your new password must contain no more than 128 characters.'),
    confirmPassword: z.string(),
  })
  .refine((passwords) => passwords.confirmPassword === passwords.newPassword, {
    message: 'The new passwords do not match.',
    path: ['confirmPassword'],
  })
