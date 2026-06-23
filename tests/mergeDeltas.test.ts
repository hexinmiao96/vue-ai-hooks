import { describe, it, expect } from 'vitest'
import { mergeDeltas } from '../src/composables/_tc_merge'

describe('mergeDeltas (tool-call accumulator)', () => {
  it('returns existing when delta is empty', () => {
    expect(mergeDeltas(undefined, undefined)).toEqual([])
    expect(
      mergeDeltas(
        [{ id: 'a', type: 'function', function: { name: 'x', arguments: '{}' } }],
        undefined
      )
    ).toEqual([{ id: 'a', type: 'function', function: { name: 'x', arguments: '{}' } }])
  })

  it('creates a new entry on first delta with an id', () => {
    const out = mergeDeltas(undefined, [
      { index: 0, id: 'call_1', function: { name: 'get_weather' } }
    ])
    expect(out).toEqual([
      { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '' } }
    ])
  })

  it('creates a new entry with default fields when the first delta is sparse', () => {
    const out = mergeDeltas(undefined, [{ index: 0 }])

    expect(out).toEqual([{ id: '', type: 'function', function: { name: '', arguments: '' } }])
  })

  it('appends to the arguments string across chunks', () => {
    const out = mergeDeltas(
      [{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '' } }],
      [
        { index: 0, function: { arguments: '{"ci' } },
        { index: 0, function: { arguments: 'ty":' } },
        { index: 0, function: { arguments: '"SF"}' } }
      ]
    )
    expect(out[0].function.arguments).toBe('{"city":"SF"}')
  })

  it('appends function name fragments', () => {
    const out = mergeDeltas(
      [{ id: 'call_1', type: 'function', function: { name: 'get_', arguments: '' } }],
      [{ index: 0, function: { name: 'weather' } }]
    )

    expect(out[0].function.name).toBe('get_weather')
  })

  it('expands a partial function name when the next chunk includes the full name', () => {
    const out = mergeDeltas(
      [{ id: 'call_1', type: 'function', function: { name: 'get', arguments: '' } }],
      [{ index: 0, id: 'call_2', function: { name: 'get_weather' } }]
    )

    expect(out[0].id).toBe('call_2')
    expect(out[0].function.name).toBe('get_weather')
  })

  it('sets the function name directly when the current name is empty', () => {
    const out = mergeDeltas(
      [{ id: 'call_1', type: 'function', function: { name: '', arguments: '' } }],
      [{ index: 0, function: { name: 'get_weather' } }]
    )

    expect(out[0].function.name).toBe('get_weather')
  })

  it('does not duplicate a repeated full function name', () => {
    const out = mergeDeltas(
      [
        { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":' } }
      ],
      [{ index: 0, function: { name: 'get_weather', arguments: '"SF"}' } }]
    )

    expect(out[0].function.name).toBe('get_weather')
    expect(out[0].function.arguments).toBe('{"city":"SF"}')
  })

  it('handles multiple parallel tool calls by index', () => {
    const out = mergeDeltas(undefined, [
      { index: 0, id: 'a', function: { name: 'f1', arguments: '{"x":' } },
      { index: 1, id: 'b', function: { name: 'f2', arguments: '{"y":' } },
      { index: 0, function: { arguments: '1}' } },
      { index: 1, function: { arguments: '2}' } }
    ])
    expect(out[0].id).toBe('a')
    expect(out[0].function.arguments).toBe('{"x":1}')
    expect(out[1].id).toBe('b')
    expect(out[1].function.arguments).toBe('{"y":2}')
  })

  it('skips deltas with no index', () => {
    const out = mergeDeltas(undefined, [{ function: { name: 'orphan' } }])
    expect(out).toEqual([])
  })
})
