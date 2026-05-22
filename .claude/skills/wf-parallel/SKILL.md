---
name: wf-parallel
description: Use when you want two independent models to work on the same task in parallel to compare results, reduce blind spots, or get cross-vendor verification
argument-hint: '[v1-v2] <prompt>'
disable-model-invocation: true
user-invocable: true
---

<!-- generated · do not edit · source: skills/wf-parallel.md -->

## Goal

平行模式：两个 executor 对**同一任务**独立工作 → 当前 LLM 综合两份产物。

**preset 语义**（`<v1>-<v2>` **可省略**）：

- `<v1>-<v2>`：两 executor，hyphen 分隔；省略时默认 `claude-codex`

## Orchestration

executor 调度优先级（host-specific subagent → CLI → fail-fast）：

1. **Host-specific subagent**：host 原生 primitive（in-session、共享 host tools / sandbox / 凭证、跨 host 一致性），保证 fresh / isolated executor
2. **CLI 子进程**：fresh OS-level executor —— agent 按 vendor 名查当前 host 上对应 CLI 入口（`which <vendor>` / `<vendor> --help` 自解析），保证 fresh / isolated executor
3. **fail-fast**：两路均不可用、vendor 无解析、失败、超时或中断 → 列出需要的入口与可用 vendor，不得降级到 manual paste 或当前模型模拟

两路 **平行** dispatch（**不串行**——避免 A 输出污染 B prompt）：

- v1 / v2 各按上述优先级 dispatch（换 vendor）
- 两路 prompt **字符级一致**

跨厂商多样性：同 vendor pair（`claude-claude` / `codex-codex`）触发警告（两份产物 blind spot 相似），不阻塞但鼓励切换。

## Worktree

- 两路被要求**落地代码**（写工作区文件）时：编排者必须先为每路 `git worktree add /tmp/wt-<run-id>-<vendor>` 隔离并在对应 worktree dispatch，避免同时写同一文件 race
- 两路仅输出**建议**（hypothesis / diff suggestion / 报告 / 评分）时：不需要 worktree
- 编排者负责判断本次任务属于哪种态

## Stages

### Stage 1 — 组装 fixture（当前 LLM）

写**单一 fixture** 文件（如 `/tmp/parallel-fixture-<run-id>.md`），含：

- 任务描述
- 输出格式要求（明示要什么：hypothesis / diff / 数据 / 评分）
- **agent 视角约束**：若评估对象是 agent 消费的内容（skill / rule / AGENTS.md / docs / 治理文档），fixture 必须显式列 agent 视角问题（lazy loading 下的 context cost / grep target 发现路径 / 实际执行触发场景 / 跨场景消费方式），否则两路 + 编排者会默认滑向 maintainer 视角（文档美学 / 维护成本 / 决策时序），错过真实受众的工作流
- **选项描述中立性**：fixture 列候选选项时，每个选项的「理由 / 风险」描述必须中立 —— 不允许把单一论据（如 cost / convenience / 计费）当作选项的**唯一**理由，也不允许在「风险」位置写未经核实的事实断言（如「host X 无 Y 概念」），否则两路会被限定在 fixture 划定的论据空间和事实假设里，reconcile 失去独立挖论据的余地

两路 executor 共用此 fixture。

### Stage 2 — 平行 dispatch（fresh executors）

同时派两路（**禁止串行**——B dispatch 时 A 输出不可见），prompt 字符级一致——以 fixture SHA 校验。

### Stage 3 — Reconcile（当前 LLM）

收到两份独立产物后：

1. **共识**：两边都说的——cite 双方一致点
2. **分歧**：A 说 X / B 说 Y——每条必给仲裁：`KEEP-A` / `KEEP-B` / `双方都不对` / `需要更多证据`
3. **盲区**：A 没看 / B 没看的方向——不允许填"无"（至少标"双方覆盖相似，无显式遗漏"）
4. 输出 reconciled 报告 + dispatch ledger（含 fixture SHA + 两 vendor status）

约束：

- 不引入两边都没提的新结论
- 分歧必给仲裁，不允许"双方都有道理"
- **视角自检**：评估 agent-facing 内容时检查两路论据 —— 若双方都只用 maintainer 视角（文档美学 / 维护成本 / 决策时序），标 `BOTH-MAINTAINER-VIEW` 并附 agent 视角（lazy loading / grep target / 实际触发）重新评估，再给最终结论

## Stop

reconciled 报告完整 + 所有分歧已仲裁 + dispatch ledger 含两 vendor 真实状态 + fixture SHA 一致性。

## 失败处理

任一 executor 不可用 / 失败 → fail-fast 不模拟。允许：

- (a) 输出单方报告 + 明示"另一方 unavailable，本报告失去双盲价值"
- (b) abort

默认 (a)。

失败模式：

- 没真实 dispatch 就写"它的意见" → 必须 fail-fast 或明确标缺失角色
- vendor key 不在字典就静默 fallback → 必须 fail-fast 并列出可用 vendor
- executor 失败后伪造产物 → 必须 fail-fast 明示，不模拟
- 同 vendor 跑 parallel 不警告 → 丢失跨厂商多样性，warning 必打
