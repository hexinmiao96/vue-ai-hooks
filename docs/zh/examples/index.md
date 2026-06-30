---
title: 示例
description: 面向对话、工具审批、文本补全、向量嵌入、图片生成、后端代理和结构化输出的精致 vue-ai-hooks 示例页。
aside: false
pageClass: demo-page
---

<script setup>
import DemoShowcase from '../../.vitepress/theme/components/DemoShowcase.vue'
</script>

# 示例

这个页面按真实产品场景组织。先看预览理解 UI 形态，需要接入时切到代码；只有查参数或方法时再看 API 表格。

## 先跑不需要 key 的 Demo

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，点击 **Run approval demo**。聊天示例会先使用确定性的
`local-tools` Provider，流式输出回复，在 `chargeCard` 工具调用处暂停，并在审批或拒绝后继续。
先用这条路径确认 UI，再接真实 Provider key 或后端代理。

要验证后端契约，运行 `pnpm example:proxy-server`。它同时接受默认的
`/api/chat`、`/api/completion`、`/api/embedding`、`/api/image`、`/api/object`
路由，以及浏览器示例通过 `proxyProvider` 使用的 `/api/ai/*` 路由。

如果要试不需要 key 的图片生成流程，运行 `pnpm example:image`。它默认渲染确定性的本地
SVG；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/image` 路由。

如果要试结构化 JSON 流程，运行 `pnpm example:object`。它默认使用本地
`local-object` Provider，不需要 key；之后也可以用和其它浏览器示例相同的环境变量切到
`proxy` 或真实 Provider。

## 先看哪个示例？

| 目标                             | 从这里开始                     |
| -------------------------------- | ------------------------------ |
| 做聊天界面、结构化片段或工具审批 | [流式对话](#chat-demo)         |
| 一个提示词生成一段文本           | [文本补全](#completion-demo)   |
| 做语义相似度比较                 | [向量相似度](#embedding-demo)  |
| 通过应用后端生成图片             | [图片生成](#image-demo)        |
| 从提示词抽取类型化 JSON          | [结构化对象输出](#object-demo) |

<DemoShowcase locale="zh" />
