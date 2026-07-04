import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

interface EntryExportsModule {
  extractExports: (content: string) => string[]
  extractRuntimeExports: (content: string) => string[]
  extractExportSources: (content: string) => string[]
  resolveExportSourceFile: (sourcePath: string) => string
  resolveExportDeclarationFile: (sourcePath: string) => string
}

const entryExports = (await import(
  pathToFileURL(`${process.cwd()}/scripts/lib/entry-exports.mjs`).href
)) as EntryExportsModule

describe('entry export parser', () => {
  it('extracts public export names including aliases and type-only exports', () => {
    const source = [
      "export { useChat, openai as openaiCompatible, type ChatProvider } from './composables/useChat'",
      "export type { Message as UIMessage, ToolDefinition } from './types'"
    ].join('\n')

    expect(entryExports.extractExports(source)).toEqual([
      'ChatProvider',
      'openaiCompatible',
      'ToolDefinition',
      'UIMessage',
      'useChat'
    ])
  })

  it('excludes type-only exports from runtime export coverage', () => {
    const source = [
      "export { useChat, type ChatProvider } from './composables/useChat'",
      "export type { Message as UIMessage } from './types'"
    ].join('\n')

    expect(entryExports.extractRuntimeExports(source)).toEqual(['useChat'])
  })

  it('deduplicates and sorts export sources', () => {
    const source = [
      "export { zhipu } from './providers/zhipu'",
      "export { useChat } from './composables/useChat'",
      "export type { ZhipuProviderOptions } from './providers/zhipu'"
    ].join('\n')

    expect(entryExports.extractExportSources(source)).toEqual([
      './composables/useChat',
      './providers/zhipu'
    ])
  })

  it('resolves direct source files and directory index declarations', () => {
    expect(entryExports.resolveExportSourceFile('./composables/useChat')).toBe(
      'src/composables/useChat.ts'
    )
    expect(entryExports.resolveExportDeclarationFile('./types')).toBe('dist/types/index.d.ts')
  })
})
