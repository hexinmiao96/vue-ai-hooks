import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-ai-hooks',
  description: 'Vue 3 Composable library for building AI-powered applications',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/use-chat' },
      { text: 'GitHub', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Providers', link: '/guide/providers' }
          ]
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
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hexinmiao96/vue-ai-hooks' }
    ]
  }
})
