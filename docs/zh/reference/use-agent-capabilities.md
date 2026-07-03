# useAgentCapabilities

面向应用自有 agent 的无 UI runtime capability discovery。

它不会创建 agent 实例、协商功能，也不会渲染 UI。用它读取自有后端或 agent runtime 的
AG-UI 风格 `/info` 响应，保留原始响应，归一化声明的 `AgentCapabilities`，并暴露一个小型
`supports` 摘要，方便 Vue 界面按能力自适应。

公开导出：`useAgentCapabilities`、`summarizeAgentCapabilities`、
`extractAgentCapabilities`、`AgentCapabilities`、`AgentCapabilitiesSupportSummary`、
`AgentCapabilityTool`、`AgentIdentityCapabilities`、`AgentTransportCapabilities`、
`AgentToolsCapabilities`、`AgentOutputCapabilities`、`AgentStateCapabilities`、
`AgentMultiAgentCapabilities`、`AgentReasoningCapabilities`、
`AgentMultimodalCapabilities`、`AgentMultimodalInputCapabilities`、
`AgentMultimodalOutputCapabilities`、`AgentExecutionCapabilities`、
`AgentHumanInTheLoopCapabilities`、`AgentInfoResponse`、`AgentInfoAgent`、
`AgentCapabilitiesRequestInfo`、`AgentCapabilitiesResponseInfo`、
`LoadAgentCapabilitiesOptions`、`UseAgentCapabilitiesOptions` 和 `UseAgentCapabilitiesReturn`。

## 用法

```ts
import { useAgentCapabilities } from 'vue-ai-hooks'

const capabilities = useAgentCapabilities({
  baseURL: 'https://agent.example.test',
  api: '/info',
  agentId: 'billing-agent',
  headers: () => ({ Authorization: `Bearer ${sessionToken.value}` })
})

await capabilities.loadCapabilities()

if (capabilities.supports.value.approvals) {
  // 只有 runtime 声明支持 HITL approval 时，才展示审批控件。
}
```

默认 `api` 是 `/api/agent/info`，适合应用自有路由。直接指向 AG-UI-compatible runtime
时，传 `api: '/info'`。

## 选项

| 名称                  | 类型                      | 默认值                     | 说明                                                |
| --------------------- | ------------------------- | -------------------------- | --------------------------------------------------- |
| `api`                 | `string`                  | `/api/agent/info`          | `loadCapabilities()` 使用的 endpoint。              |
| `baseURL`             | `string`                  | `''`                       | 可选 runtime origin，会拼到相对 `api` 前面。        |
| `agentId`             | `string`                  | -                          | 从多 agent `/info` 响应里选择匹配 agent。           |
| `headers`             | `HeadersInit \| fn`       | `Accept: application/json` | info 请求的静态或惰性 headers。                     |
| `credentials`         | `RequestCredentials`      | -                          | 同源 session cookie 使用的浏览器 credentials 模式。 |
| `timeoutMs`           | `number`                  | -                          | 传给共享 fetch wrapper 的请求超时。                 |
| `fetch`               | `typeof fetch`            | global fetch               | 测试或非浏览器 runtime 的自定义 fetch。             |
| `initialCapabilities` | `AgentCapabilities`       | `null`                     | 首次加载前的本地初始 capabilities。                 |
| `loadOnInit`          | `boolean`                 | `false`                    | 创建 composable 后立即调用 `loadCapabilities()`。   |
| `selectCapabilities`  | `(raw, ctx) => caps`      | 内置                       | 非标准 info payload 的自定义提取器。                |
| `maxRetries`          | `number`                  | `0`                        | 暂时失败时重试多少次。                              |
| `retryDelayMs`        | `number \| fn`            | `0`                        | 重试间隔。                                          |
| `shouldRetry`         | `(error, ctx) => boolean` | 默认                       | 覆盖重试判断。                                      |
| `onRequest`           | `(info) => void`          | -                          | 每次 info 请求前调用。                              |
| `onResponse`          | `(info) => void`          | -                          | capabilities 加载成功后调用。                       |
| `onSuccess`           | `(caps, raw) => void`     | -                          | 拿到归一化 capabilities 和原始 info 响应时调用。    |
| `onError`             | `(Error) => void`         | -                          | 重试耗尽后调用。                                    |

## 返回值

| 属性                     | 类型                                            | 说明                                                  |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| `capabilities`           | `Ref<AgentCapabilities \| null>`                | 归一后的声明能力；没有时为 `null`。                   |
| `rawInfo`                | `Ref<unknown \| null>`                          | 原始 `/info` JSON payload，可用于诊断或自定义 UI。    |
| `supports`               | `ComputedRef<AgentCapabilitiesSupportSummary>`  | 从 `capabilities` 推导出的布尔能力摘要。              |
| `hasCapabilities`        | `ComputedRef<boolean>`                          | 存在 capability object 时为 `true`。                  |
| `status`                 | `Ref<AiRequestStatus>`                          | `ready`、`submitted` 或 `error`。                     |
| `isLoading`              | `Ref<boolean>`                                  | 请求进行中时为 `true`。                               |
| `error`                  | `Ref<Error \| null>`                            | 最近一次非 abort 加载错误。                           |
| `lastRequest`            | `Ref<AgentCapabilitiesRequestInfo \| null>`     | 最近一次 info 请求 trace。                            |
| `lastResponse`           | `Ref<AgentCapabilitiesResponseInfo \| null>`    | 最近一次成功响应 trace。                              |
| `inspect()`              | `() => RequestInspectionSnapshot`               | 生成脱敏 debug snapshot 和 curl 命令。                |
| `loadCapabilities(opts)` | `(opts?) => Promise<AgentCapabilities \| null>` | 从 info endpoint 加载 capabilities。                  |
| `refreshCapabilities()`  | 同 `loadCapabilities()`                         | 适合 UI 按钮或轮询代码的别名。                        |
| `setCapabilities(value)` | `(caps \| null) => void`                        | 手动替换本地 capabilities。                           |
| `stop()`                 | `() => void`                                    | abort 当前请求。                                      |
| `clearError()`           | `() => void`                                    | 清空错误并恢复 `ready` 状态。                         |
| `clearTrace()`           | `() => void`                                    | 清空请求/响应 trace refs。                            |
| `clear()`                | `() => void`                                    | abort 并重置 capabilities、raw info、error 和 trace。 |

## 响应形状

内置提取器支持三类常见形状：

```ts
// 直接返回 capabilities
{ transport: { streaming: true }, tools: { supported: true } }

// runtime info wrapper
{ capabilities: { transport: { streaming: true } } }

// 多 agent runtime info
{
  agents: [
    { id: 'billing-agent', capabilities: { humanInTheLoop: { approvals: true } } }
  ]
}
```

后端形状不同的时候，使用 `selectCapabilities(rawInfo, { agentId })`。

## Support summary

`supports` 会把可选嵌套字段转成稳定布尔值：

```ts
const { streaming, toolCalling, structuredOutput, humanInTheLoop, approvals, interrupts } =
  capabilities.supports.value
```

这个摘要只是派生数据。需要工具列表、sub-agent metadata、MIME types、自定义 rate limit
或执行限制时，读取 `capabilities.value` 里的源数据。
