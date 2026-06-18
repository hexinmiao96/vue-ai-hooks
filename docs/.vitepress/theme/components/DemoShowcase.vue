<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import DemoBlock from './DemoBlock.vue'

type Locale = 'en' | 'zh'
type DemoHref = '#chat-demo' | '#completion-demo' | '#embedding-demo'

const props = withDefaults(defineProps<{ locale?: Locale }>(), {
  locale: 'en'
})

const chatCode = `const { messages, input, append, stop, reload, clear } = useChat({
  provider,
  toolHandlers: {
    getWeather: async ({ city }) => ({ city, temperature: 23 })
  }
})

async function send() {
  if (!input.value.trim()) return
  await append(input.value)
}`

const completionCode = `const { completion, input, complete, stop, clear, isLoading } = useCompletion({
  provider,
  defaultRequest: {
    model: 'gpt-4o-mini',
    temperature: 0.6
  }
})

await complete('Write a concise release note for a Vue composable.')`

const embeddingCode = `const { embed, embeddings, result, stop, clear } = useEmbedding({
  provider,
  onSuccess: (res) => {
    console.log('tokens:', res.usage?.totalTokens)
  }
})

await embed([
  'Streaming chat state for Vue',
  'Semantic search over documents',
  'A recipe for iced coffee'
])`

