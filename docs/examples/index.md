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

## Which demo should I open first?

| Goal                                                     | Start with                                                                           | Then read                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Build a chat surface, structured parts, or approval flow | [Streaming chat](#chat-demo)                                                         | [useChat](/reference/use-chat)                            |
| Add thread sidebar and local restore checks              | `pnpm example:threaded-chat`                                                         | [useChatThreads](/reference/use-chat-threads)             |
| Keep local history in async IndexedDB                    | [IndexedDB local durability](/guide/server-storage#indexeddb-local-durability-async) | [Server storage](/guide/server-storage)                   |
| Try the React chat migration entry                       | `pnpm example:react-chat`                                                            | [React hooks](/reference/react)                           |
| Try the React completion migration entry                 | `pnpm example:react-completion`                                                      | [React hooks](/reference/react)                           |
| Try the React structured output migration entry          | `pnpm example:react-object`                                                          | [React hooks](/reference/react)                           |
| Try the React image generation migration entry           | `pnpm example:react-image`                                                           | [React hooks](/reference/react)                           |
| Try the React video generation migration entry           | `pnpm example:react-video`                                                           | [React hooks](/reference/react)                           |
| Test an AI SDK UI stream backend route                   | [UI message stream route](#stream-demo)                                              | [Stream utilities](/reference/streams)                    |
| Turn one prompt into text                                | [Text completion](#completion-demo)                                                  | [useCompletion](/reference/use-completion)                |
| Compare text by semantic similarity                      | [Embedding similarity](#embedding-demo)                                              | [useEmbedding](/reference/use-embedding)                  |
| Run a custom async generation job                        | [Task-oriented demos](/guide/task-demos)                                             | [useGeneration](/reference/use-generation)                |
| Generate or edit an image through an app route           | [Image generation](#image-demo)                                                      | [useImage](/reference/use-image)                          |
| Generate a video through an app route                    | [Video generation](#video-demo)                                                      | [useVideo](/reference/use-video)                          |
| Generate speech through an app route                     | [Speech generation](#speech-demo)                                                    | [useSpeech](/reference/use-speech)                        |
| Turn audio into text through an app route                | [Audio transcription](#transcription-demo)                                           | [useTranscription](/reference/use-transcription)          |
| Rerank search results through an app route               | [Document reranking](#rerank-demo)                                                   | [useRerank](/reference/use-rerank)                        |
| Extract typed JSON from a prompt                         | [Structured object output](#object-demo)                                             | [useObject](/reference/use-object)                        |
| Expose app state to agent requests                       | `pnpm example:chat`                                                                  | [useAgentContext](/reference/use-agent-context)           |
| Render UI from runtime capability flags                  | [Task-oriented demos](/guide/task-demos)                                             | [useAgentCapabilities](/reference/use-agent-capabilities) |
| Track a headless app-owned agent run                     | `pnpm example:agent-run`                                                             | [useAgentRun](/reference/use-agent-run)                   |
| Add composer task starter chips                          | `pnpm example:chat`                                                                  | [usePromptSuggestions](/reference/use-prompt-suggestions) |

## 5-minute path to production confidence

1. `pnpm example:chat`  
   Confirm local stream + tool approval + `usePromptSuggestions()` chips.
2. `pnpm example:proxy-server` and rerun the target demo with `VITE_CHAT_PROVIDER=proxy-route`.  
   Verify `/api/*` and `readUIMessageStream()` contract behavior.
3. `pnpm example:threaded-chat`  
   Validate restore/recover flow before binding your real storage adapter.
4. `pnpm example:agent-run`  
   Validate interrupt/resume, same-run replay safety, and inspection snapshots.

## Common startup checks

- If there is no stream output: verify `pnpm example:chat` is running and check browser console for SSE connection errors.
- If tools never finish: confirm approval or result handlers return `{ status: 'approved' }` / `{ status: 'rejected' }`.
- If threads lose state: check that only one `id` is reused for the same thread and local storage keys are stable.
- If migration docs are hard to follow: from each demo link, jump directly to the API row in the reference table.

## Demo acceptance checklist

Validate the first demo in each lane before you decide your integration path:

| Lane                       | What should appear after 30 seconds                                                           | Next check if it does not                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Chat + tool approval       | `Run approval demo`, one pending `chargeCard`, one retry-capable stream                       | Confirm environment and rerun `pnpm example:chat`                                               |
| Thread persistence         | Thread sidebar exists, create/rename actions work, and `Archive` state persists after refresh | Check `useChatThreads` path and `examples/threaded-chat`                                        |
| Agent run approval         | `approvePlan` pauses the run, approve/reject resumes, and `Inspection snapshot` updates       | Check `examples/agent-run` and [useAgentRun](/reference/use-agent-run)                          |
| Image/video/speech flow    | Deterministic local output and editable request panel appears                                 | Verify `VITE_PROXY_BASE_URL` and the target media demo route                                    |
| Proxy contract             | `/api/chat` and `/api/ui-message-stream` both return 200 in `curl`/browser                    | Run `pnpm example:proxy-server` in one terminal and `pnpm example:ui-message-stream` in another |
| Structured output (object) | `local-object` prompt output renders and can switch to `/api/object`                          | Check `examples/object` + `useObject` reference                                                 |

## Run the no-key demo first

```bash
pnpm install
pnpm example:chat
```

Open the Vite URL and click **Run approval demo**. The chat example starts with
the deterministic `local-tools` provider, streams a reply, pauses on a
`chargeCard` tool call, and continues after approval or rejection. Use that flow
to verify the UI before wiring real provider keys or a backend proxy. The demo
also registers `useAgentContext()` state for provider requests, and the composer
renders `usePromptSuggestions()` chips so you can test task starters without
adding a copilot UI shell.

For a no-key React chat flow, run `pnpm example:react-chat`. It uses the same
provider contract through `vue-ai-hooks/react`, streams from a deterministic
`DirectChatTransport`, and renders request trace state beside the chat panel.

For a no-key React completion flow, run `pnpm example:react-completion`. It uses
`useCompletion` in the same no-key style, with a local stream and request trace
panel.

For a no-key React structured output flow, run `pnpm example:react-object`. It
reuses `useObject` with a local schema-driven object stream and request trace
panel, then can switch to proxy-backed `Provider` calls.

For a no-key React image flow, run `pnpm example:react-image`. It reuses
`useImage` with deterministic local SVG output and an edit mode with source/mask,
renders media starter chips, then can switch to `proxy` mode with
`VITE_EXAMPLE_PROVIDER=proxy`.

For a no-key React video flow, run `pnpm example:react-video`. It reuses
`useVideo` with deterministic local storyboard output, request trace rendering,
media starter chips, and the same `VITE_EXAMPLE_PROVIDER=proxy` switch to
`/api/video`.

For a no-key threaded chat flow, run `pnpm example:threaded-chat`. It pairs
`useChatThreads()` with per-thread `useChat({ persist })` storage so you can
create, rename, archive, restore, delete, refresh, and verify local history
before adding a server storage adapter.

For a no-key agent run flow, run `pnpm example:agent-run`. It uses
`useAgentRun()` with a deterministic local `AgentEvent` stream, pauses on an
`approvePlan` interrupt, resumes with the same run id, and shows
`inspect()` / `clearTrace()` output beside the event log. Agent and
tool-approval starter chips fill the run prompt before start.

For no-server production pilots, follow the [IndexedDB local durability](/guide/server-storage#indexeddb-local-durability-async)
recipe after this step. It shows how to pre-load and flush thread state through
an async local store while keeping the same thread/message shape used by server
storage.

To test the backend contract, run `pnpm example:proxy-server`. It accepts the
default `/api/chat`, `/api/completion`, `/api/embedding`, `/api/rerank`,
`/api/image`, `/api/video`, `/api/speech`, `/api/transcription`, `/api/object`, and
`/api/ui-message-stream` routes, plus the explicit `proxyProvider` `/api/ai/*`
routes used by the browser examples.

For a no-key image generation and editing flow, run `pnpm example:image`. It
renders a deterministic local SVG by default, exercises `editImage()` with a
source image and mask, then switches to the proxy `/api/image` route when
`VITE_PROXY_BASE_URL` is set.

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

<DemoShowcase locale="en" />
