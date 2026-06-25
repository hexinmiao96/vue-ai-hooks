# API 稳定性

`vue-ai-hooks` 对公开导出和已文档化的运行时行为遵循语义化版本。这个页面定义了
用户升级时可以依赖的兼容性范围。

## 稳定公开接口

稳定 API 面是包入口：

```ts
import { useChat, useCompletion, useEmbedding, useObject, usePersist } from 'vue-ai-hooks'
```

只要组合式函数、Provider 工厂和导出的 TypeScript 类型从 `vue-ai-hooks` 包入口
导出，并且已经写进参考文档，就受语义化版本保护。

## 什么算破坏性变更

以下变更需要 major 版本：

- 移除或重命名 public export。
- 以破坏现有代码的方式修改已文档化的 option 名称、默认行为或返回结构。
- 缩窄已声明的运行时要求，例如降低对当前 Vue 或 Node 版本下限的支持。
- 以影响现有选项序列化请求 payload 的方式修改 Provider 工厂行为。

## minor 和 patch 可以改变什么

minor 版本可以增加新的组合式函数、Provider helper、option 或已文档化能力，但不
应破坏现有代码。

patch 版本可以修复 bug、Provider 兼容性、文档、测试、类型精度和内部实现细节。

## 内部实现细节

不要直接导入 `vue-ai-hooks/dist`、`vue-ai-hooks/src` 或内部模块里的文件。只有包
根入口导出是稳定的。Deep import 和文件名以 `_` 开头的模块属于内部实现细节，
可以在不提前通知的情况下变化。

## Provider 和模型行为

Provider API 可能在这个包之外变化。`vue-ai-hooks` 会保持 adapter 接口稳定，但
上游模型行为、限流、回复文本和 Provider 专属错误 payload 不属于本包兼容性契约。

应用应在自身层面处理 Provider 错误、重试、可观测性和 fallback。