const copy = {
  en: {
    heroKicker: 'Examples',
    heroTitle: 'Polished AI composable demos for real product screens',
    heroIntro:
      'Browse the common use cases the way a component library documents them: focused previews, compact code, clear state, and API notes on one page.',
    primaryAction: 'View composables',
    secondaryAction: 'Read guide',
    secondaryHref: '/guide/getting-started',
    previewLabel: 'Preview',
    codeLabel: 'Code',
    copyLabel: 'Copy',
    copiedLabel: 'Copied',
    copyFailedLabel: 'Copy failed',
    demoNavLabel: 'Demo shortcuts',
    anchorLabel: 'Link to this demo',
    status: 'Ready',
    heroStats: [
      { label: 'Composables', value: '3' },
      { label: 'Runtime deps', value: '0' },
      { label: 'Typed APIs', value: '100%' }
    ],
    demoLinks: [
      { label: 'Chat', href: '#chat-demo' },
      { label: 'Completion', href: '#completion-demo' },
      { label: 'Embedding', href: '#embedding-demo' }
    ],
    demosTitle: 'Composables',
    chat: {
      title: 'Streaming chat',
      description:
        'A production chat surface with message history, stream controls, reload, clear, and tool-call affordances.',
      user: 'Plan a focused Vue docs page.',
      assistant:
        'Use a three-part structure: hero context, live composable demos, and compact API notes. Keep the implementation provider-agnostic.',
      tool: 'Tool call resolved: getWeather({ city: "Hangzhou" })',
      composer: 'Ask about providers, tools, or persistence'
    },
    completion: {
      title: 'Text completion',
      description:
        'A writing assistant pattern for prompts that return one streamed text result with stop and reset controls.',
      prompt: 'Write a release note for the new useEmbedding.clear() API.',
      output:
        'Added clear() to reset embedding vectors, the last result, and errors while aborting any active request.',
      metric: '42 tokens'
    },
    embedding: {
      title: 'Embedding similarity',
      description:
        'A semantic matching layout that shows batched input, vector state, usage metadata, and a similarity matrix.',
      rows: ['Chat state', 'Semantic search', 'Coffee recipe'],
      usage: '3 inputs - 128 dimensions - 87 tokens'
    },
    apiTitle: 'API surface',
    apiIntro:
      'Each composable keeps the same mental model: source state, async action, loading/error state, and small imperative controls.',
    apiRows: [
      {
        name: 'useChat',
        state: 'messages, input, isLoading, error',
        actions: 'append, reload, stop, clear',
        fit: 'Conversational UI, tool calls, persistence'
      },
      {
        name: 'useCompletion',
        state: 'completion, input, isLoading, error',
        actions: 'complete, stop, clear',
        fit: 'Prompt-to-text flows and writing tools'
      },
      {
        name: 'useEmbedding',
        state: 'embeddings, result, isLoading, error',
        actions: 'embed, stop, clear',
        fit: 'Search, clustering, similarity scoring'
      }
    ],
    tableLabels: {
      state: 'State',
      actions: 'Actions',
      fit: 'Best for'
    }
  },
  zh: {
    heroKicker: '示例',
    heroTitle: '更接近组件库文档的 AI 组合式函数 Demo',
    heroIntro:
      '用 Element Plus 那类文档体验来组织示例：预览清晰、代码紧凑、状态明确，常用 API 在同一页能扫完。',
    primaryAction: '查看组合式函数',
    secondaryAction: '阅读指南',
    secondaryHref: '/zh/guide/getting-started',
    previewLabel: '预览',
    codeLabel: '代码',
    copyLabel: '复制',
    copiedLabel: '已复制',
    copyFailedLabel: '复制失败',
    demoNavLabel: '示例快捷导航',
    anchorLabel: '跳转到此示例',
    status: '就绪',
    heroStats: [
      { label: '组合式函数', value: '3' },
      { label: '运行时依赖', value: '0' },
      { label: '类型覆盖', value: '100%' }
    ],
    demoLinks: [
      { label: '对话', href: '#chat-demo' },
      { label: '补全', href: '#completion-demo' },
      { label: 'Embedding', href: '#embedding-demo' }
    ],
    demosTitle: '组合式函数',
    chat: {
      title: '流式对话',
      description: '用于产品聊天界面的完整形态：消息历史、流控制、重新生成、清空以及工具调用提示。',
      user: '规划一个聚焦的 Vue 文档示例页。',
      assistant: '可以分成三段：顶部语境、组合式函数 demo、紧凑 API 说明。实现保持 provider 无关。',
      tool: '工具调用已完成：getWeather({ city: "Hangzhou" })',
      composer: '询问 Provider、工具调用或持久化'
    },
    completion: {
      title: '文本补全',
      description: '适合提示词到单段文本的写作助手模式，展示流式结果、中止和重置控制。',
      prompt: '为新的 useEmbedding.clear() API 写一段发布说明。',
      output: '新增 clear()，可重置 embedding 向量、最近结果和错误，并中止当前请求。',
      metric: '42 tokens'
    },
    embedding: {
      title: 'Embedding 相似度',
      description: '面向语义匹配的展示布局，包含批量输入、向量状态、usage 元数据和相似度矩阵。',
      rows: ['对话状态', '语义搜索', '冰咖啡配方'],
      usage: '3 条输入 - 128 维 - 87 tokens'
    },
    apiTitle: 'API 轮廓',
    apiIntro: '三个组合式函数保持同一套心智模型：状态、异步动作、loading/error 和少量命令式控制。',
    apiRows: [
      {
        name: 'useChat',
        state: 'messages, input, isLoading, error',
        actions: 'append, reload, stop, clear',
        fit: '对话界面、工具调用、消息持久化'
      },
      {
        name: 'useCompletion',
        state: 'completion, input, isLoading, error',
        actions: 'complete, stop, clear',
        fit: '提示词生成文本、写作工具'
      },
      {
        name: 'useEmbedding',
        state: 'embeddings, result, isLoading, error',
        actions: 'embed, stop, clear',
        fit: '搜索、聚类、相似度计算'
      }
    ],
    tableLabels: {
      state: '状态',
      actions: '操作',
      fit: '适用场景'
    }
  }
}

const content = computed(() => copy[props.locale])
const activeDemoHref = shallowRef<DemoHref>('#chat-demo')
const demoIds = ['chat-demo', 'completion-demo', 'embedding-demo'] as const

