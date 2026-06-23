# API stability

`vue-ai-hooks` follows Semantic Versioning for public exports and documented
runtime behavior. This page defines what users can rely on when upgrading.

## Stable public surface

The stable API surface is the package entrypoint:

```ts
import { useChat, useCompletion, useEmbedding, usePersist } from 'vue-ai-hooks'
```

Public composables, provider factories, and exported TypeScript types are
covered by SemVer when they are exported from `vue-ai-hooks` and documented in
the reference pages.

## What counts as a breaking change

These require a major version:

- Removing or renaming a public export.
- Changing documented option names, default behavior, or return shapes in a way
  that breaks existing code.
- Narrowing supported runtime requirements, such as dropping the documented Vue
  or Node floor.
- Changing provider factory behavior in a way that changes serialized request
  payloads for existing options.

## What can change in minor or patch releases

Minor releases may add new composables, provider helpers, options, or documented
capabilities without breaking existing code.

Patch releases may fix bugs, provider compatibility, docs, tests, type
precision, and internal implementation details.

## Internal implementation details

Do not import files below `vue-ai-hooks/dist`, `vue-ai-hooks/src`, or internal
modules directly. Only the package root export is stable. Deep imports and files
whose names start with `_` are internal implementation details and can change
without notice.

## Provider and model behavior

Provider APIs can change outside this package. `vue-ai-hooks` keeps its adapter
interfaces stable, but upstream model behavior, rate limits, response wording,
and provider-specific error payloads remain outside the package compatibility
contract.

Applications should handle provider errors, retries, observability, and
fallbacks at the app layer.
