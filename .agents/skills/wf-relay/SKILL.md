---
name: wf-relay
description: Use when you want to dispatch an external model (different vendor) to execute a task while keeping orchestration and review in your current session
argument-hint: '[executor] <prompt>'
disable-model-invocation: true
user-invocable: true
---

<!-- generated · do not edit · source: skills/wf-relay.md -->

## Goal

接力模式：当前 LLM 编排 → executor 执行 → 当前 LLM 核对 + 汇报。

**preset 语义**（`<executor>` **可省略**）：

- `<executor>`：执行者 vendor；省略时默认 `codex`（本 skill 从 Codex CLI 调起则默认 `claude`）
- 编排者：当前 LLM

## Orchestration

Vendor 字典：

- `claude`：`claude -p <prompt>`
- `codex`：`codex exec <prompt>`
- 新 vendor 接入：本表加一行。

executor 调度优先级（CLI → host-specific subagent → fail-fast）：

1. **CLI 子进程**：`codex exec "<prompt>"` / `claude -p "<prompt>"`（fresh session 天然独立）
2. **Host-specific subagent**：仅当 host 装有对应机制时使用，仍需 fresh / isolated executor
3. **fail-fast**：CLI / 插件不可用、vendor key 未知、失败、超时或中断时，列出需要的入口和可用 vendor；不得降级到 manual paste 或当前模型模拟

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

executor 不可用 / 失败 / 超时 / 中断 → **fail-fast 不模拟**——明示"executor unavailable"，不得编排者自己冒充 executor 产物。

失败模式：

- 没真实 dispatch 就写"它的意见" → 必须 fail-fast 或明确标缺失角色
- vendor key 不在字典就静默 fallback → 必须 fail-fast 并列出可用 vendor
- executor 失败后伪造产物 → 必须 fail-fast 明示，不模拟
- executor sandbox 拒写 generated 镜像（如 codex `-s workspace-write` 对 `.agents/skills/` 的输入资源保护）→ partial 不是 fail，编排者跑 `./tasks.sh sync-skills` 补救后再 validate
