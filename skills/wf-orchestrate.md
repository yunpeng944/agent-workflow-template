---
name: wf-orchestrate
description: Use when you want to dispatch external executor(s) (different vendor) to execute a task — single dispatch (N=1, relay) or fan-out across independent sub-tasks (N>1) — while keeping plan and review in your current session
argument-hint: '[executor] <prompt>'
disable-model-invocation: true
user-invocable: true
---

## Goal

编排模式：当前 LLM 计划 + 拆分判别 → 1 个或 N 个 fresh executor 执行 → 当前 LLM 汇总 review。

**preset 语义**（`<executor>` **可省略**）：

- `<executor>`：执行者 vendor；省略时**调用方反义**默认（Claude 调时默认 `codex`，Codex CLI 调时默认 `claude`）
- N（执行路数）：**不由用户指定**，由 Stage 1 拆分判别自动决定；N>1 时所有路同 vendor
- 编排者：当前 LLM

## Orchestration

executor 调度优先级（host-specific subagent → CLI → fail-fast）：

1. **Host-specific subagent**：host 原生 primitive（in-session 执行、共享 host tools / sandbox / 凭证、跨 host 一致性），保证 fresh / isolated executor
2. **CLI 子进程**：fresh OS-level executor —— agent 按 vendor 名查当前 host 上对应 CLI 入口（`which <vendor>` / `<vendor> --help` 自解析），保证 fresh / isolated executor
3. **fail-fast**：subagent 与 CLI 均不可用、vendor 无解析 → 列出需要的入口与可用 vendor，不得降级到 manual paste 或当前模型模拟

## Stages

### Stage 1 — 计划 + 拆分判别（当前 LLM）

读任务，按顺序过三道门：

**门 1 — 阻断性歧义**（关键决策未明 / 依赖未指定 / 范围模糊）→ 输 3-5 个澄清问题，**停**

**门 2 — 方向锚定 3 问**（dispatch 准入门槛，三问没答清 → 不 dispatch，回澄清或 self-do）：

1. 任务有没有方向歧义？(source → target 哪边？同步 / 迁移 / 重构 / 替换 / 提取 类必查)
2. 是否有"反向操作 / 意外形态 / 越界产物"应在 prompt 里显式负例列出？不是"保留 X 清单"，是"**出现 Y 就 FAIL**"——可以是字符 / 文件 / API 调用 / 范围越界 / 反向同步
3. 验收准则：什么算 PASS / FAIL，怎么扫？（最好是机械可扫的 pattern，供 Stage 3 复用）

**门 3 — 拆分判别**（决定 N）：

- 任务可拆吗？不可 / 拆无意义 → **N=1**（接力模式，单 prompt）
- 可拆 → 跑**独立性硬门**：
  - 子任务有顺序依赖？（B₂ 需要 B₁ 产物）→ 拒 fan-out，**N=1** 串行
  - 子任务文件域重叠？→ 必须 `git worktree add /tmp/wt-<run-id>-<idx>` 隔离，否则拒
  - 子任务可独立验收？无 → 拒
- 全部通过 → **N>1**（fan-out 模式，N 份 prompt，每份独立验收）

三门都过 → 组装 prompt：

- N=1：单份 prompt（含期望输出格式 + 负例 + 验收准则）
- N>1：N 份 prompt + N 个 worktree 计划（如改代码），每份独立含上述要素

### Stage 2 — 执行（fresh executor，单次或并行 dispatch）

- **N=1**：单次 dispatch
- **N>1**：N 路 **并行** dispatch（**严禁串行**——避免一路输出污染另一路 prompt），每路 fresh executor + 各自 worktree（如改代码）

**对称隔离约束**（N 无关）：

- **Executor 不读编排者的中间思考**——只读 dispatch payload
- **编排者不监工 executor 中间步**——默认 foreground dispatch，拿完整产物再评判；想 tail / poll executor 实时输出 = 信任不够；信任不够的正确路径是回 Stage 1 改 prompt 直到信得过，或转 self-do，**不是边 dispatch 边监工**（破坏 fresh / isolated 前提，让 Stage 3 产物级核对退化成过程级介入）

### Stage 3 — review + 汇报（当前 LLM）

收到 1 份或 N 份产物后：

1. **核对清单**（逐路应用，不软化 executor 的不足）：
   - **反向扫描**：是否引入了 Stage 1 第 2 问列出的负例 pattern？（字符 / 文件 / API 调用 / 越界）—— 命中即 `FAILED`，不软化、不解释
   - 验收准则（Stage 1 第 3 问）是否全部满足？
   - 是否触及保留范围 / 越界？
   - executor 是否声称完成了实际没做的工作？（diff 与声明对账）
2. **尝试恢复**（仅对可恢复失败；恢复 ≠ 模拟）：
   - Sandbox 拒写 generated 文件 → 编排者跑 generator（如 `./tasks.sh sync-skills`），重核对
   - Executor 不会做的已知机械尾巴（git commit / 跨仓 op）→ 编排者补做该 step，重核对
   - 临时网络 / 超时 → 同 vendor 重试 1 次
   - **不可恢复**（vendor 完全不可用 / executor 拒绝任务 / 核心产物缺失）→ 跳到 fail-fast 报告
   - 边界：编排者**不得**补写核心 diff / 任务主体（这是模拟）；只能跑后处理脚本 / 补已知机械尾巴 / 重试网络
3. 如改了代码 → 跑 `./tasks.sh validate`（退出码必须 0）；N>1：合并通过路的 worktree 回主分支，冲突 → 该路标 `PARTIAL`，worktree 保留 inspect 不删
4. 输出综合报告：
   - 每路 status：`PASS` / `PARTIAL` / `FAILED`
   - N>1 全局 status：任一非 PASS → 全局 `PARTIAL` / `FAILED`
   - executor 产物摘要 + 关键 diff / 数据
   - 我的核对意见 + reverse-scan 命中清单
   - dispatch ledger（每路一行）：vendor / 入口 / status / 恢复动作（如有）/ 产物来源

## Stop

报告完整 + 每路状态明确 + validate 通过（如适用）+ dispatch ledger 列每路真实状态（含恢复动作，如有）。

## 失败处理

**两段式**：先归类，再决策。

**可恢复 → Stage 3 步骤 2 尝试恢复**（恢复成功 = PASS + 恢复 ledger；失败 → 落不可恢复）

**不可恢复 → fail-fast 诚实报告**（不模拟）：

- Vendor 完全不可用 / 凭证无效 → 列可用 vendor
- Executor 拒绝任务 / 产物方向错位 → 回 Stage 1 改 prompt
- 核心产物缺失 → 该路 `FAILED`，部分产物诚实交付供 inspect，**不丢弃**

失败模式（永远禁止）：

- 没真实 dispatch 就写"它的意见" → 必须 fail-fast 或明确标缺失角色
- vendor key 不在字典就静默 fallback → 必须 fail-fast 并列出可用 vendor
- executor 失败后伪造产物 → 必须 fail-fast 明示，不模拟
- 编排者补写核心 diff / 任务主体 → 模拟，禁止
- N>1 一路 FAILED 阻塞其他 → 不阻塞，全局降级 `PARTIAL`；失败路 worktree 保留 inspect，不 merge
