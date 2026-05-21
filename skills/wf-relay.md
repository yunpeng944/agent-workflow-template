---
name: wf-relay
description: Use when you want to dispatch an external model (different vendor) to execute a task while keeping orchestration and review in your current session
argument-hint: '[executor] <prompt>'
disable-model-invocation: true
user-invocable: true
---

## Goal

接力模式：当前 LLM 编排 → executor 执行 → 当前 LLM 核对 + 汇报。

**preset 语义**：`<executor>` 指定执行者 vendor。编排者就是当前 LLM。默认 `codex`（若从 Codex CLI 调本 skill 则默认 `claude`）。

## Orchestration

executor 调度优先级：

1. **CLI 子进程**：`codex exec "<prompt>"` / `claude -p "<prompt>"`（fresh session 天然独立）
2. **Host subagent**：Claude Code `Agent(subagent_type="codex:codex-rescue" | "general-purpose")`
3. **fail-fast**：报错列需要的 CLI / 插件

## Stages

### Stage 1 — 编排（当前 LLM）

读任务：

- **阻断性歧义**（关键决策未明 / 依赖未指定 / 范围模糊）→ 输 3-5 个澄清问题，**停**
- 否则组装 executor prompt + 期望输出格式（diff / 报告 / 数据）

### Stage 2 — 执行（executor，单次 dispatch）

executor 按 Stage 1 prompt 工作，返回完整结果。

**Executor 不读编排者的中间思考**——只读 dispatch payload。

### Stage 3 — 核对 + 汇报（当前 LLM）

1. 核对：executor 是否做完任务？硬约束是否都满足？**不软化** executor 的不足
2. 如改了代码 → 跑 `./tasks.sh validate`
3. 输出综合报告：
   - 任务完成度：`PASS` / `PARTIAL` / `FAILED`
   - executor 产物摘要 + 关键 diff / 数据
   - 我的核对意见
   - dispatch ledger：vendor / 入口 / status / 产物来源

## Stop

报告完整 + 任务状态明确 + validate 通过（如适用）+ dispatch ledger 列 executor 真实状态。

## 失败处理

executor 不可用 / 失败 / 超时 → **fail-fast 不模拟**——明示"executor unavailable"，不得编排者自己冒充 executor 产物。
