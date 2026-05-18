---
name: wf-coauthor-doc
description: 3-stage doc co-authoring for AGENTS.md / SKILL.md / governance docs — PLANNER drafts, AUDITOR strictly verifies, FINALIZER synthesizes audit into commit-ready text.
argument-hint: '[preset] [--mode=<name>] <task>'
disable-model-invocation: true
user-invocable: true
---

<!-- generated · do not edit · source: skills/wf-coauthor-doc.md -->

## Goal

治理 / 规则型文档（AGENTS.md、子 AGENTS.md、SKILL.md、system prompt、governance / contract doc）的起草或大改拆成 **PLANNER → AUDITOR → FINALIZER 接力 3 段**：PLANNER 写初稿（元规则 + 边界 + 锚点 + anti-skip） → AUDITOR 严苛校验（可执行 / 可判定 / 可定位 / 内部一致）→ FINALIZER 综合 audit 出 commit-ready 文本。核心差异于 `wf-coding-relay`：**没有实现 / 测试 / diff 阶段**——文档本身就是产物，校验靠 `./tasks.sh validate`（含 `check-structure` / `check-refs` / `sync-skills-check`）+ 人读。**另一核心差异**：Stage 3 (FINALIZER) **故意读** Stage 2 (AUDITOR) 输出——文档润色需要 audit 意见做依据。

## Orchestration

