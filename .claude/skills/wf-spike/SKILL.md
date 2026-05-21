---
name: wf-spike
description: 3-stage exploration — PROBE-DESIGNER collapses open questions to ≤3 observable probes, EXPLORER runs throwaway experiments (≤500 LOC, /tmp), SYNTHESIZER answers + 4-state decision.
argument-hint: '[preset] [--mode=learning-only] <task>'
disable-model-invocation: true
user-invocable: true
---

<!-- generated · do not edit · source: skills/wf-spike.md -->

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

开放问题 / 不熟领域 / 概念验证类任务拆成 **PROBE-DESIGNER → EXPLORER → SYNTHESIZER 接力 3 段**：PROBE-DESIGNER 把开放问题收敛为 ≤ 3 个**可观察**子问题 + 最小实验设计 → EXPLORER 在隔离环境跑实验（≤ 500 LOC spike code 写在 `/tmp`，丢弃式），只观察不下结论 → SYNTHESIZER 综合给每子问题 YES/NO/INCONCLUSIVE + 4 态决策（CONTINUE-TO-CODING-RELAY / SWITCH-DIRECTION / NO-GO / NEED-MORE-PROBES）。**核心差异于 `wf-bake-off`**：bake-off 已锁候选锁判据，spike 是**候选 < 2 或判据不清的前置阶段**；与 `wf-coding-relay` 区别：coding-relay 要 PLAN，spike 阶段尚无规格。

## Orchestration

