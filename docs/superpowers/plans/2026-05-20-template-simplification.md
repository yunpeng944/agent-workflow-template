# Template Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `agent-workflow-template` 从 1663 行的三 lane adapter + 349 行 parity test + 198 行 contract README 简化到单 Node lane，干掉两条 🔴（shell RCE + 三 lane config fallback drift 自动消失），并对齐被三 lane 牵连的文档与治理产物——保留全部真实核心资产（9 个 wf-* skill + 双镜像 + 治理 config + tasks.sh 调度）。**同时把 spec 真源从"Notion 真源 + Obsidian working copy + git mirror"翻转为"git 真源 + 可选 Notion 单向 export"，让模板对自身 spec 也采用其宣称的 agent-native workflow**（agent 能 propose spec 演进 / 修订记录依赖 git log / 同步摩擦归零）。

**Architecture:** 三 phase 独立可 ship，无强依赖（C 可在 A/B 任一之前或之后单做）：

- **Phase A — Drop two lanes**：删 `adapters/shell/` + `adapters/python/` + `tools/adapter-parity.test.mjs` 共 ~1400 行；改 `tasks.sh` 直调 Node 入口；重写 `adapters/README.md` 为 Node 实现说明；Node lane 顺手加 config 缺字段 fallback；同步修 8 处文档对"三 lane / POSIX 零依赖 / ADAPTER 切换"的引用
- **Phase B — Skill Orchestration 段去重**：6 个 wf-* skill 的 Orchestration 段复述了 `docs/workflows.md` 总则，改为指针（不动各 skill 独有约束 / Stage prompt）；跑 `./tasks.sh sync-skills` 同步双镜像
- **Phase C — 治理产物对齐 + spec 真源迁移**：(1) **spec 真源翻转** — 删 Notion / Obsidian working-copy 表述 + 删手写修订记录 + 顶部声明 single source；(2) 修 `governance-snippets/11`（描述上限 / 产物格式 / 五段式）+ `skills/README.md` 五段式 + `AGENTS.md:45` "4-stage" 泛化；(3) 折叠 docs（4→2-3 篇，无外部真源豁免）；(4) 砍 snippets 同主题重复版（15→7-9 段）；(5) 加显式 CONTRIBUTING 说明 agent 可贡献 spec 演进

**Tech Stack:** Node.js 20.11+（保留唯一 lane，因 `import.meta.dirname`）；POSIX bash（`tasks.sh` 调度）；JSON config（`agents-md.config.json`）；Markdown（`skills/` + `docs/` + `governance-snippets/`）。

**Codex 二意见承接**：Codex 的核心诊断「过度的核心不在"双镜像"和 workflow taxonomy，而在把很小的治理检查产品化成三语言契约系统」——Phase A 直接对应此诊断；Phase B 是 Codex 对"砍 9 个 skill"立场的修正版（保留 9 个文件、只删每个 skill 内复述总则的 Orchestration 重复段）；Phase C 对齐其余文档摩擦。

**预计净影响**：代码量降 ~50%（不是先前说的 60%——Codex push back 让 skill 文件数保留）；维护成本降一个数量级（加规则 6→3 处同步、加 lane 4→1 处同步）；干掉 2 条 🔴 + 6-8 条 🟡。

---

## Phase A — Drop two lanes（核心，最大价值）

> **依赖**：无。可独立 ship。完成后两条 🔴 自动消失（shell lane 整删 → RCE 没了；fallback 只 Node 一处实现 → 三 lane drift 不存在）。

### File Structure Map

**Delete entirely:**
- `adapters/shell/check_refs.sh` (130 行)
- `adapters/shell/check_structure.sh` (61 行)
- `adapters/shell/sync_skills.sh` (140 行)
- `adapters/python/check_refs.py` (121 行)
- `adapters/python/check_structure.py` (64 行)
- `adapters/python/sync_skills.py` (167 行)
- `adapters/python/README.md`
- `tools/adapter-parity.test.mjs` (349 行)
- 整个 `adapters/shell/` 目录
- 整个 `adapters/python/` 目录

**Modify:**
- `tasks.sh` — 砍 ADAPTER 路由 case 分支，直调 Node 入口
- `adapters/README.md` — 从"三 lane 等价契约 + 变更治理"重写为"Node 实现说明 + config schema"
- `adapters/node/check_refs.mjs` — 加 config 缺字段 fallback（`knownPrefixes ?? []` / `runtimePrefixes ?? []` / `intentionallyAbsentRefs ?? []`）
- `adapters/node/check_structure.mjs` — 加 config 缺字段 fallback（`sectionLineLimits ?? {}` / `expectedHeadings ?? []`）
- `adapters/node/sync_skills.mjs` — 加 config 缺字段 fallback（`mirrorRoots ?? []`）
- `README.md` — 删"3 套等价 adapter" / "POSIX 零依赖" 措辞；写明 "需 Node 20.11+"；改 `ADAPTER=node` 等切换示例为单 lane
- `AGENTS.md` — 同步上述措辞；改"4-stage prompt" → "按各 skill `## Stages` 节定义的接力顺序"（顺手做 C2 的一半）
- `follow-ups.md` — 删 R7（parity test 已删，不再适用）
- `docs/workflows.md` — 删"快速定位" / 其他段对 "ADAPTER" / "parity" 的引用
- `docs/agents-governance.md` — 同上
- `docs/development-conventions.md` — 同上

### Tasks

#### Task A1: 删除 shell + python adapter 目录

**Files:**
- Delete: `adapters/shell/` (整个目录，3 个 .sh 文件)
- Delete: `adapters/python/` (整个目录，3 个 .py 文件 + README.md)

- [ ] **Step 1: 删除两个 adapter 目录**

```bash
git rm -r adapters/shell adapters/python
```

- [ ] **Step 2: 验证文件已删除**

