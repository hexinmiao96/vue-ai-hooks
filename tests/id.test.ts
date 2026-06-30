import { describe, expect, it, vi } from 'vitest'
import { createIdGenerator, generateId } from '../src/types'

describe('id helpers', () => {
  it('generates prefixed ids for composable defaults', () => {
    const id = generateId('chat')

    expect(id).toMatch(/^chat-[0-9A-Za-z]{16}$/)
  })

  it('creates fixed-prefix generators', () => {
    const createId = createIdGenerator({
      prefix: 'msg',
      alphabet: 'ab',
      size: 8
    })

    expect(createId()).toMatch(/^msg-[ab]{8}$/)
    expect(createId('ignored')).toMatch(/^msg-[ab]{8}$/)
  })

  it('supports custom separators and runtime prefixes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    try {
      const createId = createIdGenerator({
        separator: '_',
        alphabet: 'abc',
        size: 4
      })

      expect(createId()).toBe('aaaa')
      expect(createId('user')).toBe('user_aaaa')
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('rejects invalid generator options', () => {
    expect(() => createIdGenerator({ size: 0 })).toThrow(/positive integer/)
    expect(() => createIdGenerator({ size: 1.5 })).toThrow(/positive integer/)
    expect(() => createIdGenerator({ alphabet: '' })).toThrow(/must not be empty/)
    expect(() => createIdGenerator({ prefix: 'msg', separator: '_', alphabet: 'a_b' })).toThrow(
      /separator/
    )
  })
})
