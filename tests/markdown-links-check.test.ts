import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-markdown-links.mjs')

describe('markdown link check script', () => {
  it('allows normal local, external, email, and anchor links', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      mkdirSync(join(fixture, 'docs'))
      writeFileSync(join(fixture, 'docs/index.md'), '# Docs\n\n## Install Now\n')
      writeFileSync(join(fixture, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />\n')
      writeFileSync(
        join(fixture, 'README.md'),
        [
          '# README',
          '',
          '[docs](docs/index.md)',
          '![logo](logo.svg)',
          '[section](docs/index.md#install-now)',
          '[site](https://example.com)',
          '[email](mailto:support@example.com)',
          '[anchor](#readme)'
        ].join('\n')
      )

      expect(runMarkdownLinkCheck(fixture)).toContain('Markdown link check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('allows anchors supplied by a VitePress component used on the page', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      mkdirSync(join(fixture, 'docs/.vitepress/theme/components'), { recursive: true })
      writeFileSync(
        join(fixture, 'docs/.vitepress/theme/components/DemoPanel.vue'),
        '<template><section id="component-demo"><h2 api-title-id="component-demo-api">Demo</h2></section></template>\n'
      )
      writeFileSync(
        join(fixture, 'README.md'),
        [
          '# README',
          '',
          '[demo](#component-demo)',
          '[api](#component-demo-api)',
          '<DemoPanel />'
        ].join('\n')
      )

      expect(runMarkdownLinkCheck(fixture)).toContain('Markdown link check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing local markdown anchors', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      writeFileSync(join(fixture, 'README.md'), '# README\n\n[missing](#does-not-exist)\n')

      expect(() => runMarkdownLinkCheck(fixture)).toThrow(/missing link anchor/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing local markdown image targets', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      writeFileSync(join(fixture, 'README.md'), '# README\n\n![missing](assets/missing.png)\n')

      expect(() => runMarkdownLinkCheck(fixture)).toThrow(/missing link target/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects unsafe markdown image protocols', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      writeFileSync(join(fixture, 'README.md'), '# README\n\n![xss](javascript:alert)\n')

      expect(() => runMarkdownLinkCheck(fixture)).toThrow(/unsafe link href/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects unsafe markdown link protocols', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))

    try {
      writeFileSync(
        join(fixture, 'README.md'),
        ['# README', '', '[xss](javascript:alert)', '[payload](data:text/html;base64,AAAA)'].join(
          '\n'
        )
      )

      expect(() => runMarkdownLinkCheck(fixture)).toThrow(/unsafe link href/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects escaped local links even when a sibling path shares the root prefix', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-links-'))
    const sibling = `${fixture}-outside`

    try {
      mkdirSync(sibling)
      writeFileSync(join(sibling, 'target.md'), '# Outside\n')
      writeFileSync(join(fixture, 'README.md'), `[escape](../${basename(sibling)}/target.md)\n`)

      expect(() => runMarkdownLinkCheck(fixture)).toThrow(/link escapes repo/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
      rmSync(sibling, { recursive: true, force: true })
    }
  })
})

function runMarkdownLinkCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
