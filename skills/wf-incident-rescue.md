---
name: wf-incident-rescue
description: 4-stage regression triage workflow — REPRODUCER pins minimal failure, BISECTOR finds first-bad commit, FIX-DESIGNER decides forward-fix vs revert, FIX-IMPLEMENTER applies + verifies green.
argument-hint: '[preset] [--mode=known-cause-fix|revert-only] <task>'
disable-model-invocation: true
user-invocable: true
---

> **共用约定**：fresh subagent / paste boundary / SCOPE-EXPANSION / DIFF block / dispatch ledger / `./tasks.sh validate` 收口 / 同产品 preset 警告 / tracked follow-up 等 8 项共用约束见 [docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)。

## Goal

失败测试 / 断分支 / regression 现场拆成 **REPRODUCER → BISECTOR → FIX-DESIGNER → FIX-IMPLEMENTER 接力 4 段**，顺序与 `wf-coding-relay` 反向：**先复现、再二分、再设计、最后修**。REPRODUCER 在 Stage 1 把失败钉死成可复现的最小现场；BISECTOR 在 Stage 2 用 `git bisect` 找出 first-bad commit；FIX-DESIGNER 在 Stage 3 基于 commit diff + 复现做**最小修设计**（forward-fix vs revert 决策）；FIX-IMPLEMENTER 在 Stage 4 实现 + 跑复现脚本应转绿 + `./tasks.sh validate`。核心差异：**Stage 1 复现优先**——不许跳过去想 fix；复现不成 → 整条流程 BLOCKED（多半是 environment-specific 需先解决）。

## Orchestration

- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节；默认 `claude-codex`；`custom` (`--reproducer=<m> --bisector=<m> --fix-designer=<m> --fix-implementer=<m>` 缺任一 fail-fast)
- **role slots**: REPRODUCER (Stage 1) / BISECTOR (Stage 2) / FIX-DESIGNER (Stage 3) / FIX-IMPLEMENTER (Stage 4)；Stage 3 (FIX-DESIGNER) input = STAGE-1 REPRODUCTION + STAGE-2 BISECT-RESULT（含 diff），**不**含 REPRODUCER / BISECTOR self-narrative
- **fresh subagent 例外**：Stage 1 (REPRODUCER) 与 Stage 2 (BISECTOR) **可同一 session 复用**——因 BISECTOR 需 REPRODUCER 累积的信息（reproducer 脚本路径、known-good anchor、failure mode），强制 fresh 反而损失
- **特有约束**: 复现优先（Stage 1 不许跳，BLOCKED 时必须给 ≥ 3 条退路 hint）；reproducer 脚本必须放**git tree 外**（避免 bisect checkout 换掉）；**Worktree 隔离必需**——`git bisect` 切换 working tree，CLI 路径**必须**独立 `git worktree add` 内跑；四态 Decision（FORWARD-FIX / REVERT / REVERT-WITH-CHERRY-PICK / PARTIAL-REVERT-PLUS-FORWARD-FIX）；所有 Decision 分支都跑**三项 PASS**（Stage 1 reproducer 转绿 + Stage 3 negative test + `./tasks.sh validate`）
- 通用调度行为（优先级 / fresh subagent / dispatch ledger / single-role preset 例外）→ [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-incident-rescue [preset] [--mode=<simplification>] <task>`（task 建议含 failing test name / CI URL / 错误消息 / 最近 known-good）

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制。reproducer 脚本本身放 `/tmp/reproducer-<task>.sh` 或独立 worktree（git tree 外，避免 bisect checkout 替换）。

## When to use / Skip if

**用**：已存在 failing test / 已知 regression 现场（CI 红 / 本地复现 / 用户报错）；知道"哪里崩"但不知道"哪一次提交引入"；修复策略不明确（revert vs forward-fix vs 重设计）需 first-bad diff 才能定；跨多 commits 的 regression。

**跳过**：不知道"哪里崩" / 多 hypothesis 互相矛盾 → 先 `wf-second-opinion`；凭空新建功能 → `wf-coding-relay`；大重构引入跨多模块 regression → 回 `wf-convoy-refactor` 看 INVARIANTS；安全相关 regression → Stage 3/4 切 `wf-red-team`。

**降级**：已知 root cause → `--mode=known-cause-fix`（跳 Stage 1/2 进 Stage 3+4）；first-bad 改动小独立 → `--mode=revert-only`（仍需 reproducer 转绿验证）。

---

## Stages

### Stage 1 — REPRODUCER（复现 + 钉死最小现场）

> **复现优先原则**：本 stage **不许**讨论"可能的 fix"。无法复现 → 整条流程 BLOCKED——可能 environment-specific / flaky / 已被无意修复，先在 Stage 1 内解决"为什么不能复现"。

````
===== BEGIN STAGE-1-REPRODUCER PROMPT =====
**不要写 fix**。**不要猜 root cause**。本 stage 唯一产物是**可重复跑出失败的最小现场**。

执行步骤：
1. 跑用户给定的 failing 入口（test name / 命令 / 脚本），确认本地能复现
   - 若**不能复现**：列可能原因（env 差异 / 依赖版本 / OS / flaky / 已被无意修复）→ 输出 BLOCKED 并停止；**同时给用户至少 3 条具体退路 hint**：(a) CI 失败时的 env capture（Node / pnpm / OS / lockfile SHA）；(b) docker / nix 镜像复现；(c) 从 CI artifact 拉 fixture 重放；(d) `rm -rf node_modules && pnpm install --frozen-lockfile` 锁版本重装；(e) 跑 reproducer 命令 ≥ 20 次确认非 flaky-by-low-probability。BLOCKED 时不许进下一步
2. 把复现简化到**最小**：
   - vitest → 缩到单个 `it` 或单个 `describe`
   - CLI 行为 → 缩到最小 fixture + 最小命令
   - build / typecheck → 缩到最小源文件复制集
3. 把最小现场固化成**reproducer 脚本**——可以是 vitest test / shell / Node.js，**不依赖外部 ad-hoc state**。**位置约束**：reproducer 脚本必须放在**git tree 外**（如 `/tmp/reproducer-<task>.sh`）或单独 `git worktree add` 中——避免 Stage 2 `git bisect` checkout 把 reproducer 自身换掉
4. 跑 reproducer ≥ 2 次，确认稳定失败（非 flaky）
   - 疑似 flaky：**deflake-before-bisect 最小协议** — 重跑 ≥ 20 次，记失败率分布：
     - **失败率 100% (20/20)**：STABLE，直接进 Stage 2
     - **失败率 ≥ 80% (16-19/20)**：NEAR-STABLE，进 Stage 2 但 bisect 时把 reproducer 包成"重试 3 次都失败才算 bad"
     - **失败率 30-80%**：FLAKY-HIGH，bisect 受高噪声影响，**建议用户先解决 flake**（找非确定性源：random seed / timing / 网络 / 全局状态），否则结论不可靠
     - **失败率 < 30%**：FLAKY-LOW，二分基本无效，**必须**先 deflake；不允许带这种噪声进 Stage 2

输出格式：

```
===== BEGIN STAGE-1 REPRODUCTION =====
## Status
REPRODUCED-STABLE / REPRODUCED-FLAKY (rate: N/M) / BLOCKED-NOT-REPRODUCED

## Reproducer Script
```
[完整脚本内容 - vitest test / shell / Node.js]
```

## How to Run
```bash
[一行命令，从 repo root 跑]
```

## Failure Mode
- 退出码: [N]
- 关键 stderr / stack: [片段]
- 关键 stdout: [片段，若与失败有关]
- 失败稳定性: [stable / flaky 详情]

## What Was Excluded
简化过程中砍掉的代码 / fixture / 依赖——简短列出，让 Stage 2 二分时知道这些已被排除嫌疑。

## Known-Good Anchor
- 最近 known-good commit / 日期 (用户提供): [SHA 或 "未知"]
- 当前 failing commit: HEAD [SHA]
- 二分范围 commit 数: [N]——若 > 200，建议用户先收窄
===== END STAGE-1 REPRODUCTION =====
```

约束：不臆造命令 / fixture；不"应该可以"——必须实际跑过；不进入 root cause 推测；不写 fix 草稿。

```
===== BEGIN INCIDENT INPUT =====
[PASTE: failing test 名 / CI 链接 / 错误消息 / 最近 known-good / 已尝试但失败的复现路径]
===== END INCIDENT INPUT =====
```
===== END STAGE-1-REPRODUCER PROMPT =====
````

**Artifact**：STAGE-1 REPRODUCTION 块（含 reproducer 脚本 + 稳定性确认 + 二分范围）。
**Handoff to Stage 2**：Status = REPRODUCED-STABLE 或 NEAR-STABLE 进 Stage 2；FLAKY-HIGH 需用户拍板（强烈建议先 deflake）；FLAKY-LOW / BLOCKED-NOT-REPRODUCED **不允许**进 Stage 2——必须先解决。

### Stage 2 — BISECTOR（`git bisect` 找 first-bad；可与 REPRODUCER 复用 session）

````
===== BEGIN STAGE-2-BISECTOR PROMPT =====
基于 Stage 1 提供的 reproducer 脚本，找出 **first-bad commit**——引入 regression 的那次提交。

执行步骤：
1. 用 Stage 1 Known-Good Anchor 作 good，HEAD 作 bad，跑 `git bisect`
   - 自动化：`git bisect start <bad> <good> && git bisect run <reproducer command>`
   - reproducer 命令应指向 Stage 1 放在 git tree 外（如 `/tmp/reproducer.sh`）或独立 worktree 的脚本
   - reproducer 含 build / install 步骤 → 先确认每个 bisect step 都能执行 build——build 失败的 commit 标 `git bisect skip` 而非 `bad`
   - **monorepo / lockfile 失真处理**：bisect 跨越 lockfile 变更或 workspace 重构时 skip 量会激增；缓解：(a) 每步前跑 `pnpm install --frozen-lockfile` 同步依赖；(b) 用稳定的根命令（`pnpm -w test ...`）而非可能消失的子包脚本；(c) reproducer 内 setup 关键环境变量；(d) 若 skip > 30%，停下并报 BISECT-INCONCLUSIVE 让用户先收窄 anchor
2. 拿到 first-bad commit 后：
   - `git show <SHA> --stat` 看改动文件清单
   - `git show <SHA>` 看完整 diff
3. 分析 diff：列**哪段改动最可能导致 regression**——但**不进入 fix 设计**（Stage 3 工作）
4. 在 first-bad 的**父 commit**上跑一次 reproducer 确认 PASS——first-bad 是 root commit 的双向证明
   - **merge commit 处理**：若 first-bad 是 merge（多父），对**每一个父** commit 都跑 reproducer：
     - 全部父 PASS → first-bad 确认是引入 regression 的 merge（推荐 forward-fix 而非 revert）
     - 有父 FAIL → 在 FAIL 父分支历史里继续 bisect（缩到那条分支重启 Stage 2）
     - BISECT-RESULT 输出明示哪种情形
5. **不修代码**——仅产报告

bisect 失败（多次 skip 后 inconclusive / range 太大 / 全是 build 失败的 commit）：
- 报告 BISECT-INCONCLUSIVE + 已 narrow 的 suspect range
- 建议用户：收窄 anchor / 修 build flake / 用 git log 肉眼定位（commits 范围已收窄）

输出格式：

```
===== BEGIN STAGE-2 BISECT-RESULT =====
## Status
FIRST-BAD-FOUND / BISECT-INCONCLUSIVE

## First-Bad Commit
- SHA: [40 字符 SHA]
- 作者 / 日期: [...]
- Message: [first line]

## Parent Verification
- 父 commit(s) [SHA list] 上跑 reproducer: PASS (确认 first-bad 是 root)
- first-bad commit 上跑 reproducer: FAIL (确认本 commit 引入)
- merge commit case (如适用): [全部父 PASS / 某父 FAIL → 缩到分支重启]

## Diff Hot Spots
diff 中**最可疑**的改动段（file:line 范围 + 简短说明为什么这段最可能与 reproducer 失败模式相关）。不超过 3 处。**不写 fix 建议**。

## Full Diff
```
[git show <SHA> 完整输出]
```

## Bisect Trace
- good anchor: [SHA]
- bad anchor: [SHA]
- 二分步数: [N]
- skipped commits: [N + 原因]
===== END STAGE-2 BISECT-RESULT =====
```

约束：不进入 fix 设计；不"建议 revert" / "建议改 X"；diff hot spots 必须基于 reproducer 失败模式 + diff 内容的客观关联，不许"看起来可疑"。

```
===== BEGIN STAGE-1 REPRODUCTION =====
[PASTE STAGE-1 REPRODUCTION BLOCK HERE]
===== END STAGE-1 REPRODUCTION =====
```
===== END STAGE-2-BISECTOR PROMPT =====
````

**Artifact**：STAGE-2 BISECT-RESULT（first-bad SHA + 父 commit 验证 + diff hot spots + 完整 diff）。
**Handoff to Stage 3**：Status = FIRST-BAD-FOUND 才进 Stage 3；INCONCLUSIVE → 先解决 anchor / build 问题或用 git log 肉眼定位（commits 范围已收窄）。

### Stage 3 — FIX-DESIGNER（fresh subagent，四态 Decision 设计最小修）

````
===== BEGIN STAGE-3-FIX-DESIGNER PROMPT =====
已知：复现（Stage 1）+ first-bad commit diff（Stage 2）。**你的工作是设计最小修**——不写代码，不顺手重构。

**决策门**（必须先回答；四态枚举，可组合不互斥）：
- **FORWARD-FIX**：first-bad commit 整体有用，仅某段有缺陷 → 只改缺陷段
- **REVERT**：first-bad commit 改动整体不该有，且 revert 不破坏依赖
- **REVERT-WITH-CHERRY-PICK**：整体 revert，但需 cherry-pick / 重做 first-bad 中**确实需要保留**的部分
- **PARTIAL-REVERT-PLUS-FORWARD-FIX**：撤掉 first-bad 中的某段坏改动 + 同时补 forward-fix 修复上游 latent bug（适用：first-bad 暴露了原有问题 + 自己也带新问题）
在输出中明确给出**判定（四态之一）+ 理由**。

执行步骤：
1. 读 diff hot spots，与 reproducer 失败模式做映射：哪一处改动**直接**引起 reproducer 失败？
2. 做 forward-fix vs revert 判定
3. 若 forward-fix：
   - 定义**最小修 scope**——file:line + 改什么
   - 设计 **negative test**：验 fix 真挡住 regression（reproducer 转绿 + 新增 vitest 测试覆盖这条 regression 路径）
   - 列**不在本次 fix 内**的 adjacent 问题（first-bad 有其他坏味道但不是本 regression 引起 → 进 follow-up）
4. 若 revert：
   - 给 revert 命令 + 预期影响面（哪些后续 commit 依赖 first-bad）
   - 若有依赖：列依赖 commit 是否也需 cherry-pick 调整
5. 残留风险：fix 后仍可能存在的 regression 模式（如"仅修了路径 A，路径 B 类似 bug 留作 follow-up"）

输出格式：

```
===== BEGIN STAGE-3 FIX-DESIGN =====
## Decision
FORWARD-FIX / REVERT / REVERT-WITH-CHERRY-PICK / PARTIAL-REVERT-PLUS-FORWARD-FIX

## Rationale
3-5 句话，cite first-bad diff 具体行 + reproducer 失败模式。

## Fix Scope (若 FORWARD-FIX)
- 改动文件:行: [file:line] - 改什么 (具体描述)
- 改动原则: 最小必要——不顺手 refactor / 不扩范围

## Revert Plan (若 REVERT)
- 命令: `git revert <SHA>`
- 影响面: 依赖 first-bad 的后续 commits: [SHA list 或 "无"]
- 后续调整: [cherry-pick / 手工合并 / 无]

## Negative Test Design
- reproducer 转绿条件: 现有 Stage 1 reproducer 应在 fix 后 PASS
- 新增 regression test: [test name + 期望行为]——以 vitest 风格描述（不写代码）

## Not in This Fix (Follow-ups)
- [item]: 发现但不混入本次 fix 的 adjacent 问题，标 file:line + 简短描述 + 是否需开 issue

## Residual Risks
- [fix 后仍可能漏过的 regression 模式]
===== END STAGE-3 FIX-DESIGN =====
```

约束：不写代码 / 不扩范围 / 不"顺手重构"；Decision 必须明示四态之一并给理由（混合策略走 REVERT-WITH-CHERRY-PICK 或 PARTIAL-REVERT-PLUS-FORWARD-FIX，不再"二选一"）；negative test 设计不许是简单"reproducer 转绿"——必须有**新增**的 regression test 描述（除非 reproducer 本身就是新增 test）。

```
===== BEGIN STAGE-1 REPRODUCTION =====
[PASTE STAGE-1 REPRODUCTION HERE]
===== END STAGE-1 REPRODUCTION =====
```

```
===== BEGIN STAGE-2 BISECT-RESULT =====
[PASTE STAGE-2 BISECT-RESULT HERE]
===== END STAGE-2 BISECT-RESULT =====
```
===== END STAGE-3-FIX-DESIGNER PROMPT =====
````

**Artifact**：STAGE-3 FIX-DESIGN（Decision + Rationale + Fix Scope **或** Revert Plan + Negative Test Design + Follow-ups + Residual Risks）。
**Handoff to Stage 4**：拿到 Decision。若 REVERT 且影响面 = 无依赖 → 可走 `--mode=revert-only` 跳 Stage 4 直接执行 revert + 跑 validate；其他情况进 Stage 4。

### Stage 4 — FIX-IMPLEMENTER（实现 + 三项 PASS 验证）

````
===== BEGIN STAGE-4-FIX-IMPLEMENTER PROMPT =====
按 Stage 3 fix design 实现修复。**严格按 design 的 scope**——发现 adjacent 改动 → 标 SCOPE-EXPANSION 停下，不静默扩。

执行步骤（**所有 Decision 分支都必须跑 Stage 1 reproducer + negative test + ./tasks.sh validate**——不允许"revert 完直接 validate"）：

**步骤 A — 写 negative test**（无论哪种 Decision 都先做）：
- 写 Stage 3 设计的 negative test
- 在**未改任何业务代码前**跑一次，应**红**（验证测试本身能触达 regression 路径；若已绿说明测试设计错或 regression 已被无意修复，回 Stage 3）

**步骤 B — 应用 Decision 对应的改动**：
- **FORWARD-FIX**：实现 Fix Scope 列出的改动——不多不少
- **REVERT**：跑 `git revert <SHA>` 或手工应用反向 patch
- **REVERT-WITH-CHERRY-PICK**：先 revert，再 cherry-pick / 手工补回需保留的部分
- **PARTIAL-REVERT-PLUS-FORWARD-FIX**：撤掉 first-bad 中的某段（手工 patch 反向）+ 实现 forward-fix Scope

**步骤 C — 三项验证（全部 Decision 分支都跑）**：
1. 跑 **Stage 1 reproducer**——应**转绿**（不转绿：报告 reproducer 输出，回 Stage 3 修订 fix design，不要继续；revert 也可能没真覆盖 root cause）
2. 跑 **Stage 3 negative test**——应**转绿**（验证 regression 被挡住）
3. 跑 **`./tasks.sh validate`**——应**全绿**

**步骤 D — Scope 控制**：
- 发现必要 adjacent 修改超 Fix Scope（如 Stage 3 Follow-ups 中某条**必须**本次一起修才能 validate 通过）→ 标 **SCOPE-EXPANSION**（文件 + why），停等裁定

输出格式：

```
===== BEGIN STAGE-4 SUMMARY =====
## Decision Applied
FORWARD-FIX / REVERT / REVERT-WITH-CHERRY-PICK / PARTIAL-REVERT-PLUS-FORWARD-FIX

## Changes
- 修改文件清单 (含行数)
- 新增测试 (test name 列表)

## Verification
- Stage 1 reproducer 退出码: [转绿确认]
- Negative test 退出码: [转绿确认]
- ./tasks.sh validate 退出码: 0

## Follow-ups Recorded
- [Stage 3 Follow-ups 列出的项是否已建 issue / 加 follow-ups.md 条目 / 或仍 pending]

## SCOPE-EXPANSION (如有)
- 文件 + why + 是否已停等用户裁定
===== END STAGE-4 SUMMARY =====
```

```
===== BEGIN STAGE-4 DIFF =====
[`git diff` 完整文本，含 fix 改动 + 新增 negative test]
===== END STAGE-4 DIFF =====
```

不扩范围（除 SCOPE-EXPANSION 协议）；不"顺手 refactor"；不绕过 negative test（即使 reproducer 已转绿）。

```
===== BEGIN STAGE-1 REPRODUCTION =====
[PASTE]
===== END STAGE-1 REPRODUCTION =====
```

```
===== BEGIN STAGE-3 FIX-DESIGN =====
[PASTE]
===== END STAGE-3 FIX-DESIGN =====
```
===== END STAGE-4-FIX-IMPLEMENTER PROMPT =====
````

**Artifact**：SUMMARY + DIFF + Stage 1 reproducer 转绿 + negative test 转绿 + `./tasks.sh validate` 全绿。
**Stop**：三项 PASS 后由用户做 commit；commit message 引用 first-bad SHA + Stage 3 Decision（forward-fix 还是 revert）。

---

## Simplification

默认完整 4 阶段。**保留两个降级 mode**：`--mode=known-cause-fix` / `--mode=revert-only`。

- **`known-cause-fix`**：跳过 Stage 1 + Stage 2，进 Stage 3 + 4。适用：root cause 已通过 `wf-second-opinion` 或人工分析定位。**Stage 3 输入替代格式**：把 Stage 3 prompt 中的 `STAGE-2 BISECT-RESULT` 块替换为以下 `KNOWN-CAUSE-DESCRIPTION` 块：
  ```
  ===== BEGIN KNOWN-CAUSE-DESCRIPTION =====
  ## Root Cause
  1-2 段话描述确认的 root cause（来源：wf-second-opinion 结论 / 人工分析 / issue 描述）
  ## Observed Evidence
  - file:line 引用 + 已观察的现场片段
  ## Suggested Minimal Fix Scope
  - 推测的改动点（Stage 3 会验证 / 调整这个建议）
  ## Reproducer
  - **Equivalent Reproducer Command**（必填，可执行 shell 命令）：跳 Stage 1 时必须给一条等价 failing 命令，**Stage 4 写 negative test 前必须本机跑出 fail**——若该命令未跑红即升级回完整 4 阶段（防止 root cause 错位）
  ===== END KNOWN-CAUSE-DESCRIPTION =====
  ```
  Stage 3 输出格式不变（仍含 Decision、Fix Scope、Negative Test Design 等段）。Stage 4 验证步骤完全照跑（仍需 Equivalent Reproducer Command 跑红 → 修代码 → reproducer 转绿 + negative test + ./tasks.sh validate）。
- **`revert-only`**：跳过 Stage 3 forward-fix 设计 + Stage 4 实现部分，但**仍需走完 Stage 4 三项验证**。适用：first-bad commit 改动小、独立、无依赖。执行：直接 `git revert <SHA>` → 跑 Stage 1 reproducer 应**转绿**（若不转绿说明 revert 没真覆盖 root cause，必须升级回完整 4 阶段走 Stage 3）→ **将 `/tmp/reproducer-<task>.sh` 转写为 `tests/regression/` 下持久 test**（防下次同 bug 复发无 test gate）→ 跑 `./tasks.sh validate`。**不允许跳过 reproducer 验证**——这是 revert 是否真有效的唯一证据。**revert-only 不豁免持久 test**——临时 reproducer 必须进仓。

**何时不该走本 workflow**：
- 单 typo 引发的 CI 红 → 直接修
- 不知道"哪里崩" → 先 `wf-second-opinion`

降级 2 维度：**root cause 已知性**（已知 → `known-cause-fix`；未知 → 必须 Stage 1）/ **first-bad 可回退性**（可独立 revert + 无后续依赖 → `revert-only`）。**git log < 10 commits 时**：仍走完整 Stage 2 BISECTOR，BISECTOR 自行选 git log 肉眼定位 vs git bisect（不再有独立 mode）。
