import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthForm } from './auth-form'

describe('AuthForm', () => {
  it('uses a non-query native fallback so credentials cannot enter the URL', () => {
    render(<AuthForm mode="sign-up" />)

    const submitButton = screen.getByRole('button', { name: 'Create your workspace' })
    expect(submitButton.closest('form')).toHaveAttribute('method', 'post')
  })
})
