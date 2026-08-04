import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProductPreview } from './product-preview'

describe('ProductPreview', () => {
  it('keeps the document and decision queue available as distinct landmarks', () => {
    render(<ProductPreview />)

    expect(screen.getByRole('article', { name: 'Example document being reviewed' })).toBeVisible()

    const queue = screen.getByRole('complementary', {
      name: 'Example review decision queue',
    })

    expect(within(queue).getByRole('heading', { name: 'Open reviews' })).toBeVisible()
    expect(within(queue).getByRole('button', { name: 'Accept example proposal' })).toBeEnabled()
    expect(within(queue).getByRole('button', { name: 'Reject example proposal' })).toBeEnabled()
  })
})