```bash
ls adapters/
```
Expected: 只剩 `README.md` 和 `node/` 子目录

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(adapters): drop shell + python lanes — single Node lane

Removes ~720 lines of equivalent adapter implementations.
Node lane is the single blessed lane (matches Claude Code / Codex CLI
runtime; non-Node hosts unlikely to be the template's audience).

Eliminates two 🔴 findings from RECONCILED-REVIEW:
- shell/check_refs.sh:82 command injection RCE (lane removed)
- three-lane config fallback contract drift (collapses to single lane)
"
```

---

#### Task A2: 修 `tasks.sh` — 砍 ADAPTER 路由

**Files:**
- Modify: `tasks.sh`

- [ ] **Step 1: 读取当前 tasks.sh**

```bash
cat tasks.sh
```
观察 case dispatch 结构，特别是 ADAPTER 变量解析的 9-10 行 + 每个 target case 内 `case "$ADAPTER" in shell|python|node)` 分支。

- [ ] **Step 2: 用 Edit 工具替换路由逻辑**

把所有 `case "$ADAPTER" in ... node) "$NODE" adapters/node/<file>.mjs ;; ...` 简化为直接 `"$NODE" adapters/node/<file>.mjs`。

新 tasks.sh 应保留 target 结构（`validate` / `check-structure` / `check-refs` / `sync-skills` / `sync-skills-check`），但删除：
- 顶部 ADAPTER 变量解析（如 `ADAPTER="${ADAPTER:-shell}"`）
- 每个 target 内的 `case "$ADAPTER" in` 分支
- 删除 `parity` target（parity test 即将在 Task A3 删除）

保留：`set -euo pipefail`、`NODE="${NODE:-node}"`、AGENTS_MD_ROOT 设置、各 target 的 case 入口。

- [ ] **Step 3: 验证修改后的 tasks.sh 可跑**

```bash
./tasks.sh validate
```
Expected: 三个 check（structure / refs / sync-skills-check）依次跑过，全绿。

```bash
./tasks.sh check-structure
./tasks.sh check-refs
./tasks.sh sync-skills-check
```
Expected: 每个 exit 0。

- [ ] **Step 4: 验证 ADAPTER 变量已不再起作用（无害降级）**

```bash
ADAPTER=shell ./tasks.sh validate
```
Expected: 与不带 ADAPTER 行为一致（即直调 Node lane），不报"unknown adapter"——降级到默认即可。可选：在 tasks.sh 加一行 `if [ -n "${ADAPTER:-}" ]; then echo "Note: ADAPTER variable is deprecated; only Node lane available" >&2; fi`。

- [ ] **Step 5: Commit**

```bash
git add tasks.sh
git commit -m "refactor(tasks): drop ADAPTER routing — direct Node invocation

