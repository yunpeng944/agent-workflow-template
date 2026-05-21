# Research Rules — exploration / probes / technology selection

Apply when: candidates < 2 / criteria 不清 / 不熟领域 / 概念验证 / 选型对比。

**Use base.md 同时叠加**。

## Problem Convergence

- 开放问题必须收敛到 **≤ 3 个可观察子问题**
- 每子问题结构：
  - **Question**: "X 能跑通吗" / "X p50 < 100ms 吗" / "X 内存 < 500 MB 吗"
  - **Measurement**: 命令 + 输入 + 期望产出形态（exit code / 数字 / 文本模式）
  - **Success Criterion**: 什么观察对应 YES / NO / INCONCLUSIVE

## Falsifiability Required

**禁止 unfalsifiable 措辞**：
- "X 是否好用 / 优雅 / 现代" → ❌
- "团队接受度如何" → ❌
- 任何 1-5 评分不绑定可观察 proxy → ❌

每条 question 必须能在 ≤ 5 分钟内跑出 YES/NO/INCONCLUSIVE 结论。

## Throwaway Code Discipline

探索代码（spike code）**强制隔离**：
- 写到 `/tmp/spike-<topic>/`，**不进主仓 / 不进 worktree / 不 git add**
- LOC 上限：总计 ≤ 500 行（`wc -l` 累计统计）
- 收尾必输 `git status --short`：主仓 / worktree 都应不含 spike 文件
- 主仓只读不写：worktree 用于读仓库状态（grep / find），实验代码写 /tmp

## Selection (when comparing A vs B)

- **Stage 1 判据冻结**：criteria 设定后不许回改
- **A/B prompt 字符级一致**：仅候选名占位符替换；同 fixture 跑两次
- **A/B 用同 model**：公平性要求（不同 model 写 prototype 会引入实现偏置）
- **Scoring**：机械化加权和 ≤ 70%，主观维度 ≥ 30%（每条主观维度必有可观察 proxy）
- 不引入 Stage 1 未列维度；不重新加权；不引"团队偏好"作决胜票
- Hard Constraint 漏写需补 → criteria version bump + 重跑相关测量

## Exit Conditions (4 态)

探索结束必须给一个：
- **CONTINUE**: 方向 OK，给后续 PLAN 草图 + **不可复用 spike 代码清单** + 可复用观察清单
- **SWITCH-DIRECTION**: 原方向被否，给新方向 + 排除原方向的反证
- **NO-GO**: 整体不可行，给反证 + "什么前置条件变化才可能重启"
- **NEED-MORE-PROBES**: 信息不足，列 ≤ 3 个新 probe 设计

不允许"继续做吧"这种无 decision；不允许只输 CONTINUE 不论 NO-GO 可能。
