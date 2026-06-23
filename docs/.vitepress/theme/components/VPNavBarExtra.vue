<script lang="ts" setup>
import { computed } from 'vue'
import VPFlyout from 'vitepress/dist/client/theme-default/components/VPFlyout.vue'
import VPMenuLink from 'vitepress/dist/client/theme-default/components/VPMenuLink.vue'
import VPSwitchAppearance from 'vitepress/dist/client/theme-default/components/VPSwitchAppearance.vue'
import VPSocialLinks from 'vitepress/dist/client/theme-default/components/VPSocialLinks.vue'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'
import { useLangs } from 'vitepress/dist/client/theme-default/composables/langs'
import { useRoute } from 'vitepress'

const { site, theme, lang } = useData()
const { localeLinks, currentLang } = useLangs({ correspondingLink: true })
const route = useRoute()

const isChineseDemoContext = computed(() => {
  const path = route.path
  return path.startsWith('/zh/') || path.startsWith('/examples/')
})

const hasExtraContent = computed(
  () =>
    (localeLinks.value.length && currentLang.value.label) ||
    site.value.appearance ||
    theme.value.socialLinks
)

const extraNavLabel = computed(() =>
  isChineseDemoContext.value || lang.value.startsWith('zh-') ? '更多导航' : 'extra navigation'
)

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

const appearanceLabel = computed(() =>
  isChineseDemoContext.value || lang.value.startsWith('zh-')
    ? '外观'
    : theme.value.darkModeSwitchLabel || 'Appearance'
)
</script>

<template>
  <VPFlyout v-if="hasExtraContent" class="VPNavBarExtra" :label="extraNavLabel">
    <div v-if="localeLinks.length && currentLang.label" class="group translations">
      <p class="trans-title">{{ localizedCurrentLangLabel }}</p>

      <template v-for="locale in localizedLocaleLinks" :key="locale.link">
        <VPMenuLink :item="locale" />
      </template>
    </div>

    <div
      v-if="site.appearance && site.appearance !== 'force-dark' && site.appearance !== 'force-auto'"
      class="group"
    >
      <div class="item appearance">
        <p class="label">
          {{ appearanceLabel }}
        </p>
        <div class="appearance-action">
          <VPSwitchAppearance />
        </div>
      </div>
    </div>

    <div v-if="theme.socialLinks" class="group">
      <div class="item social-links">
        <VPSocialLinks class="social-links-list" :links="theme.socialLinks" />
      </div>
    </div>
  </VPFlyout>
</template>

<style scoped>
.VPNavBarExtra {
  display: none;
  margin-right: -12px;
}

@media (min-width: 768px) {
  .VPNavBarExtra {
    display: block;
  }
}

@media (min-width: 1280px) {
  .VPNavBarExtra {
    display: none;
  }
}

.trans-title {
  padding: 0 24px 0 12px;
  line-height: 32px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.item.appearance,
.item.social-links {
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.item.appearance {
  min-width: 176px;
}

.appearance-action {
  margin-right: -2px;
}

.social-links-list {
  margin: -4px -8px;
}
</style>