let demoObserver: IntersectionObserver | undefined

function toDemoHref(hash: string): DemoHref | undefined {
  return demoIds.map((id) => `#${id}` as DemoHref).find((href) => href === hash)
}

function setActiveDemo(href: string) {
  const demoHref = toDemoHref(href)
  if (demoHref) activeDemoHref.value = demoHref
}

function syncActiveDemoFromHash() {
  if (typeof window === 'undefined') return
  setActiveDemo(window.location.hash)
}

onMounted(() => {
  syncActiveDemoFromHash()
  window.addEventListener('hashchange', syncActiveDemoFromHash)

  if (!('IntersectionObserver' in window)) return

  demoObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0]
      if (visibleEntry instanceof IntersectionObserverEntry) {
        setActiveDemo(`#${visibleEntry.target.id}`)
      }
    },
    {
      rootMargin: '-120px 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 1]
    }
  )

  demoIds.forEach((id) => {
    const node = document.getElementById(id)
    if (node) demoObserver?.observe(node)
  })
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncActiveDemoFromHash)
  demoObserver?.disconnect()
})
</script>

<template>
  <main
    class="demo-showcase"
    :lang="props.locale === 'zh' ? 'zh-CN' : 'en'"
  >
    <section class="showcase-hero">
      <div class="showcase-hero__copy">
        <p class="showcase-hero__kicker">
          {{ content.heroKicker }}
        </p>
        <h1 class="showcase-hero__title">
          {{ content.heroTitle }}
        </h1>
        <p class="showcase-hero__intro">
          {{ content.heroIntro }}
        </p>
        <div class="showcase-hero__actions">
          <a
            class="showcase-link is-primary"
            href="#composable-demos"
          >
            {{ content.primaryAction }}
          </a>
          <a
            class="showcase-link"
            :href="content.secondaryHref"
          >
            {{ content.secondaryAction }}
          </a>
        </div>
      </div>

      <div class="showcase-brief">
        <div class="showcase-brief__topline">
          <span class="showcase-brief__dot" />
          <span>{{ content.status }}</span>
        </div>
        <dl class="showcase-brief__stats">
          <div
            v-for="item in content.heroStats"
            :key="item.label"
            class="showcase-brief__stat"
          >
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <nav
      class="showcase-nav"
      :aria-label="content.demoNavLabel"
    >
      <a
        v-for="link in content.demoLinks"
        :key="link.href"
        :href="link.href"
        :class="{ 'is-active': activeDemoHref === link.href }"
        :aria-current="activeDemoHref === link.href ? 'true' : undefined"
        @click="setActiveDemo(link.href)"
      >
        {{ link.label }}
      </a>
    </nav>

    <section
      id="composable-demos"
      class="demo-stack"
      :aria-label="content.demosTitle"
    >
      <DemoBlock
        id="chat-demo"
        :title="content.chat.title"
        :description="content.chat.description"
        :code="chatCode"
        :anchor-label="content.anchorLabel"
        :preview-label="content.previewLabel"
        :code-label="content.codeLabel"
        :copy-label="content.copyLabel"
        :copied-label="content.copiedLabel"
        :copy-failed-label="content.copyFailedLabel"
      >
        <div class="chat-preview">
          <div class="preview-topbar">
            <span class="preview-topbar__mark" />
            <span>useChat</span>
          </div>
          <div class="chat-preview__body">
            <article class="chat-message is-user">
              <span class="chat-message__role">user</span>
              <p>{{ content.chat.user }}</p>
            </article>
            <article class="chat-message is-assistant">
              <span class="chat-message__role">assistant</span>
              <p>{{ content.chat.assistant }}</p>
            </article>
            <div class="tool-call">
              <span class="tool-call__status" />
              <span>{{ content.chat.tool }}</span>
            </div>
          </div>
          <footer class="chat-composer">
            <span>{{ content.chat.composer }}</span>
            <span class="command-row">
              <span>Stop</span>
              <span>Reload</span>
              <span>Clear</span>
            </span>
          </footer>
        </div>
      </DemoBlock>

      <DemoBlock
        id="completion-demo"
        :title="content.completion.title"
        :description="content.completion.description"
        :code="completionCode"
        :anchor-label="content.anchorLabel"
        :preview-label="content.previewLabel"
        :code-label="content.codeLabel"
        :copy-label="content.copyLabel"
        :copied-label="content.copiedLabel"
        :copy-failed-label="content.copyFailedLabel"
      >
        <div class="completion-preview">
          <div class="preview-topbar">
            <span class="preview-topbar__mark is-amber" />
            <span>useCompletion</span>
          </div>
          <div class="completion-editor">
            <span class="field-label">Prompt</span>
            <p>{{ content.completion.prompt }}</p>
          </div>
          <article class="completion-output">
            <span class="field-label">Result</span>
            <p>{{ content.completion.output }}</p>
            <div class="completion-output__meter">
              <span />
            </div>
          </article>
          <footer class="preview-footer">
            <span>{{ content.completion.metric }}</span>
            <span>complete - stop - clear</span>
          </footer>
        </div>
      </DemoBlock>

      <DemoBlock
        id="embedding-demo"
        :title="content.embedding.title"
        :description="content.embedding.description"
        :code="embeddingCode"
        :anchor-label="content.anchorLabel"
        :preview-label="content.previewLabel"
        :code-label="content.codeLabel"
        :copy-label="content.copyLabel"
        :copied-label="content.copiedLabel"
        :copy-failed-label="content.copyFailedLabel"
      >
        <div class="embedding-preview">
          <div class="preview-topbar">
            <span class="preview-topbar__mark is-green" />
            <span>useEmbedding</span>
          </div>
          <div class="embedding-list">
            <div
              v-for="row in content.embedding.rows"
              :key="row"
              class="embedding-row"
            >
              <span>{{ row }}</span>
              <span class="vector-bars">
                <i class="is-wide" />
                <i />
                <i class="is-mid" />
                <i class="is-short" />
              </span>
            </div>
          </div>
          <table class="similarity-table">
            <thead>
              <tr>
                <th />
                <th>A</th>
                <th>B</th>
                <th>C</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>A</th>
                <td>1.00</td>
                <td>0.86</td>
                <td>0.18</td>
              </tr>
              <tr>
                <th>B</th>
                <td>0.86</td>
                <td>1.00</td>
                <td>0.22</td>
              </tr>
              <tr>
                <th>C</th>
                <td>0.18</td>
                <td>0.22</td>
                <td>1.00</td>
              </tr>
            </tbody>
          </table>
          <footer class="preview-footer">
            <span>{{ content.embedding.usage }}</span>
          </footer>
        </div>
      </DemoBlock>
    </section>

    <section class="api-section">
      <div class="api-section__header">
        <h2>{{ content.apiTitle }}</h2>
        <p>{{ content.apiIntro }}</p>
      </div>
      <div class="api-grid">
        <article
          v-for="row in content.apiRows"
          :key="row.name"
          class="api-card"
        >
          <h3>{{ row.name }}</h3>
          <dl>
            <div>
              <dt>{{ content.tableLabels.state }}</dt>
              <dd>{{ row.state }}</dd>
            </div>
            <div>
              <dt>{{ content.tableLabels.actions }}</dt>
              <dd>{{ row.actions }}</dd>
            </div>
            <div>
              <dt>{{ content.tableLabels.fit }}</dt>
              <dd>{{ row.fit }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.demo-showcase {
  --demo-ink: oklch(24% 0.035 250);
  --demo-muted: oklch(48% 0.04 250);
  --demo-soft: oklch(96% 0.018 245);
  --demo-surface: oklch(100% 0.005 245);
  --demo-subtle: oklch(97.5% 0.015 245);
  --demo-canvas: oklch(98.5% 0.012 245);
  --demo-border: oklch(89% 0.025 245);
  --demo-grid: oklch(89% 0.025 245 / 44%);
  --demo-brand: oklch(56% 0.17 248);
  --demo-brand-soft: oklch(94% 0.05 248);
  --demo-green: oklch(58% 0.13 154);
  --demo-amber: oklch(70% 0.14 72);
  --demo-focus: oklch(60% 0.16 248);
  --demo-code-bg: oklch(22% 0.04 252);
  --demo-code: oklch(91% 0.02 245);
  display: grid;
  gap: 40px;
  color: var(--demo-ink);
  letter-spacing: 0;
}

:global(.dark) .demo-showcase {
  --demo-ink: oklch(93% 0.018 245);
  --demo-muted: oklch(72% 0.025 245);
  --demo-soft: oklch(20% 0.035 250);
  --demo-surface: oklch(17% 0.032 252);
  --demo-subtle: oklch(21% 0.035 252);
  --demo-canvas: oklch(15.5% 0.03 252);
  --demo-border: oklch(31% 0.04 252);
  --demo-grid: oklch(31% 0.04 252 / 46%);
  --demo-brand-soft: oklch(25% 0.07 248);
  --demo-code-bg: oklch(13% 0.035 252);
  --demo-code: oklch(91% 0.02 245);
}

.showcase-hero {
  display: grid;
  gap: 28px;
  padding: 32px 0 16px;
}

.showcase-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 760px;
}

