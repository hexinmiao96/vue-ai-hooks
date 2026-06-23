# 故障排查

这个页面整理了最常见的集成问题。提交 issue 前，建议先按这里排查；
如果仍然能稳定复现，请在报告中带上最后一节的信息。

## 浏览器 API key 会暴露

任何 `VITE_*` 值都会被打包进浏览器代码。这是 Vite 的预期行为，不是
`vue-ai-hooks` 的 bug。

浏览器 key 只适合本地演示、原型，或已经按来源、额度和模型范围严格限制的
Provider key。生产应用应通过后端或边缘代理发送模型请求，并把 Provider
凭据保留在服务端。

## 浏览器里出现 CORS 或 Provider 请求失败

很多 AI Provider 不允许浏览器直接请求 REST API。如果看到 CORS、网络失败或
preflight 被拦截：

- 把 Provider 调用放到自己的后端或边缘函数后面。
- Provider key 只保留在服务端。
- 只转发应用确实需要的请求字段。
- 需要流式响应时，把 Provider stream 以 Server-Sent Events 返回给浏览器。

## 流式响应没有实时更新

流式响应需要 `fetch`、`AbortController`、`ReadableStream` 和 Server-Sent
Events 支持。如果 UI 一直等到完整响应结束才更新：

- 确认 Provider endpoint 真的返回 SSE stream。
- 检查代理、serverless function 或 CDN 是否缓冲了响应。
- 不要在响应到达 `vue-ai-hooks` 前把 stream 转成 JSON。
- 用最小 prompt 和已知支持 streaming 的 Provider 复现。

## `stop()` 不一定立刻取消上游任务

`stop()` 会中止客户端请求，并更新本地响应式状态。有些 Provider 在连接关闭后
仍可能短暂继续处理。应把客户端 abort 视为改善 UX 和节省资源的提示，而不是
Provider 侧一定回滚的保证。

## Tool calling 需要明确的信任边界

Tool handler 运行在你的应用里。`vue-ai-hooks` 不会替你做沙箱隔离、权限弹窗，
也不会验证副作用是否安全。

开放 tool calling 给用户前：

- 保持 handler 小而明确。
- 使用 tool 参数前先验证。
- 对会修改数据、花费资金或调用外部系统的操作加入权限确认。
- 记录足够的执行日志以便排查问题，同时避免泄露 secret。

## Provider 错误应保持可见

Provider adapter 会把抛出的值归一化成错误，但 Provider 专属状态码、限流和
重试策略仍应由你的应用处理。认证失败、额度不足、模型无效和 Provider 临时
故障都应给出有用提示。

## 最小 issue 信息

提交 issue 时请包含：

- `vue-ai-hooks` 版本。
- Vue 版本。
- Node 和包管理器版本。
- 浏览器或运行时。
- Provider 和模型。
- 请求是否为 streaming。
- 最小代码示例或复现仓库。
- 完整错误信息或网络响应。
