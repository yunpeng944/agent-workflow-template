---
name: wf-code-review
description: External diff review without spec — fresh REVIEWER scores 6 dimensions (correctness/security/readability/tests/architecture/cross-file) and outputs APPROVE/REQUEST-CHANGES/COMMENT-ONLY. Upgrades to 3-stage double-review for high-value PRs.
argument-hint: '[preset] [--mode=double-review] <task>'
disable-model-invocation: true
user-invocable: true
---

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

外部 diff / PR / commit / 历史代码做 review，**无规格做对照**（这是与 `wf-coding-relay` Stage 3 的核心差异：coding-relay Stage 3 的 input = PLAN + DIFF；本 workflow input = 仅 DIFF）。默认单段 **REVIEWER 1 个 fresh subagent**，按 6 维度（正确性 / 安全 / 可读性 / 测试 / 架构 / 跨文件影响）输出 🔴/🟡/🟢 + 三态推荐（APPROVE / REQUEST-CHANGES / COMMENT-ONLY）。**核心约束**：REVIEWER **不许猜规格**——意图判定锚点不齐时（同 PR 测试、命名、调用点、文档无法唯一确认意图）标 🟡 "需向作者澄清"，不擅自评对错；**本 workflow 不含实现段**——要修走 `wf-coding-relay` 或派给原作者。

## Orchestration

- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节；默认 `claude-codex`；`custom` (`--reviewer=<m>` 或 `--reviewer-a=<m> --reviewer-b=<m> --reconciler=<m>` 缺任一 fail-fast)
- **role slots**: REVIEWER (single-mode，A 段) **或** REVIEWER-A (A 段) / REVIEWER-B (A 段) / RECONCILER (A 段)（double-review 模式）
- **特有约束**: **不许猜规格**（意图判定锚点：同 PR 测试 / 命名 / 调用点 / 同模块 grep / commit message / 文档；任一无法唯一证明意图 → 标 🟡 "需向作者澄清"，不擅自评对错）；**不含实现段**（要修走 coding-relay 或派回原作者，本 workflow 只允许写 review action / evidence / follow-up，**禁止补丁级实现方案**）；6 维度逐条 🔴/🟡/🟢 + file:line + review action；总结**必给三态推荐**（APPROVE / REQUEST-CHANGES / COMMENT-ONLY）；**升级 `double-review` 客观条件**（不依赖主观"高价值"判断）：用户显式 `--mode=double-review` / 改动文件数 ≥ 8 / 触及凭证或公共 API 或 CLI / JSON schema / 跨 ≥ 3 模块 / single-mode 输出 🔴 ≥ 3；**同产品 preset 警告**——`double-review` 模式下当 `vendor1 == vendor2`（如 `claude-claude`），双盲只剩 session 隔离。编排者在 Stage 2 dispatch 前打印警告（不阻塞）
- 通用调度行为（优先级 / fresh subagent / dispatch ledger / single-mode 专用 preset 解析）→ [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-code-review [preset] [--mode=double-review] <task>` —— task 是 diff 来源（PR URL / commit range / 路径列表 / staged 改动指针）。**约定**：`single-mode` 指默认 1 段 REVIEWER；`double-review` 指升级到 3 段双盲 + RECONCILER。

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制。

## When to use / Skip if

**用**：外部 diff / PR review（含下游贡献者 PR）/ 同事 commit 让看 / 历史代码深度审计 / pre-merge 独立第二视角。

**跳过**：自己刚写的代码 → `wf-coding-relay` Stage 3 已嵌入 review；要红队视角 + 配 negative 测试 → `wf-red-team`；要双盲 bug 诊断 → `wf-second-opinion`；要起草新文档 → `wf-coauthor-doc`。

**降级**：本 workflow 不提供降级 mode；粗看 / 单维度场景走 AGENTS.md「何时不用 workflow」直接评论。

**升级**：客观条件任一满足 → `--mode=double-review`（3 段双盲 + reconcile）：用户显式 `--mode=double-review` / 改动文件数 ≥ 8 / 触及凭证或公共 API 或 CLI / JSON schema / 跨 ≥ 3 模块 / single-mode 输出 🔴 ≥ 3。

---

## Stages

### Stage 1 — REVIEWER（fresh subagent，无 PLAN input）

````
===== BEGIN STAGE-1-REVIEWER PROMPT =====
本 session 是**外部代码 review**——你**没有规格**（没有 PLAN / 没有原作者意图说明），只能基于代码本身评判。

**核心约束**：
- **不许猜规格**——意图判定按以下锚点逐项核：(a) 同 PR 测试 / (b) 命名是否唯一暗示意图 / (c) 调用点（grep 改动符号被谁调用）/ (d) 同模块 grep（既有惯例）/ (e) commit message / 文档。任一无法唯一证明意图 → 标 🟡 "意图不明确，需向作者澄清"，**不擅自评对错**
- **不含实现段**——你只输出 review 意见；要修走 coding-relay 或派给原作者
- **review action 边界**：每条 finding 必含 file:line + 具体证据（grep 输出 / 圈复杂度 / 测试缺口 / 调用图）+ review action（写"此处违反 X 约束 / 缺 Y 测试 / 与 Z 文件惯例不一致"）；**禁止补丁级实现方案**（不写"应改为 `const x = ...`"这类代码片段；改成什么是作者 / coding-relay 的事）
- 6 维度审查，每条 🔴 / 🟡 / 🟢 + file:line + review action（不写"代码应清晰"这类正确的废话）

**阈值优先级**：若仓内含 lint config（`eslint.config.*` / `ruff.toml` / `.golangci.yml` / `.rubocop.yml` / `pyproject.toml [tool.ruff]` / `clippy.toml` 等），**REVIEWER 优先用项目阈值**（如 `max-lines` / `cyclomatic-complexity` / `max-depth`）；缺失才用本 prompt 下列默认阈值（偏 JS/TS 经验值）。判定时在 finding 明示用的是项目配置还是默认。

6 维度审查（每维度判定均需机械锚点，非"合理性"主观断言）：

1. **正确性**（Correctness）
   - bug / off-by-one / null / undefined / 并发竞态 / 异常路径未处理
   - 改动行的语义本身是否自洽（不是是否符合规格——你没规格）
   - 判定锚点：能写出"输入 X → 期望输出 Y / 实际输出 Z"的反例 / 异常路径未 catch / 资源未释放

2. **安全 / 信任面**（Security）
   - 输入校验（用户输入 / 跨服务调用 / 反序列化）
   - 凭证 / token / 密钥（硬编码 / log 泄露 / 错误处理泄露）
   - 权限 / 越权（rbac / 路径遍历 / 反向代理）
   - 注入（SQL / 命令 / XSS / SSRF）
   - 资源泄露（fd / connection / memory）

3. **可读性 / 命名**（Readability）
   - 命名是否反映意图（`f` / `tmp` / `data2` → 🔴；`processedUserIds` → 🟢）
   - 复杂度：单函数 > 50 行 / 嵌套 > 4 层 / cyclomatic > 10（任一超 → 🟡，超两项 → 🔴）
   - 注释合理性（解释 why 而非 what）
   - 死代码 / commented-out code

4. **测试**（Tests）
   - 改动是否有测试覆盖（grep 同 PR / 同 commit 的测试文件，列改动符号被哪些 test cite）
   - 测试是否**真测了改动**（不是只跑通 happy path——grep `expect`/`assert` 数 + 改动函数的负向输入是否被测）
   - 是否测了边界（empty / null / max / 并发 / 错误路径——逐条核对在不在测试用例中）

5. **架构妥当**（Architecture）
   - 引入的复杂度是否必要（YAGNI 检查：新抽象是否有 ≥ 2 调用点 / ≥ 2 已知用例；无 → 🟡）
   - 与周边代码风格一致（grep 同模块现有模式；偏离主导模式 → 🟡）
   - 抽象层次是否合理（按本仓既有惯例 grep；新层无既有同位先例 → 🟡）

6. **跨文件影响**（Cross-file impact）
   - 改动行符号 / API / schema 的全仓引用是否都更新了（`grep -r <symbol>` 验证未更新引用数）
   - 改动暗示其他地方也该改吗？标 **SCOPE-EXPANSION**（file:line + why + grep 证据）
   - breaking change 风险（公开 API / CLI / JSON schema 字段；列出可能受影响的下游）

输出格式（**严格按下列结构**）：

```
===== BEGIN STAGE-1 REVIEW =====
## Diff Scope
- 来源：[PR URL / commit range / 路径列表]
- 改动文件数：N
- 改动行数（+ / -）：N / N
- 关键改动概要（≤ 3 行，**不评价**只描述）

## Findings

### 1. 正确性
- 🔴 / 🟡 / 🟢 + file:line + 证据 + review action（**不写代码补丁**）
- ...

### 2. 安全 / 信任面
- ...

### 3. 可读性 / 命名
- ...

### 4. 测试
- ...

### 5. 架构妥当
- ...

### 6. 跨文件影响
- ...

## Intent Clarifications Needed
🟡 "需向作者澄清"的条目集中列出（避免散在 6 维度里淹没）：
- [file:line]: [改动的意图不明确——锚点 (a)-(e) 中哪些缺失 / 矛盾；可能是 X 也可能是 Y，需作者确认]

## Summary
- 必修 🔴: N / 建议 🟡: N / 通过 🟢: N
- **三态推荐**：**APPROVE / REQUEST-CHANGES / COMMENT-ONLY**
- 推荐理由（≤ 3 句，cite 严重度依据）

## Recommended Follow-ups
- 🔴 必修：建议派 `wf-coding-relay` 或退回原作者
- 🟡 高风险面（安全维度 ≥ 2 🔴 / 🟡 集中）：建议跑 `wf-red-team` 复扫
- 🟡 跨文件 SCOPE-EXPANSION 集中：建议跑 `wf-convoy-refactor` 重新设计
- 升级条件触发（🔴 ≥ 3 / 改动文件数 ≥ 8 / 触及凭证或公共 API / 跨 ≥ 3 模块）→ 建议升级 `--mode=double-review`
===== END STAGE-1 REVIEW =====
```

约束：不猜规格；不擅自评意图不明的改动对错；不写补丁级实现方案（"应该这样改 `const x = ...`"——只写"这里有 X 问题"，怎么改是作者 / coding-relay 的事）；每条 finding 必 cite file:line + 具体证据（grep 输出 / 行数 / 圈复杂度 / 调用图）；不写"代码应清晰可读"这类正确的废话。

```
===== BEGIN STAGE-1 DIFF-INPUT =====
[PASTE: diff 来源指针——PR URL / commit range / staged 改动 / 路径列表；REVIEWER 自取实际 diff via git diff / gh pr view / cat]
===== END STAGE-1 DIFF-INPUT =====
```
===== END STAGE-1-REVIEWER PROMPT =====
````

**Artifact**：STAGE-1 REVIEW 块（6 维度逐条 + Intent Clarifications + Summary 三态推荐 + Follow-ups）。
**Stop**（single-mode）：Summary 三态推荐已选 + 🔴/🟡 全配 file:line + 意图不明改动已列入 Intent Clarifications。

### Stage 2 / 3（仅 `double-review` 模式）— REVIEWER-A ∥ REVIEWER-B → RECONCILER

> **触发**：客观条件任一——用户 `/wf-code-review --mode=double-review <task>` / 改动文件数 ≥ 8 / 触及凭证或公共 API 或 CLI / JSON schema / 跨 ≥ 3 模块 / single-mode 发现 🔴 ≥ 3。
> **同产品 preset 警告**：与 wf-second-opinion / wf-bake-off 同机制——`double-review` 下当 `vendor1 == vendor2`（如 `claude-claude`），双盲只剩 session 隔离，丢失跨厂商多样性。编排者在 Stage 2 dispatch 前打印警告（不阻塞）。

**Stage 2A / 2B（平行 fresh dispatch，字符级一致 input）**：

````
===== BEGIN STAGE-2-REVIEWER-[A|B] PROMPT =====
本 session 是 REVIEWER-[A|B]——独立 review，**不知道**另一 REVIEWER 的存在 / 不读其输出。

按 Stage 1 REVIEWER 完全相同的 6 维度 + 不许猜规格 + 不含实现 + review action 不写补丁 约束 review。

输出 STAGE-2 REVIEW-[A|B] 块（结构同 Stage 1 STAGE-1 REVIEW，但块名改为 STAGE-2 REVIEW-A 或 STAGE-2 REVIEW-B）。

```
===== BEGIN STAGE-1 DIFF-INPUT =====
[PASTE DIFF-INPUT HERE]
===== END STAGE-1 DIFF-INPUT =====
```
===== END STAGE-2-REVIEWER-[A|B] PROMPT =====
````

**Stage 3 — RECONCILER（fresh subagent，从未参与 A/B）**：

````
===== BEGIN STAGE-3-RECONCILER PROMPT =====
综合 REVIEW-A + REVIEW-B，输出**共识 review** + 分歧标记。

执行要求：
1. **共识条目**（A & B 都标的 🔴 / 🟡）：直接进 RECONCILED REVIEW，cite 双方一致点
2. **A 独有条目**：是否合理？给 KEEP / DROP + 理由（KEEP 必 cite A 提供的证据可独立复现，如 grep 输出 / 行号 / 圈复杂度；DROP 必给 B 未提及的反证或证据不可复现）
3. **B 独有条目**：同上
4. **冲突条目**（同位置 A 标 🔴 但 B 标 🟢）：标 ⚠️ DIVERGENCE + 双方理由 + RECONCILER 仲裁（KEEP-A / KEEP-B / 双方都不对 / 需 Probe）
5. **三态推荐**：基于 RECONCILED 严重度给 APPROVE / REQUEST-CHANGES / COMMENT-ONLY；明示与 A、B 推荐的一致 / 分歧

输出格式：

```
===== BEGIN STAGE-3 RECONCILED-REVIEW =====
## Consensus Findings（A & B 共识）
- 按 6 维度逐条

## A-Only Findings
- 每条：[KEEP / DROP] + 理由（KEEP 必 cite 可独立复现的证据）

## B-Only Findings
- 每条：[KEEP / DROP] + 理由（同上）

## Divergence
- ⚠️ [file:line]: A 标 X / B 标 Y → 仲裁：[KEEP-A / KEEP-B / 双方都不对 / 需 Probe]

## Summary
- 必修 🔴: N / 建议 🟡: N
- **三态推荐**：APPROVE / REQUEST-CHANGES / COMMENT-ONLY
- 与 REVIEW-A 推荐一致 / 分歧：[...]
- 与 REVIEW-B 推荐一致 / 分歧：[...]
===== END STAGE-3 RECONCILED-REVIEW =====
```

约束：不引入 A/B 都未提的新 finding；Divergence 必给仲裁不许"双方都对"；最终推荐必 cite 严重度依据；不写补丁级实现方案。
===== END STAGE-3-RECONCILER PROMPT =====
````

```
===== BEGIN STAGE-2 REVIEW-A =====
[PASTE REVIEW-A HERE]
===== END STAGE-2 REVIEW-A =====
```

```
===== BEGIN STAGE-2 REVIEW-B =====
[PASTE REVIEW-B HERE]
===== END STAGE-2 REVIEW-B =====
```

**Artifact**（double-review）：STAGE-3 RECONCILED-REVIEW 块（Consensus + A-Only / B-Only / Divergence + Summary 三态推荐）。
**Stop**（double-review）：RECONCILED 完整 + Divergence 全仲裁 + 最终推荐已选。

---

## Simplification

默认单段 REVIEWER 6 维度评审（内部称 `single-mode`）。**保留一个升级 mode**：`--mode=double-review`。

- **`double-review`**（升级）：3 段双盲 + RECONCILER 合并。**触发判据**（4 项任一，机械可数）：改动文件数 ≥ 8 / 触及凭证或公共 API / 跨 ≥ 3 模块 / single-mode 输出 🔴 ≥ 3。**禁止主观"高价值 PR"判断**——触发条件必须可 grep 验证。

**何时不该走本 workflow**：
- 粗看一眼给印象（非 gating） → 直接评论，不走 workflow
- 限定单一维度（如只看安全） → 直接评论 + prompt 内自然语言指定关注维度
- self-PR / 自己刚写的代码 → 走 `wf-coding-relay` Stage 3（已嵌入 review + 配 fix stage）

无其他降级路径——非 double-review 场景走默认 single-mode。

## 已知 follow-up

- `skills/wf-code-review.md` 可读性 / 架构维度判定锚点（如圈复杂度 > 10、抽象 < 2 调用点）阈值是常用经验值；后续若仓库定 lint config 可改为引用 ESLint rule。