.showcase-hero__kicker {
  margin: 0;
  color: var(--demo-brand);
  font-size: 0.8125rem;
  font-weight: 760;
  line-height: 1.2;
  letter-spacing: 0;
}

.showcase-hero__title {
  margin: 0;
  color: var(--demo-ink);
  font-size: 3rem;
  font-weight: 760;
  line-height: 1.05;
  letter-spacing: 0;
}

.showcase-hero__intro {
  margin: 0;
  max-width: 66ch;
  color: var(--demo-muted);
  font-size: 1.0625rem;
  line-height: 1.75;
  letter-spacing: 0;
}

.showcase-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.showcase-link {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-ink);
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.showcase-link:hover {
  border-color: var(--demo-brand);
  color: var(--demo-brand);
}

.showcase-link:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 3px;
}

.showcase-link.is-primary {
  border-color: var(--demo-brand);
  background: var(--demo-brand);
  color: oklch(99% 0.008 245);
}

.showcase-brief {
  align-self: end;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.showcase-brief__topline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--demo-border);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.showcase-brief__dot {
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: var(--demo-green);
}

.showcase-brief__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.showcase-brief__stat {
  display: grid;
  gap: 6px;
  padding: 16px;
}

.showcase-brief__stat + .showcase-brief__stat {
  border-left: 1px solid var(--demo-border);
}

