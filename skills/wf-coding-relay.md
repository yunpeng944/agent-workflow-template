---
name: wf-coding-relay
description: 4-stage default development workflow — PLANNER plans, IMPLEMENTER implements, REVIEWER reviews diff independently, IMPLEMENTER applies fix.
argument-hint: '[preset] <task>'
disable-model-invocation: true
user-invocable: true
---

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

非平凡开发任务（新功能 / 多文件重构 / 不熟悉的子系统）拆成 4-stage 接力：PLANNER 想清楚 → IMPLEMENTER 做扎实 → REVIEWER 反观 → IMPLEMENTER 收口。REVIEWER 永远 fresh subagent，避免单 agent 自评盲区。

## Orchestration

- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节；默认 `claude-codex`；`custom` (`--planner=<m> --implementer=<m> --reviewer=<m>` 缺任一 fail-fast)
- **role slots**: PLANNER / IMPLEMENTER / REVIEWER；Stage 3 (REVIEWER) input 仅含 STAGE-1 PLAN + STAGE-2 DIFF，**不含** STAGE-2 SUMMARY
- **特有约束**: Phase B / Stage 4 中发现 adjacent 改动超方案写入集 → 标 **SCOPE-EXPANSION**，停等用户裁定
- 通用调度行为（优先级 / fresh subagent / dispatch ledger / worktree 隔离 / single-role preset 例外）→ [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-coding-relay [preset] [--mode=<simplification>] <task>`

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制为 dispatch payload；用户传入 task 替换 `[PASTE … HERE]`。

## When to use / Skip if

**用**：新功能 / 跨多文件 / 不熟模块 / 触及契约或跨端边界。

**跳过**：高风险面 → `wf-red-team`；大重构 → `wf-convoy-refactor`；疑难 bug → `wf-second-opinion`；失败测试 → `wf-incident-rescue`；选型 → `wf-bake-off`；治理文档 → `wf-coauthor-doc`。

**降级**：本 workflow 不提供 mode；详见 Simplification 段。

---

## Stages

### Stage 1 — PLANNER

````
===== BEGIN STAGE-1-PLANNER PROMPT =====
基于以下需求与本仓 AGENTS.md：

**决策门**：需求是否含阻断性歧义 / 未确认决策？
- 有 → **只输出澄清问题**（3-5 项），停止
- 无 → 直接输出完整方案

方案输出：
1. 功能边界（做什么 / 不做什么）
2. 实现方案（1 段主线 + 2-4 个关键技术决策）
3. 替代方案（≥ 1 + 排除原因）
4. 依赖评估（新增依赖每条带候选 + 选择 + 排除原因）
5. 文件结构（新建 / 修改清单 + 单一职责）
6. Phase 分解（每 Phase：改动文件 / 并发可能 / 独立验证命令）
7. 风险点（≤ 3 条按可能性排序）
8. 自审 3 条：规格覆盖 / 类型一致性 / 路径一致性
9. 验收：链回 `./tasks.sh validate`（必要时加项目自定 test / typecheck / `./tasks.sh check-structure` / `./tasks.sh check-refs`）

契约值指向真源，不复制。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE REQUIREMENT HERE]
===== END STAGE-1 REQUIREMENT =====
```
===== END STAGE-1-PLANNER PROMPT =====
````

**Artifact**：澄清清单（用户答完重跑 Stage 1）或完整方案（含 9 项 → 进 Stage 2，所有路径 / 命令 / API 必须能在仓库中验证存在）。

### Stage 2 — IMPLEMENTER（Phase A 校验 + Phase B 实现）

````
===== BEGIN STAGE-2-IMPLEMENTER PROMPT =====
两阶段执行：

**Phase A — 方案对仓库的可执行性校验（不写代码）**：
1. 读方案中提到的所有现有文件，确认目录 + API 与方案一致
2. 列出将要修改 / 新建的文件清单
3. 标 **DEVIATION**（与方案不符 + 修正建议）或 **BLOCKED**（无法直接执行 + 回 Stage 1 的具体问题）
4. 输出 Phase A 结果块。**停等闸门**：
   - 若结论 = `PASS` + 修改文件 ≤ 3 + 无新建文件 → 标 `PHASE-A AUTO-CONTINUE` 直接进 Phase B（无需用户裁定）
   - 若 `DEVIATION` 或 `BLOCKED` → **必停**等用户：`Phase B GO` 继续 / `back to Stage 1` 重启

**Phase B — 实现（用户 GO 后）**：
1. 最小必要改动；不扩范围
2. 行为变更先补失败测试（红），再实现（绿）
3. 按方案跑验证命令；收口跑 `./tasks.sh validate`
4. 发现 adjacent 改动超方案写入集 → 标 **SCOPE-EXPANSION**（文件 + why），停等用户裁定

输出格式（fenced block）：

Phase A 后：
```
===== BEGIN STAGE-2 PHASE-A RESULT =====
Phase A 结论: PASS / DEVIATION / BLOCKED + 原因
目标修改文件清单: [...]
与方案对照偏差: [...]
===== END STAGE-2 PHASE-A RESULT =====
```

Phase B 后两个块：
```
===== BEGIN STAGE-2 SUMMARY =====
修改摘要 (1-3 行) / 修改文件列表 (含行数估算)
验证命令 + 退出码 + 关键日志
SCOPE-EXPANSION (如有): 文件 + why + 是否已停等
===== END STAGE-2 SUMMARY =====
```
```
===== BEGIN STAGE-2 DIFF =====
[`git diff` 完整文本 — 非可选 — Stage 3 review 的必需输入]
===== END STAGE-2 DIFF =====
```

```
===== BEGIN STAGE-1 PLAN =====
[PASTE STAGE-1 PLAN HERE]
===== END STAGE-1 PLAN =====
```
===== END STAGE-2-IMPLEMENTER PROMPT =====
````

**Artifact**：PHASE-A RESULT + SUMMARY + DIFF。diff 必须是 `git diff` 完整文本，不接受 SHA 替代——Stage 3 需 diff 本身做独立 review。
**Handoff to Stage 3**：Phase B 完成 + `./tasks.sh validate` 绿 → 把 STAGE-2 DIFF 块（**不含 SUMMARY**）传给 Stage 3。

### Stage 3 — REVIEWER（fresh subagent，只读 plan + diff）

````
===== BEGIN STAGE-3-REVIEWER PROMPT =====
不要重新实现。**独立性约束**：本 prompt 含 plan 与 diff；IMPLEMENTER summary **永不进入** context——独立 review 不可逆，禁止"事后补给 summary 调整 review"（这会软化结论）。补充澄清走 Stage 4 IMPLEMENTER 主动 raise，不走 review 修订路径。

review 维度：
1. 是否偏离 Stage 1 方案？哪里、为什么、是否合理？
2. 是否过度工程化？可删但不影响功能的代码？
3. 是否破坏现有抽象 / 模块边界？
4. 错误处理 / 边界条件
5. 测试是否覆盖行为主张（不只是路径）？
6. 契约表面是否动了（CLI / JSON / state / error）？若动了是否同步契约变更流程？
7. 长期可维护性

输出按严重度分级，每条含 file:line：
- 🔴 必须修改（阻断合并）
- 🟡 建议修改（合并前修 或 tracked follow-up，**不允许只留 TODO 注释**）
- 🟢 可以接受 / 标记 follow-up

```
===== BEGIN STAGE-1 PLAN =====
[PASTE STAGE-1 PLAN HERE]
===== END STAGE-1 PLAN =====
```

```
===== BEGIN STAGE-2 DIFF =====
[PASTE git diff OUTPUT HERE]
===== END STAGE-2 DIFF =====
```
===== END STAGE-3-REVIEWER PROMPT =====
````

**Artifact**：分级清单 + file:line。**任一 🔴 必须进 Stage 4**；0 🔴 且 ≤ 2 🟡 可考虑收口或仅修 1-2 条。

### Stage 4 — IMPLEMENTER（修复 + 验证）

````
===== BEGIN STAGE-4-IMPLEMENTER PROMPT =====
按 review 清单修代码：
1. **所有 🔴 必改**，不能跳过
2. 🟡 处理（**不允许只留 TODO 注释**）：本次直接修 OR 创建 tracked follow-up（GitHub issue / 本地 follow-ups.md，含 file:line + 描述 + 责任人）
3. 🟢 跳过
4. 收口跑 `./tasks.sh validate`

例外：修 🔴 时发现必要 adjacent 修改（如揭露的同类 bug）→ 标 **SCOPE-EXPANSION**（文件 + why），停等裁定。

输出两个块：
```
===== BEGIN STAGE-4 SUMMARY =====
🔴 已处理: [item ↔ commit/file]
🟡 已处理: [item ↔ 修 或 follow-up ID]
🟢 跳过: [count]
验证命令 + 退出码 / Follow-up 列表 / SCOPE-EXPANSION (如有)
===== END STAGE-4 SUMMARY =====
```
```
===== BEGIN STAGE-4 DIFF =====
[`git diff` 完整文本，仅修复部分]
===== END STAGE-4 DIFF =====
```

```
===== BEGIN STAGE-3 REVIEW =====
[PASTE STAGE-3 REVIEW HERE]
===== END STAGE-3 REVIEW =====
```
===== END STAGE-4-IMPLEMENTER PROMPT =====
````

**Artifact**：SUMMARY + DIFF + 全绿 `./tasks.sh validate` + follow-up 清单。
**Stop**：`./tasks.sh validate` 绿 + 所有 🔴 处理 + 所有 🟡 处理（修或 tracked follow-up）。

---

## Simplification

本 workflow 不提供显式降级 mode flag；默认即完整 4 阶段。

**何时不该走本 workflow**（走 [AGENTS.md](../AGENTS.md)「何时不用 workflow」直接编辑）：
- 单 typo / 单行文案改动
- 已熟模块小改动、不动公共 API
- 已写过 3+ 次的同类模式

降级路径不存在；要么走完整 4 阶段，要么走 AGENTS.md「何时不用 workflow」，不存在中间档。
