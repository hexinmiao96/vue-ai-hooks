# useAgentCapabilities

Headless runtime capability discovery for app-owned agents.

It does not create an agent instance, negotiate features, or render UI. Use it
to read an AG-UI-style `/info` response from your own backend or agent runtime,
store the raw response, normalize the declared `AgentCapabilities`, and expose a
small `supports` summary for adaptive Vue interfaces.

Public exports: `useAgentCapabilities`, `summarizeAgentCapabilities`,
`extractAgentCapabilities`, `AgentCapabilities`, `AgentCapabilitiesSupportSummary`,
`AgentCapabilityTool`, `AgentIdentityCapabilities`, `AgentTransportCapabilities`,
`AgentToolsCapabilities`, `AgentOutputCapabilities`, `AgentStateCapabilities`,
`AgentMultiAgentCapabilities`, `AgentReasoningCapabilities`,
`AgentMultimodalCapabilities`, `AgentMultimodalInputCapabilities`,
`AgentMultimodalOutputCapabilities`, `AgentExecutionCapabilities`,
`AgentHumanInTheLoopCapabilities`, `AgentInfoResponse`, `AgentInfoAgent`,
`AgentCapabilitiesRequestInfo`, `AgentCapabilitiesResponseInfo`,
`LoadAgentCapabilitiesOptions`, `UseAgentCapabilitiesOptions`, and
`UseAgentCapabilitiesReturn`.

## Usage

```ts
import { useAgentCapabilities } from 'vue-ai-hooks'

const capabilities = useAgentCapabilities({
  baseURL: 'https://agent.example.test',
  api: '/info',
  agentId: 'billing-agent',
  headers: () => ({ Authorization: `Bearer ${sessionToken.value}` })
})

await capabilities.loadCapabilities()

if (capabilities.supports.value.approvals) {
  // Show approval controls only when the runtime declares HITL support.
}
```

The default `api` is `/api/agent/info` for app-owned routes. Set `api: '/info'`
when you point `baseURL` at an AG-UI-compatible runtime directly.

## Options

| Name                  | Type                      | Default                    | Description                                                    |
| --------------------- | ------------------------- | -------------------------- | -------------------------------------------------------------- |
| `api`                 | `string`                  | `/api/agent/info`          | Endpoint used by `loadCapabilities()`.                         |
| `baseURL`             | `string`                  | `''`                       | Optional runtime origin prepended to relative `api` values.    |
| `agentId`             | `string`                  | -                          | Selects a matching agent from multi-agent `/info` responses.   |
| `headers`             | `HeadersInit \| fn`       | `Accept: application/json` | Static or lazy headers for the info request.                   |
| `credentials`         | `RequestCredentials`      | -                          | Browser credentials mode for same-origin sessions.             |
| `timeoutMs`           | `number`                  | -                          | Request timeout passed to the shared fetch wrapper.            |
| `fetch`               | `typeof fetch`            | global fetch               | Custom fetch implementation for tests or non-browser runtimes. |
| `initialCapabilities` | `AgentCapabilities`       | `null`                     | Initial local capabilities before the first load.              |
| `loadOnInit`          | `boolean`                 | `false`                    | Calls `loadCapabilities()` immediately.                        |
| `selectCapabilities`  | `(raw, ctx) => caps`      | built-in                   | Custom extractor for non-standard info payloads.               |
| `maxRetries`          | `number`                  | `0`                        | Retry transient failures before exposing an error.             |
| `retryDelayMs`        | `number \| fn`            | `0`                        | Delay between retries.                                         |
| `shouldRetry`         | `(error, ctx) => boolean` | default                    | Override retry decisions.                                      |
| `onRequest`           | `(info) => void`          | -                          | Called before each info request attempt.                       |
| `onResponse`          | `(info) => void`          | -                          | Called after a successful capabilities load.                   |
| `onSuccess`           | `(caps, raw) => void`     | -                          | Called with normalized capabilities and the raw info response. |
| `onError`             | `(Error) => void`         | -                          | Called after retries are exhausted.                            |

## Return value

| Property                 | Type                                            | Description                                                 |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| `capabilities`           | `Ref<AgentCapabilities \| null>`                | Normalized declared capabilities, or `null` when absent.    |
| `rawInfo`                | `Ref<unknown \| null>`                          | Raw `/info` JSON payload for diagnostics or custom UI.      |
| `supports`               | `ComputedRef<AgentCapabilitiesSupportSummary>`  | Boolean feature summary derived from `capabilities`.        |
| `hasCapabilities`        | `ComputedRef<boolean>`                          | `true` when a capability object is available.               |
| `status`                 | `Ref<AiRequestStatus>`                          | `ready`, `submitted`, or `error`.                           |
| `isLoading`              | `Ref<boolean>`                                  | `true` while a request is in flight.                        |
| `error`                  | `Ref<Error \| null>`                            | Last non-aborted load error.                                |
| `lastRequest`            | `Ref<AgentCapabilitiesRequestInfo \| null>`     | Latest info request trace.                                  |
| `lastResponse`           | `Ref<AgentCapabilitiesResponseInfo \| null>`    | Latest successful response trace.                           |
| `inspect()`              | `() => RequestInspectionSnapshot`               | Builds a redacted debug snapshot and curl command.          |
| `loadCapabilities(opts)` | `(opts?) => Promise<AgentCapabilities \| null>` | Loads capabilities from the info endpoint.                  |
| `refreshCapabilities()`  | Same as `loadCapabilities()`                    | Alias for UI buttons and polling code.                      |
| `setCapabilities(value)` | `(caps \| null) => void`                        | Manually replace local capabilities.                        |
| `stop()`                 | `() => void`                                    | Aborts the active request.                                  |
| `clearError()`           | `() => void`                                    | Clears error and restores `ready` status.                   |
| `clearTrace()`           | `() => void`                                    | Clears request/response trace refs.                         |
| `clear()`                | `() => void`                                    | Aborts and resets capabilities, raw info, error, and trace. |

## Response shapes

The built-in extractor accepts three common shapes:

```ts
// Direct capabilities
{ transport: { streaming: true }, tools: { supported: true } }

// Runtime info wrapper
{ capabilities: { transport: { streaming: true } } }

// Multi-agent runtime info
{
  agents: [
    { id: 'billing-agent', capabilities: { humanInTheLoop: { approvals: true } } }
  ]
}
```

Use `selectCapabilities(rawInfo, { agentId })` when your backend exposes a
different shape.

## Support summary

`supports` turns optional nested fields into stable booleans:

```ts
const { streaming, toolCalling, structuredOutput, humanInTheLoop, approvals, interrupts } =
  capabilities.supports.value
```

The summary is intentionally derived data. Keep source-of-truth details in
`capabilities.value` when you need tool lists, sub-agent metadata, MIME types,
custom rate limits, or execution limits.
