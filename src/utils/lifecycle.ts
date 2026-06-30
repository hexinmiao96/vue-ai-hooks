import type { Message } from '../types'
import { headersToRecord } from './headers'

interface RequestSnapshot {
  body?: Record<string, unknown>
  forwardedProps?: Record<string, unknown>
  headers?: HeadersInit
  input?: string | string[]
  messages?: Message[]
}

export function cloneMessageSnapshot(message: Message): Message {
  return {
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === 'image_url' ? { ...part, image_url: { ...part.image_url } } : { ...part }
        )
      : message.content,
    ...(message.toolCalls
      ? {
          toolCalls: message.toolCalls.map((call) => ({
            ...call,
            function: { ...call.function }
          }))
        }
      : {}),
    ...(message.parts ? { parts: message.parts.map((part) => ({ ...part })) } : {}),
    ...(message.metadata ? { metadata: { ...message.metadata } } : {})
  }
}

export function cloneRequestSnapshot<T extends RequestSnapshot>(request: T): T {
  return {
    ...request,
    ...(Array.isArray(request.input) ? { input: [...request.input] } : {}),
    ...(request.messages ? { messages: request.messages.map(cloneMessageSnapshot) } : {}),
    ...(request.body ? { body: { ...request.body } } : {}),
    ...(request.forwardedProps ? { forwardedProps: { ...request.forwardedProps } } : {}),
    ...(request.headers ? { headers: headersToRecord(request.headers) } : {})
  } as T
}
