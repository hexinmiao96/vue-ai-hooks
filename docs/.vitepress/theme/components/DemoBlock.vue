<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'

const props = defineProps<{
  id?: string
  title: string
  description: string
  code: string
  anchorLabel?: string
  previewLabel: string
  codeLabel: string
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
}>()

const activePanel = shallowRef<'preview' | 'code'>('preview')
const copyState = shallowRef<'idle' | 'copied' | 'failed'>('idle')
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

const copyButtonLabel = computed(() => {
  if (copyState.value === 'copied') return props.copiedLabel
  if (copyState.value === 'failed') return props.copyFailedLabel
  return props.copyLabel
})

function resetCopyStateLater() {
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copyState.value = 'idle'
  }, 1800)
}

async function writeClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Copy failed')
}

async function copyCode() {
  try {
    await writeClipboard(props.code)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  } finally {
    resetCopyStateLater()
  }
}

onUnmounted(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer)
})
</script>

<template>
  <section
    :id="id"
    class="demo-block"
  >
    <header class="demo-block__header">
      <div class="demo-block__copy">
        <h3 class="demo-block__title">
          <span>{{ title }}</span>
          <a
            v-if="id"
            class="demo-block__anchor"
            :href="`#${id}`"
            :aria-label="anchorLabel || title"
          >
            #
          </a>
        </h3>
        <p class="demo-block__description">
          {{ description }}
        </p>
      </div>

      <div
        class="demo-block__switch"
        aria-label="Demo panel"
      >
        <button
          class="demo-block__switch-button"
          :class="{ 'is-active': activePanel === 'preview' }"
          type="button"
          :aria-pressed="activePanel === 'preview'"
          @click="activePanel = 'preview'"
        >
          {{ previewLabel }}
        </button>
        <button
          class="demo-block__switch-button"
          :class="{ 'is-active': activePanel === 'code' }"
          type="button"
          :aria-pressed="activePanel === 'code'"
          @click="activePanel = 'code'"
        >
          {{ codeLabel }}
        </button>
      </div>
    </header>

    <div class="demo-block__surface">
      <div
        v-show="activePanel === 'preview'"
        class="demo-block__preview"
      >
        <slot />
      </div>
      <div
        v-show="activePanel === 'code'"
        class="demo-block__code-panel"
      >
        <button
          class="demo-block__copy-button"
          :class="{
            'is-copied': copyState === 'copied',
            'is-failed': copyState === 'failed'
          }"
          type="button"
          @click="copyCode"
        >
          {{ copyButtonLabel }}
        </button>
        <pre class="demo-block__code"><code>{{ code }}</code></pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-block {
  overflow: hidden;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.demo-block__header {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--demo-border);
}

.demo-block__copy {
  display: grid;
  gap: 6px;
}

.demo-block__title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--demo-ink);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0;
}

.demo-block__anchor {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  min-height: 32px;
  border-radius: 6px;
  color: var(--demo-muted);
  font-size: 0.9375rem;
  font-weight: 760;
  text-decoration: none;
}

.demo-block__anchor:hover {
  color: var(--demo-brand);
  background: var(--demo-subtle);
}

.demo-block__anchor:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.demo-block__description {
  margin: 0;
  max-width: 64ch;
  color: var(--demo-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
  letter-spacing: 0;
}

.demo-block__switch {
  display: inline-flex;
  width: max-content;
  min-height: 36px;
  padding: 3px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-subtle);
}

.demo-block__switch-button {
  min-width: 74px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--demo-muted);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 650;
  letter-spacing: 0;
  cursor: pointer;
}

.demo-block__switch-button:hover {
  color: var(--demo-ink);
}

.demo-block__switch-button:focus {
  outline: none;
}

.demo-block__switch-button:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.demo-block__switch-button.is-active {
  background: var(--demo-surface);
  color: var(--demo-ink);
  box-shadow: 0 1px 2px oklch(55% 0.04 245 / 14%);
}

.demo-block__surface {
  min-height: 360px;
}

.demo-block__preview {
  min-height: 360px;
  padding: 20px;
  background:
    linear-gradient(var(--demo-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--demo-grid) 1px, transparent 1px),
    var(--demo-canvas);
  background-size: 28px 28px;
}

.demo-block__code-panel {
  position: relative;
  min-height: 360px;
  margin: 0;
  overflow: hidden;
  background: var(--demo-code-bg);
  color: var(--demo-code);
}

.demo-block__copy-button {
  position: absolute;
  z-index: 1;
  top: 14px;
  right: 14px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid oklch(86% 0.025 245 / 28%);
  border-radius: 8px;
  background: oklch(28% 0.045 252);
  color: oklch(91% 0.02 245);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

.demo-block__copy-button:hover {
  background: oklch(34% 0.05 252);
}

.demo-block__copy-button:focus {
  outline: none;
}

.demo-block__copy-button:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.demo-block__copy-button.is-copied {
  border-color: oklch(72% 0.13 154 / 72%);
  background: oklch(30% 0.07 154);
}

.demo-block__copy-button.is-failed {
  border-color: oklch(68% 0.16 29 / 72%);
  background: oklch(31% 0.08 29);
}

.demo-block__code {
  display: block;
  min-height: 360px;
  margin: 0;
  overflow: auto;
  padding: 64px 20px 20px;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
  line-height: 1.7;
  letter-spacing: 0;
}

.demo-block__code code {
  font-family: var(--vp-font-family-mono);
  font-variant-ligatures: none;
  white-space: pre;
}

@media (pointer: coarse) {
  .demo-block__anchor {
    width: 44px;
    min-height: 44px;
  }
}

@media (min-width: 768px) {
  .demo-block__header {
    grid-template-columns: 1fr auto;
    align-items: start;
    padding: 24px;
  }

  .demo-block__preview,
  .demo-block__code {
    padding: 28px;
    padding-top: 72px;
  }
}
</style>