- **5 preset (默认 claude-codex)**：claude-codex / claude-claude / codex-claude / codex-codex / custom (`--planner=<m> --auditor=<m> --finalizer=<m>` 缺任一 fail-fast)
- **调度优先级**：CLI (`claude -p` / `codex exec`) → host subagent (Claude Code `general-purpose` / `codex:codex-rescue`) → fail-fast
- **role slots**: PLANNER / AUDITOR / FINALIZER
- **evaluator stage**: Stage 2 (AUDITOR) fresh subagent；**Stage 3 (FINALIZER) 例外**——fresh subagent 但 input **必含** STAGE-2 AUDIT（文档润色需 audit 意见做依据）
- **特有约束**: 不验代码（产物即文档）；目标在 `skills/<name>.md` 时终稿后**必须先**跑 `./tasks.sh sync-skills` 重生镜像再 commit，否则 `./tasks.sh validate` 中的 `sync-skills-check` 必失败
- 详细 model 映射 / host-specific routing / worktree 隔离 / 调度执行约束 / dispatch ledger / 同产品 preset 警告触发时机 → [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-coauthor-doc [preset] [--mode=<simplification>] <task>`

**Stage prompt 来源**：从对应 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 之间复制。可选 run dir：`.wf-runs/<ISO-timestamp>-coauthor-doc/`。

## When to use / Skip if

**用**：新建或大改 AGENTS.md / 子模块 AGENTS.md / docs/ 治理类文档；起草新 skill（`skills/<name>.md`，尤其 user-invocable workflow skill）；起草 `.claude/agents/<name>.md` subagent 规约；改造 system prompt / role description。

**跳过**：写代码 → `wf-coding-relay`；高风险面代码 → `wf-red-team`；大重构 → `wf-convoy-refactor`；仅修 typo → 直接改。

**降级**：小幅改动（< 30 行、单段内）→ `audit-only`；极简改动（typo / 错锚点 / 单行）→ 直接改 + 跑 `./tasks.sh validate`。

---

## Stages

### Stage 1 — PLANNER（起草）

````
===== BEGIN STAGE-1-PLANNER PROMPT =====
基于以下需求与本仓 AGENTS.md + `docs/agents-governance.md`，起草目标文档。

**决策门**：需求是否含阻断性歧义（受众 / 放置路径 / 与现有文档边界 / 替换 vs 合并 vs 并存）？
- 有 → **只输出澄清问题**（3-5 项），停止
- 无 → 直接输出完整草稿

写作原则（**所有条目必须满足**）：
1. **元规则在前**：开头 ≤ 3 行交代本文件管什么、不管什么、细节去哪里
2. **三层边界**（若适用于治理类）：始终 / 先问后做 / 禁止——每条按字面可执行
3. **可执行**：不含"按需要"/"必要时"/"合理地"等不可判定措辞
4. **可判定**：争议时有客观锚点（命令退出码 / 文件存在 / 字符串匹配 / schema 校验）
5. **可定位**：跨文件引用用相对路径，路径在仓库中真实存在
6. **不复制契约值**：契约 / schema / 字段值改为指向真源文件 + 行号或 anchor
7. **不重复上层规则**：上层 AGENTS.md 已有的不再重复；只写本层特有约束
8. **anti-skip 三条**（若是流程类）：替代方案 + 排除原因 / 新依赖备选 + 排除原因 / 自审 3 条
9. **导航锚点**：末尾给 ≤ 6 个"去哪找 X"一行指针，避免 dump 全部目录
10. **失败模式声明**：若文档触发自动化校验（`./tasks.sh check-structure` / `./tasks.sh check-refs` / 目标在 `skills/<name>.md` 时另触发 `./tasks.sh sync-skills-check`），明示触发条件 + 修复入口

额外输出（草稿后）：
- **设计说明**：3-5 句话——元定位 / 与相邻文档边界 / 为什么砍掉了某些诱人但不属于此处的内容
- **替代结构**：≥ 1 个考虑过但未采用的结构 + 排除原因
- **校验入口**：列出本文档完成后需跑的命令——收口必跑 `./tasks.sh validate`；目标在 `skills/<name>.md` 时**必须先**跑 `./tasks.sh sync-skills` 重生镜像再 commit

约束：不臆造命令、路径、API、契约值；不引入未实际存在的链接；不写"代码应清晰可读"一类正确的废话。

```
===== BEGIN STAGE-1 REQUIREMENT =====
[PASTE DOC GOAL: 受众 / 放置路径 / 上层约束 / 要替换或合并的现有文件 HERE]
===== END STAGE-1 REQUIREMENT =====
```
===== END STAGE-1-PLANNER PROMPT =====
````

**Artifact**：澄清清单 或 完整草稿 + 设计说明 + 替代结构 + 校验入口。
**Handoff to Stage 2**：草稿完整 + 所有跨文件引用路径真实存在 + 校验入口明确。

### Stage 2 — AUDITOR（fresh subagent，严苛校验）

````
===== BEGIN STAGE-2-AUDITOR PROMPT =====
你是治理文档审计 agent。**不要重写文档**，只做严苛校验。本文档**不是代码**——校验靠机械工具 + 静读。

校验维度（每条逐项条目，不只是"通过/不通过"总结）：

1. **可执行性**：
   - 找所有"按需要"/"必要时"/"合理地"/"适当地"/"通常"等**不可判定措辞** + file:line + 改造建议
   - 每条指令性表述（"始终"/"禁止"/"必须"）是否含**判定锚点**（命令 / 文件 / schema / 字符串匹配）

2. **可定位性**：
   - 抽出所有跨文件引用（`docs/X.md`、`src/Y.ts` 等），用 `ls`/`find`/`grep` 逐条核对仓库存在
   - 不存在 → 🔴 必修；存在但描述与实际不符 → 🟡 建议修

3. **内部一致性**：
   - 自相矛盾（"始终 X" 与 "若 Y 则不 X" 未明示优先级）
   - 语义重叠（两处说同一件事但措辞不同）
   - 上下文断裂（引用了未定义的概念 / 缩写）

4. **上层规则重复**：
   - 对照 AGENTS.md + `docs/agents-governance.md`，列**与上层重复**的条目 → 建议精简到指针
   - 列**与上层冲突**的条目 → 🔴 必明示优先级或撤回

5. **可机械校验执行**：
   - **草稿落盘策略**：把 Stage 1 草稿写入目标路径（在 worktree 或临时 branch，避免污染 main）；若目标是 `skills/<name>.md`，**必须先跑 `./tasks.sh sync-skills`** 重生镜像，否则 `./tasks.sh validate` 中的 `sync-skills-check` 必失败
   - 跑 `./tasks.sh check-structure` + `./tasks.sh check-refs` + `./tasks.sh validate`（收口）
   - 记每条命令退出码 + 错误清单 + root cause + 修复建议
   - 说明 working tree 处置建议（保留供 Stage 3 改写 / `git restore` 丢弃）

6. **信息密度**：找"正确的废话"段落（"代码应保持清晰"/"团队应充分沟通"）+ file:line + 建议删除或具体化

7. **anchor 多余度**：末尾"去哪找 X"指针 > 6 条 → 🟡 砍到 6 内；指针指向废弃 / 重复目标 → 🔴 修

输出：
```
===== BEGIN STAGE-2 AUDIT =====
## 1. 可执行性
- 🔴 / 🟡 / 🟢 + file:line + 问题 + 建议
## 2. 可定位性
- 🔴 缺失锚点: [path → 不存在]
- 🟡 描述不符: [path → 实际是 X，草稿写 Y]
## 3. 内部一致性
- ...
## 4. 上层规则重复
- ...
## 5. 机械校验
- `./tasks.sh check-structure`: exit [N], errors: [...]
- `./tasks.sh check-refs`: exit [N], errors: [...]
## 6. 信息密度
- ...
## 7. anchor 多余度
- ...
## 总结
- 必修 (🔴): N / 建议 (🟡): N
- 是否需要回 Stage 1 重写: YES/NO + 原因
===== END STAGE-2 AUDIT =====
```

约束：不重写草稿、不擅自重排结构；若发现需结构性改动，标 🔴 在 Stage 3 prompt 中说明让 FINALIZER 决定。

audit-only 模式：`STAGE-1 DRAFT` 块填目标文件当前内容，块首标 `# Target: <path>`；设计说明可写"既有文本审计"或省略。

```
===== BEGIN STAGE-1 DRAFT =====
[PASTE STAGE-1 DRAFT + 设计说明 HERE]
===== END STAGE-1 DRAFT =====
```
===== END STAGE-2-AUDITOR PROMPT =====
````

**Artifact**：STAGE-2 AUDIT 块（7 维度逐条 + 总结）+ 三命令退出码 + working tree 处置建议。
**Handoff to Stage 3**：audit 完整。总结若说"回 Stage 1 重写: YES"则回 Stage 1 修订后重跑 Stage 2，否则进 Stage 3。

### Stage 3 — FINALIZER（fresh subagent，**例外**：必读 Stage 2 AUDIT）

````
===== BEGIN STAGE-3-FINALIZER PROMPT =====
综合 Stage 1 草稿 + Stage 2 审计意见，**产出 commit-ready 最终文本**。

执行要求：
1. **必修 (🔴) 全部落地**：每条 🔴 要么修掉、要么明示拒绝原因——**拒绝时必须 cite 仓库具体文件 / 行 / 契约值作为反证**（如「audit 说 `docs/X.md` 不存在，但实测 `ls docs/X.md` 退出码 0」）；空洞理由（"上下文有意如此" / "不影响主流程"）不接受
2. **建议 (🟡) 处理**：本次直接修 OR 在终稿末尾"已知 follow-up"段落列出（含 file:line + 描述）。**不允许放 `<!-- TODO -->` 又不在 follow-up 列出**
3. **不引入审计未提及的新内容**——若发现必要相邻改动，标 **SCOPE-EXPANSION**（内容 + why），停等裁定
4. **保持锚点正确**：所有跨文件引用真实存在；契约值仍不复制；元规则与边界结构维持
5. **风格统一**：与上层 AGENTS.md / 兄弟 docs 在标题层级、列表风格、jargon 保持一致

输出三个块：
```
===== BEGIN STAGE-3 FINAL =====
[完整最终文本——可直接写入目标路径，无需用户再编辑]
===== END STAGE-3 FINAL =====
```
```
===== BEGIN STAGE-3 CHANGELOG =====
🔴 处理: [audit item ↔ 终稿处理]
🟡 处理: [audit item ↔ 修 或 follow-up 行]
🟢 跳过: [count]
SCOPE-EXPANSION (如有): 内容 + why
拒绝的 🔴 (如有): item + 拒绝原因 + 仓库反证
===== END STAGE-3 CHANGELOG =====
```
```
===== BEGIN STAGE-3 VERIFICATION-PLAN =====
写入路径: [path]
若路径是 skills/<name>.md: 先跑 `./tasks.sh sync-skills` 重生镜像，再继续
验证命令: `./tasks.sh validate`（收口；含 `check-structure` / `check-refs` / `sync-skills-check` / 其他）
期望退出码: 0
失败回退: 按 audit 第 5 节"机械校验" root cause 定位；不通过则回 Stage 3 修订（非 Stage 1）
===== END STAGE-3 VERIFICATION-PLAN =====
```

约束：终稿是真实 commit 候选，不含"// TODO replace this"占位符；不含未存在的路径；不含未定义的概念。

```
===== BEGIN STAGE-1 DRAFT =====
[PASTE STAGE-1 DRAFT HERE]
===== END STAGE-1 DRAFT =====
```

```
===== BEGIN STAGE-2 AUDIT =====
[PASTE STAGE-2 AUDIT HERE]
===== END STAGE-2 AUDIT =====
```
===== END STAGE-3-FINALIZER PROMPT =====
````

**Artifact**：FINAL（终稿全文）+ CHANGELOG + VERIFICATION-PLAN。
**Stop**：用户写入目标路径 →（若是 `skills/<name>.md` 先跑 `./tasks.sh sync-skills`）→ 跑 `./tasks.sh validate` → 全绿即收口。命令失败则回 Stage 3 修订（不必从 Stage 1 重做，除非根因在初稿设计）。

---

## Simplification

- **`full-coauthor`**：3 阶段（默认）。新建文档 / 大改 / 跨层级重组
- **`audit-only`**：跳 Stage 1，从既有文本起步跑 Stage 2 审计，Stage 3 润色。适用：小幅改动（< 30 行、单段内）。Stage 2 的 `STAGE-1 DRAFT` 块填目标文件当前内容，并在块首标 `# Target: <path>`；设计说明可写"既有文本审计"或省略。
- **`mechanical-fix`**：直接改 + 跑 `./tasks.sh validate`（目标在 `skills/<name>.md` 时记得先 `./tasks.sh sync-skills`）。适用：typo / 错锚点 / 单行修订

降级 3 维度：**规模**（< 30 行 + 单段 → audit-only）/ **是否新建**（新建 / 替换 → 必须 full-coauthor）/ **是否动元规则**（动元规则 / 边界 / anti-skip → 必须 full-coauthor，缺起草上下文不可走 audit-only）。
