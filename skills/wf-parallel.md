---
name: wf-parallel
description: Use when you want two independent models to work on the same task in parallel to compare results, reduce blind spots, or get cross-vendor verification
argument-hint: '[v1-v2] <prompt>'
disable-model-invocation: true
user-invocable: true
---

## Goal

平行模式：两个 executor 对**同一任务**独立工作 → 当前 LLM 综合两份产物。

**preset 语义**：`<v1>-<v2>` 指定两 executor，hyphen 分隔。默认 `claude-codex`。`claude-claude` / `codex-codex` 触发**同 vendor 警告**（两份 blind spot 高度相似，跨厂商多样性丢失），不阻塞。

## Orchestration

两路 **平行** dispatch（**不串行**——避免 A 输出污染 B prompt）：

- v1 executor：`claude -p` / `codex exec` 或对应 Agent tool
- v2 executor：同上换 vendor
- 两路 prompt **字符级一致**

## Stages

### Stage 1 — 组装 fixture（当前 LLM）

写**单一 fixture** 文件（如 `/tmp/parallel-fixture-<run-id>.md`），含：

- 任务描述
- 输出格式要求（明示要什么：hypothesis / diff / 数据 / 评分）

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

## Stop

reconciled 报告完整 + 所有分歧已仲裁 + dispatch ledger 含两 vendor 真实状态 + fixture SHA 一致性。

## 失败处理

任一 executor 不可用 / 失败 → fail-fast 不模拟。允许：

- (a) 输出单方报告 + 明示"另一方 unavailable，本报告失去双盲价值"
- (b) abort

默认 (a)。
