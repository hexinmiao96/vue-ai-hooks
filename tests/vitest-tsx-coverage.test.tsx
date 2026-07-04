import { describe, expect, it } from 'vitest'

describe('Vitest TSX test coverage', () => {
  it('runs TSX test files through the standard test gate', () => {
    const element = <span data-kind="tsx-test" />

    expect(element.props['data-kind']).toBe('tsx-test')
  })
})
