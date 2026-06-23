# usePersist

把任意 Vue `Ref` 接到 `localStorage` 的轻量持久化 helper。

`useChat` 在传入 `persist` 选项时会内部使用它；如果你的应用状态也需要同样的保存和恢复行为，也可以直接使用导出的 `usePersist`。

公开 TypeScript 类型：`UsePersistOptions`。

## 用法

```ts
import { ref } from 'vue'
import { usePersist } from 'vue-ai-hooks'

const messages = ref([])
const { clear } = usePersist(messages, {
  key: 'my-app:messages',
  version: 1
})
```

`usePersist` 会在创建时恢复 ref，并深度监听后续变化，把每次变更写回 storage。

## 选项

| 名称          | 类型                          | 默认值                           | 说明                                                             |
| ------------- | ----------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `key`         | `string`                      | 必填                             | Storage key。                                                    |
| `version`     | `number`                      | -                                | 在 storage key 后追加 `:v${version}`，让不兼容的旧数据自然失效。 |
| `serialize`   | `(value: T) => unknown`       | 原样返回                         | JSON 序列化前的转换函数。                                        |
| `deserialize` | `(raw: unknown) => T \| null` | 原样返回                         | 把解析后的 JSON 转回 ref 值。返回 `null` 会丢弃已保存数据。      |
| `storage`     | `Storage \| null`             | 可用时使用 `window.localStorage` | 覆盖 storage；SSR 或测试中可传 `null`。                          |
| `onError`     | `(err: Error) => void`        | -                                | 接收保存阶段错误，例如 quota 失败。读取阶段错误会被忽略。        |

## 返回值

| 属性      | 类型         | 说明                            |
| --------- | ------------ | ------------------------------- |
| `clear()` | `() => void` | 移除当前版本对应的 storage 项。 |

## 版本管理

当持久化数据结构发生不兼容变化时，使用 `version`：

```ts
usePersist(settings, {
  key: 'my-app:settings',
  version: 2
})
```

版本 `2` 会把数据保存到 `my-app:settings:v2`，旧的 `:v1` 数据不会被隐式迁移或读取。

## 自定义序列化

```ts
const selectedIds = ref(new Set<string>())

usePersist(selectedIds, {
  key: 'selected-ids',
  serialize: (value) => [...value],
  deserialize: (raw) => (Array.isArray(raw) ? new Set(raw as string[]) : null)
})
```

`serialize` 应返回 JSON 安全的数据。`deserialize` 收到的是解析后的 JSON，而不是原始字符串。

## SSR 和测试

当 `window.localStorage` 不存在时，`usePersist` 会退化为 no-op。测试里如果需要稳定验证持久化行为，可以传入内存版 `Storage`：

```ts
usePersist(source, {
  key: 'test-key',
  storage: memoryStorage
})
```
