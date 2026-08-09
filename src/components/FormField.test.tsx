import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField.tsx'

describe('FormField', () => {
  it('connects label, hint and validation feedback to the input', () => {
    render(
      <FormField
        label="E-post"
        hint="Bruk jobb-adressen din."
        error="E-post er påkrevd."
      />,
    )

    const input = screen.getByRole('textbox', { name: 'E-post' })
    expect(input).toHaveAccessibleDescription(
      'Bruk jobb-adressen din. E-post er påkrevd.',
    )
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('E-post er påkrevd.')
  })
})
