import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGeneration, useRerank, useTranscription } from '../src/react'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('react parity hooks', () => {
  it('runs custom generation jobs with progress, chunks, and traces', async () => {
    const onProgress = vi.fn()
    const onChunk = vi.fn()
    const { result } = renderHook(() =>
      useGeneration<string, { url: string }, { percent: number }, string>({
        initialInput: 'seed',
        defaultBody: { tenantId: 'tenant_1' },
        onProgress,
        onChunk,
        async fetcher(input, context) {
          expect(context.body).toEqual({ tenantId: 'tenant_1' })
          context.reportProgress({ percent: 50 })
          context.reportChunk('half')
          return { url: `/generated/${input}` }
        }
      })
    )

    await act(async () => {
      await expect(result.current.generate()).resolves.toEqual({
        url: '/generated/seed'
      })
    })

    expect(result.current.progress).toEqual({ percent: 50 })
    expect(result.current.chunks).toEqual(['half'])
    expect(result.current.result).toEqual({ url: '/generated/seed' })
    expect(result.current.lastRequest).toMatchObject({ input: 'seed' })
    expect(result.current.lastResponse).toMatchObject({ result: { url: '/generated/seed' } })
    expect(onProgress).toHaveBeenCalledWith({ percent: 50 })
    expect(onChunk).toHaveBeenCalledWith('half')
  })

  it('shares generation state between hooks with the same id', async () => {
    const fetcher = vi.fn(async (input: string) => ({ url: `/shared/${input}` }))
    const { result } = renderHook(() => ({
      first: useGeneration<string, { url: string }>({
        id: 'shared-generation-parity',
        initialInput: 'seed',
        fetcher
      }),
      second: useGeneration<string, { url: string }>({
        id: 'shared-generation-parity',
        initialInput: 'ignored',
        fetcher
      })
    }))

    expect(result.current.first.input).toBe('seed')
    expect(result.current.second.input).toBe('seed')

    await act(async () => {
      result.current.first.setInput('synced')
    })

    expect(result.current.first.input).toBe('synced')
    expect(result.current.second.input).toBe('synced')

    await act(async () => {
      await expect(result.current.second.generate()).resolves.toEqual({
        url: '/shared/synced'
      })
    })

    expect(fetcher).toHaveBeenCalledWith('synced', expect.objectContaining({ attempt: 1 }))
    expect(result.current.first.result).toEqual({ url: '/shared/synced' })
    expect(result.current.second.lastResponse).toMatchObject({
      result: { url: '/shared/synced' }
    })
  })

  it('posts transcription requests and exposes text aliases', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ transcription: 'hello from audio', model: 'transcribe-model' })
    )
    const { result } = renderHook(() =>
      useTranscription({
        api: '/api/react-transcription',
        fetch: fetcher as unknown as typeof fetch,
        initialInput: 'data:audio/wav;base64,AAAA'
      })
    )

    await act(async () => {
      await expect(result.current.handleSubmit()).resolves.toMatchObject({
        text: 'hello from audio',
        model: 'transcribe-model'
      })
    })

    expect(result.current.input).toBe('')
    expect(result.current.transcription).toBe('hello from audio')
    expect(result.current.text).toBe('hello from audio')
    expect(result.current.lastRequest).toMatchObject({
      api: '/api/react-transcription',
      audio: 'data:audio/wav;base64,AAAA'
    })
    expect(
      JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    ).toMatchObject({
      audio: 'data:audio/wav;base64,AAAA'
    })
  })

  it('posts rerank requests and exposes ranked documents', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        ranking: [
          { index: 1, score: 0.9 },
          { index: 0, score: 0.4 }
        ]
      })
    )
    const { result } = renderHook(() =>
      useRerank<string>({
        fetch: fetcher as unknown as typeof fetch,
        initialInput: 'billing question',
        initialDocuments: ['shipping policy', 'billing workflow']
      })
    )

    await act(async () => {
      await expect(result.current.handleSubmit()).resolves.toMatchObject({
        ranking: [
          { index: 1, score: 0.9, document: 'billing workflow' },
          { index: 0, score: 0.4, document: 'shipping policy' }
        ]
      })
    })

    expect(result.current.input).toBe('')
    expect(result.current.rerankedDocuments).toEqual(['billing workflow', 'shipping policy'])
    expect(result.current.ranking).toHaveLength(2)
    expect(result.current.lastRequest).toMatchObject({
      query: 'billing question',
      documents: ['shipping policy', 'billing workflow']
    })
  })
})
