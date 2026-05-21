---
name: wf-convoy-refactor
description: Convoy refactor — split cross-module refactor into verifiable batches; PLANNER (batch plan) + per-batch IMPLEMENTER/REVIEWER/IMPLEMENTER mini-cycle with explicit invariants.
argument-hint: '[preset] <task>'
disable-model-invocation: true
user-invocable: true
---

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

大重构 / 跨模块迁移（≥ 3 模块、≥ 5 文件、或触动公共抽象）拆成 **PLANNER → IMPLEMENTER → REVIEWER → IMPLEMENTER 接力**：PLANNER 设计**护送车队路线**——把整段重构切成 N 个**独立可验证、可回滚**的批次，每批维持显式不变量集合 → IMPLEMENTER 按批实现 → REVIEWER 按批 review → IMPLEMENTER 按批修复，**每批独立 commit、独立 `./tasks.sh validate`、独立回滚点**。核心差异于 `wf-coding-relay`：**Stage 1 输出 batch plan 而非单一方案**；Stage 2/3/4 按批循环 mini-cycle。

## Orchestration

- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节；默认 `claude-codex`；`custom` (`--planner=<m> --implementer=<m> --reviewer=<m>` 缺任一 fail-fast)
- **role slots**: PLANNER (Stage 1 一次性产 batch plan) / IMPLEMENTER (每批 Stage 2, 4) / REVIEWER (每批 Stage 3)；每批 Stage 3 input 仅含 STAGE-1 PLAN + 本批 STAGE-2 DIFF + STAGE-2 INVARIANTS-REPORT，**绝不**含 STAGE-2 SUMMARY 的 self-narrative
- **特有约束**: 每批 Stage 4 收口后才 commit（Stage 2/3 期间留 working tree）；**INVARIANTS 必须机械可校验**（diff 型 reviewer 自判 + 命令型信 Stage 2 退出码）；BATCH ABORT/REWORK 时**丢 working tree** 不 git revert（commit 未发生）；跨批 follow-up 用 `DEFERRED-TO-BATCH-X` 标记；**Worktree 隔离每批一个** `git worktree add`，避免跨批污染
- 通用调度行为（优先级 / fresh subagent / dispatch ledger / single-role preset 例外）→ [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-convoy-refactor [preset] [--mode=<simplification>] <task>`

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制。**批次间编排**：编排者按 batch plan 顺序为每批跑 Stage 2-4 mini-cycle，前一批 Stage 4 收口（用户做真实 commit）后才进下一批 Stage 2。

## When to use / Skip if

**用**：跨 ≥ 3 模块 / ≥ 5 文件的重构（重命名、抽象迁移、API 演化、目录结构改造）；改动公共抽象 / 模块边界 / 跨子系统 type 流向；大型框架升级 / 工具链替换；一次完成 diff 大、回滚成本高、reviewer 难看清。

**跳过**：单文件 / 单模块 → `wf-coding-relay`；高风险面（auth / state / 契约）即便范围小 → `wf-red-team`；regression 现场 → `wf-incident-rescue`；选型 / 架构对比 → `wf-bake-off`。

**降级**：本 workflow 不提供 mode；详见 Simplification 段。

---

## Stages

### Stage 1 — PLANNER（Convoy 路线规划）

````
===== BEGIN STAGE-1-PLANNER PROMPT =====
把以下重构设计成**护送车队（convoy）路线**。先不要写代码。基于本仓 AGENTS.md：

**决策门**：重构是否含阻断性歧义（目标状态 / API 契约边界 / 是否允许行为变更）？
- 有 → **只输出澄清问题**（3-5 项），停止
- 无 → 直接输出完整 convoy plan

Convoy plan 输出：
1. **目标状态与差距**：1 段当前形态 + 1 段目标形态 + 主要差距清单
2. **跨批不变量集合 (INVARIANTS)**：所有批次必须维持的性质，每条**可机械校验**（如「`pnpm typecheck` 全程绿」「契约文件 X 字段值不变」「CLI 命令 Y 行为不变」「Z import 路径在 grep 中保持唯一」）
3. **批次切分 (BATCHES)**：每批必含：
   - `id`: 批次编号 + 短名（如 `B1: extract-shared-types`）
   - `intent`: 1 句话目的
   - `files`: 文件清单（含新建 / 修改 / 删除）
   - `invariants_held`: 本批结束时仍维持的不变量子集（应等于 INVARIANTS）
   - `invariants_temporarily_relaxed`: 批中段可能违反但批末必须恢复的不变量（含恢复机制）
   - `dependencies`: 依赖的前置批次 id；可与哪些批次并行
   - `acceptance`: 验收命令（必含 `./tasks.sh validate`）+ 期望产出
   - `rollback_strategy`: 如何回滚（`git revert <SHA>` / 删新文件 + 改回 import / codemod 反向跑）
   - `est_size`: 估算行数 / 文件数（避免单批 > 600 行或 > 15 文件）
4. **批次依赖图**：dot / markdown list 表达依赖；标**关键路径**与**可并行段**
5. **过渡期处理**：是否需要 deprecation 双写 / 同名 shim / feature flag？**默认禁用**（AGENTS.md 不引入只为兼容旧代码的垫片）；如必须，写明每条 shim 的撤除批次 id
6. **失败恢复路径**：批次 N review 被打回（🔴 阻断），是否影响后续批次的 invariants？给"挂起 / 回滚 N 重启 / 继续 N+1 跳过 N"三策略对应判据
7. **替代方案** ≥ 1 + 排除原因（如「单批 big-bang 排除：diff > 1000 行，reviewer 难看清」）
8. **依赖评估**：新增依赖每条带候选 + 选择 + 排除原因；如本身就是撤掉依赖，写明撤的批次 id
9. 自审 3 条：规格覆盖 / 类型一致性 / 路径一致性
10. **总验收**：所有批次完成跑 `./tasks.sh validate`；不变量校验链回 #2 可机械项

约束：契约值不复制到方案；不变量必须**可机械校验**，不接受「代码风格保持」「可读性不下降」一类主观项。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE REFACTOR TARGET + CURRENT/TARGET STATE HERE]
===== END STAGE-1 REQUIREMENT =====
```
===== END STAGE-1-PLANNER PROMPT =====
````

**Artifact**：澄清清单 或 完整 convoy plan（10 项 + 批次依赖图）。
**Handoff to Stage 2**：每个 BATCH 有可机械校验的验收 + 单批估算 ≤ 600 行 / 15 文件 + 不变量全部可机械化。

### Stage 2 — IMPLEMENTER（每批 mini-cycle Phase A + Phase B）

> **本 Stage 对每个 BATCH 跑一次**。完成 batch N 后回 Stage 3 review，全绿后再回 Stage 2 跑 batch N+1。**不要把多批合并到一次 Stage 2 跑**——丢失分批价值。

````
===== BEGIN STAGE-2-IMPLEMENTER PROMPT =====
本次是 convoy refactor 的**一个批次**。两阶段执行。

**当前批次 id**: [BATCH_ID]（在 plan 中查找对应条目）

**Phase A — 批次对仓库的可执行性校验（不写代码）**：
1. 读 plan 中本批 `files` 列出的所有现有文件，确认与 plan 描述一致
2. 列出将改 / 新建 / 删除的文件清单，对照 plan 找偏差
3. 标 **DEVIATION**（与 plan 不一致 + 修正建议）或 **BLOCKED**（前置批次未完成 / plan 信息不足）
4. **额外**：核验所有 `dependencies` 批次的最终 commit 已存在（`git log` 找批次标签）；缺则 BLOCKED
5. 输出 Phase A 结果块，停等 `Phase B GO` / `back to Stage 1`

**Phase B — 本批实现**：
1. 只做本批 `intent` 的事，不做相邻批次的事
2. 行为变更先补失败测试（红），再实现（绿）；纯结构搬运也补 smoke test
3. 批中段可能违反 `invariants_temporarily_relaxed`，**但本批 commit 前必须恢复**——commit 时所有 INVARIANTS 应通过
4. 跑本批 `acceptance` 命令 + `./tasks.sh validate`，全绿才能产 commit **草稿**。**真实 commit 在本批 Stage 4 收口后做**——Stage 2/3 期间改动留 working tree（必要时 `git stash` 而非 commit），Stage 3 review 拿 working tree diff，ABORT 时直接丢工作目录
5. 发现 adjacent 修改超本批 `files` → 标 **SCOPE-EXPANSION**（文件 + why），停等裁定——切勿合并到本批

输出格式：

Phase A 后：
```
===== BEGIN STAGE-2 PHASE-A RESULT (BATCH [ID]) =====
Phase A 结论: PASS / DEVIATION / BLOCKED + 原因
目标修改文件清单: [...]
与 plan 对照偏差: [...]
前置批次完成状态: [BatchID → commit SHA 或 MISSING]
===== END STAGE-2 PHASE-A RESULT (BATCH [ID]) =====
```

Phase B 后三个块：
```
===== BEGIN STAGE-2 SUMMARY (BATCH [ID]) =====
本批 intent + 修改摘要 (1-3 行)
修改文件列表 (含行数估算)
验证命令 + 退出码 + 关键日志
本批 INVARIANTS 检查结果 (每条 PASS/FAIL)
SCOPE-EXPANSION (如有): 文件 + why
===== END STAGE-2 SUMMARY (BATCH [ID]) =====
```
```
===== BEGIN STAGE-2 DIFF (BATCH [ID]) =====
[`git diff` 完整文本 — 仅本批改动]
===== END STAGE-2 DIFF (BATCH [ID]) =====
```
```
===== BEGIN STAGE-2 PENDING-COMMIT-DRAFT (BATCH [ID]) =====
待定 commit message (含批次标签如 `refactor(B1): extract-shared-types`) — 真实 commit 推迟到本批 Stage 4 收口后
预期 rollback 命令 (Stage 4 commit 之后才需要；Stage 4 之前直接丢 working tree)
===== END STAGE-2 PENDING-COMMIT-DRAFT (BATCH [ID]) =====
```

不合并多批 / 不静默引入兼容垫片 / 不跨批改文件；SCOPE-EXPANSION 必走，不静默扩。

```
===== BEGIN STAGE-1 PLAN =====
[PASTE STAGE-1 CONVOY PLAN HERE]
===== END STAGE-1 PLAN =====
```
===== END STAGE-2-IMPLEMENTER PROMPT =====
````

**Artifact**：PHASE-A RESULT + 三个 Phase B 块（SUMMARY / DIFF / PENDING-COMMIT-DRAFT）+ 全绿 `./tasks.sh validate`。**本批此时尚未 commit**。
**Handoff to Stage 3**：本批 Phase B 完成 + 所有 INVARIANTS PASS。把 STAGE-2 DIFF + STAGE-2 SUMMARY 中**「本批 INVARIANTS 检查结果」**一段（命名为 INVARIANTS-REPORT）传给 Stage 3（diff 给独立 review、INVARIANTS 报告供命令型不变量交叉核对）。

### Stage 3 — REVIEWER（fresh subagent，按批 review + 批次裁定）

````
===== BEGIN STAGE-3-REVIEWER PROMPT =====
不要重新实现。本次是 convoy refactor 的**一个批次** review。

**当前批次 id**: [BATCH_ID]

**独立性约束**：本 prompt 含 plan、本批 diff、INVARIANTS 检查结果。IMPLEMENTER 其他 self-narrative summary **不在 context 里**。先基于 diff 形成独立 review，再用 INVARIANTS 报告做交叉核对（**命令型**不变量你无法自跑只能信 IMPLEMENTER 退出码；**diff 型**不变量应自己重判）。

review 维度（按 convoy 特性扩展）：
1. 本批 `intent` 是否被精确执行？有无扩 / 缩范围？
2. 本批是否破坏 INVARIANTS？逐条核对：**diff 型**（如「import 路径 X 唯一」「字段 Y 未改」）你直接读 diff 判定；**命令型**（如「`pnpm typecheck` 绿」）信 Stage 2 退出码，若 Stage 2 报 FAIL 则直接 🔴
3. 本批是否破坏前序批次产出（如改回了 B1 抽出的类型）？
4. 本批是否提前做了后续批次的工作（污染后续 review 边界）？
5. 本批是否引入需要后续批次紧急清理的过渡态（兼容垫片 / 双写 / unused stub）？
6. 设计 / 错误处理 / 边界条件常规审视
7. 测试是否覆盖本批引入的行为 / 结构变更？
8. 契约表面是否动了？若动了，是否在本批同步契约？

输出按严重度分级，每条含 file:line：
- 🔴 必须修改（阻断本批合并）
- 🟡 建议修改（合并前修 或 tracked follow-up，**不允许只留 TODO**）
- 🟢 可以接受

**额外**给一条**批次裁定**：
- `BATCH ACCEPT`：本批可独立 commit，进 Stage 4 修 🔴/🟡 后或直接收口
- `BATCH REWORK`：结构性问题，回 Stage 2 重做（仍在本批 id 下）
- `BATCH ABORT`：本批方向错，回 Stage 1 改 plan（可能影响后续批次）

```
===== BEGIN STAGE-1 PLAN =====
[PASTE STAGE-1 CONVOY PLAN HERE]
===== END STAGE-1 PLAN =====
```

```
===== BEGIN STAGE-2 DIFF (BATCH [ID]) =====
[PASTE git diff OUTPUT HERE]
===== END STAGE-2 DIFF (BATCH [ID]) =====
```

```
===== BEGIN STAGE-2 INVARIANTS-REPORT (BATCH [ID]) =====
[PASTE Stage 2 SUMMARY 中「本批 INVARIANTS 检查结果」段]
===== END STAGE-2 INVARIANTS-REPORT (BATCH [ID]) =====
```
===== END STAGE-3-REVIEWER PROMPT =====
````

**Artifact**：分级清单 + file:line + **批次裁定**（ACCEPT / REWORK / ABORT）。
**Handoff to Stage 4**：`BATCH ACCEPT` + (🔴 > 0 **或** 🟡 > 0) → 进 Stage 4 处理；`BATCH ACCEPT` + 全 🟢 → 跳 Stage 4 直接进收口 commit；`BATCH REWORK` → 回 Stage 2 重做本批（丢 working tree）；`BATCH ABORT` → 回 Stage 1 修订 plan（本批此时未 commit，无需 git revert）。

### Stage 4 — IMPLEMENTER（本批修复 + 收口）

````
===== BEGIN STAGE-4-IMPLEMENTER PROMPT =====
按 review 清单修本批改动。

**当前批次 id**: [BATCH_ID]

执行要求：
1. **所有 🔴 必改**，不能跳过
2. 🟡 处理（**不允许只留 TODO**）：本批直接修 OR tracked follow-up（含 file:line + 描述 + 责任人）
3. 🟢 跳过
4. **修复不得越批**：若 review 提到的问题需在后续批次解决，标 `DEFERRED-TO-BATCH-[id]` 进 follow-up
5. 跑本批 `acceptance` + `./tasks.sh validate`
6. 所有 INVARIANTS 再次确认 PASS
7. **Cross-Batch INVARIANTS Recheck**：本批 commit **后**，重跑所有命令型 INVARIANTS 并对照上一批 commit 时记录的退出码——任何 PASS → FAIL 即 `BATCH REWORK`（前批引入的不变量被本批破坏 或 反之）。在 SUMMARY 中列每条 INVARIANT 的"本批前 / 本批后"退出码对比；首批跳过对比但仍记录退出码作下一批基线
8. **INVARIANTS-REPORT 格式硬约束**：每条命令型 INVARIANT 必带**命令字串 + 退出码**两字段，禁止只写 PASS/FAIL（编排者据此可复跑校验）

例外：修 🔴 时发现必要 adjacent 修改（同批内）→ 标 **SCOPE-EXPANSION**，停等裁定。

输出两个块：
```
===== BEGIN STAGE-4 SUMMARY (BATCH [ID]) =====
🔴 已处理: [item ↔ commit/file]
🟡 已处理: [item ↔ 修 或 follow-up ID]
🟢 跳过: [count]
DEFERRED-TO-BATCH-X: [item ↔ batch id]
验证命令 + 退出码 / INVARIANTS 最终检查 (每条 PASS) / Follow-up 列表 / SCOPE-EXPANSION
===== END STAGE-4 SUMMARY (BATCH [ID]) =====
```
```
===== BEGIN STAGE-4 DIFF (BATCH [ID]) =====
[`git diff` 完整文本，仅本批修复部分]
===== END STAGE-4 DIFF (BATCH [ID]) =====
```

不引入 review 未提及的改动 / 不跨批改文件。

```
===== BEGIN STAGE-3 REVIEW =====
[PASTE STAGE-3 REVIEW HERE]
===== END STAGE-3 REVIEW =====
```
===== END STAGE-4-IMPLEMENTER PROMPT =====
````

**Artifact**：SUMMARY + DIFF + 全绿 `./tasks.sh validate` + INVARIANTS 全 PASS。
**Stop**：本批 Stage 4 收口后**由用户做真实 commit**（含 Stage 2 + Stage 4 累计 diff，用 Stage 2 PENDING-COMMIT-DRAFT message）。记本批最终 commit SHA，**回 Stage 2 跑下一批**直到所有 batch 完成。最后跑一次全量 `./tasks.sh validate` 收尾整个 convoy。

---

## Simplification

本 workflow 不提供显式降级 mode flag；默认即完整 4 阶段 × N 批次。

**何时不该走本 workflow**：
- < 3 模块 / < 5 文件 / 不改公共抽象 → 走 `wf-coding-relay`
- 单 typo / 单文件 → 直接改

降级路径不存在；要么走完整 convoy，要么走其他 workflow，不存在中间档。
