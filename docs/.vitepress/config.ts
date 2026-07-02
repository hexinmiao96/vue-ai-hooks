import { defineConfig } from 'vitepress'

const rootNav = [
  { text: 'Guide', link: '/guide/getting-started' },
  { text: 'Examples', link: '/examples/' },
  { text: 'Reference', link: '/reference/use-chat' },
  { text: 'GitHub', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }
]

const rootSidebar = {
  '/guide/': [
    {
      text: 'Introduction',
      items: [
        { text: 'Getting started', link: '/guide/getting-started' },
        { text: 'Task demos', link: '/guide/task-demos' },
        { text: 'Choosing vue-ai-hooks', link: '/guide/choosing' },
        { text: 'Upgrade to v0.4.0', link: '/guide/upgrade-0.4' },
        { text: 'Upgrade to v0.3.0', link: '/guide/upgrade-0.3' },
        { text: 'AI SDK migration', link: '/guide/ai-sdk-migration' },
        { text: 'Providers', link: '/guide/providers' },
        { text: 'Proxy recipes', link: '/guide/proxy-recipes' },
        { text: 'Server storage', link: '/guide/server-storage' },
        { text: 'Regenerate branches', link: '/guide/regenerate-branches' },
        { text: 'Agent events', link: '/guide/agent-events' },
        { text: 'Inspection', link: '/guide/inspection' },
        { text: 'Production checklist', link: '/guide/production-checklist' },
        { text: 'API stability', link: '/guide/api-stability' },
        { text: 'SSR and Nuxt', link: '/guide/ssr' },
        { text: 'Testing', link: '/guide/testing' },
        { text: 'Troubleshooting', link: '/guide/troubleshooting' }
      ]
    }
  ],
  '/examples/': [
    {
      text: 'Examples',
      items: [{ text: 'Overview', link: '/examples/' }]
    }
  ],
  '/reference/': [
    {
      text: 'Composables',
      items: [
        { text: 'useChat', link: '/reference/use-chat' },
        { text: 'useCompletion', link: '/reference/use-completion' },
        { text: 'useEmbedding', link: '/reference/use-embedding' },
        { text: 'useGeneration', link: '/reference/use-generation' },
        { text: 'useImage', link: '/reference/use-image' },
        { text: 'useVideo', link: '/reference/use-video' },
        { text: 'useSpeech', link: '/reference/use-speech' },
        { text: 'useTranscription', link: '/reference/use-transcription' },
        { text: 'useRerank', link: '/reference/use-rerank' },
        { text: 'useObject', link: '/reference/use-object' },
        { text: 'useChatThreads', link: '/reference/use-chat-threads' },
        { text: 'usePersist', link: '/reference/use-persist' }
      ]
    },
    {
      text: 'Core API',
      items: [
        { text: 'React hooks', link: '/reference/react' },
        { text: 'Providers', link: '/reference/providers' },
        { text: 'Stream utilities', link: '/reference/streams' },
        { text: 'Public types', link: '/reference/types' }
      ]
    }
  ]
}

const zhNav = [
  { text: '指南', link: '/zh/guide/getting-started' },
  { text: '示例', link: '/zh/examples/' },
  { text: '参考', link: '/zh/reference/use-chat' },
  { text: 'GitHub', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }
]

const zhSidebar = {
  '/zh/guide/': [
    {
      text: '入门',
      items: [
        { text: '快速开始', link: '/zh/guide/getting-started' },
        { text: '任务型 Demo', link: '/zh/guide/task-demos' },
        { text: '选择 vue-ai-hooks', link: '/zh/guide/choosing' },
        { text: '升级到 v0.4.0', link: '/zh/guide/upgrade-0.4' },
        { text: '升级到 v0.3.0', link: '/zh/guide/upgrade-0.3' },
        { text: 'AI SDK 迁移', link: '/zh/guide/ai-sdk-migration' },
        { text: 'Provider', link: '/zh/guide/providers' },
        { text: 'Proxy 配方', link: '/zh/guide/proxy-recipes' },
        { text: '服务端存储', link: '/zh/guide/server-storage' },
        { text: '重新生成分支', link: '/zh/guide/regenerate-branches' },
        { text: 'Agent 事件', link: '/zh/guide/agent-events' },
        { text: '调试检查', link: '/zh/guide/inspection' },
        { text: '生产检查清单', link: '/zh/guide/production-checklist' },
        { text: 'API 稳定性', link: '/zh/guide/api-stability' },
        { text: 'SSR 和 Nuxt', link: '/zh/guide/ssr' },
        { text: '测试', link: '/zh/guide/testing' },
        { text: '故障排查', link: '/zh/guide/troubleshooting' }
      ]
    }
  ],
  '/zh/examples/': [
    {
      text: '示例',
      items: [{ text: '总览', link: '/zh/examples/' }]
    }
  ],
  '/zh/reference/': [
    {
      text: '组合式函数',
      items: [
        { text: 'useChat', link: '/zh/reference/use-chat' },
        { text: 'useCompletion', link: '/zh/reference/use-completion' },
        { text: 'useEmbedding', link: '/zh/reference/use-embedding' },
        { text: 'useGeneration', link: '/zh/reference/use-generation' },
        { text: 'useImage', link: '/zh/reference/use-image' },
        { text: 'useVideo', link: '/zh/reference/use-video' },
        { text: 'useSpeech', link: '/zh/reference/use-speech' },
        { text: 'useTranscription', link: '/zh/reference/use-transcription' },
        { text: 'useRerank', link: '/zh/reference/use-rerank' },
        { text: 'useObject', link: '/zh/reference/use-object' },
        { text: 'useChatThreads', link: '/zh/reference/use-chat-threads' },
        { text: 'usePersist', link: '/zh/reference/use-persist' }
      ]
    },
    {
      text: '核心 API',
      items: [
        { text: 'React hooks', link: '/zh/reference/react' },
        { text: 'Provider', link: '/zh/reference/providers' },
        { text: 'Stream 工具', link: '/zh/reference/streams' },
        { text: '公共类型', link: '/zh/reference/types' }
      ]
    }
  ]
}

export default defineConfig({
  title: 'vue-ai-hooks',
  description: 'Vue 3 Composable library for building AI-powered applications',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg'
      }
    ]
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      link: '/'
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'vue-ai-hooks',
      description: '用于构建 AI 应用的 Vue 3 组合式函数库',
      themeConfig: {
        nav: zhNav,
        sidebar: zhSidebar,
        outline: {
          label: '本页目录'
        },
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        lastUpdated: {
          text: '最后更新'
        },
        langMenuLabel: '多语言',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        skipToContentLabel: '跳转到内容'
      }
    }
  },
  themeConfig: {
    nav: rootNav,
    sidebar: rootSidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }],
    langMenuLabel: '多语言',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '返回顶部',
    skipToContentLabel: '跳转到内容',
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    lastUpdated: {
      text: '最后更新'
    }
  }
})
