<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useChatThreads } from 'vue-ai-hooks'
import type { ChatThread } from 'vue-ai-hooks'
import ThreadChatPanel from './ThreadChatPanel.vue'

interface ThreadMetadata extends Record<string, unknown> {
  channel: 'demo'
}

interface ThreadStats {
  threadId: string
  messageCount: number
  lastMessagePreview: string
  updatedAt: Date
}

const THREAD_INDEX_KEY = 'vue-ai-hooks:threaded-chat:index'
const STORAGE_VERSION = 1

const threads = useChatThreads<ThreadMetadata>({
  persist: { key: THREAD_INDEX_KEY, version: STORAGE_VERSION }
})
const newThreadTitle = shallowRef('')
const activeTitleDraft = shallowRef('')

const activeThread = computed(() => threads.activeThread.value)
const visibleThreads = computed(() => threads.visibleThreads.value)
const archivedThreads = computed(() => threads.archivedThreads.value)
const hasArchivedThreads = computed(() => archivedThreads.value.length > 0)

watch(
  () => activeThread.value?.id,
  () => {
    activeTitleDraft.value = activeThread.value?.title ?? ''
  },
  { immediate: true }
)

ensureActiveThread()

function ensureActiveThread() {
  if (threads.activeThread.value) return threads.activeThread.value
  const firstVisible = threads.visibleThreads.value[0]
  if (firstVisible) {
    threads.setActiveThread(firstVisible.id)
    return firstVisible
  }
  return createThread('Support intake')
}

function createThread(title?: string) {
  const typedTitle = title ?? newThreadTitle.value.trim()
  const nextTitle = typedTitle || nextThreadTitle()
  const thread = threads.createThread({
    title: nextTitle,
    metadata: { channel: 'demo' }
  })
  newThreadTitle.value = ''
  return thread
}

function nextThreadTitle() {
  return `Support chat ${threads.threads.value.length + 1}`
}

function selectThread(id: string) {
  threads.setActiveThread(id)
}

function renameActiveThread() {
  const thread = activeThread.value
  if (!thread) return
  const title = activeTitleDraft.value.trim()
  if (!title || title === thread.title) return
  threads.renameThread(thread.id, title)
}

function archiveActiveThread() {
  const thread = activeThread.value
  if (!thread) return
  threads.archiveThread(thread.id)
  ensureActiveThread()
}

function deleteActiveThread() {
  const thread = activeThread.value
  if (!thread) return
  threads.deleteThread(thread.id)
  ensureActiveThread()
}

function restoreThread(id: string) {
  threads.restoreThread(id)
}

function syncThreadStats(stats: ThreadStats) {
  const thread = threads.threads.value.find((item) => item.id === stats.threadId)
  if (!thread) return
  threads.updateThread(stats.threadId, {
    updatedAt: stats.updatedAt,
    messageCount: stats.messageCount,
    lastMessagePreview: stats.lastMessagePreview || null
  })
}

function formatThreadTime(thread: ChatThread<ThreadMetadata>) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(thread.updatedAt)
}
</script>

