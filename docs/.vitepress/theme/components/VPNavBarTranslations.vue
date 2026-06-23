<script lang="ts" setup>
import { computed } from 'vue'
import VPFlyout from 'vitepress/dist/client/theme-default/components/VPFlyout.vue'
import VPMenuLink from 'vitepress/dist/client/theme-default/components/VPMenuLink.vue'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import { useLangs } from 'vitepress/dist/client/theme-default/composables/langs'
import { useRoute } from 'vitepress'

const { theme } = useData()
const { localeLinks, currentLang } = useLangs({ correspondingLink: true })
const route = useRoute()

const isChineseDemoContext = computed(() => {
  const path = route.path
  return path.startsWith('/zh/') || path.startsWith('/examples/')
})

const localizedCurrentLangLabel = computed(() => {
  if (!isChineseDemoContext.value) return currentLang.value.label

  return (
    {
      English: '英文',
      简体中文: '简体中文'
    }[currentLang.value.label] || currentLang.value.label
  )
})

const localizedLocaleLinks = computed(() =>
  localeLinks.value.map((locale) => ({
    ...locale,
    text: locale.text === 'English' ? '英文' : locale.text
  }))
)
</script>

<template>
  <VPFlyout
    v-if="localeLinks.length && currentLang.label"
    class="VPNavBarTranslations"
    icon="vpi-languages"
    :label="theme.langMenuLabel || 'Change language'"
  >
    <div class="items">
      <p class="title">{{ localizedCurrentLangLabel }}</p>

      <template v-for="locale in localizedLocaleLinks" :key="locale.link">
        <VPMenuLink :item="locale" />
      </template>
    </div>
  </VPFlyout>
</template>

<style scoped>
.VPNavBarTranslations {
  display: none;
}

@media (min-width: 1280px) {
  .VPNavBarTranslations {
    display: flex;
    align-items: center;
  }
}

.title {
  padding: 0 24px 0 12px;
  line-height: 32px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
</style>
