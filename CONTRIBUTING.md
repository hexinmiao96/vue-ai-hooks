# Contributing

Thanks for your interest in `vue-ai-hooks`! We welcome PRs, reproducible bug
reports, and discussion.

## Development setup

Node.js 18.18 or newer is required. CI runs the full gate on Node 18, 20, 22, and
24 so the declared engine range stays honest.
This repo pins pnpm through `packageManager`; use Corepack or pnpm 8.15.9 so
the lockfile format stays stable across local development, CI, and publishing.

```bash
git clone https://github.com/hexinmiao96/vue-ai-hooks
cd vue-ai-hooks
corepack enable
pnpm install
```

The repo is a single package at the root. Examples live in `examples/`.

## Common commands

```bash
pnpm test         # run unit tests once
pnpm test:coverage # run tests with coverage thresholds
pnpm test:hygiene # reject focused, skipped, or todo test markers
pnpm test:watch   # watch mode
pnpm security:audit # dependency vulnerability audit; requires registry access
pnpm typecheck    # vue-tsc strict check
pnpm typecheck:all # type-check src, tests, and examples
pnpm lint         # eslint
pnpm format       # format repository files with Prettier
pnpm format:check # verify repository formatting without writing files
pnpm secrets:check # scan committed files for likely API keys and tokens
pnpm source:hygiene # reject conflict markers, debugger statements, and source console output
pnpm build        # type-check + bundle to dist/
pnpm dist:check   # verify built ESM/CJS package entries
pnpm size:check   # verify published bundle size budgets
pnpm pack:check   # verify npm package contents
pnpm install:check # verify the packed package in temporary Node, TS, and Vite consumers
pnpm changelog:check # verify CHANGELOG has a dated section for the current package version
pnpm metadata:check # verify package metadata, README, docs navigation, and contributor facts
pnpm community:check # verify CODEOWNERS, issue/PR templates, support, security, and conduct files
pnpm workflows:check # verify CI, CodeQL, and npm publish workflow guardrails
pnpm api:check   # verify public exports, reference docs, and VitePress guide/reference navigation
pnpm docs:ux:check # verify docs onboarding paths, examples language routing, and demo navigation
pnpm links:check # verify local Markdown links
pnpm examples:build # verify all example apps build
pnpm docs:build   # verify the VitePress docs build
pnpm check        # full local gate before opening a PR
pnpm release:check # dependency audit plus the full local gate before publishing
pnpm prepublishOnly # npm lifecycle publish gate; delegates to pnpm release:check
pnpm example:chat # run the chat example app
```

## Project layout

```
src/
├── composables/    # core hooks plus persistence helper
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

## Bundle size policy

Run `pnpm build && pnpm size:check` before submitting changes that affect
runtime code. Current published bundle budgets:

- `dist/index.mjs`: 67,600 bytes raw, 18,100 bytes gzip.
- `dist/index.cjs`: 47,700 bytes raw, 15,700 bytes gzip.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) loosely.
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` are all fine prefixes.

## Versioning policy

This package follows Semantic Versioning for public exports and documented
runtime behavior:

- **Patch**: bug fixes, docs, tests, internal refactors, and compatible provider
  fixes.
- **Minor**: new public exports, provider helpers, options, or documented
  capabilities that keep existing code working.
- **Major**: removing or renaming public exports, changing option defaults in a
  breaking way, narrowing supported runtimes, or changing documented return
  shapes.

Call out any breaking change explicitly in the PR and `CHANGELOG.md`.

## Publishing

This package publishes through npm Trusted Publishing from GitHub Actions.
The workflow uses GitHub OIDC and npm provenance only; do not add long-lived
`NPM_TOKEN` publishing secrets.
Configure npm with these trusted publisher settings before pushing a release tag:

- Publisher: GitHub Actions
- Organization or user: `hexinmiao96`
- Repository: `vue-ai-hooks`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

Then create and push a tag matching `package.json`, for example `v0.2.1`.

Release checklist:

1. Update `CHANGELOG.md` and the `package.json` version.
2. Run `pnpm release:check`.
3. Create a tag that exactly matches the package version, for example `v0.2.1`.
4. Push the tag and confirm the GitHub Actions publish workflow completes.
   The publish workflow intentionally runs only from `v*` tags; there is no
   manual publish dispatch path.

## Pull request flow

1. Fork and branch from `main`.
2. Make your change. Run `pnpm check` before pushing.
3. Open a PR. Fill in the template. Reference any related bug issue or
   discussion.
4. Address review feedback. Squash-merge when approved.

## Questions and support

Use [`SUPPORT.md`](./SUPPORT.md) for usage questions, provider configuration
help, feature ideas, and support channel guidance.

## Security reports

Do not open public issues for suspected vulnerabilities. Follow
[`SECURITY.md`](./SECURITY.md) so maintainers can investigate privately first.

## Code of conduct

Follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Keep technical feedback
specific, respectful, and actionable.
