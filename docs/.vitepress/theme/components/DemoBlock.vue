<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'

type ApiRefEntry = {
  name: string
  type?: string
  required?: 'required' | 'optional' | string
  description: string
}

type ApiRef = {
  title: string
  propsTitle: string
  methodsTitle: string
  propsHeaders?: {
    name: string
    type: string
    required: string
    description: string
  }
  methodsHeaders?: {
    name: string
    description: string
  }
  props: ApiRefEntry[]
  methods: ApiRefEntry[]
}

const props = withDefaults(
  defineProps<{
    id?: string
    title: string
    description: string
    code: string
    anchorLabel?: string
    apiTitleId?: string
    apiPropsSectionId?: string
    apiMethodsSectionId?: string
    panelLabel?: string
    previewLabel: string
    codeLabel: string
    copyLabel: string
    copiedLabel: string
    copyFailedLabel: string
    apiRef?: ApiRef
    apiAriaLabel?: string
  }>(),
  {
    anchorLabel: '跳转到此示例',
    panelLabel: '示例面板',
    previewLabel: '预览',
    codeLabel: '代码',
    copyLabel: '复制',
    copiedLabel: '已复制',
    copyFailedLabel: '复制失败',
    apiAriaLabel: 'API 参考'
  }
)

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
  <section :id="id" class="demo-block">
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

      <div class="demo-block__switch" :aria-label="panelLabel || '示例面板'">
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
      <div v-show="activePanel === 'preview'" class="demo-block__preview">
        <slot />
      </div>
      <div v-show="activePanel === 'code'" class="demo-block__code-panel">
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
    <section v-if="apiRef" class="demo-block__api" :aria-label="apiAriaLabel || 'API 参考'">
      <h4 :id="apiTitleId" class="demo-block__api-title">
        {{ apiRef.title }}
      </h4>
      <div class="api-ref__section">
        <h5 :id="apiPropsSectionId" class="api-ref__section-title">
          {{ apiRef.propsTitle }}
        </h5>
        <div class="api-ref__table-wrap">
          <table class="api-ref__table">
            <thead>
              <tr>
                <th>{{ apiRef.propsHeaders?.name || '参数名' }}</th>
                <th>{{ apiRef.propsHeaders?.type || '类型' }}</th>
                <th>{{ apiRef.propsHeaders?.required || '必需' }}</th>
                <th>{{ apiRef.propsHeaders?.description || '说明' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in apiRef.props" :key="item.name">
                <td>
                  <span class="api-ref__name-text">{{ item.name }}</span>
                </td>
                <td>
                  <span class="api-ref__type">{{ item.type || '-' }}</span>
                </td>
                <td>
                  <span class="api-ref__tag">{{ item.required || '-' }}</span>
                </td>
                <td>
                  <span class="api-ref__desc">{{ item.description }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="api-ref__section">
        <h5 :id="apiMethodsSectionId" class="api-ref__section-title">
          {{ apiRef.methodsTitle }}
        </h5>
        <div class="api-ref__table-wrap">
          <table class="api-ref__table">
            <thead>
              <tr>
                <th>{{ apiRef.methodsHeaders?.name || '方法名' }}</th>
                <th>{{ apiRef.methodsHeaders?.description || '说明' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in apiRef.methods" :key="item.name">
                <td>
                  <span class="api-ref__name-text">{{ item.name }}</span>
                  <span v-if="item.type" class="api-ref__type">
                    {{ item.type }}
                  </span>
                </td>
                <td>
                  <span class="api-ref__desc">{{ item.description }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
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

.demo-block__api {
  padding: 18px 20px 22px;
  border-top: 1px solid var(--demo-border);
  display: grid;
  gap: 14px;
  background: var(--demo-surface);
}

.demo-block__api-title {
  margin: 0;
  color: var(--demo-brand);
  font-size: 0.9375rem;
  font-weight: 760;
  line-height: 1.3;
}

.demo-block__preview {
  min-height: 360px;
  padding: 20px;
  background:
    linear-gradient(var(--demo-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--demo-grid) 1px, transparent 1px), var(--demo-canvas);
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

.api-ref__section-title {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 760;
}

.api-ref__section + .api-ref__section {
  border-top: 1px dashed var(--demo-border);
  padding-top: 12px;
}

.api-ref__table-wrap {
  overflow-x: auto;
  margin-top: 8px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
}

.api-ref__table-wrap::-webkit-scrollbar {
  height: 8px;
}

.api-ref__table-wrap::-webkit-scrollbar-thumb {
  background: var(--demo-border);
  border-radius: 999px;
}

.api-ref__table {
  margin-top: 10px;
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  table-layout: fixed;
  min-width: 620px;
}

.api-ref__table th,
.api-ref__table td {
  vertical-align: top;
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid var(--demo-border);
  line-height: 1.5;
}

.api-ref__table th {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
  background: var(--demo-surface);
  border-bottom: 1px solid var(--demo-border);
}

.api-ref__table th,
.api-ref__table td {
  font-variant-numeric: tabular-nums;
}

.api-ref__table th:first-child {
  width: 24%;
}

.api-ref__table th:nth-child(2) {
  width: 18%;
}

.api-ref__table th:nth-child(3) {
  width: 18%;
}

.api-ref__table td:first-child {
  width: 24%;
}

.api-ref__table td:nth-child(2) {
  width: 18%;
}

.api-ref__table td:nth-child(3) {
  width: 18%;
}

.api-ref__table tr:nth-child(even) td {
  background: var(--demo-subtle);
}

.api-ref__name-text {
  color: var(--demo-ink);
  font-size: 0.875rem;
  font-weight: 760;
  white-space: nowrap;
}

.api-ref__type,
.api-ref__tag {
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}

.api-ref__type {
  margin-left: 8px;
}

.api-ref__desc {
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
}

.api-ref__tag {
  border: 1px solid var(--demo-border);
  border-radius: 999px;
  padding: 1px 8px;
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
