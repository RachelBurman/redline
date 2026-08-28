import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(128),
    newPassword: z
      .string()
      .min(8, 'Your new password must contain at least 8 characters.')
      .max(128, 'Your new password must contain no more than 128 characters.'),
    confirmPassword: z.string(),
  })
  .refine((passwords) => passwords.newPassword !== passwords.currentPassword, {
    message: 'Your new password must be different from your current password.',
    path: ['newPassword'],
  })
  .refine((passwords) => passwords.confirmPassword === passwords.newPassword, {
    message: 'The new passwords do not match.',
    path: ['confirmPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
