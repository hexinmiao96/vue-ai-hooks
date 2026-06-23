<script lang="ts" setup>
import { computed } from 'vue'
import VPNavBarMenuLink from 'vitepress/dist/client/theme-default/components/VPNavBarMenuLink.vue'
import VPNavBarMenuGroup from 'vitepress/dist/client/theme-default/components/VPNavBarMenuGroup.vue'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import { useRoute } from 'vitepress'

const { lang, theme } = useData()
const route = useRoute()

const isChineseDemoContext = computed(() => {
  const path = route.path
  return path.startsWith('/zh/') || path.startsWith('/examples/')
})

const mainNavLabel = computed(() =>
  isChineseDemoContext.value || lang.value.startsWith('zh-') ? '主导航' : 'Main Navigation'
)

const demoMenuItems = computed(() => {
  const navItems = theme.value?.nav || []
  if (!navItems.length) return navItems

  if (!isChineseDemoContext.value) return navItems

  const translate = (text: string): string => {
    return (
      {
        Guide: '指南',
        Reference: '参考',
        GitHub: '代码仓库'
      }[text] || text
    )
  }

  return navItems.map((item) => {
    if ('text' in item && typeof item.text === 'string') {
      return {
        ...item,
        text: translate(item.text)
      }
    }

    return item
  })
})
</script>

<template>
  <nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu">
    <span id="main-nav-aria-label" class="visually-hidden">
      {{ mainNavLabel }}
    </span>
    <template v-for="item in demoMenuItems" :key="JSON.stringify(item)">
      <VPNavBarMenuLink v-if="'link' in item" :item="item" />
      <component v-else-if="'component' in item" :is="item.component" v-bind="item.props" />
      <VPNavBarMenuGroup v-else :item="item" />
    </template>
  </nav>
</template>

<style scoped>
.VPNavBarMenu {
  display: none;
}

@media (min-width: 768px) {
  .VPNavBarMenu {
    display: flex;
  }
}
</style>
