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
        { text: 'Providers', link: '/guide/providers' }
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
        { text: 'useEmbedding', link: '/reference/use-embedding' }
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
        { text: 'Provider', link: '/zh/guide/providers' }
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
        { text: 'useEmbedding', link: '/zh/reference/use-embedding' }
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
        returnToTopLabel: '返回顶部'
      }
    }
  },
  themeConfig: {
    nav: rootNav,
    sidebar: rootSidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }
    ]
  }
})
