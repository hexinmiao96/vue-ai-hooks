---
title: Examples
description: Polished vue-ai-hooks demos for chat, tool approvals, completions, embeddings, image generation, speech generation, backend proxying, and structured output.
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

To test the backend contract, run `pnpm example:proxy-server`. It accepts the
default `/api/chat`, `/api/completion`, `/api/embedding`, `/api/image`,
`/api/speech`, and `/api/object` routes, plus the explicit `proxyProvider`
`/api/ai/*` routes used by the browser examples.

For a no-key image generation flow, run `pnpm example:image`. It renders a
deterministic local SVG by default, then switches to the proxy `/api/image`
route when `VITE_PROXY_BASE_URL` is set.

For a no-key speech generation flow, run `pnpm example:speech`. It returns a
deterministic local WAV by default, then switches to the proxy `/api/speech`
route when `VITE_PROXY_BASE_URL` is set.

For a no-key structured JSON flow, run `pnpm example:object`. It uses the local
`local-object` provider by default, then can switch to `proxy` or a real provider
through the same environment variables as the other browser examples.

## Which demo should I open first?

| Goal                                                     | Start with                               |
| -------------------------------------------------------- | ---------------------------------------- |
| Build a chat surface, structured parts, or approval flow | [Streaming chat](#chat-demo)             |
| Turn one prompt into text                                | [Text completion](#completion-demo)      |
| Compare text by semantic similarity                      | [Embedding similarity](#embedding-demo)  |
| Generate an image through an app route                   | [Image generation](#image-demo)          |
| Generate speech through an app route                     | [Speech generation](#speech-demo)        |
| Extract typed JSON from a prompt                         | [Structured object output](#object-demo) |

<DemoShowcase locale="en" />
