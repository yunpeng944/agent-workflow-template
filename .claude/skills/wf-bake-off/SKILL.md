---
name: wf-bake-off
description: 3-stage A/B selection — CRITERIA-LOCKER locks mechanical criteria, PROTOTYPER builds A/B in parallel, SCORER scores strictly by Stage 1 criteria.
argument-hint: '[preset] [--mode=<name>] <task>'
disable-model-invocation: true
user-invocable: true
---

<!-- generated · do not edit · source: skills/wf-bake-off.md -->

## Goal

架构 / 框架 / 库 / 性能策略选型拆成 **CRITERIA-LOCKER → PROTOTYPER (A & B 平行) → SCORER 接力 3 段**：CRITERIA-LOCKER 锁胜出判据（机械化 + 主观维度加权 + 否决条件）→ PROTOTYPER 平行做 **A 与 B 两个最小 prototype**（同 scope、独立 fresh subagent、字符级相同 prompt 仅占位符替换）→ SCORER 仅基于 Stage 1 判据评分 + 推荐 + 残留风险。核心差异于 `wf-coding-relay`：**胜出判据必须在 Stage 1 锁死**，Stage 3 不许 invent 新维度——否则就是 reverse-engineering 偏好投票。

## Orchestration

- **5 preset (默认 claude-codex)**：claude-codex / claude-claude / codex-claude / codex-codex / custom (`--criteria-locker=<m> --prototyper=<m> --scorer=<m>` 缺任一 fail-fast)
- **调度优先级**：CLI (`claude -p` / `codex exec`) → host subagent (Claude Code `general-purpose` / `codex:codex-rescue`) → fail-fast
- **role slots**: CRITERIA-LOCKER (Stage 1) / PROTOTYPER (Stage 2，A/B 各 dispatch 一次同 model 独立 subagent) / SCORER (Stage 3)
- **evaluator stage**: Stage 2 PROTOTYPER A/B 互为 evaluator 平行 dispatch；Stage 3 SCORER fresh subagent，严格按 Stage 1 criteria 禁止 invent 新维度
- **特有约束**: **判据冻结**（Stage 1 完后不许回改，除非 Hard Constraint 漏写要 version bump + 重跑相关测量）；**A/B prompt 字符级一致**（同 fixture，仅末尾 `[CANDIDATE_NAME]` 占位符替换）；**SCORER 评分只用 raw metrics + proxy 证据**，Implementation Summary / Caveats 是上下文不是评分依据；**同产品 preset 警告在 Stage 2 dispatch 前打印**（Stage 1 仅锁判据不依赖跨厂商）
- 详细 model 映射 / host-specific routing / worktree 隔离 / 调度执行约束 / dispatch ledger / 同产品 preset 警告触发时机 → [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-bake-off [preset] [--mode=<simplification>] <task>`

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制。**`--prototyper` 只一个 slot**——A/B 两 prototype 用**同 model 但独立 subagent**（bake-off 公平性要求）。可选 run dir：`.wf-runs/<ISO-timestamp>-bake-off/`。

## When to use / Skip if

**用**：架构 / 框架 / 库 / build 工具 / 数据存储 / 通信协议选型；性能策略对比；跨子系统 schema 形态对比；决策**难回退**或**影响面大**——一旦写进代码会拖累 N 个后续决策。

**跳过**：单候选实现 / 候选只是稻草人 → `wf-coding-relay`；已在用 A 只想换 B（migration）→ `wf-convoy-refactor`；选型已定要落地 → `wf-coding-relay`；高风险面带选型成分 → 先 `wf-bake-off` 选型、再 `wf-red-team` 加固。

**降级**：两候选都熟、决策可逆 → `paper-bakeoff`；A 看起来明显更好但需 sanity check → `single-prototype-poc`。

---

## Stages

### Stage 1 — CRITERIA-LOCKER（锁定胜出判据）

````
===== BEGIN STAGE-1-CRITERIA-LOCKER PROMPT =====
先**不要**说哪个更好。本 stage 产物是**评估标准**——Stage 2 prototype 跑出结果后**判据不许修改**。

**反 reverse-engineering 原则**：你不知道两边 prototype 会跑成什么样；把判据设计成能在不知结果的情况下**机械应用**。

输出格式（**所有 section 必填**——任一缺失会让 Stage 3 评分失去客观锚点）：

```
===== BEGIN STAGE-1 BAKEOFF-CRITERIA =====
## Scope
本次选型决定什么？范围边界？哪些**不在**本次内？

## Candidates
- **A**: 名称 + 一句话定义 + 主要参考资料链接
- **B**: 同上
- （≥ 3 候选先说明为什么不分轮 pairwise——本 workflow 默认两候选）

## Hard Constraints (Veto Conditions)
任一候选触发任一条直接淘汰，每条**机械可判**：
- [如 "license 与 GPL 兼容"，`npm view <pkg> license` 检查]
- [如 "支持 Node 22+ ESM"，读 package.json `engines`]
- [如 "build time < 5s on M2 Air"，跑 benchmark]

## Mechanical Metrics (Objective Dimensions)
跑 benchmark 能产出数字的维度，每条：维度名 / 测量命令 / **加权（0-100，本节加权和默认 ≤ 70**——给主观维度留 ≥ 30%）。
**豁免条件**：若 Scope 段显式声明"本次选型完全机械可量化（典型：纯性能基准 / 容量极限 / 单指标驱动）"，本节可放宽至 100、主观维度可为 0；豁免必须在 Scope 段写明理由：
- [如 "smoke test 通过率，weight 20"]
- [如 "依赖树大小，weight 10"]
- [如 "build 时间 p50，weight 15"]

## Subjective Dimensions (Judged Dimensions)
机械化盖不全的维度，每条：维度名 / **可观察 proxy** / **加权（0-100，本节加权和 = 100 - 机械化加权和；若机械化走豁免至 100，本节可为 0）**：
- [如 "API 表面易用度，weight 10，proxy: 同样功能的客户端代码行数 / 概念数"]
- [如 "异常路径清晰度，weight 10，proxy: 错误从源头到处理点的层数 / 类型是否结构化"]
禁止维度："好用" / "优雅" / "现代" / "推荐" 这类 unfalsifiable 形容词。

## Scoring Rubric
机械化维度：测量值 → 归一化 0-100 函数（如 "小于 X 得 100、大于 Y 得 0、线性插值"）。
主观维度：1-5 量表 + 每档**可观察判据**（如 "5 = 客户端代码 ≤ 10 行 / 4 = 11-20 行 / ..."）。
最终分 = Σ(归一化分 × 加权 / 100)。

## Tiebreaker
分差 ≤ 5 分如何决定？

## Anti-Patterns
评分时**不许做**：
- 不许引入 Stage 1 未列的维度 / 不许重新加权 / 不许修 Scoring Rubric / 不许引"团队偏好"作决胜票
===== END STAGE-1 BAKEOFF-CRITERIA =====
```

约束：所有维度先于 Stage 2 prototype 完成——不许根据"我觉得 A 会赢"反推权重；不用"行业默认 / 众所周知"等没具体来源的断言；候选 = 2 默认，≥ 3 在 Scope 段说明分轮。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE: 选型场景 / 候选清单 / 已知约束 / 决策影响面]
===== END STAGE-1 REQUIREMENT =====
```
===== END STAGE-1-CRITERIA-LOCKER PROMPT =====
````

**Artifact**：STAGE-1 BAKEOFF-CRITERIA 块（7 个 section 全填，机械化加权和 ≤ 70 且总和 = 100）。
**Handoff to Stage 2**：criteria 完整 + 加权合规 + Hard Constraints / Mechanical Metrics 全机械可判。**此后不许回改 criteria**——除非 Stage 2 发现某候选无法启动到跑 benchmark（Hard Constraint 漏写）才能补一条 Hard Constraint。**补 Hard Constraint 后果**：criteria 版本必须 bump（`criteria-v1` → `criteria-v2`），对**所有候选**重跑相关 Stage 2 测量（受新约束影响的维度）——否则 A/B 评分基线不一致。

### Stage 2 — PROTOTYPER（A/B 平行 fresh subagent，同 scope）

> **本 stage dispatch 两次**：A、B 各起一个**独立 fresh subagent**，prompt 字符级相同（只候选名占位符替换）。**不要在同一 subagent 中先做 A 再做 B**——会造成实现偏置。同 fixture 调两次 `codex exec`/`claude -p`，唯一差异是末尾 `[CANDIDATE_NAME]` 替换为 `A` 或 `B`。

````
===== BEGIN STAGE-2-PROTOTYPER PROMPT =====
本 session 只为**候选 [CANDIDATE_NAME]** 工作。**不要**讨论另一候选 / 不要对比 / 不要暗示偏好——忠实实现并跑 benchmark。

**核心约束**：
- prototype scope 与平行的另一候选**完全相同**（功能集、I/O 形态、benchmark 输入）——bake-off 公平前提
- **不许优化你这边**：不加只对本候选有利的 feature；不偷砍只对本候选不利的 corner case
- 上限：**≤ 500 行 / ≤ 4 小时**。超出说明 scope 太大或本候选不适配 → **报 BLOCKED-OVER-BUDGET 而非继续**

执行步骤：
1. 通读 Stage 1 BAKEOFF-CRITERIA，确认 Mechanical Metrics 测量命令——为本候选**至少跑一次**这些命令并记原始输出
2. 实现本候选最小 prototype（scope = Stage 1 Scope 段定义；不多不少）
3. 跑 Hard Constraints 检查——任一不通过 → 输出 VETOED 并停止
4. 跑 Mechanical Metrics 所有测量命令，记原始输出 + 测量条件（机器 / Node 版本 / 输入大小）
5. 为主观维度收集 **proxy 证据**——不许打分（评分是 Stage 3 工作），只列证据：
   - 如 "API 易用度 proxy = 客户端代码行数" → 列实际客户端代码 + 行数
   - 如 "生态健康度 proxy = 近 12 月 commit 数" → 跑 `git log --since='12 months ago' --oneline | wc -l` 记数

输出格式（**严格按下列结构**）：

```
===== BEGIN STAGE-2 PROTOTYPE-[CANDIDATE_NAME] =====
## Status
COMPLETED / VETOED / BLOCKED-OVER-BUDGET

若 BLOCKED-OVER-BUDGET：列"已写行数 / 预算行数 / 已耗小时 / 预算小时 / 卡住的具体子问题"，本块到此结束
若 VETOED：填完 Hard Constraints Check 段后到此结束、其余段省略

## Implementation Summary
2-3 行实现摘要 + scope 边界声明（"实现了 X / Y，**没**实现 Z 因为 Stage 1 Scope 排除"）

## Files
prototype 文件清单 + 总行数（必须 ≤ 500）

## Hard Constraints Check
- [constraint 1]: PASS / VETOED + 测量原始输出
- ...
若任一 VETOED → Status 改为 VETOED、本块到此结束

## Mechanical Metrics Raw
每条维度**原始测量输出**（不归一化、不打分）：
- [metric 1]: 命令 + 输出 + 测量条件
- ...

## Subjective Dimension Proxies
每条主观维度**可观察证据**（不打分、不评价）：
- [dim 1]: proxy 证据原文
- ...

## Caveats
实现期间发现但**没改 scope** 的注意点。不是建议修 criteria——除非 Stage 1 漏写 Hard Constraint，那种情况报 BLOCKED 让用户裁定。
===== END STAGE-2 PROTOTYPE-[CANDIDATE_NAME] =====
```

```
===== BEGIN STAGE-2 PROTOTYPE-DIFF-[CANDIDATE_NAME] =====
[完整 prototype 源码 diff / 或 prototype 仓库 commit SHA + 关键文件 cat]
===== END STAGE-2 PROTOTYPE-DIFF-[CANDIDATE_NAME] =====
```

约束：不引入未在 Stage 1 Scope 中的功能；不偷砍 corner case；不打分 / 不下结论；不与另一候选对比；遇 Hard Constraint VETOED 不挽救——直接停止报告。

```
===== BEGIN STAGE-1 BAKEOFF-CRITERIA =====
[PASTE STAGE-1 CRITERIA HERE]
===== END STAGE-1 BAKEOFF-CRITERIA =====
```

**当前候选**: [CANDIDATE_NAME]
===== END STAGE-2-PROTOTYPER PROMPT =====
````

**Artifact**：每候选各产 `STAGE-2 PROTOTYPE-[NAME]` + `STAGE-2 PROTOTYPE-DIFF-[NAME]`；VETOED 只产 Status + Hard Constraints Check；BLOCKED-OVER-BUDGET 只产 Status + 预算诊断。
**Handoff to Stage 3**：

- 双方 COMPLETED → 两份 PROTOTYPE + 两份 DIFF 都传 Stage 3
- 一方 VETOED 一方 COMPLETED → 两份都传，Stage 3 走单候选 sanity check 路径
- 双方 VETOED 或一方 BLOCKED-OVER-BUDGET → **不**进 Stage 3，回 Stage 1 重审 criteria / 候选 / Scope
- 任一 case 都**不**先 paste 自己 Caveats 推断给 Stage 3

### Stage 3 — SCORER（fresh subagent，严格按 Stage 1 判据评分）

````
===== BEGIN STAGE-3-SCORER PROMPT =====
**严格使用 Stage 1 BAKEOFF-CRITERIA**——引入 Stage 1 未列维度 / 改加权 / 修 Scoring Rubric / 引用"团队偏好"等都被视为评分作弊。

**反 reverse-engineering 提醒**：你看到 prototype 后可能下意识被某候选风格吸引——识别这种偏置；**评分只用 Stage 2 提供的 raw metrics + proxy 证据**，Implementation Summary / Caveats 是上下文不是评分依据，不得受其措辞 / 语气 / 自吹影响。

执行步骤：
1. 先看 Stage 2 输入 **Status 字段**：
   - 双方 COMPLETED → 进正常评分流程（步骤 2-6）
   - 一方 VETOED、另一方 COMPLETED → Winner = COMPLETED 方；**仍**填 Score Table（只填 COMPLETED 方）+ Hard Constraint Check（标 VETOED 方原因）+ Rationale；跳过分差 / Tiebreaker
   - 双方 VETOED → Winner = NONE-BOTH-VETOED，给"回 Stage 1 修订 criteria 或更换候选"建议；不评分
2. 核对 Stage 1 所有维度是否在 Stage 2 输出中都有对应原始数据
   - 维度数据缺失 → 标 INCOMPLETE 并停止本维度评分；不允许"估算"
3. 对每条 Mechanical Metric 套 Scoring Rubric 归一化函数 → 0-100 分
4. 对每条 Subjective Dimension 用 Stage 1 的 1-5 量表 + Stage 2 proxy 证据打分 → 归一化 0-100
5. 加权求和 → 总分
6. 若分差 ≤ 5：套 Tiebreaker
7. 给推荐 + 推理 + **不选 loser 的具体原因**（必须 cite 评分项，不许"感觉不如"）+ 残留风险

输出：
```
===== BEGIN STAGE-3 SCORECARD =====
## Score Table
| Dimension | Weight | A raw → norm | B raw → norm | A weighted | B weighted | Notes |
| ... | ... | ... | ... | ... | ... | ... |
| **Total** | 100 | — | — | **<A_total>** | **<B_total>** | — |

## Hard Constraint Check
- A: PASS / VETOED
- B: PASS / VETOED

## Incomplete Dimensions
- [dim] missing because Stage 2 [候选] 没跑 [命令] —— 阻断性，需回 Stage 2 补再决（除非另一方已 VETOED）

## Winner
[A | B | TIE-AFTER-TIEBREAKER | INCOMPLETE]

## Rationale
3-5 句话，cite 评分表具体行 / 数据。

## Why Not [Loser]
loser 在哪些维度被压（具体行 / 具体差值）+ 不可被 future improvement 弥补的结构性短板（如有）。

## Residual Risks
推荐方在 Stage 1 未覆盖维度上的潜在风险，**纯声明式 follow-up**（"以下风险本次评分未考量"）。
**约束**：本段不允许暗示需重跑 bake-off / 不允许成为修改 Winner 决策的依据；若发现 Stage 1 真有重要遗漏维度足以颠覆决策，**明示回 Stage 1 修订**（在 Recommendation 段建议触发条件）而非含蓄影响推荐。
===== END STAGE-3 SCORECARD =====
```

```
===== BEGIN STAGE-3 RECOMMENDATION =====
推荐: [候选名 | NONE-BOTH-VETOED]
下一步建议 workflow: [wf-coding-relay 落地 / wf-convoy-refactor 迁移 / wf-red-team 加固 / 重跑 wf-bake-off]
仅以下条件之一触发"重跑 wf-bake-off"：
- 双方 VETOED（criteria 设计错误，必须重订）
- Residual Risks 中识别的某条遗漏维度**经验证**足以颠覆当前 Winner（需 cite 具体证据）
- 一方 INCOMPLETE 且无法在 Stage 2 内补齐
其他情况不允许提"重跑 wf-bake-off"——决策已基于 Stage 1 锁定 criteria 完成，新维度只能进 follow-up
===== END STAGE-3 RECOMMENDATION =====
```

约束：不引入新维度；不修加权；不引用"经验 / 行业实践 / 团队偏好"作评分依据；Residual Risks 只声明不补打分。

```
===== BEGIN STAGE-1 BAKEOFF-CRITERIA =====
[PASTE STAGE-1 CRITERIA HERE]
===== END STAGE-1 BAKEOFF-CRITERIA =====
```

```
===== BEGIN STAGE-2 PROTOTYPE-A =====
[PASTE]
===== END STAGE-2 PROTOTYPE-A =====
```

```
===== BEGIN STAGE-2 PROTOTYPE-B =====
[PASTE]
===== END STAGE-2 PROTOTYPE-B =====
```
===== END STAGE-3-SCORER PROMPT =====
````

**Artifact**：SCORECARD（score table + Hard Constraint + Winner + Rationale + Why Not + Residual Risks）+ RECOMMENDATION（含下一步 workflow）。
**Stop**：Winner = INCOMPLETE → 回 Stage 2 补缺失维度；有效 winner → 带 RECOMMENDATION 进下一步 workflow 落地。

---

## Simplification

- **`full-bakeoff`**：3 阶段（默认）。架构 / 框架 / 数据存储等难回退决策
- **`paper-bakeoff`**：Stage 1 + Stage 3，跳 Stage 2 prototype。用纸面材料替代（已有 prototype / 文档 / 公开 benchmark）。适用：两候选都熟、可逆、prototype 成本 > 决策成本。**Stage 3 输入格式**：仍按 `STAGE-2 PROTOTYPE-[NAME]` 块结构包装纸面材料——Status 填 `COMPLETED-PAPER`、Implementation Summary 写"基于既有 X 文档 / Y 公开 benchmark / Z 旧 prototype"、Files 写"n/a (paper)"、Mechanical Metrics Raw 引用文档原文 + URL、Subjective Dimension Proxies 同上；Stage 3 评分逻辑不变，Rationale 段需声明数据来源
- **`single-prototype-poc`**：Stage 1 + Stage 2 单候选 (A) + 简化 Stage 3（"A 是否过基本线"判定，B 作 theoretical fallback）。适用：A 看起来明显更好但需 validate；B 不值得投入

降级 3 维度：**回退成本**（低 → paper-bakeoff；中高 → full-bakeoff）/ **prototype 可行性**（≤ 500 行能实现 → prototype；不能 → paper-bakeoff）/ **候选熟悉度**（双方都熟 → paper-bakeoff；至少一方陌生 → 必须 prototype）。
