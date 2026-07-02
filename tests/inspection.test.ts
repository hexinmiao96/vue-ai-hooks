import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  classifyInspectionError,
  inspectRequestTrace,
  type InspectRequestTraceOptions,
  type RequestInspectionSnapshot
} from '../src/utils/inspection'
import { AiHooksError } from '../src/types'

describe('inspection utilities', () => {
  it('classifies HTTP and transport errors without exposing raw causes', () => {
    const auth = classifyInspectionError(new AiHooksError('bad token', { status: 401 }))
    expect(auth).toEqual({
      category: 'authentication',
      message: 'bad token',
      name: 'AiHooksError',
      status: 401,
      retryable: false,
      hasCause: false
    })

    const limited = classifyInspectionError(
      new AiHooksError('too many requests', {
        status: 429,
        cause: { providerBody: 'not surfaced' }
      })
    )
    expect(limited).toMatchObject({
      category: 'rate-limit',
      status: 429,
      retryable: true,
      hasCause: true
    })
    expect(limited).not.toHaveProperty('cause')

    expect(
      classifyInspectionError(Object.assign(new Error('request aborted'), { name: 'AbortError' }))
    ).toMatchObject({
      category: 'abort',
      retryable: false
    })
    expect(classifyInspectionError(new Error('Network error'))).toMatchObject({
      category: 'network',
      retryable: true
    })
    expect(
      classifyInspectionError(new AiHooksError('request timeout', { status: 408 }))
    ).toMatchObject({
      category: 'timeout',
      retryable: true
    })
    expect(classifyInspectionError(new Error('schema validation failed'))).toMatchObject({
      category: 'validation',
      retryable: false
    })
    expect(classifyInspectionError({ status: 418, message: 'teapot' })).toMatchObject({
      category: 'provider',
      message: 'teapot',
      retryable: false,
      status: 418
    })
    expect(classifyInspectionError('plain failure')).toMatchObject({
      category: 'unknown',
      retryable: false
    })
    expect(classifyInspectionError(null)).toBeNull()
  })

  it('creates a render-safe request inspection snapshot', () => {
    const request = {
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 2,
      trigger: 'submit-message',
      aiSdkTrigger: 'submit-user-message',
      body: { tenantId: 'tenant_1' }
    }
    const response = { ...request, hasStream: true }

    const snapshot = inspectRequestTrace({
      status: 'streaming',
      lastRequest: request,
      lastResponse: response,
      now: '2026-07-01T00:00:00.000Z'
    })

    expect(snapshot).toEqual({
      status: 'streaming',
      request,
      response,
      error: null,
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 2,
      trigger: 'submit-message',
      aiSdkTrigger: 'submit-user-message',
      hasRequest: true,
      hasResponse: true,
      hasStream: true,
      retryable: false,
      summary: 'response received',
      timestamp: '2026-07-01T00:00:00.000Z'
    })
  })

  it('summarizes missing streams and request errors', () => {
    expect(
      inspectRequestTrace({
        lastRequest: { providerId: 'proxy' },
        lastResponse: { api: '/api/chat', attempt: 3, hasStream: false },
        now: 0
      })
    ).toMatchObject({
      status: 'ready',
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 3,
      hasStream: false,
      summary: 'response received without stream',
      timestamp: '1970-01-01T00:00:00.000Z'
    })

    expect(
      inspectRequestTrace({
        lastRequest: { providerId: 'openai-compatible' },
        error: new AiHooksError('upstream unavailable', { status: 503 }),
        now: new Date('2026-07-01T00:00:00.000Z')
      })
    ).toMatchObject({
      status: 'error',
      providerId: 'openai-compatible',
      retryable: true,
      summary: 'provider: upstream unavailable',
      error: {
        category: 'provider',
        status: 503,
        retryable: true
      }
    })

    expect(
      inspectRequestTrace({
        status: 'submitted',
        lastRequest: { providerId: 'proxy' },
        now: '2026-07-01T00:00:00.000Z'
      })
    ).toMatchObject({
      status: 'submitted',
      summary: 'request submitted',
      hasRequest: true,
      hasResponse: false
    })

    expect(inspectRequestTrace({ now: '2026-07-01T00:00:00.000Z' })).toMatchObject({
      status: 'idle',
      summary: 'no request recorded',
      hasRequest: false,
      hasResponse: false
    })
  })

  it('keeps generic types available for request and response snapshots', () => {
    type Request = { providerId: string; body: { tenantId: string } }
    type Response = Request & { hasStream: boolean }
    const options: InspectRequestTraceOptions<Request, Response> = {
      lastRequest: { providerId: 'proxy', body: { tenantId: 'tenant_1' } },
      lastResponse: { providerId: 'proxy', body: { tenantId: 'tenant_1' }, hasStream: true }
    }
    const snapshot = inspectRequestTrace(options)

    expectTypeOf(snapshot).toEqualTypeOf<RequestInspectionSnapshot<Request, Response>>()
    expect(snapshot.request?.body.tenantId).toBe('tenant_1')
    expect(snapshot.response?.hasStream).toBe(true)
  })
})
