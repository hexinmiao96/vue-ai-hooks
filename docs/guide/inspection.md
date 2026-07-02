# Inspection

Use inspection state when a chat, completion, embedding, generation, or object
request fails and you need to see what the app actually sent to the provider or
proxy route.

## What is available today

The main composables expose:

| Field          | Use it for                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| `lastRequest`  | The latest sanitized request snapshot, including provider id and metadata.  |
| `lastResponse` | Whether the latest provider/proxy call returned a stream or response shape. |
| `clearTrace()` | Clears request/response trace state without clearing messages or input.     |
| `error`        | The normalized error shown by the current composable.                       |
| `status`       | Lifecycle state: `ready`, `submitted`, `streaming`, or `error`.             |

`useChat` also records AI SDK-style trigger metadata such as
`submit-user-message` and `regenerate-assistant-message`, which helps when
debugging migration code.

## Copyable debug panel

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  inspectRequestTrace,
  useChat,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput
} from 'vue-ai-hooks'

const retries = ref<InspectionRetryRecordInput[]>([])
const streamEvents = ref<InspectionTimelineEventInput[]>([])
const chat = useChat({
  api: '/api/chat',
  onRetry(error, context) {
    retries.value.push({
      attempt: context.attempt,
      maxRetries: context.maxRetries,
      error,
      timestamp: Date.now()
    })
  },
  onChunk(chunk) {
    streamEvents.value.push({
      kind: 'stream',
      label: 'stream chunk',
      timestamp: Date.now(),
      metadata: { type: chunk.type }
    })
  }
})

const inspection = computed(() =>
  inspectRequestTrace({
    status: chat.status.value,
    error: chat.error.value,
    lastRequest: chat.lastRequest.value,
    lastResponse: chat.lastResponse.value,
    retries: retries.value,
    events: streamEvents.value,
    curl: true
  })
)

const inspectionJson = computed(() => JSON.stringify(inspection.value, null, 2))
</script>

<template>
  <form @submit="chat.handleSubmit">
    <textarea v-model="chat.input.value" />
    <button type="submit" :disabled="chat.isLoading.value">Send</button>
  </form>

  <details>
    <summary>Request trace</summary>
    <button type="button" @click="chat.clearTrace()">Clear trace</button>
    <p>{{ inspection.summary }}</p>
    <pre>{{ inspectionJson }}</pre>
  </details>
</template>
```

`inspectRequestTrace()` classifies errors as `authentication`, `rate-limit`,
`network`, `provider`, `validation`, and other render-safe categories. It only
reports `hasCause`; it does not copy raw provider response bodies into the
summary.

The same snapshot now includes a `timeline`, normalized `retries`, a compact
`providerTrace`, and a redacted `curl` command when `curl: true` is set.
`createInspectionCurl(request)` is exported separately when you only need the
copyable request command.

Do not render provider API keys, raw authorization headers, or full tenant data
in a browser debug panel. If your backend adds those fields, keep them out of
the response and logs you show to users.

## Debugging checklist

1. Confirm `lastRequest.providerId` matches the provider or proxy route you
   expected.
2. Check `lastRequest.messages` to verify message order and tool result
   placement.
3. Check `lastRequest.headers` and `lastRequest.body` for app-owned metadata,
   not provider secrets.
4. Confirm `lastResponse.hasStream` is `true` for streaming chat routes.
5. If `status` reaches `error`, show `error.message` and keep the input so the
   user can retry.
6. If a stream starts but stops midway, check `onFinish` and `isDisconnect`
   before retrying automatically.
7. Use `inspection.timeline` to correlate request, retry, stream, response, and
   error events before opening a provider support ticket.

## Production path

For production browser apps, send model requests through your own backend or
edge route:

```mermaid
flowchart LR
  UI["Vue component"] --> Hook["vue-ai-hooks"]
  Hook --> Proxy["/api/chat"]
  Proxy --> Provider["model provider or agent service"]
```

The backend should own provider credentials, rate limits, tenant policy, and
provider-specific observability. `vue-ai-hooks` should own the UI request
lifecycle and the sanitized trace that helps users and support engineers
understand what happened.
