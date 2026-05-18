# 09 · 验证命令锚点

**何时用**：放在 AGENTS.md "验证与安全" / "开发约定" 段末，作为 agent 自检的命令清单。
**占位符**：所有命令名按项目替换。
**反模式**：用 prose 描述"应该跑测试 / 应该跑 lint"——agent 会问"具体哪条命令"，浪费 round-trip。

---

**验证命令锚点**（prose 不替代命令；harness 退出码是 ground truth）：

| 触发面      | 命令                                      | 何时跑                        |
| ----------- | ----------------------------------------- | ----------------------------- |
| 单测 / 集成 | `{{test命令}}` 或 `{{vitest命令}} <path>` | 开发内循环、改代码后          |
| 类型        | `{{typecheck命令}}`                       | 公共接口 / 类型签名改动后     |
| 文档导航    | `{{check命令}}`                           | AGENTS / docs / README 改动后 |
| AGENTS 结构 | `{{lint命令}}`                            | AGENTS.md 改动后              |
| 收口        | `{{validate命令}}`                        | 任务 / Phase 闸门             |

紧凑版（占空间更少）：

> **验证命令锚点**（prose 不替代命令；退出码是 ground truth）：单测/集成 `{{test命令}}` 或 `{{vitest命令}} <path>`、类型 `{{typecheck命令}}`、文档与 AGENTS 结构 `{{check命令}}` / `{{lint命令}}`、收口 `{{validate命令}}`。

---

## 为什么不让 agent 凭"记忆"跑命令

- agent 在长 session 里会逐渐"忘"具体命令名（被压缩或漂移）
- 显式锚点让任何阶段都能直接看到正确命令，零猜测

## 来源

- 本仓库 `AGENTS.md` "先做什么" 段验证锚点行
- Datadog "harness-first agents" 2026：harness 退出码是 ground truth
- Karpathy Software 3.0：generation-verification loop 决定可用自治度

## 改写建议

- 仅一条收口命令的项目：缩成一句话 "收口跑 `{{validate命令}}`"
- 多 monorepo workspace：每个 workspace 列一行，加 `cd <workspace> && ...`
- 没有自动 lint 的项目：写明 "暂无自动校验，依赖 review" 而不是留空
