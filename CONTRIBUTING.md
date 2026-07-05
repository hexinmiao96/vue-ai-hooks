# Contributing

Thanks for your interest in `vue-ai-hooks`! We welcome PRs, reproducible bug
reports, and discussion.

## Development setup

Node.js 18.18 or newer is required. CI runs the full gate on Node 18, 20, 22, and
24 so the declared engine range stays honest.
This repo pins pnpm through `packageManager`; use Corepack or pnpm 11.7.0 so
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
pnpm test:hygiene # reject focused, skipped, todo, or expected-failing test markers
pnpm test:watch   # watch mode
pnpm security:audit # dependency vulnerability audit; requires registry access
pnpm typecheck    # vue-tsc strict check
pnpm typecheck:all # type-check src, tests, and examples
pnpm lint         # lint src, tests, examples, scripts, docs theme, and root config files with ESLint, including TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML sources
pnpm format       # format repository files with Prettier, including TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML sources
pnpm format:check # verify repository formatting without writing files, including TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML sources
pnpm secrets:check # scan Git-tracked and unignored candidate files, including TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML/Markdown/env candidate files, for provider keys, auth tokens, and sensitive env assignments
pnpm source:hygiene # reject trailing whitespace, conflict markers in root metadata/workflows and docs theme source, debugger statements, TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML source console output, and broad suppression comments in source/docs/scripts
pnpm build        # type-check + bundle to dist/
pnpm dist:check   # verify built ESM/CJS package entries
pnpm size:check   # verify published bundle size budgets
pnpm pack:check   # verify npm package contents
pnpm install:check # verify the packed package in temporary Node, TS, and Vite consumers
pnpm changelog:check # verify CHANGELOG has a dated section for the current package version
pnpm metadata:check # verify package metadata, README, docs navigation, and contributor facts
pnpm community:check # verify CODEOWNERS, issue/PR templates, support, security, and conduct files
pnpm workflows:check # verify CI, CodeQL, and npm publish workflow guardrails
pnpm release:cadence # reject a second npm version in the same Asia/Shanghai day
pnpm release:status # print npm registry status and the current release window
pnpm api:check   # verify public exports, reference docs, and VitePress guide/reference navigation
pnpm docs:ux:check # verify docs onboarding paths, examples language routing, and demo navigation
pnpm links:check # verify local Markdown links/images, anchors, unsafe protocols, and repo-boundary escapes
pnpm examples:build # verify all example apps build
pnpm docs:build   # verify the VitePress docs build
pnpm check        # full local gate before opening a PR
pnpm production:readiness # release-candidate gate with release status and local checks
pnpm release:check # dependency audit, unpublished-version release cadence, and the full local gate before publishing
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

- `dist/index.mjs`: 149,500 bytes raw, 36,000 bytes gzip.
- `dist/index.cjs`: 109,000 bytes raw, 32,000 bytes gzip.
- `dist/react.mjs`: 67,500 bytes raw, 16,800 bytes gzip.
- `dist/react.cjs`: 47,500 bytes raw, 14,000 bytes gzip.

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

Release cadence is deliberately slow: publish at most one npm version per
Asia/Shanghai calendar day. Merge PRs whenever they are ready, but batch package
version bumps and tags into the next daily release. `pnpm release:cadence` and
the publish workflow enforce this rule; re-checking an already-published
`package.json` version is allowed, but a new version is blocked once another
version has already shipped that day.

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

Then create and push a tag matching `package.json`, for example `v1.0.0-rc.1`.

Release checklist:

1. Run `pnpm release:status` and confirm the next npm version is allowed by the
   daily release cadence.
2. Update `CHANGELOG.md` and the `package.json` version.
3. Run `pnpm release:check`; it includes the daily release cadence gate and
   rejects versions that are already published.
4. Create a tag that exactly matches the package version, for example `v1.0.0-rc.1`.
5. Push the tag and confirm the GitHub Actions publish workflow completes.
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
