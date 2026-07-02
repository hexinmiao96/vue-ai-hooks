---
title: Examples
description: Polished vue-ai-hooks demos for chat, tool approvals, completions, embeddings, reranking, image generation, video generation, speech generation, transcription, backend proxying, and structured output.
aside: false
pageClass: demo-page
---

<script setup>
import DemoShowcase from '../.vitepress/theme/components/DemoShowcase.vue'
</script>

# Examples

Use this page as a product-oriented map. Start with the preview to understand the
UI shape, switch to code when you want the minimal composable wiring, then scan
the API table only when you need an option or method.

## Run the no-key demo first

```bash
pnpm install
pnpm example:chat
```

Open the Vite URL and click **Run approval demo**. The chat example starts with
the deterministic `local-tools` provider, streams a reply, pauses on a
`chargeCard` tool call, and continues after approval or rejection. Use that flow
to verify the UI before wiring real provider keys or a backend proxy.

For a no-key React chat flow, run `pnpm example:react-chat`. It uses the same
provider contract through `vue-ai-hooks/react`, streams from a deterministic
`DirectChatTransport`, and renders request trace state beside the chat panel.

For a no-key React completion flow, run `pnpm example:react-completion`. It uses
`useCompletion` in the same no-key style, with a local stream and request trace
panel.

For a no-key React structured output flow, run `pnpm example:react-object`. It
reuses `useObject` with a local schema-driven object stream and request trace
panel, then can switch to proxy-backed `Provider` calls.

For a no-key threaded chat flow, run `pnpm example:threaded-chat`. It pairs
`useChatThreads()` with per-thread `useChat({ persist })` storage so you can
create, rename, archive, restore, delete, refresh, and verify local history
before adding a server storage adapter.

For no-server production pilots, follow the [IndexedDB local durability](/guide/server-storage#indexeddb-local-durability-async)
recipe after this step. It shows how to pre-load and flush thread state through
an async local store while keeping the same thread/message shape used by server
storage.

To test the backend contract, run `pnpm example:proxy-server`. It accepts the
default `/api/chat`, `/api/completion`, `/api/embedding`, `/api/rerank`,
`/api/image`, `/api/video`, `/api/speech`, `/api/transcription`, `/api/object`, and
`/api/ui-message-stream` routes, plus the explicit `proxyProvider` `/api/ai/*`
routes used by the browser examples.

For a no-key image generation flow, run `pnpm example:image`. It renders a
deterministic local SVG by default, then switches to the proxy `/api/image`
route when `VITE_PROXY_BASE_URL` is set.

For a no-key video generation flow, run `pnpm example:video`. It renders a
deterministic local storyboard by default, then switches to the proxy
`/api/video` route when `VITE_PROXY_BASE_URL` is set.

For a no-key speech generation flow, run `pnpm example:speech`. It returns a
deterministic local WAV by default, then switches to the proxy `/api/speech`
route when `VITE_PROXY_BASE_URL` is set.

For a no-key transcription flow, run `pnpm example:transcription`. It returns a
deterministic local transcript by default, then switches to the proxy
`/api/transcription` route when `VITE_PROXY_BASE_URL` is set.

For a no-key rerank flow, run `pnpm example:rerank`. It returns deterministic
local ranking by default, then switches to the proxy `/api/rerank` route when
`VITE_PROXY_BASE_URL` is set.

For a no-key structured JSON flow, run `pnpm example:object`. It uses the local
`local-object` provider by default, then can switch to `proxy` or a real provider
through the same environment variables as the other browser examples.

For a no-key UI message stream contract check, run `pnpm example:proxy-server`
in one terminal and `pnpm example:ui-message-stream` in another. The UI demo
posts to `/api/ui-message-stream`, displays decoded chunks from
`readUIMessageStream()`, and shows metadata for the response.

## Which demo should I open first?

| Goal                                                     | Start with                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Build a chat surface, structured parts, or approval flow | [Streaming chat](#chat-demo)                                                         |
| Add thread sidebar and local restore checks              | `pnpm example:threaded-chat`                                                         |
| Keep local history in async IndexedDB                    | [IndexedDB local durability](/guide/server-storage#indexeddb-local-durability-async) |
| Try the React chat migration entry                       | `pnpm example:react-chat`                                                            |
| Try the React completion migration entry                 | `pnpm example:react-completion`                                                      |
| Try the React structured output migration entry          | `pnpm example:react-object`                                                          |
| Test an AI SDK UI stream backend route                   | [UI message stream route](#stream-demo)                                              |
| Turn one prompt into text                                | [Text completion](#completion-demo)                                                  |
| Compare text by semantic similarity                      | [Embedding similarity](#embedding-demo)                                              |
| Generate an image through an app route                   | [Image generation](#image-demo)                                                      |
| Generate a video through an app route                    | [Video generation](#video-demo)                                                      |
| Generate speech through an app route                     | [Speech generation](#speech-demo)                                                    |
| Turn audio into text through an app route                | [Audio transcription](#transcription-demo)                                           |
| Rerank search results through an app route               | [Document reranking](#rerank-demo)                                                   |
| Extract typed JSON from a prompt                         | [Structured object output](#object-demo)                                             |

<DemoShowcase locale="en" />