tasks.sh now directly invokes adapters/node/*.mjs without case dispatch.
ADAPTER env var is silently ignored (deprecation note printed to stderr).
"
```

---

#### Task A3: 删 `tools/adapter-parity.test.mjs` + 清 `follow-ups.md` R7

**Files:**
- Delete: `tools/adapter-parity.test.mjs` (349 行)
- Modify: `follow-ups.md` — 删 R7 条目

- [ ] **Step 1: 删 parity test**

```bash
git rm tools/adapter-parity.test.mjs
```

- [ ] **Step 2: 确认 tools/ 目录是否还有其他文件**

```bash
ls tools/
```
若 tools/ 为空，可顺手 `rmdir tools/` 或保留作未来用。

- [ ] **Step 3: 读 follow-ups.md 找到 R7 条目**

```bash
grep -n "^R7\|parity\|kebab-case\|name === stem\|字节级" follow-ups.md
```
找到关于 parity test 缺 2 项 case 的整段（约 L1-19）。

- [ ] **Step 4: 用 Edit 删除 R7 整段**

R7 是关于"parity test 缺 kebab-case + 字节级一致 case"——三 lane 删除后这条不再适用。完整删除 R7 标题 + 描述。

- [ ] **Step 5: 验证 follow-ups.md 仍有效**

```bash
cat follow-ups.md | head -30
```
确认结构未坏。

- [ ] **Step 6: Commit**

```bash
git add follow-ups.md tools/
git commit -m "chore(tests): drop adapter-parity test — single lane no parity needed

Removes 349-line parity test that compared shell/python/node lane outputs.
With shell + python lanes dropped (Task A1), parity has no second lane
to compare against.

Removes R7 follow-up (covered the parity coverage gap which is now moot).
"
```

---

#### Task A4: 重写 `adapters/README.md` + Node lane 加 config fallback

**Files:**
- Modify: `adapters/README.md` (198 行 → 预计 ~40-60 行)
- Modify: `adapters/node/check_refs.mjs:16-19` (config 索引点)
- Modify: `adapters/node/check_structure.mjs` (config 索引点)
- Modify: `adapters/node/sync_skills.mjs:40` (config 索引点)

- [ ] **Step 1: 在 Node lane 加 config fallback — `check_refs.mjs`**

读 `adapters/node/check_refs.mjs:16-19`，找到 `CONFIG.knownPrefixes` / `CONFIG.runtimePrefixes` / `CONFIG.intentionallyAbsentRefs` 直接索引点。

用 Edit 改为：
```javascript
const KNOWN_PREFIXES = CONFIG.knownPrefixes ?? [];
const RUNTIME_PREFIXES = CONFIG.runtimePrefixes ?? [];
const INTENTIONALLY_ABSENT = CONFIG.intentionallyAbsentRefs ?? [];
```

- [ ] **Step 2: 同样改 `check_structure.mjs`**

找到 `CONFIG.expectedHeadings` / `CONFIG.sectionLineLimits` 索引点，改为：
```javascript
const EXPECTED_HEADINGS = CONFIG.expectedHeadings ?? [];
const SECTION_LIMITS = CONFIG.sectionLineLimits ?? {};
```

- [ ] **Step 3: 同样改 `sync_skills.mjs`**

找到 `CONFIG.mirrorRoots` 索引点（约 L40），改为：
```javascript
const MIRROR_ROOTS = CONFIG.mirrorRoots ?? [];
```

- [ ] **Step 4: 验证 fallback 行为（手工测试）**

```bash
# 构造缺字段的临时 config
cp agents-md.config.json /tmp/agents-md.config.json.backup
node -e "const c=require('./agents-md.config.json'); delete c.knownPrefixes; require('fs').writeFileSync('agents-md.config.json', JSON.stringify(c, null, 2))"

# 跑 validate 应不抛 TypeError
./tasks.sh check-refs
```
Expected: 不抛 `Cannot read properties of undefined`，可能报"all refs OK"或类似 success（因为缺 knownPrefixes 时 ref 检查全空跳过）。

```bash
# 恢复 config
mv /tmp/agents-md.config.json.backup agents-md.config.json
```

- [ ] **Step 5: 重写 `adapters/README.md`**

原文档是"三 lane 等价契约 + 变更治理"，全部改写为 Node 实现说明。Write 完整新内容：

```markdown
# Node adapter

Node 实现 `agents-md.config.json` 三个治理入口：

- `check_structure.mjs` — AGENTS.md 二级标题集合与顺序 + 各节行数上限校验
- `check_refs.mjs` — AGENTS.md / README.md 等文档内 markdown link 路径存在性校验
- `sync_skills.mjs` — `skills/wf-*.md` 真源 → `.claude/skills/` + `.agents/skills/` 双镜像同步

## 运行环境

- Node 20.11+（用 `import.meta.dirname`）
- 仅依赖 Node stdlib（`node:fs` / `node:path` / `node:assert`）
- 零 npm / pnpm / package.json

## Config schema

`agents-md.config.json` 字段（全部可选，缺失字段按下表 fallback）：

| 字段 | 类型 | Fallback | 用途 |
|---|---|---|---|
| `expectedHeadings` | `string[]` | `[]` | AGENTS.md 应有的二级标题集合 + 顺序 |
| `sectionLineLimits` | `{ heading: number }` | `{}` | 每个二级标题节的行数上限 |
| `knownPrefixes` | `string[]` | `[]` | 已知合法路径前缀（如 `skills/` `docs/`） |
| `runtimePrefixes` | `string[]` | `[]` | 运行时生成的路径前缀（如 `.claude/`），check_refs 跳过 |
| `intentionallyAbsentRefs` | `string[]` | `[]` | 显式声明"暂不存在"的路径白名单 |
| `mirrorRoots` | `string[]` | `[]` | skill 真源 → 镜像的目标根（`.claude/skills` / `.agents/skills`） |

## 入口契约

- 全部入口读 `AGENTS_MD_ROOT` env var（默认仓库根），cwd 不敏感
- 退出码：`0` 全绿；`1` 有违规
- 错误消息写 stderr；成功写 stdout（如 `PASSED`）

## 生成产物格式

`sync_skills.mjs` 写入镜像时，每份 SKILL.md 首行必须是 `---`（Anthropic SKILL.md spec 硬约束），格式：

\`\`\`
---
name: wf-<kebab-case>
description: <≤500 chars>
<其他 frontmatter 字段 verbatim 透传>
---
<!-- generated · do not edit · source: skills/wf-<name>.md -->

<skill body>
\`\`\`
```

- [ ] **Step 6: 验证 README 改写没破坏 sync-skills**

```bash
./tasks.sh sync-skills-check
```
Expected: PASSED。

- [ ] **Step 7: Commit**

```bash
git add adapters/README.md adapters/node/*.mjs
git commit -m "refactor(adapters): rewrite README as Node-only implementation note

- adapters/README.md: 198 lines → ~60 lines, removes three-lane contract
  language, keeps config schema + entry contract + product format
- adapters/node/*.mjs: add config field fallback (?? [] / ?? {}) per
  schema; previously assumed all fields present, would TypeError on missing

Closes the second 🔴 from RECONCILED-REVIEW (three-lane fallback drift)."
```

---

#### Task A5: 修 `README.md` + `AGENTS.md` 措辞

**Files:**
- Modify: `README.md` — 删"3 套等价 adapter / POSIX 零依赖"措辞；写明"需 Node 20.11+"；改 `ADAPTER=` 切换示例
- Modify: `AGENTS.md` — 同上 + 顺手把 L45 "4-stage prompt" 改为 "按各 skill `## Stages` 节定义"

- [ ] **Step 1: grep `README.md` 找所有相关引用**

```bash
grep -n "三 lane\|3 lane\|3 套等价 adapter\|adapter\|ADAPTER=\|POSIX 零依赖\|POSIX bash\|jq\|shell\|python" README.md
```

- [ ] **Step 2: 用 Edit 逐条改 README.md**

主要改动点（用 Edit 工具）：
- "**3 套等价 adapter（shell / python / node）**" → "**Node adapter**"
- "POSIX bash + jq + awk，绝大多数 Unix 预装" → "需 Node 20.11+（仅依赖 Node stdlib）"
- "`ADAPTER=shell|python|node` 切 lane（默认 shell）" → 整段删除
- "`ADAPTER=python ./tasks.sh validate` / `ADAPTER=node ./tasks.sh validate`" → 删除
- 任何提到 `tools/adapter-parity.test.mjs` 的链接 → 删除

- [ ] **Step 3: grep `AGENTS.md` 找所有相关引用**

```bash
grep -n "三 lane\|3 lane\|3 套等价 adapter\|ADAPTER=\|POSIX bash\|adapter\|4-stage prompt" AGENTS.md
```

- [ ] **Step 4: 用 Edit 逐条改 AGENTS.md**

主要改动点：
- "**3 套等价 adapter（shell / python / node）消费**" → "**Node adapter 消费**"
- "POSIX bash，零依赖" → "POSIX bash 调度，Node 20.11+ 实现 adapter"
- "`ADAPTER=shell|python|node`" 整段删
- "POSIX 即可跑" → "Node 20.11+ 即可跑"
- `AGENTS.md:45` "按 SKILL.md 内 **4-stage prompt** 手动接力" → "按 SKILL.md `## Stages` 节定义的接力顺序"
- "改 adapter 行为契约（[adapters/README.md](adapters/README.md) MUST 节）—— 属契约变更，需同步全 lane + parity test" → "改 adapter 行为 — 改 `adapters/node/*.mjs` 并验证 `./tasks.sh validate` 全绿"

- [ ] **Step 5: 验证 AGENTS.md 结构 lint 通过**

```bash
./tasks.sh check-structure
```
Expected: PASSED（`expectedHeadings` 在 `agents-md.config.json` 内未改，AGENTS.md 二级标题集合应保持不变）。

- [ ] **Step 6: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: align README + AGENTS.md to single Node lane

- Drop 'three equivalent adapters' / 'POSIX zero-dep' language
- Specify Node 20.11+ runtime requirement (uses import.meta.dirname)
- Remove ADAPTER= switching examples
- Fix AGENTS.md:45 '4-stage prompt' overgeneralization → 'per-skill Stages'
"
```

---

#### Task A6: 修 `docs/*` + 其他散落引用

**Files:**
- Modify: `docs/workflows.md` — "快速定位" 等段对 ADAPTER / parity 的引用
- Modify: `docs/agents-governance.md`
- Modify: `docs/development-conventions.md`

- [ ] **Step 1: grep 三篇 docs**

```bash
grep -n "adapter\|ADAPTER\|parity\|三 lane\|3 lane\|POSIX 零依赖\|POSIX bash" docs/workflows.md docs/agents-governance.md docs/development-conventions.md
```

- [ ] **Step 2: 逐条用 Edit 改**

每处引用按场景改：
- "三 lane 等价" → "Node adapter"
- "ADAPTER=node|python|shell" → 删
- "`./tasks.sh parity`" → 删（target 已删）
- "POSIX 零依赖" → "Node 20.11+ 实现 adapter，POSIX bash 调度"

- [ ] **Step 3: 验证全套 check 通过**

```bash
./tasks.sh validate
```
Expected: PASSED（含 check-structure / check-refs / sync-skills-check）。

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: clean three-lane references in docs/

- workflows.md: drop ADAPTER switching tips + parity target reference
- agents-governance.md: align to single Node adapter
- development-conventions.md: same
"
```

---

#### Task A7: Phase A 收尾验证

- [ ] **Step 1: 全套 validate**

```bash
./tasks.sh validate
```
Expected: 全绿 (check-structure PASSED + check-refs PASSED + sync-skills-check PASSED)。

- [ ] **Step 2: 验证镜像未漂移**

```bash
./tasks.sh sync-skills-check
```
Expected: PASSED。

- [ ] **Step 3: 验证两条 🔴 已消失**

```bash
# 1. shell RCE 已消失（lane 不存在）
test ! -d adapters/shell && echo "OK: shell lane removed"

# 2. config fallback drift 已消失（只有 Node 一处实现，且已加 fallback）
node -e "
const c = require('./agents-md.config.json');
delete c.knownPrefixes;
require('fs').writeFileSync('agents-md.config.json', JSON.stringify(c));
" 
./tasks.sh check-refs && echo "OK: missing-field fallback works"
git checkout agents-md.config.json  # 恢复
```

- [ ] **Step 4: git log 看一下 Phase A 5-7 个 commit**

```bash
git log --oneline | head -10
```

- [ ] **Step 5: Phase A 完成，等用户决定是否进 Phase B**

---

## Phase B — Skill Orchestration 段去重

> **依赖**：无（与 Phase A 独立）。完成后 `docs/workflows.md` 成为 6 个 skill 的统一总则真源，改总则只需 1 处同步。

### File Structure Map

**No new files.** Modify only existing wf-* skill sources:

- Modify: `skills/wf-coding-relay.md` — Orchestration 段从复述总则改为指针
- Modify: `skills/wf-red-team.md` — 同上
- Modify: `skills/wf-convoy-refactor.md` — 同上
- Modify: `skills/wf-incident-rescue.md` — 同上
- Modify: `skills/wf-second-opinion.md` — 同上
- Modify: `skills/wf-bake-off.md` — 同上
- 镜像（`.claude/skills/` + `.agents/skills/`）通过 `./tasks.sh sync-skills` 自动重生

**注意**：保留各 skill 的**独有**约束（如 wf-code-review 的"不许猜规格" / wf-red-team 的"不许暴露 hint" / wf-bake-off 的"判据冻结"），只删复述 `docs/workflows.md` 总则的部分（调度优先级 / role slots 通用模式 / dispatch ledger）。

### Tasks

#### Task B1: 验证 `docs/workflows.md` 总则段已存在

- [ ] **Step 1: 读 `docs/workflows.md` 检查关键总则段**

```bash
grep -n "^## " docs/workflows.md
```
Expected：应已有以下段落（实测仓库已有）：
- `## Role / Model 映射 / Vendor 字典` (L5)
- `## 调度优先级（CLI → host-specific subagent → fail-fast）` (L16)
- `## Preset Index` (L42)
- `## 三层边界（workflow 特有）` (L68)

若上述段都在，Task B1 跳过。若缺，在 `docs/workflows.md` 新增对应总则段（用 Write 工具完整写入）。

- [ ] **Step 2: 确认总则段内容能被 6 个 skill 引用**

每个 wf-* skill 的 Orchestration 段当前重复了"调度优先级 / role slots"——这些都对应 `docs/workflows.md:16-67` 已有内容。直接指针化即可。

---

#### Task B2: 修 6 个 wf-* skill 的 Orchestration 段

**通用改动模式**：

每个 skill 的 Orchestration 段当前包含：
```markdown
- **preset**: ... 见 [docs/workflows.md](...) 「Role / Model 映射 / Vendor 字典」节查 ...
- **调度优先级**：CLI (`claude -p` / `codex exec`) → host subagent (...) → fail-fast
- **role slots**: PLANNER / IMPLEMENTER / REVIEWER (...)
- **evaluator stage**: ... fresh subagent (...)
- **特有约束**: <skill 独有>
- 详细 model 映射 / host-specific routing / 调度执行约束 / dispatch ledger / single-role workflow preset 例外 → [docs/workflows.md](...)
```

改为：
```markdown
- **preset**: 见 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节
- **role slots**: PLANNER / IMPLEMENTER / REVIEWER (本 skill 实际使用的角色)
- **特有约束**: <skill 独有>（保留）
- 通用调度行为（优先级 / dispatch / fresh subagent / single-role preset 例外）→ [docs/workflows.md](../docs/workflows.md)
```

净效果：每个 Orchestration 段从 ~7-10 行 bullets 砍到 ~3-4 行。保留各 skill 独有的"特有约束"段。

#### Task B2.1: 修 `skills/wf-coding-relay.md`

- [ ] **Step 1: 读 wf-coding-relay.md 找到 Orchestration 段**

```bash
grep -n "^## Orchestration" skills/wf-coding-relay.md
```

- [ ] **Step 2: 用 Edit 替换通用部分为指针**

保留：
- `preset` 单行（指向 workflows.md）
- `role slots` 单行（本 skill 用 PLANNER / IMPLEMENTER / REVIEWER）
- `特有约束`（独有部分，原文照搬）
- `调用语法` 单行
- `Stage prompt 来源` 单行

删除：
- 复述"调度优先级"完整描述
- 复述"evaluator stage"通用规则（保留具体到本 skill 的 evaluator slot 指定）
- 复述"详细 model 映射 / dispatch ledger"

- [ ] **Step 3: 跑 sync-skills 同步两份镜像**

```bash
./tasks.sh sync-skills
```

- [ ] **Step 4: 验证镜像同步成功**

```bash
./tasks.sh sync-skills-check
```
Expected: PASSED。

- [ ] **Step 5: Commit**

```bash
git add skills/wf-coding-relay.md .claude/skills/wf-coding-relay/ .agents/skills/wf-coding-relay/
git commit -m "refactor(skills): pointer-ize Orchestration general rules in wf-coding-relay

Removes duplicated general rules (dispatch priority / fresh subagent /
dispatch ledger) that already exist in docs/workflows.md.
Keeps skill-unique constraints intact.
"
```

#### Task B2.2 - B2.6: 重复同样模式给其余 5 个 skill

按相同 5-step 模式处理：
- `skills/wf-red-team.md`
- `skills/wf-convoy-refactor.md`
- `skills/wf-incident-rescue.md`
- `skills/wf-second-opinion.md`
- `skills/wf-bake-off.md`

每个 skill 独立 commit。

**注意 wf-incident-rescue**：352 行最长 skill；Orchestration 段去重外，可顺手砍 Stage 1/2 prompt 内部的重复部分（如 reproducer 脚本格式说明可指针化到 `docs/development-conventions.md`，如果合适）。这是可选优化，不强求。

---

#### Task B3: Phase B 收尾验证

- [ ] **Step 1: 全套 validate**

```bash
./tasks.sh validate
```
Expected: 全绿。

- [ ] **Step 2: 检查 `skills/wf-code-review.md:240` 的 follow-up 是否仍存在**

`skills/wf-code-review.md` 自承"复述 docs/workflows.md 中的总则；后续若全部 wf-* 一起降重复，再统一指针化"——Phase B 已落地这条 follow-up，可以删除该段尾注。

- [ ] **Step 3: 计算节省的行数**

```bash
wc -l skills/wf-*.md
```
预计每个 skill 减 5-10 行（×6 = 30-60 行净减）。看起来不多，但**改总则只需 1 处同步**这个维护成本降幅是质变。

---

## Phase C — 治理产物对齐 + spec 真源迁移

> **依赖**：无（与 Phase A/B 独立）。**关键设计变更**：本 phase 把 spec 真源从"Notion 真源 + Obsidian working copy + git mirror"翻转为"git 真源 + 可选 Notion 单向 export"，让 spec 演进有人 + agent 双向通道（agent 在 git 上 propose → 作者 review merge）。Task C0 前置必做，C4 折叠依赖 C0 完成后才能解锁 bootstrap-spec.md 的"外部真源豁免"。

### File Structure Map

**Modify:**
- `docs/bootstrap-spec.md:3` — working-copy 表述改为 single-source 声明
- `docs/bootstrap-spec.md:345-349` — 删手写修订记录（依赖 git log）
- `docs/agents-governance.md` / `docs/development-conventions.md` — audit + 删任何 Notion / Obsidian / working-copy 表述（若有）
- `governance-snippets/11-skill-codegen-source-of-truth.md:21,26-33` — 描述上限 / 产物格式 / 五段式（独立修复，与 spec 真源迁移无关）
- `skills/README.md:9-10` — 五段式描述对齐实际
- `AGENTS.md:45` — "4-stage prompt" 泛化（若 Phase A Task A5 已改，跳过）
- `governance-snippets/README.md` — 顶部加 "paste 库定位" 声明 + 删被砍 snippet 索引行

**Delete:**
- 同主题重复版 snippet（候选：04↔13 / 10↔15，需逐对 audit）

**Create:**
- `CONTRIBUTING.md`（仓库根）— 显式化 spec 演进流程：git 真源 / human + agent 均走 PR / 不走 Notion 回流

**Optionally collapse (after C0):**
- `docs/bootstrap-spec.md` → 合并进 `docs/agents-governance.md` 作 "## Bootstrap Spec" 节
- `docs/development-conventions.md` → 合并进 `agents-governance.md` 或保留独立

### Tasks

#### Task C0: spec 真源迁移（前置，必须最先做）

**Files:**
- Modify: `docs/bootstrap-spec.md:3` + L345-349
- Modify: `docs/agents-governance.md`（若 audit 发现相似表述）
- Modify: `docs/development-conventions.md`（同上）
- Modify: 其他 docs / snippets 内 Notion / working-copy 引用

- [ ] **Step 1: audit 全部 docs + snippets 内的真源相关表述**

```bash
grep -rn "Notion\|Obsidian\|working copy\|working-copy\|AgentSpace\|34199080acdf81dd8d4cf30c3bda7e1a\|cp 同步\|回流前" docs/ governance-snippets/ AGENTS.md README.md
```
记录所有命中点。

- [ ] **Step 2: 改 `docs/bootstrap-spec.md:3`（顶部真源声明）**

把现有：
```markdown
> **真源**：本仓 `docs/bootstrap-spec.md`。另有 working copy 在 Obsidian (`AgentSpace/40-agent-autonomy-bootstrap-spec.md`) 与 Notion (`34199080acdf81dd8d4cf30c3bda7e1a`)，改动以本仓为准；working copy 仅供作者编辑使用，回流前需 cp 同步到本仓。
```

改为：
```markdown
> **真源**：本仓 `docs/bootstrap-spec.md` 是 single source of truth。spec 演进流程见根目录 `CONTRIBUTING.md`——人或 agent 都通过 git PR 提议改动，作者 review merge。不走 Notion / Obsidian 等外部工具回流（会绕过 PR review）。
```

- [ ] **Step 3: 删 `docs/bootstrap-spec.md:345-349` 手写修订记录段**

读 L343-349 段（含 `---` 分隔符 + `## 修订记录` heading + 两条 bullet），整段删除：
```markdown
---

## 修订记录

- **2026-04-29**：初版从 Notion 同步。
- **2026-05-14**：合并原 v2 主规范（Layer 1/2/3 + 参考来源）进本文件，单文件自包含；新增 §1.7 2026 实践补丁、§2.3 删除候选信号；场景二改名"重审 Bootstrap"。原 v2 page 已不再被本文档引用，可在 Notion UI 手动 archive。
```

理由：git log 已经是 commit 真源，手写 changelog 注定漂移。

- [ ] **Step 4: audit 其他 docs / snippets 内 Notion / working-copy 引用**

按 Step 1 grep 结果逐处用 Edit 处理：
- 删 Notion / Obsidian / working-copy 引用（不必每个 doc 都加完整真源声明，仅删冗余表述）
- 保留 evidence cite（如 "CommandTest 2026-05 审计实证" 这类来源标注是合法的，与"working copy / 同步 / 回流"等真源表述不同）

- [ ] **Step 5: 验证 check-refs + check-structure**

```bash
./tasks.sh validate
```
Expected: PASSED。bootstrap-spec.md 章节标题改动后，确认 docs/agents-governance.md 或其他文件对 bootstrap-spec.md 内部 anchor 的 link 未坏。

- [ ] **Step 6: Commit**

```bash
git add docs/ governance-snippets/
git commit -m "refactor(docs): flip spec source-of-truth — git is now single source

Removes Notion / Obsidian / working-copy language across docs and
snippets. Deletes hand-written changelog at bootstrap-spec.md (git log
is authoritative).

Rationale: spec consumers are agents reading git. If git is mirror,
agent-proposed changes get clobbered by next cp from Notion — breaks
the agent-native workflow this template advocates. Now spec evolution
has a real two-way channel (human + agent both via PR).

Follow-up: CONTRIBUTING.md will document the new flow explicitly
(Task C5).
"
```

---

#### Task C1: 修 `governance-snippets/11-skill-codegen-source-of-truth.md`

**Files:**
- Modify: `governance-snippets/11-skill-codegen-source-of-truth.md:21,26-33`

- [ ] **Step 1: 读 L20-35 区段**

```bash
sed -n '20,35p' governance-snippets/11-skill-codegen-source-of-truth.md
```

- [ ] **Step 2: 用 Edit 修三处**

- `description ≤ 200 字符` → `description ≤ 500 字符`
- 产物格式 `<!-- generated --> --- frontmatter ---` → `--- frontmatter --- <!-- generated -->`
- 五段式 `Role / Goal / Boundaries / Validation / Output` → `Goal / Orchestration / When to use / Stages / Simplification`（或改为"按 skill 类型自定结构"）

- [ ] **Step 3: Commit**

```bash
git add governance-snippets/11-skill-codegen-source-of-truth.md
git commit -m "fix(snippets): correct skill codegen snippet to match implementation

- description limit: 200 → 500 (actual cap in adapters/node/sync_skills.mjs:68)
- generated header order: frontmatter first, then HTML comment
- skill structure: drop fictitious '5-section Role/Goal/Boundaries/...'
  use actual 'Goal/Orchestration/When to use/Stages/Simplification'
"
```

---

#### Task C2: 修 `skills/README.md:9-10` 五段式描述

- [ ] **Step 1: 读 L1-20**

```bash
sed -n '1,20p' skills/README.md
```

- [ ] **Step 2: Edit 把"五段式 Role/Goal/Boundaries/Validation/Output" 改为实际结构**

改为 "Goal / Orchestration / When to use / Stages / Simplification（部分 skill 含 'When to use' 内嵌 'Skip if' 子段）"。

- [ ] **Step 3: Commit**

```bash
git add skills/README.md
git commit -m "fix(skills): correct README structure description to match wf-* sources"
```

---

#### Task C3: 砍 `governance-snippets/` 同主题重复版

**前置**：Task C0 已完成。spec 真源翻转后，snippets 不再有"作者外部真源 / evidence trail 不能碰"的豁免——除非 snippet 顶部明确声明外部真源（同 bootstrap-spec.md:3 模式），否则按 single-source-in-git 规则处理。

**evidence cite vs 真源声明区分**：
- ✅ 保留：snippet 引用 "CommandTest 2026-05 审计实证" / "本仓库 (CommandTest / mybot) 2026-05-14" 这类**来源标注**——属于 evidence trail，不是真源声明
- ❌ 删除：snippet 含"另有 working copy 在 X" / "改动需先在 Y 改" 这类**外部真源声明**——已被 C0 全局清掉

**评估候选删除对**（需读片段内容确认是否真"同主题两版本"）：

```bash
# 列出全部 snippets
ls governance-snippets/

# 候选删除对（用 head 看每段开头判断主题）
head -10 governance-snippets/04-*.md governance-snippets/13-*.md
head -10 governance-snippets/10-*.md governance-snippets/15-*.md
head -10 governance-snippets/06-*.md governance-snippets/15-*.md
```

- [ ] **Step 1: 逐对判断保留哪个版本**

判据：(a) 更短 + 更明确具体 → 保留；(b) 更"哲学派"或抽象 → 删；(c) 引用证据更新 → 保留。

- [ ] **Step 2: 删 ~5-7 个重复版**

```bash
git rm governance-snippets/<chosen>.md
```

- [ ] **Step 3: 修 `governance-snippets/README.md`** — 移除被删片段的索引行 + 顶部加一句:

```markdown
> **定位**：本目录是 paste 素材库，下游按需挑一两段；模板自身不强制采用任一。
```

- [ ] **Step 4: 验证 check-refs 通过**

```bash
./tasks.sh check-refs
```
Expected: PASSED（被删 snippet 不应在其他 doc 内有 link 残留；若有，需先修引用方）。

- [ ] **Step 5: Commit**

```bash
git add governance-snippets/
git commit -m "chore(snippets): drop same-topic duplicate versions (15→8 segments)

- Keep more-evidence-based / shorter versions
- Add 'paste-library' positioning note to governance-snippets/README.md
"
```

---

#### Task C4: 折叠 `docs/` 4 篇 → 2-3 篇

**前置**：Task C0 已完成。spec 真源翻转后 `bootstrap-spec.md` 不再有"外部真源 mirror 不能折叠"的豁免——可作为普通 doc 文件正常合并。

**决策点**：把 `bootstrap-spec.md`（345 行，C0 已删 5 行手写 changelog）合并进 `agents-governance.md` 还是保留独立？把 `development-conventions.md` 合并进 `agents-governance.md` 还是保留？

**推荐合并方案**（默认走，无需追问）：
- `docs/bootstrap-spec.md` → 合并进 `docs/agents-governance.md` 末尾作 "## Bootstrap Spec" 节（含 Layer 1/2/3 三个 ### 子节）
- `docs/development-conventions.md` → 保留独立（与 governance / workflows 主题不同，混进 governance 会冲淡主题）
- `docs/workflows.md` → 不动（核心调度文档，独立性强）
- 净结果：4 → 3 篇

**激进选项**（仅在用户主动要求时走）：合并 `bootstrap-spec` + `development-conventions` 进 `agents-governance.md` → 4 → 2 篇。

- [ ] **Step 1: 按推荐方案默认执行**（不追问；若用户已声明偏好则按其偏好走）

- [ ] **Step 2: 按选择执行合并**

用 Read 读两个源文件 + Write 合并文件 + git rm 原文件。

- [ ] **Step 3: 修所有 cross-ref**

```bash
grep -rn "docs/bootstrap-spec\|docs/development-conventions" --include="*.md"
```
逐处用 Edit 改 link 路径。

- [ ] **Step 4: 验证 check-refs**

```bash
./tasks.sh check-refs
```

- [ ] **Step 5: Commit**

```bash
git add docs/ AGENTS.md README.md
git commit -m "docs: collapse 4→<N> doc files; update cross-refs"
```

---

#### Task C5: 加 `CONTRIBUTING.md` 显式化 spec 演进流程

**Files:**
- Create: `CONTRIBUTING.md`（仓库根）
- Modify: `README.md` — 末尾加 link
- Modify: `AGENTS.md` — 在「项目特定规则」之前合适位置加 link（让 agent 也能发现这个流程）

- [ ] **Step 1: Write `CONTRIBUTING.md`（仓库根）**

```markdown
# Contributing to agent-workflow-template

本模板的 spec 真源 = git。所有 spec 文件（`docs/` / `AGENTS.md` / `skills/wf-*.md` / `governance-snippets/`）都遵循同一流程。

## 提议 spec 演进

- **人贡献者**：直接编辑 git 文件 + 提 PR；CI 自动跑 `./tasks.sh validate`
- **agent 贡献者**：同样路径——任何 agent（Claude Code / Codex CLI / 其他）都可以在 git 上 propose spec 改动，作者 review merge。**不要**通过 Notion / Obsidian 等外部真源回流，那会绕过 PR review 并让 spec 演进失去 agent 协作通道

## 修 skill 真源

修 `skills/wf-*.md` 后必须跑 `./tasks.sh sync-skills`，同 commit 提交真源 + 两份镜像（`.claude/skills/` + `.agents/skills/`）。这是 Anthropic SKILL.md / OpenAI Codex CLI 互操作的硬约束，不是冗余。

## 修 adapter / config

见 [adapters/README.md](adapters/README.md) 实现说明 + [agents-md.config.json](agents-md.config.json) schema。Node lane 是唯一实现。

## 验证

任何 commit 前都跑 `./tasks.sh validate`（含 check-structure / check-refs / sync-skills-check 三项）。
```

- [ ] **Step 2: 在 `README.md` 末尾加 link**

```bash
grep -n "Contributing\|CONTRIBUTING" README.md
```

如无，在 README.md 末尾合适位置加：

```markdown
## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — git 是 spec 真源；human + agent 都通过 PR 提议 spec 演进。
```

- [ ] **Step 3: 在 `AGENTS.md` 加 link**

在「项目目标」节之后、「优先做什么」之前合适位置加一行：

```markdown
**贡献流程**：见 [CONTRIBUTING.md](CONTRIBUTING.md)——git 是 spec 真源，人 + agent 都走 PR。
```

- [ ] **Step 4: 验证 check-refs + check-structure**

```bash
./tasks.sh validate
```
Expected: PASSED。AGENTS.md 加内容后 sectionLineLimits 不应被突破（"项目目标" 节当前 ~10 行，加 1 行无害）。

- [ ] **Step 5: Commit**

```bash
git add CONTRIBUTING.md README.md AGENTS.md
git commit -m "docs: add CONTRIBUTING.md — explicit spec evolution flow for human + agent

Makes the 'agent can propose spec changes via git PR' workflow explicit.
Closes the loop on Task C0's source-of-truth flip — agents fork-ing
this template now have clear guidance on how to contribute back.
"
```

---

#### Task C6: Phase C 收尾验证

- [ ] **Step 1: 全套 validate**

```bash
./tasks.sh validate
```
Expected: PASSED。

- [ ] **Step 2: 最终 grep 确认无 Notion / working-copy 残留**

```bash
grep -rn "Notion\|Obsidian\|working copy\|working-copy\|AgentSpace\|cp 同步\|回流前" docs/ governance-snippets/ AGENTS.md README.md CONTRIBUTING.md
```
Expected: 空（或仅在 `CONTRIBUTING.md` 内作反向引用 "不要走 Notion 回流" / evidence cite 形式）。

- [ ] **Step 3: 看 git log 整体改动**

```bash
git log --oneline main..HEAD
```

- [ ] **Step 4: 跑 `wc -l` / `git diff --stat` 看代码量净减**

```bash
git diff --stat main..HEAD
wc -l docs/*.md governance-snippets/*.md skills/wf-*.md 2>/dev/null
```

预计净减：Phase A ~1100 行（adapter）+ ~349 行（parity）= ~1450 行；Phase B ~30-60 行（skill 内重复）；Phase C ~视 C3/C4 折叠方案而定（保守 ~300 行 / 激进 ~600 行）。

- [ ] **Step 5: 验证 "spec 演进双向通道" 已建立**

机械检查：
- `CONTRIBUTING.md` 存在 + 被 README.md / AGENTS.md 链接
- `docs/bootstrap-spec.md:3` 已是 single-source 声明（非 working-copy 形式）
- `git log docs/bootstrap-spec.md` 提供权威修订记录（手写 changelog 已删）

---

## Self-Review Checklist

- [ ] **Spec coverage**: 综合推荐版表格 7 项变更 + spec 真源翻转，每项对应到 Phase A/B/C 的具体 task：
  - "adapters/ 三 lane → 单 Node" → Phase A (A1-A6)
  - "tools/adapter-parity 删" → Task A3
  - "skill Orchestration 重复指针化" → Phase B (B2.1-B2.6)
  - "spec 真源翻转 Notion → git" → **Task C0**（前置）+ Task C5（CONTRIBUTING 显式化）
  - "governance-snippets 15→7-8" → Task C3
  - "docs 4→2-3 篇" → Task C4
  - "prompts 保留" → 无 task（保留 = 不动）
  - "真源双镜像保留" → 无 task（保留 = 不动）

  外加从 RECONCILED-REVIEW 顺手承接：
  - 🔴 shell RCE → Task A1（删整个 shell lane）
  - 🔴 config fallback → Task A4
  - 🟡 follow-ups.md:13 stale 行号 → 未单独 task（可在 Phase A 收尾时顺手 Edit）
  - 🟡 "POSIX 零依赖" 文案 → Task A5 / A6
  - 🟡 Node 20.11+ 未明示 → Task A4 / A5
  - 🟡 snippet 11 / skills/README 五段式 → Task C1 / C2
  - 🟡 AGENTS.md:45 "4-stage" 泛化 → Task A5
  - 🟡 `adapters/python/check_structure.py:4` stale 注释 → 自动消失（adapters/python/ 整个目录删）
  - 🟡 governance-snippets paste 库定位声明 → Task C3 Step 3
  - **新增（Codex / 用户对话沉淀）**：spec 演进缺 agent 双向通道 → Task C0 + C5 共同解决

- [ ] **Placeholder scan**: 全部 task 含具体 file:line / 完整代码 / 完整 commit message。无 "TBD" / "implement later"。

- [ ] **Type consistency**: 改动涉及的 config 字段名（`knownPrefixes` / `runtimePrefixes` / `intentionallyAbsentRefs` / `expectedHeadings` / `sectionLineLimits` / `mirrorRoots`）在 Task A4 内三处加 fallback + Task A4 Step 5 重写 README 表都保持一致。

---

## Execution Choice

执行选项（按 superpowers:writing-plans 标准 handoff）：

**1. Subagent-Driven（推荐）** — 用 `superpowers:subagent-driven-development`，每个 task fresh subagent + 两阶段 review。优势：每个 commit 独立 review，错了可单 task 回滚。

**2. Inline Execution** — 用 `superpowers:executing-plans`，本 session 批量执行 + 检查点 review。优势：上下文连续，适合小批量。

**3. 走 wf-coding-relay workflow** — 用 `/wf-coding-relay plan-and-implement` 触发 Stage 1 PLANNER → Stage 2 IMPLEMENTER 接力（PLANNER 段已经由本 plan 覆盖，直接进 Stage 2）。

**4. 只跑 Phase A** — 最大价值 + 干掉两条 🔴 + 独立可 ship，Phase B/C 后续再决定。

**5. Pause** — 看完 plan 不动，等后续决定。
