---
name: wf-red-team
description: 4-stage adversarial workflow for high-risk surfaces — PLANNER threat-models, IMPLEMENTER implements + negative tests, RED-TEAMER red-teams independently, IMPLEMENTER hardens.
argument-hint: '[preset] <task>'
disable-model-invocation: true
user-invocable: true
---

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

高风险面改动（auth / credential / permission / state 文件 / 契约 / 跨端边界）拆成 4-stage 反方扫雷：PLANNER 建威胁模型与防御方案 → IMPLEMENTER 实现并补 negative 测试 → RED-TEAMER 切换红队视角找绕过 → IMPLEMENTER 加固并把每条 🔴 钉在失败测试上。核心差异于 `wf-coding-relay`：**Stage 3 强制反方 review**——不验"正向行得通"，只问"我作为攻击者 / 状态污染者 / 上游故障源能不能让它崩 / 越权 / 泄露 / 静默丢数据"。

## Orchestration

- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节；默认 `claude-codex`；`custom` (`--planner=<m> --implementer=<m> --red-teamer=<m>` 缺任一 fail-fast)
- **role slots**: PLANNER / IMPLEMENTER / RED-TEAMER；Stage 3 (RED-TEAMER) input 仅含 STAGE-1 PLAN + STAGE-2 DIFF，**不含** STAGE-2 SUMMARY
- **特有约束**: Stage 3 红队视角（不奖励防御充分性、只输出"我能怎么让它出事"）；Stage 4 每 🔴 **1:1 配 negative 测试**（红 → 复现攻击；绿 → 攻击被挡）
- 通用调度行为（优先级 / fresh subagent / dispatch ledger / worktree 隔离 / single-role preset 例外）→ [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-red-team [preset] [--mode=<simplification>] <task>`

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制为 dispatch payload。

## When to use / Skip if

**用**：触及凭证 / token / admin / hook 权限边界；状态文件读写、session id 生成、replay 防御；CLI / JSON 契约中带语义的字段（认证、引用、外部输入）；第三方 API 边界、跨端 (`src/gateway/ui/` ↔ Node.js) 信任边界。

**跳过**：单纯新功能 / 重构、不动安全相关面 → `wf-coding-relay`；大重构 → `wf-convoy-refactor`；疑难 bug → `wf-incident-rescue`；文档 → `wf-coauthor-doc`。

**降级**：本 workflow 不提供 mode；详见 Simplification 段。

---

## Stages

### Stage 1 — PLANNER（威胁模型 + 防御方案）

````
===== BEGIN STAGE-1-PLANNER PROMPT =====
基于以下需求与本仓 AGENTS.md + `docs/agents-governance.md`，以**威胁视角**（而非功能视角）组织方案：

**决策门**：需求是否含阻断性歧义 / 未明示的信任假设？
- 有 → **只输出澄清问题**（3-5 项，含信任假设澄清），停止
- 无 → 直接输出完整方案

方案输出（仅在无阻断歧义时）：
1. **威胁面与信任边界**：受影响输入源 / 信任级别（用户 / 文件 / 网络 / 跨端 IPC）；明示**信任假设**（哪些默认可信 / 哪些必须验证）
2. **滥用路径枚举** ≥ 3 条：每条标可能性（high/med/low）+ 冲击（critical/high/med）。**likelihood/impact 仅用于 Stage 1 设计排序，与 Stage 3 的 🔴/🟡/🟢 是独立体系**
3. **防御方案**：1 段主线 + 2-4 个关键防御决策（入口最早可拒绝点、最小权限、失败封闭、可审计）
4. **替代方案** ≥ 1 + 排除原因
5. **依赖评估**：新增依赖每条带候选 + 选择 + 排除原因；额外审视依赖自身安全历史
6. **文件结构**：新建 / 修改清单，标出**信任边界穿越点**
7. **Negative 测试设计**：每条 🔴 滥用路径必须配一条对应失败测试（红 → 修 → 绿），列测试名 + 期望（拒绝 / 抛错 / 不副作用）
8. **Phase 分解**：每 Phase 改动文件 / 并发可能 / 独立验证命令
9. **风险点** ≤ 3 条按可能性排序，**含残留风险**（修完后仍存在但已知/可接受的）
10. 自审 3 条：规格覆盖 / 类型一致性 / 路径一致性
11. 验收链回 `./tasks.sh validate`（必要时加项目自定 test / typecheck）

不引入"运行时绕过 / feature flag 兜底"妥协路径。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE REQUIREMENT + AFFECTED SUBSYSTEMS HERE]
===== END STAGE-1 REQUIREMENT =====
```
===== END STAGE-1-PLANNER PROMPT =====
````

**Artifact**：澄清清单 或 完整方案（11 项，重点 #2 滥用路径与 #7 negative 测试 1:1 映射）。
**Handoff to Stage 2**：每条滥用路径有对应 negative 测试 design + 所有路径 / 命令 / API 能在仓库中验证存在。

### Stage 2 — IMPLEMENTER（Phase A 校验 + Phase B 实现 + negative 测试）

````
===== BEGIN STAGE-2-IMPLEMENTER PROMPT =====
本任务在**高风险面**。两阶段执行：

**Phase A — 方案对仓库的可执行性校验（不写代码）**：
1. 读方案提到的所有现有文件，确认目录 + API + 信任边界假设与方案一致
2. 列出将修改 / 新建的文件清单
3. 标 **DEVIATION** 或 **BLOCKED**（含 why + 回 Stage 1 具体问题）
4. **额外**：核验方案 #2 每条滥用路径都能在当前代码 OR 方案声明的新文件中映射到对应入口（两者都缺则 BLOCKED）
5. 输出 Phase A 结果块，停等 `Phase B GO` / `back to Stage 1`

**Phase B — 实现**：
1. **先写所有 negative 测试**（红 = 复现攻击），再写防御实现（绿 = 攻击被挡）
2. 不扩范围 / 不为方便放宽信任假设
3. 输入校验放在**入口最早可拒绝点**，不在深层逻辑兜底
4. 失败封闭：异常路径默认拒绝 / 不副作用 / 不静默吞错
5. 收口跑 `./tasks.sh validate`
6. 发现 adjacent 修改超方案 → 标 **SCOPE-EXPANSION**（文件 + why），停等裁定

输出格式：

Phase A 后：
```
===== BEGIN STAGE-2 PHASE-A RESULT =====
Phase A 结论: PASS / DEVIATION / BLOCKED + 原因
目标修改文件清单: [...]
与方案对照偏差: [...]
滥用路径在代码中的对应入口: [path1 → file:line, ...]
===== END STAGE-2 PHASE-A RESULT =====
```

Phase B 后两个块：
```
===== BEGIN STAGE-2 SUMMARY =====
修改摘要 / 修改文件列表 / Negative 测试清单 (test name ↔ 对应滥用路径)
验证命令 + 退出码 / SCOPE-EXPANSION (如有)
===== END STAGE-2 SUMMARY =====
```
```
===== BEGIN STAGE-2 DIFF =====
[`git diff` 完整文本 — Stage 3 红队 review 的必需输入]
===== END STAGE-2 DIFF =====
```

不引入运行时 feature flag 兜底未实现的防御。

```
===== BEGIN STAGE-1 PLAN =====
[PASTE STAGE-1 PLAN HERE]
===== END STAGE-1 PLAN =====
```
===== END STAGE-2-IMPLEMENTER PROMPT =====
````

**Artifact**：PHASE-A RESULT + SUMMARY + DIFF。
**Handoff to Stage 3**：Phase B 完成 + `./tasks.sh validate` 绿 → 传 STAGE-2 DIFF（**不含 SUMMARY**）给 Stage 3。

### Stage 3 — RED-TEAMER（fresh subagent，攻击者视角）

````
===== BEGIN STAGE-3-RED-TEAMER PROMPT =====
你是**红队 reviewer**——不是合规审计师，是想方设法让这段代码崩 / 越权 / 泄露 / 静默丢数据的对手。不要重新实现，也不要奖励防御充分性；只输出"我能怎么让它出事"。

**独立性约束**：本 prompt 含 plan + diff；IMPLEMENTER summary 不在 context——基于 diff 形成独立红队 review，避免被自评偏置。

红队视角清单（每条至少尝试一次）：
1. **输入毒化**：恶意 / 异常输入（超长 / 控制字符 / Unicode 同形 / null byte / path traversal / 引号注入）能否到达深层逻辑？校验是否真在入口最早可拒绝点？
2. **信任边界越权**：能否绕过 auth / admin token？凭证比对是否 constant time？错误消息是否泄露用户存在性 / token 形状？
3. **状态文件污染**：状态文件被改成异常内容（缺字段 / 类型错 / 循环引用 / 巨大值）会怎样？读路径是否有 schema 校验？
4. **TOCTOU / 并发**：两次读之间状态被改怎么办？同 session 并发写是否互踩？锁 / 原子操作覆盖关键不变量？
5. **失败模式**：依赖（fs / network / 子进程）抛错时是否**失败封闭**？还是 fall back 到"宽松默认"？
6. **错误信息泄露**：日志 / stderr / JSON error payload 是否含敏感数据（token / 路径 / 内部结构）？
7. **跨端污染**：跨 (`src/gateway/ui/` ↔ Node.js) 边界数据两侧都被信任？UI 字符串是否被当作可信 path / command？
8. **Negative 测试覆盖**：方案声称的每条滥用路径，diff 里是否真有对应失败测试？测试是否真验"行为"（被拒绝 / 抛错 / 不副作用）而非只验路径走过？
9. **残留风险与新引入风险**：本次防御是否引入新攻击面（新依赖供应链 / 新日志 sink / 新 IPC 端点）？

输出按严重度分级，每条含 file:line + **攻击复现描述**：
- 🔴 必须修改（阻断合并）+ 可触发场景（"如果 X 输入 Y 则 Z"）
- 🟡 建议修改（合并前修 或 tracked follow-up，**不允许只留 TODO**）
- 🟢 可以接受 / 残留风险声明

**总结部分额外答**：本 review 范围外的攻击面？哪些防御"看起来在挡"实则可绕过？

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
===== END STAGE-3-RED-TEAMER PROMPT =====
````

**Artifact**：分级清单 + file:line + 攻击复现描述 + 范围外攻击面声明。
**Handoff to Stage 4**：任一 🔴 必须进 Stage 4 加固；🟡 视范围决定。

### Stage 4 — IMPLEMENTER（加固 + 每条 🔴 配 negative 测试）

````
===== BEGIN STAGE-4-IMPLEMENTER PROMPT =====
按红队 review 清单修代码：
1. **所有 🔴 必改**，**且每条 🔴 必配一条对应 negative 测试**——先写测试（红 = 复现攻击），再改实现（绿 = 攻击被挡）
2. 🟡 处理（**不允许只留 TODO**）：本次直接修 OR tracked follow-up（含 file:line + 描述 + 责任人 + 残留风险等级）
3. 🟢 跳过；若是"残留风险"类，在 SUMMARY 中显式声明
4. 收口跑 `./tasks.sh validate`

例外：修 🔴 时发现必要 adjacent 同类漏洞（如同类校验缺口在相邻函数）→ 标 **SCOPE-EXPANSION**，停等裁定。

输出两个块：
```
===== BEGIN STAGE-4 SUMMARY =====
🔴 已处理: [item ↔ 修 commit/file ↔ 对应 negative 测试名]
🟡 已处理: [item ↔ 修 或 follow-up ID]
🟢 跳过 / 残留风险声明: [...]
验证命令 + 退出码 / Follow-up 列表 / SCOPE-EXPANSION (如有)
===== END STAGE-4 SUMMARY =====
```
```
===== BEGIN STAGE-4 DIFF =====
[`git diff` 完整文本，仅加固部分]
===== END STAGE-4 DIFF =====
```

```
===== BEGIN STAGE-3 REVIEW =====
[PASTE STAGE-3 RED-TEAM REVIEW HERE]
===== END STAGE-3 REVIEW =====
```
===== END STAGE-4-IMPLEMENTER PROMPT =====
````

**Artifact**：SUMMARY + DIFF + 全绿 `./tasks.sh validate` + 每条 🔴 ↔ negative 测试映射 + follow-up 清单。
**Stop**：`./tasks.sh validate` 绿 + 所有 🔴 处理且配测试 + 所有 🟡 处理（修或 tracked follow-up）+ 残留风险显式声明。

---

## Simplification

本 workflow 不提供显式降级 mode flag；默认即完整 4 阶段。

**高风险面降级硬门**：凭证 / 权限 / 状态文件 / 跨端信任边界改动**禁止降级**——任何"小行数高影响"组合（如 token 验证 40 行）都必须走完整 4 段。

**何时不该走本 workflow**：
- 单 typo / 文案 → 直接改
- 不触及凭证 / 权限 / 状态 / 跨端 → 改走 `wf-coding-relay`

降级路径不存在；要么走完整 4 阶段，要么走其他 workflow，不存在中间档。
