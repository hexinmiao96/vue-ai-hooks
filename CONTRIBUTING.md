# Contributing

Thanks for your interest in `vue-ai-hooks`! We welcome PRs, issues, and discussion.

## Development setup

```bash
git clone https://github.com/hexinmiao96/vue-ai-hooks
cd vue-ai-hooks
pnpm install
```

The repo is a single package at the root. Examples live in `examples/`.

## Common commands

```bash
pnpm test         # run unit tests once
pnpm test:watch   # watch mode
pnpm typecheck    # vue-tsc strict check
pnpm lint         # eslint
pnpm build        # type-check + bundle to dist/
pnpm example:chat # run the chat example app
```

## Project layout

```
src/
├── composables/    # the three hooks — useChat, useCompletion, useEmbedding
├── providers/      # ChatProvider interface + adapter implementations
├── types/          # public types
├── utils/          # fetch, SSE parser, ID generator
└── index.ts        # public entry
tests/              # vitest specs, mirroring src/
examples/           # runnable Vite apps for each hook
```

## Adding a new provider

This is the single best first contribution. The hook layer is provider-agnostic;
all you need is a file that implements `ChatProvider`:

```ts
// src/providers/your-provider.ts
import type { ChatProvider } from './types'
// implement chat / completion / embedding
```

Look at [`src/providers/openai.ts`](./src/providers/openai.ts) for a reference
implementation. Most providers that follow the OpenAI REST spec can use
`openaiCompatible({ baseURL, apiKey, ... })` directly without writing a new file.

## Coding conventions

- **TypeScript strict mode.** No `any` in public APIs; if you need it in tests,
  explain with a comment.
- **No external runtime deps.** The library should stay tiny. If you want to add
  a dep, justify it in the PR.
- **Vue 3 idioms.** Composable functions only. No options API in the library itself.
- **Tested.** Every public composable has at least one happy-path test. Bug fixes
  should come with a regression test.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) loosely.
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` are all fine prefixes.

## Publishing

This package publishes through npm Trusted Publishing from GitHub Actions.
Configure npm with these trusted publisher settings before pushing a release tag:

- Publisher: GitHub Actions
- Organization or user: `hexinmiao96`
- Repository: `vue-ai-hooks`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

Then create and push a tag matching `package.json`, for example `v0.2.0`.

## Pull request flow

1. Fork and branch from `main`.
2. Make your change. Run `pnpm test && pnpm typecheck && pnpm lint` before pushing.
3. Open a PR. Fill in the template. Reference any related issue.
4. Address review feedback. Squash-merge when approved.

## Code of conduct

Be kind. We're all here to ship good software.