- **preset**: `<vendor1>-<vendor2>` 按 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节查；默认 `claude-codex`；`custom` (`--probe-designer=<m> --explorer=<m> --synthesizer=<m>` 缺任一 fail-fast)
- **调度优先级**：CLI (`claude -p` / `codex exec`) → host subagent (Claude Code `general-purpose` / `codex:codex-rescue`) → fail-fast
- **role slots**: PROBE-DESIGNER (Stage 1, A 段) / EXPLORER (Stage 2, B 段) / SYNTHESIZER (Stage 3, A 段)
- **evaluator stage**: Stage 2 (EXPLORER) fresh subagent，**worktree 强制**（执行前 `git worktree add /tmp/wt-spike-<run-id>` 并 `cd` 进去；Stage 2 输出 `git rev-parse --show-toplevel` 作为判定锚点）；Stage 3 (SYNTHESIZER) fresh subagent，input = STAGE-1 PROBES + STAGE-2 OBSERVATIONS（**不含** EXPLORER 自评 / Caveats / Self-Narrative）
- **特有约束**: **问题收敛硬约束**（PROBE-DESIGNER 必输 ≤ 3 个**可观察**子问题，禁止 "X 是否好用 / 优雅 / 现代" 这类 unfalsifiable 措辞）；**代码可丢弃**（spike code 强制 `/tmp/spike-<topic>/`，**不许 git add / apply 到主仓**，Stage 2 收尾必输 `git status --short` 证明无 spike 文件进入 worktree / 主仓）；**LOC 上限机械可判**（spike code 总行数 ≤ 500，Stage 2 必输 `wc -l` 统计，超限即 ABORT）；**结论必含 NO-GO 选项**（SYNTHESIZER 不许只输出"继续做"）；**不许引入未声明依赖**（EXPLORER 用的 lib / framework 必须在 Stage 1 Background Constraints 中列出）
- 详细 model 映射 / host-specific routing / 调度执行约束 / dispatch ledger → [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-spike [preset] [--mode=<simplification>] <task>`

## When to use / Skip if

**用**：候选 < 2 或判据不清 / 不熟领域 / 概念验证（"X 能不能跑通 / X 性能 < Y 吗"）/ 摸清未文档化的内部模块。

**跳过**：≥ 2 明确候选 + 判据可机械化 → `wf-bake-off`；已有规格 + 1 个方案 → `wf-coding-relay`；失败现场要复现 / 二分 → `wf-incident-rescue`；要双盲诊断 → `wf-second-opinion`。

**降级**：不需跑代码就能答（纯读源码 / 文档） → `--mode=learning-only`（Stage 2 跑但禁止写 spike code，OBSERVATIONS 引证文档 / 源码）。

---

## Stages

### Stage 1 — PROBE-DESIGNER（收敛开放问题）

本 stage 产物是**实验设计**——把开放问题收敛为 ≤ 3 个**可观察**子问题。Stage 2 EXPLORER 只回答这 ≤ 3 个，**不许漫游**。

**决策门**：检查 input 是否已具体到不需 spike：
- 已有 ≥ 2 明确候选 + 判据可机械化 → 输出 `EXIT-TO-BAKEOFF` + 推荐 criteria 草图，停止
- 已有 1 个方案 + 规格 → 输出 `EXIT-TO-CODING-RELAY` + 推荐 PLAN 草图，停止
- 已有失败现场 → 输出 `EXIT-TO-INCIDENT-RESCUE`，停止
- 上述皆不满足 → 继续输出 STAGE-1 PROBES

输出格式（**所有 section 必填**）：

```
===== BEGIN STAGE-1 PROBES =====
## Open Question
≤ 3 行重述用户的开放问题；标出哪些是"未知 X 是否可行"vs"已知方向但不知效果"。

## Background Constraints
- **技术栈 / 不变量**：必须遵守的（如 "Node 22+" / "不引第三方网络服务"）
- **允许的依赖** ≤ 5 条：EXPLORER 仅可用这些 lib / framework / tool（未列在内即禁止引入）
- **Time Budget**：每子问题 ≤ X min（默认 60 min / 子问题），总预算明示

## Probes（≤ 3 个；用户明确单一子问题时输 1 个亦可）
每条**必须可观察**——禁止 "X 是否好用 / 优雅 / 现代" / "X 在团队接受度如何" 等 unfalsifiable 措辞。每条结构：
- **Question**: "X 能跑通吗" / "X p50 < 100ms 吗" / "X 内存峰值 < 500 MB 吗"
- **Measurement**: 测量方式（命令 + 输入 + 期望产出形态——exit code / 数字 / 字符串模式）
- **Probe Sketch**: 最小代码 / 操作骨架（≤ 30 行伪代码或步骤）
- **Success Criterion**: 什么观察对应 YES / NO / INCONCLUSIVE

## Out-of-scope
诱人但本 spike **不答**的问题（≥ 2 条）+ 排除原因。

## Exit Conditions（决策门转出 / 终止条件）
- 转 bake-off 触发：[什么探索结果 → 浮现 ≥ 2 候选 + 判据可定]（在 Stage 1 决策门即转 → 输出 `EXIT-TO-BAKEOFF`；Stage 3 综合后才浮现 → 在 SYNTHESIZER 给 SWITCH-DIRECTION 并标"下一步 workflow = wf-bake-off"）
- 转 coding-relay 触发：[什么观察 → 锁定方向 + 可写 PLAN]
- NO-GO 触发：[什么观察 → 整体不可行]
- NEED-MORE-PROBES 触发：[什么 INCONCLUSIVE 模式 → 需要新 probe 设计]
===== END STAGE-1 PROBES =====
```

约束：probe 数 ≤ 3（再多必拆 spike 两次）；每 probe 测量都用命令型锚点；不臆造 Background Constraints 中未声明的 lib / API；不在本 stage 推荐结论。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE: 开放问题 / 已知约束 / 已有候选（若有，列明）/ time budget（若指定）]
===== END STAGE-1 REQUIREMENT =====
```

**Artifact**：STAGE-1 PROBES 块（5 section 必填，probe ≤ 3 全可观察）或 EXIT-TO-\* 决策。
**Handoff to Stage 2**：PROBES 完整 + 所有 probe 测量命令明确 + Time Budget 写明 + Exit Conditions 列出。决策门转出则**不**进 Stage 2。

### Stage 2 — EXPLORER（fresh subagent，worktree 强制）

> **强制环境**：本 stage **必须**在 `git worktree add /tmp/wt-spike-<run-id>` 隔离的 worktree 内跑——**worktree 用于读取/验证仓库状态**（grep / find / 跑既有命令需仓库 context）。spike code **不写到 worktree**，写到独立的 `/tmp/spike-<topic>/`——**spike code 是丢弃式外部实验**，与仓库 working tree 解耦，避免被误 git add。Stage 2 输出 Environment 段必填**双路径**：worktree 路径（`git rev-parse --show-toplevel`）+ spike 路径（`ls /tmp/spike-<topic>/`），缺一即 fail。

本 session 是 spike 探索——**只观察、不下结论 / 不打分 / 不推荐方向**。结论是 Stage 3 SYNTHESIZER 的工作。

**核心约束**：
- 严格按 Stage 1 PROBES 的 ≤ 3 子问题逐个跑；**不漫游**、不跑 PROBES 未列出的额外实验
- spike code 写到 `/tmp/spike-<topic>/`，**不写到主仓 / worktree / 不 git add**——本 workflow 的 artifact 是观察，不是代码
- spike code 总行数 ≤ 500（`find /tmp/spike-<topic> -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.sh' \) | xargs wc -l`）；超限 → 报 `ABORT-OVER-LOC` 停止
- 仅可用 Stage 1 Background Constraints 列出的依赖；引入未列依赖即 ABORT
- 每子问题上限：Stage 1 Time Budget；超 → 报 `BLOCKED-OVER-BUDGET` 停止该 probe（保留已有观察），不继续硬怼
- **`learning-only` 模式特例**：禁止写 spike code（spike 路径下不许有任何文件）；Probe Results 的 Spike Code Reference 填 `n/a (learning-only)`，Raw Observations 引证文档原文 / 源码 file:line / 公开 benchmark URL，仍按 Measurement 跑可执行命令（如 `grep`、`man`、`rg`）记录原始输出

执行步骤：
1. 通读 Stage 1 PROBES
2. **对每个子问题**：
   a. 按 Probe Sketch 写最小 spike（写到 `/tmp/spike-<topic>/probe-N/`；`learning-only` 模式下跳过）
   b. 按 Measurement 跑命令，记**原始输出**（exit code / stdout / stderr / 测量条件——机器 / runtime 版本 / 输入大小）
   c. **不下结论 / 不评 YES/NO**（这是 Stage 3 工作）
3. 跑 LOC 统计与隔离校验：`wc -l` 累计 + `git status --short` 在 worktree 内（应无未跟踪 spike 文件）+ 主仓 `git status --short`（同样应空）
4. 全部 probe 结束（或 BLOCKED-OVER-BUDGET / ABORT-OVER-LOC）后输出报告

输出格式（**严格按下列结构**）：

```
===== BEGIN STAGE-2 OBSERVATIONS =====
## Status
COMPLETED / PARTIALLY-COMPLETED / BLOCKED-OVER-BUDGET / ABORT-OVER-LOC / NO-PROGRESS

若 BLOCKED-OVER-BUDGET：列"哪个 probe / 已耗 budget / 实际进度"
若 ABORT-OVER-LOC：列"累计 LOC / 超出条目 / 哪个 probe"
若 NO-PROGRESS：列卡住的具体子问题 + 不可逾越的障碍

## Environment
- 机器 / OS / runtime 版本
- spike 路径：/tmp/spike-<topic>/
- worktree 路径（必填）：`git rev-parse --show-toplevel` 输出
- spike LOC 统计：`wc -l` 累计数字（须 ≤ 500，`learning-only` 模式填 `0 (learning-only)`）
- 隔离校验：worktree `git status --short` 输出 + 主仓 `git status --short` 输出（皆应不含 spike 文件）

## Probe Results（每子问题一段）

### Probe-1: [Question]
- **Spike Code Reference**: /tmp/spike-<topic>/probe-1/ 主要文件清单（`learning-only` 模式填 `n/a (learning-only)`）
- **Measurement Commands Run**: 实际跑的命令（按顺序）
- **Raw Observations**: 原始输出（exit codes / 数字 / 文本片段；`learning-only` 模式引证 doc / source file:line / URL；**不**摘要、**不**解读）
- **Measurement Conditions**: 输入大小 / 重复次数 / 异常项
（不写 "我认为" / "看起来" / "应该" 这类断言）

### Probe-2: ...
### Probe-3: ...

## Anomalies
跑实验时遇到的**非预期**观察（与 PROBES 设计不符的现象）——只列事实，不解释。
===== END STAGE-2 OBSERVATIONS =====
```

约束：不下结论；不打分；不与其他候选对比；不引入 Stage 1 未列依赖；spike code 不入主仓 / 不入 worktree / 不 git add；spike LOC ≤ 500；不漫游到 PROBES 外的问题。

```
===== BEGIN STAGE-1 PROBES =====
[PASTE STAGE-1 PROBES HERE]
===== END STAGE-1 PROBES =====
```

**Artifact**：STAGE-2 OBSERVATIONS 块（Probe Results 逐条 + Raw Observations 不解读 + Environment 含 worktree 路径 / LOC / 隔离校验 + Anomalies）。
**Handoff to Stage 3**：OBSERVATIONS 完整 + 每 probe 有 Raw Observations + Environment 含 worktree `git rev-parse` 输出与 LOC 统计 + spike code 在 `/tmp/spike-<topic>/`（**不在** 主仓 / worktree）。BLOCKED-OVER-BUDGET / ABORT-OVER-LOC 也进 Stage 3——SYNTHESIZER 据残缺观察给 NEED-MORE-PROBES 决策。

### Stage 3 — SYNTHESIZER（fresh subagent，input 仅 PROBES + OBSERVATIONS）

综合 Stage 1 PROBES + Stage 2 OBSERVATIONS，回答每子问题 + 给 4 态综合决策。

**核心约束**：
- input 仅 PROBES + OBSERVATIONS——**不**读 EXPLORER 的 Caveats / Self-Narrative（防"我喜欢这个所以它好"污染）
- 任何 INCONCLUSIVE 必须给"什么新探索能转 YES/NO"——**不许只摆烂**
- SWITCH-DIRECTION 必须给具体新方向（≥ 1 个）+ 排除原方向的反证 cite
- NO-GO 必须 cite Raw Observations 作为反证；不接受"看起来不可行"的空洞理由
- Learning Notes 每条必 cite 至少一个 probe / 命令 / 文件或观察；空泛"模式 / 反模式"无锚点的条目须删除

执行步骤：
1. 对每子问题：YES / NO / INCONCLUSIVE 判定 + **每条 cite Raw Observations**（命令输出 / 数字 / 异常）
2. 综合决策（**必选 1 个 4 态**）：
   - **CONTINUE-TO-CODING-RELAY**: 推荐继续 → 给 coding-relay 的 PLAN 草图（≤ 10 行：目标 / 主要方法 / 验收）+ **不可复用 spike 代码清单**（哪些 `/tmp/spike-<topic>/` 文件不可直接 import / copy 到主仓，原因如 "用了假数据"/"绕过了校验"）+ **可复用观察清单**（哪些数字 / API 调用 pattern 可作 PLAN 输入）
   - **SWITCH-DIRECTION**: 原方向被否 → 给新方向 + 排除原方向的反证（若新方向浮现 ≥ 2 候选 + 判据可定，下一步 workflow 标 `wf-bake-off`）
   - **NO-GO**: 整体不可行 → 给反证 + 列"什么前置条件变化才会重新可行"
   - **NEED-MORE-PROBES**: 信息不足 → 列 ≤ 3 个新 probe 设计（按 Stage 1 同格式）
3. 学习要点：≤ 5 条对未来类似问题的复用经验，每条必绑定 probe 编号 / 命令 / file:line / 数字证据

输出格式：

```
===== BEGIN STAGE-3 SYNTHESIS =====
## Probe Answers

### Probe-1: [Question]
- **Verdict**: YES / NO / INCONCLUSIVE
- **Evidence**: cite Raw Observations 中具体片段（命令 / 输出 / 数字）
- **Confidence**: HIGH / MEDIUM / LOW + 理由

### Probe-2: ...
### Probe-3: ...

## Decision
**[必选 1: CONTINUE-TO-CODING-RELAY / SWITCH-DIRECTION / NO-GO / NEED-MORE-PROBES]**

按所选 Decision 给对应输出：
- CONTINUE: PLAN 草图 ≤ 10 行（目标 / 方法 / 验收）+ 推荐 preset
- SWITCH: 新方向 ≥ 1 个 + 原方向反证 + 下一步 workflow（wf-bake-off / wf-coding-relay / 再跑 wf-spike）
- NO-GO: 反证 + 重新可行的前置条件
- NEED-MORE-PROBES: ≤ 3 新 probe（Stage 1 格式）

## Learning Notes
≤ 5 条复用要点。**每条必 cite**：probe 编号 / 命令 / file:line / 数字。无锚点的条目须删除（不允许"X 一般要慎用"这类无证据断言）。

## Caveats
INCONCLUSIVE / Anomalies / BLOCKED / ABORT-OVER-LOC 等限制条件——明示本决策的不确定性边界。
===== END STAGE-3 SYNTHESIS =====
```

约束：每个 Verdict 必 cite Raw Observations；INCONCLUSIVE 必给后续探索路径；Decision 必选 4 态之一不许"留待讨论"；Learning Notes 每条必有锚点；spike code 不在本 stage 写 / 不在本 stage 修。

```
===== BEGIN STAGE-1 PROBES =====
[PASTE STAGE-1 PROBES HERE]
===== END STAGE-1 PROBES =====
```

```
===== BEGIN STAGE-2 OBSERVATIONS =====
[PASTE STAGE-2 OBSERVATIONS HERE]
===== END STAGE-2 OBSERVATIONS =====
```

**Artifact**：STAGE-3 SYNTHESIS 块（Probe Answers + Decision + Learning Notes + Caveats）。
**Stop**：Decision 已选 + 所有 Verdict 有 Evidence cite + INCONCLUSIVE 已给后续探索路径 + Learning Notes 每条都有锚点。**spike code 已在 `/tmp/spike-<topic>/`，不入主仓**（若 Decision = CONTINUE，coding-relay 从零开始按 PLAN 草图实现，不复用 spike 代码）。

---

## Simplification

默认完整 3 段。**保留一个降级 mode**：`--mode=learning-only`。

- **`learning-only`**：跳 EXPLORER 写代码，仍跑 Stage 2 但**禁止写 spike code**——Probe Results 的 Raw Observations 引证文档原文 / 源码 file:line / 公开 benchmark URL，仍按 Measurement 跑可执行命令（grep / man / rg）记录原始输出。**触发判据**：问题不需要跑代码就能回答（如"X 库的 API 模型是什么 / X 协议规定 Y 怎么处理"）+ 既存权威源（官方文档 / 源码注释 / 公开 RFC，可 URL 或 file:line 引用）。

**何时不该走本 workflow**：
- 单一明确 probe + 已有测量方式 + 答案 < 60 秒可写：直接跑该 probe + 记观察，不走 workflow
- ≥ 2 明确候选 + 判据可机械化 → 走 `wf-bake-off`

无其他降级路径——单 probe 场景仍走完整 3 段（Stage 1 PROBE-DESIGNER 允许输 1 个 probe）。