.showcase-brief__stat dt {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.showcase-brief__stat dd {
  margin: 0;
  color: var(--demo-ink);
  font-size: 1.35rem;
  font-weight: 780;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.showcase-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.showcase-nav a {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 6px;
  color: var(--demo-muted);
  font-size: 0.875rem;
  font-weight: 760;
  text-decoration: none;
}

.showcase-nav a:hover {
  color: var(--demo-brand);
  background: var(--demo-subtle);
}

.showcase-nav a.is-active {
  background: var(--demo-brand-soft);
  color: var(--demo-brand);
}

.showcase-nav a:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.demo-stack {
  display: grid;
  gap: 24px;
}

.chat-preview,
.completion-preview,
.embedding-preview {
  display: grid;
  gap: 18px;
  max-width: 760px;
  margin: 0 auto;
}

.preview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.preview-topbar__mark {
  width: 9px;
  height: 9px;
  border-radius: 8px;
  background: var(--demo-brand);
}

.preview-topbar__mark.is-amber {
  background: var(--demo-amber);
}

.preview-topbar__mark.is-green {
  background: var(--demo-green);
}

.chat-preview__body {
  display: grid;
  gap: 12px;
}

.chat-message {
  display: grid;
  gap: 6px;
  width: min(100%, 620px);
  padding: 14px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.chat-message.is-user {
  justify-self: end;
  max-width: 520px;
  border-color: var(--demo-brand-soft);
  background: var(--demo-brand-soft);
}

.chat-message p,
.completion-editor p,
.completion-output p {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.chat-message__role,
.field-label {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
  line-height: 1.2;
}

.tool-call {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 540px);
  padding: 11px 12px;
  border: 1px dashed var(--demo-border);
  border-radius: 8px;
  background: var(--demo-subtle);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}

.tool-call__status {
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: var(--demo-green);
}

.chat-composer {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
  color: var(--demo-muted);
  font-size: 0.875rem;
}

.command-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.command-row span {
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 700;
}

.completion-editor,
.completion-output,
.embedding-list,
.similarity-table {
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.completion-editor,
.completion-output {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.completion-output__meter {
  overflow: hidden;
  height: 6px;
  border-radius: 6px;
  background: var(--demo-soft);
}

.completion-output__meter span {
  display: block;
  width: 68%;
  height: 100%;
  border-radius: inherit;
  background: var(--demo-amber);
}

.preview-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}

.embedding-list {
  display: grid;
  overflow: hidden;
}

.embedding-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(140px, 220px);
  gap: 14px;
  align-items: center;
  padding: 14px;
  color: var(--demo-ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.embedding-row + .embedding-row {
  border-top: 1px solid var(--demo-border);
}

.vector-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
  height: 42px;
}

.vector-bars i {
  display: block;
  height: 70%;
  border-radius: 6px 6px 2px 2px;
  background: var(--demo-brand);
}

.vector-bars i.is-wide {
  height: 100%;
  background: var(--demo-green);
}

.vector-bars i.is-mid {
  height: 54%;
  background: var(--demo-amber);
}

.vector-bars i.is-short {
  height: 34%;
  background: var(--demo-muted);
}

.similarity-table {
  display: table;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  table-layout: fixed;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.similarity-table th,
.similarity-table td {
  padding: 12px;
  border-bottom: 1px solid var(--demo-border);
  color: var(--demo-ink);
  text-align: right;
}

.similarity-table tr:last-child th,
.similarity-table tr:last-child td {
  border-bottom: 0;
}

.similarity-table th {
  color: var(--demo-muted);
  font-weight: 760;
}

.api-section {
  display: grid;
  gap: 18px;
  padding-bottom: 24px;
}

.api-section__header {
  display: grid;
  gap: 8px;
}

.api-section__header h2 {
  margin: 0;
  color: var(--demo-ink);
  font-size: 1.75rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.api-section__header p {
  margin: 0;
  max-width: 70ch;
  color: var(--demo-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.api-grid {
  display: grid;
  gap: 14px;
}

.api-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.api-card h3 {
  margin: 0;
  color: var(--demo-brand);
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0;
}

.api-card dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.api-card dl div {
  display: grid;
  gap: 4px;
}

.api-card dt {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
}

.api-card dd {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.875rem;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .showcase-hero__title {
    font-size: 2.25rem;
  }

  .showcase-brief__stats {
    grid-template-columns: 1fr;
  }

  .showcase-brief__stat + .showcase-brief__stat {
    border-top: 1px solid var(--demo-border);
    border-left: 0;
  }

  .embedding-row {
    grid-template-columns: 1fr;
  }
}

@media (pointer: coarse) {
  .showcase-nav a {
    min-height: 44px;
  }
}

@media (min-width: 768px) {
  .showcase-hero {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: end;
    padding-top: 48px;
  }

  .chat-composer {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .api-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .showcase-nav {
    width: max-content;
  }
}
</style>
