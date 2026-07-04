import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  classifyInspectionError,
  createInspectionCurl,
  inspectRequestTrace,
  type InspectionCurlOptions,
  type InspectionProviderTrace,
  type InspectionRetryRecord,
  type InspectionTimelineEvent,
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
      providerTrace: {
        providerId: 'proxy',
        api: '/api/chat',
        attempt: 2,
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message',
        hasStream: true,
        requestKeys: ['aiSdkTrigger', 'api', 'attempt', 'body', 'providerId', 'trigger'],
        responseKeys: [
          'aiSdkTrigger',
          'api',
          'attempt',
          'body',
          'hasStream',
          'providerId',
          'trigger'
        ]
      },
      timeline: [
        {
          kind: 'request',
          label: 'request prepared',
          timestamp: '2026-07-01T00:00:00.000Z',
          status: 'streaming',
          attempt: 2
        },
        {
          kind: 'response',
          label: 'response received',
          timestamp: '2026-07-01T00:00:00.000Z',
          status: 'streaming',
          attempt: 2
        }
      ],
      retries: [],
      curl: null,
      retryable: false,
      summary: 'response received',
      timestamp: '2026-07-01T00:00:00.000Z'
    })
  })

  it('extracts trace id from request metadata for snapshot and provider trace', () => {
    const snapshot = inspectRequestTrace({
      status: 'ready',
      lastRequest: {
        providerId: 'proxy',
        api: '/api/chat',
        metadata: { traceId: 'trace_123' },
        attempt: 1
      },
      now: '2026-07-01T00:00:00.000Z'
    })

    expect(snapshot.traceId).toBe('trace_123')
    expect(snapshot.providerTrace).toMatchObject({
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 1,
      traceId: 'trace_123'
    })
  })

  it('extracts trace id from request body and request metadata snapshots', () => {
    expect(
      inspectRequestTrace({
        lastRequest: {
          providerId: 'proxy',
          body: { traceId: 'trace_body' }
        },
        now: '2026-07-01T00:00:00.000Z'
      })
    ).toMatchObject({
      traceId: 'trace_body',
      providerTrace: { traceId: 'trace_body' }
    })

    expect(
      inspectRequestTrace({
        lastRequest: {
          providerId: 'proxy',
          requestMetadata: { traceId: 'trace_request_metadata' }
        },
        now: '2026-07-01T00:00:00.000Z'
      })
    ).toMatchObject({
      traceId: 'trace_request_metadata',
      providerTrace: { traceId: 'trace_request_metadata' }
    })
  })

  it('adds retry records, stream events, provider trace, and redacted curl output', () => {
    const retryError = new AiHooksError('too many requests', { status: 429 })
    const request = {
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 2,
      headers: {
        authorization: 'Bearer secret',
        'x-tenant': 'tenant_1'
      },
      request: {
        headers: {
          Authorization: 'Bearer nested-secret',
          accept: 'application/json'
        }
      },
      body: {
        message: "don't leak headers",
        apiKey: 'body-secret',
        accessToken: 'access-secret',
        clientSecret: 'client-secret',
        nested: {
          completionTokens: 12,
          privateKey: 'private-secret'
        }
      }
    }
    const streamMetadata = {
      chunkIndex: 1,
      Authorization: 'Bearer event-direct-secret',
      apiKey: 'event-api-key',
      sessionToken: 'event-session-token',
      nested: {
        password: 'event-password'
      },
      headers: {
        Authorization: 'Bearer event-secret',
        accept: 'text/event-stream'
      }
    }
    const snapshot = inspectRequestTrace({
      status: 'error',
      error: retryError,
      lastRequest: request,
      retries: [
        {
          attempt: 1,
          maxRetries: 2,
          delayMs: 250,
          error: retryError,
          timestamp: '2026-07-01T00:00:01.000Z'
        }
      ],
      events: [
        {
          kind: 'stream',
          label: 'delta received',
          timestamp: '2026-07-01T00:00:02.000Z',
          attempt: 2,
          metadata: streamMetadata
        }
      ],
      curl: true,
      now: '2026-07-01T00:00:03.000Z'
    })

    expect(snapshot.retries).toEqual([
      {
        attempt: 1,
        maxRetries: 2,
        delayMs: 250,
        error: {
          category: 'rate-limit',
          message: 'too many requests',
          name: 'AiHooksError',
          status: 429,
          retryable: true,
          hasCause: false
        },
        timestamp: '2026-07-01T00:00:01.000Z'
      }
    ])
    expect(snapshot.timeline.map((event) => event.kind)).toEqual([
      'retry',
      'stream',
      'request',
      'error'
    ])
    expect(snapshot.providerTrace).toMatchObject({
      providerId: 'proxy',
      api: '/api/chat',
      attempt: 2
    })
    expect(snapshot.curl).toContain("curl -X 'POST' '/api/chat'")
    expect(snapshot.curl).toContain("-H 'authorization: [redacted]'")
    expect(snapshot.curl).toContain("-H 'x-tenant: tenant_1'")
    expect(snapshot.curl).toContain('--data-raw')
    expect(snapshot.curl).not.toContain('Bearer secret')
    expect(snapshot.curl).not.toContain('body-secret')
    expect(snapshot.curl).not.toContain('access-secret')
    expect(snapshot.curl).not.toContain('client-secret')
    expect(snapshot.curl).not.toContain('private-secret')
    expect(snapshot.curl).toContain('"apiKey":"[redacted]"')
    expect(snapshot.curl).toContain('"accessToken":"[redacted]"')
    expect(snapshot.curl).toContain('"clientSecret":"[redacted]"')
    expect(snapshot.curl).toContain('"privateKey":"[redacted]"')
    expect(snapshot.request?.headers.authorization).toBe('[redacted]')
    expect(snapshot.request?.headers['x-tenant']).toBe('tenant_1')
    expect(snapshot.request?.request.headers.Authorization).toBe('[redacted]')
    expect(snapshot.request?.request.headers.accept).toBe('application/json')
    expect(snapshot.request?.body.apiKey).toBe('[redacted]')
    expect(snapshot.request?.body.accessToken).toBe('[redacted]')
    expect(snapshot.request?.body.clientSecret).toBe('[redacted]')
    expect(snapshot.request?.body.nested.completionTokens).toBe(12)
    expect(snapshot.request?.body.nested.privateKey).toBe('[redacted]')
    expect(snapshot.timeline[1]?.metadata).toMatchObject({
      chunkIndex: 1,
      Authorization: '[redacted]',
      apiKey: '[redacted]',
      sessionToken: '[redacted]',
      nested: {
        password: '[redacted]'
      },
      headers: {
        Authorization: '[redacted]',
        accept: 'text/event-stream'
      }
    })
    expect(request.headers.authorization).toBe('Bearer secret')
    expect(request.body.apiKey).toBe('body-secret')
    expect(request.body.accessToken).toBe('access-secret')
    expect(request.body.clientSecret).toBe('client-secret')
    expect(request.body.nested.privateKey).toBe('private-secret')
    expect(streamMetadata.headers.Authorization).toBe('Bearer event-secret')
    expect(streamMetadata.Authorization).toBe('Bearer event-direct-secret')
    expect(streamMetadata.apiKey).toBe('event-api-key')
    expect(streamMetadata.sessionToken).toBe('event-session-token')
    expect(streamMetadata.nested.password).toBe('event-password')
  })

  it('creates standalone curl commands with request overrides', () => {
    const jsonBody = JSON.stringify({
      prompt: 'hello',
      apiKey: 'json-secret',
      nested: {
        clientSecret: 'nested-json-secret'
      }
    })
    const curl = createInspectionCurl(
      {
        api: '/api/chat',
        headers: [['Authorization', 'Bearer token']],
        body: { prompt: 'hello' }
      },
      {
        command: 'curl --compressed',
        method: 'PUT',
        headers: { cookie: 'session=secret', accept: 'application/json' },
        body: 'raw body'
      }
    )

    expect(curl).toBe(
      "curl --compressed -X 'PUT' '/api/chat' \\\n" +
        "  -H 'cookie: [redacted]' \\\n" +
        "  -H 'accept: application/json' \\\n" +
        "  --data-raw 'raw body'"
    )

    const jsonCurl = createInspectionCurl({
      api: '/api/chat',
      body: jsonBody
    })
    expect(jsonCurl).toContain('"apiKey":"[redacted]"')
    expect(jsonCurl).toContain('"clientSecret":"[redacted]"')
    expect(jsonCurl).not.toContain('json-secret')
    expect(jsonCurl).not.toContain('nested-json-secret')

    const snapshot = inspectRequestTrace({
      lastRequest: {
        providerId: 'proxy',
        api: '/api/chat',
        body: jsonBody
      },
      curl: true
    })
    expect(snapshot.request?.body).toBe(
      '{"prompt":"hello","apiKey":"[redacted]","nested":{"clientSecret":"[redacted]"}}'
    )
    expect(snapshot.curl).not.toContain('json-secret')
    expect(createInspectionCurl({ providerId: 'direct' })).toBeNull()
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
      lastResponse: { providerId: 'proxy', body: { tenantId: 'tenant_1' }, hasStream: true },
      events: [{ kind: 'stream', label: 'delta' }],
      retries: [{ attempt: 1, error: new Error('network') }],
      curl: { api: '/api/chat' }
    }
    const snapshot = inspectRequestTrace(options)

    expectTypeOf(snapshot).toEqualTypeOf<RequestInspectionSnapshot<Request, Response>>()
    expect(snapshot.request?.body.tenantId).toBe('tenant_1')
    expect(snapshot.response?.hasStream).toBe(true)
    expectTypeOf(snapshot.timeline).toEqualTypeOf<InspectionTimelineEvent[]>()
    expectTypeOf(snapshot.retries).toEqualTypeOf<InspectionRetryRecord[]>()
    expectTypeOf(snapshot.providerTrace).toEqualTypeOf<InspectionProviderTrace>()
    expectTypeOf<InspectionCurlOptions>().toMatchTypeOf<{ api?: string; headers?: unknown }>()
  })
})