<template>
  <main class="threaded-chat">
    <aside class="thread-sidebar" aria-label="chat threads">
      <header class="sidebar-header">
        <p class="eyebrow">No-key demo</p>
        <h1 class="sidebar-title">Threaded chat</h1>
      </header>

      <form class="new-thread-form" @submit.prevent="createThread()">
        <label class="field-label" for="new-thread-title">New thread</label>
        <div class="inline-controls">
          <input
            id="new-thread-title"
            v-model="newThreadTitle"
            class="text-input"
            placeholder="Customer question"
          />
          <button class="primary-button" type="submit">Create</button>
        </div>
      </form>

      <section class="thread-list-section" aria-labelledby="active-threads-title">
        <h2 id="active-threads-title" class="section-title">Active</h2>
        <ul class="thread-list">
          <li v-for="thread in visibleThreads" :key="thread.id" class="thread-list-item">
            <button
              type="button"
              :class="['thread-button', { 'is-active': thread.id === activeThread?.id }]"
              @click="selectThread(thread.id)"
            >
              <span class="thread-row">
                <strong class="thread-title">{{ thread.title }}</strong>
                <span class="thread-time">{{ formatThreadTime(thread) }}</span>
              </span>
              <span class="thread-preview">
                {{ thread.lastMessagePreview || 'No messages yet' }}
              </span>
              <span class="thread-count">{{ thread.messageCount ?? 0 }} messages</span>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="hasArchivedThreads"
        class="thread-list-section"
        aria-labelledby="archived-threads-title"
      >
        <h2 id="archived-threads-title" class="section-title">Archived</h2>
        <ul class="thread-list">
          <li v-for="thread in archivedThreads" :key="thread.id" class="archived-row">
            <span class="archived-title">{{ thread.title }}</span>
            <button type="button" class="ghost-button" @click="restoreThread(thread.id)">
              Restore
            </button>
          </li>
        </ul>
      </section>
    </aside>

    <section class="chat-workspace" aria-label="active chat workspace">
      <header v-if="activeThread" class="workspace-header">
        <div class="title-edit">
          <label class="field-label" for="active-thread-title">Thread title</label>
          <div class="inline-controls">
            <input
              id="active-thread-title"
              v-model="activeTitleDraft"
              class="text-input"
              @keydown.enter.prevent="renameActiveThread"
            />
            <button class="secondary-button" type="button" @click="renameActiveThread">
              Rename
            </button>
          </div>
        </div>
        <div class="workspace-actions">
          <button class="ghost-button" type="button" @click="archiveActiveThread">Archive</button>
          <button class="danger-button" type="button" @click="deleteActiveThread">Delete</button>
        </div>
      </header>

      <ThreadChatPanel
        v-if="activeThread"
        :key="activeThread.id"
        :thread-id="activeThread.id"
        :title="activeThread.title"
        @sync-thread="syncThreadStats"
      />
    </section>
  </main>
</template>

<style scoped>
.threaded-chat {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  min-height: 100vh;
  color: #172033;
  background: #f5f7fb;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.thread-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-right: 1px solid #d8dee9;
  background: #ffffff;
}

.sidebar-header {
  display: grid;
  gap: 3px;
}

.eyebrow {
  margin: 0;
  color: #526070;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.sidebar-title {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0;
}

.new-thread-form,
.title-edit {
  display: grid;
  gap: 8px;
}

.field-label,
.section-title {
  color: #526070;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.section-title {
  margin: 0 0 8px;
}

.inline-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.text-input {
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #c8d1df;
  border-radius: 8px;
  color: #172033;
  background: #ffffff;
  font: inherit;
}

.text-input:focus {
  border-color: #2563eb;
  outline: 3px solid #bfdbfe;
}

.thread-list-section {
  min-width: 0;
}

.thread-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.thread-list-item {
  min-width: 0;
}

.thread-button {
  display: grid;
  width: 100%;
  gap: 5px;
  padding: 10px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  color: #172033;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.thread-button:hover,
.thread-button.is-active {
  border-color: #2563eb;
  background: #eff6ff;
}

.thread-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: baseline;
}

.thread-title,
.archived-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread-time,
.thread-count,
.thread-preview {
  color: #526070;
  font-size: 12px;
}

.thread-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archived-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
}

.chat-workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  padding: 22px;
}

.workspace-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
  margin-bottom: 16px;
}

.workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.primary-button,
.secondary-button,
.ghost-button,
.danger-button {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  color: #ffffff;
  background: #2563eb;
}

.secondary-button {
  color: #1d4ed8;
  border-color: #93c5fd;
  background: #eff6ff;
}

.ghost-button {
  color: #334155;
  border-color: #c8d1df;
  background: #ffffff;
}

.danger-button {
  color: #9f1239;
  border-color: #fecdd3;
  background: #fff1f2;
}

@media (max-width: 820px) {
  .threaded-chat {
    grid-template-columns: 1fr;
  }

  .thread-sidebar {
    border-right: 0;
    border-bottom: 1px solid #d8dee9;
  }

  .workspace-header {
    grid-template-columns: 1fr;
  }

  .workspace-actions {
    justify-content: flex-start;
  }
}
</style>
