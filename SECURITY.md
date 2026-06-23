# Security Policy

## Supported Versions

Security fixes are provided for the latest published minor version of
`vue-ai-hooks`.

## Reporting a Vulnerability

Please do not open a public issue for suspected vulnerabilities.

Report security concerns through GitHub private vulnerability reporting when it
is available for this repository. If private reporting is not available, email
the maintainer listed in `package.json` with:

- A short summary of the issue.
- A minimal reproduction or affected API surface.
- Any known impact, prerequisites, or mitigations.

You should receive an initial response within 7 days. Confirmed vulnerabilities
will be fixed before public disclosure whenever practical.

## API Key Safety

Provider API keys are secrets. Browser builds expose `VITE_*` values to users,
so production applications should send model requests through a backend or edge
proxy and keep upstream provider credentials server-side.
