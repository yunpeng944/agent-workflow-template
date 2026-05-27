# 治理细则全集（guide）

> **定位**：本文从原 `governance-snippets/` 17 段（编号 01-19，含跳号 04/10）机械合并而来，作为统一指导文件被 [AGENTS.md](../AGENTS.md)「自治维护」节引用，进入 agent 必读路径。
>
> **为什么合并**：snippets 原设计为「下游 fork 后按需 paste」的素材库，但实证使用 = 0 —— 既无 agent SOP 触发 paste，也无真实下游 fork 形成 paste 历史（详见 [archive 决策快照](#archive-决策快照-2026-05-27)）。形态本身决定了「**不能自动生效**」：等人触发但没人触发。合并到本文件后被 AGENTS.md 引用，闭合「自动生效」最后一公里。
>
> **当前状态**：本文为**机械合并第一阶段** —— 内容保留原段全文、原 HTML `<!-- prune-candidate -->` 标记、原编号、原 H1。第二阶段将讨论修改 / 去重 / 删除 / 跨段合并，逐条精简。
>
> **来源对照**：原 `governance-snippets/` 目录暂保留作对照，待第二阶段完成后再决定去留。

## archive 决策快照 (2026-05-27)

- 17 段（01,02,03,05-09,11-19）合并入本文。
- 跳号 04/10 历史背景：04 已并入 13（三层边界）· 10 已并入 15（剪枝信号 + 触发审计）· 编号不重排以保历史引用稳定（commit `5232dd9`）。
- 实证证据：扫描真实下游 `CommandTest` 仓库，governance-snippets 16-19 段（hooks / permissions）**0 独立 paste 历史**；02 / 08 / 09 / 11 / 13 / 14 段内容在 `CommandTest` AGENTS.md 中有原料证据，但属抽取来源而非 fork-paste 兑现。
- 第二阶段（待启动）将处理：去重（与 `agents-governance.md` 内容重叠）/ 已被 lint enforcement 替代的 prose 删除 / `prune-candidate` 标记段评估 / 跨段合并整理。

---

# 01 · 元规则

> **元规则**：本文件只保留稳定的入口规则、边界、导航和验证要求。流程细节、实现细节、案例和专题规则放到 `docs/`。更接近修改位置且更具体的局部规则可在局部范围内覆盖上层通用规则。

---
# 02 · 能力假设声明

**能力假设**：本文件假定 agent 为前沿 thinking model（Claude Opus 4.x / GPT-5.x 或同档及以上）。已内化的 SE 常识（TDD、强类型、模块化、结构化错误、Conventional Commits、PR 礼仪、git rebase 语义、长 ctx 懒加载）默认成立，本文件只列项目特异的约束、入口与边界。若使用更弱模型（如 haiku / gpt-4o-mini），需补充 procedural 指引或用 skill 触发执行。

---
# 03 · 规则质量三判据

## 规则质量判据

写入 AGENTS.md 的每条规则必须同时满足"可执行、可判定、可快速定位"，再兼顾人类可读性：

- **可执行**：规则描述了一个具体动作（读什么文件、跑什么命令、写什么测试），不只是劝告或意图声明。
- **可判定**：agent 能机械判断"这条规则是否适用"和"是否被违反"，不依赖主观解读。模糊词（如"必要时"、"通常"、"尽量"）应给出客观触发条件或换为决策树。
- **可快速定位**：相关代码 / 契约 / 真源在 `{{src目录}}` 中能用 grep 找到；引用的路径必须真实存在。

新增规则前自检：**"不能确定一定有用就不要加。"** 不能列出"如果没有这条规则，agent 在什么真实场景会犯什么错"的，一律不加。同样的标准用于决定是否删除已有规则。

---
# 05 · 分层验证策略

## 验证策略

验证分为开发内循环和收口闸门，目标是保留最终可信证据，同时避免每个小修复重复运行完整套件。

- **RED / GREEN 内循环**：优先运行受影响的目标测试（修改 WS router 时先跑对应 `*.test.ts`；修改 schema 或契约时同时跑对应 contract / schema 测试）。
- **review fix 内循环**：先跑覆盖该反馈的目标测试；类型或公共接口受影响时加跑 `typecheck`；文档链接或 AGENTS 导航受影响时加跑 `{{check命令}}`；AGENTS 结构受影响时加跑 `{{lint命令}}`。
- **任务 / Phase 收口**：在 spec review 和 code quality review 都通过后，运行一次 `{{validate命令}}`，作为该阶段的完整证据。
- **最终交付**：主流程必须亲自运行收口验证并读取退出码，**不能只引用 subagent 报告**。
- **高风险改动**：契约、构建配置、跨端边界、共享基础设施、状态布局、协议帧或错误 schema 变更，可在 review fix 后提前运行 `{{validate命令}}`；但同一 Phase 不应因每个小修复机械重复全量验证。
- **派 subagent 时**：prompt 必须写明本次任务的目标测试和收口验证要求；不要默认要求每个窄修复都运行完整 `{{validate命令}}`，除非该修复本身触发高风险条件。

---
# 06 · 治理失效信号 / 何时改 AGENTS.md

## 何时更新 / 修补 AGENTS.md

满足以下任一条件应触发更新或修补：

- 契约变更（同步要求见 AGENTS.md "做契约变更"段）。
- `{{src目录}}` 顶层子目录新增 / 删除、验证路径变化、开发约定变化（技术栈、依赖策略、规则修改）。
- "快速定位"中的文件路径或职责描述与代码实际不一致，或新增高频修改模块未在"快速定位" / "高风险区域"体现。
- AGENTS.md、README 或 docs 对同一命令、路径、字段、默认值出现两种描述。
- "最小流程"中引用的命令或工具不再存在或语义已变。
- agent 在同类任务中反复犯同一类错误——应沉淀为长期规则或由本文件引用的专题文档，而非依赖临时提醒。
- 本文件持续膨胀、混入执行细节或背景材料，影响快速通读和导航效率——应触发拆分、收缩或重组。

## 日常修补 vs 完整 Bootstrap

- **日常修补**（agent 自行执行）：单条路径引用失效修掉、一条规则过时删掉、新增高频模块补一行导航、删除过时条目。
- **完整 Bootstrap**（需人工触发）：项目架构结构性变化、主要技术栈切换、AGENTS.md > **30%** 路径引用失效、最近 **10** 次 agent 任务中 > **3** 次需人工补同类背景。

## 维护责任

- 发现失效信号时，以最小必要范围修补，不借机扩张到无关区域。
- 修补后按任务类型选择验证：仅改 AGENTS 导航或说明文字时执行文档引用校验；触及契约、状态路径、CLI / JSON / 错误码 / schema 说明、验证策略或 `{{src目录}}/contracts/` 时执行完整收口验证。
- 每次更新同时检查是否有过时内容可以删除或合并，**防止只增不减**。

---
# 07 · 真源指针 + 自动校验回路

## 真源

| 真源类别             | 文件 / 入口                             | 自动校验命令       |
| -------------------- | --------------------------------------- | ------------------ |
| 系统契约             | `{{契约真源}}`                          | `{{lint命令}}`     |
| 协议帧 / WS / RPC    | `src/contracts/<protocol>/...`          | `{{validate命令}}` |
| 配置 schema          | `{{schema真源}}`                        | `{{check命令}}`    |
| 路径 / 命令 / 子命令 | `src/state/*-paths.ts`、`src/commands/` | `{{check命令}}`    |

**文档永远不复制契约值**。如需快速定位关键词，只列搜索锚点（protocol topic / method 名 / 字段名 / 状态文件名），完整清单、参数语义、TTL、错误码、schema 以代码为准。

变更触发 → 见 contract checklist（另存于 `docs/agents-governance.md`）。

---
# 08 · Agent 协作机制

## Agent 协作机制

- **上下文导航**：先读本文件，再按任务关键词读对应 `docs/` 文件；禁止一次性 ingest 整个 `docs/`。多文件任务顺序：目录地图 → grep 符号 → 局部 Read → 阶段摘要，不读整目录。

- **Subagent 委派**：仅当任务可独立 / 可并行 / 写入范围在 prompt 中可显式描述时派 subagent；返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。主流程亲自跑收口命令再确认 subagent 报告的成功。

- **优先级**：用户显式指令 > CLAUDE.md / AGENTS.md > project skill > user / plugin skill > 默认 system prompt。skill / subagent / plan 决定执行机制，不替代 contract 同步、目标测试与收口验证。

- **信任边界**：project skill（本仓库 `.claude/` / `.codex/`）可读写本仓库与 `{{state目录}}`；user / plugin skill 不能写 `{{state目录}}`，除非由 project skill 显式委托。

---
# 09 · 验证命令锚点

**验证命令锚点**（prose 不替代命令；harness 退出码是 ground truth）：

| 触发面      | 命令                                      | 何时跑                        |
| ----------- | ----------------------------------------- | ----------------------------- |
| 单测 / 集成 | `{{test命令}}` 或 `{{vitest命令}} <path>` | 开发内循环、改代码后          |
| 类型        | `{{typecheck命令}}`                       | 公共接口 / 类型签名改动后     |
| 文档导航    | `{{check命令}}`                           | AGENTS / docs / README 改动后 |
| AGENTS 结构 | `{{lint命令}}`                            | AGENTS.md 改动后              |
| 收口        | `{{validate命令}}`                        | 任务 / Phase 闸门             |

紧凑版（占空间更少）：

> **验证命令锚点**（prose 不替代命令；退出码是 ground truth）：单测/集成 `{{test命令}}` 或 `{{vitest命令}} <path>`、类型 `{{typecheck命令}}`、文档与 AGENTS 结构 `{{check命令}}` / `{{lint命令}}`、收口 `{{validate命令}}`。

---
# 11 · skill 单源 + 双工具镜像 codegen

## 真源单点 + codegen 双镜像

`skills/<name>.md` 是 skill 模板的**唯一可编辑位置**。两个工具特定镜像由生成器产出，提交进 git，CI 校验漂移。

```
skills/<name>.md                 ← 真源（frontmatter + 五段式正文）
adapters/node/sync_skills.mjs    ← 生成器（写模式 / --check 模式）
.claude/skills/<name>/SKILL.md   ← Claude Code 镜像（generated · committed）
.agents/skills/<name>/SKILL.md   ← OpenAI Codex 镜像（generated · committed）
.prettierignore                  ← 排除两镜像目录
```

frontmatter 约定：`name`（kebab-case，与文件名 stem 一致）+ `description`（≤ 500 字符，可含 1-2 个跨语言别名以扩大隐式触发匹配面）。正文结构：`## Goal` / `## Orchestration` / `## When to use / Skip if` / `## Stages` / `## Simplification`。

生成器输出格式（两镜像字节级一致）：

```
---
name: <name>
description: <description>
---

<!-- generated · do not edit · source: skills/<name>.md -->

<body 原样拷贝>
```

`{{validate命令}}` 链入 `sync:skills --check`：产物 ≠ 真源时退出码 ≠ 0，与 `{{lint命令}}` / `{{check命令}}` 同闸。

**修改流程**：只改 `skills/<name>.md` → 跑生成器 → `git add` 真源 + 两镜像 → 同提交。禁止直接编辑 `.claude/skills/**` 或 `.agents/skills/**`。

---
# 12 · 嵌套子 AGENTS.md（agents.md closest-file-wins）

## 就近规约文件

在每个高风险目录放一份 `<dir>/AGENTS.md`，承载本目录的强约束。根 AGENTS.md 对应段改为 1–2 行指针，不复制下层内容。

```
AGENTS.md                          ← 根：入口 + 通用边界 + 指针
src/contracts/AGENTS.md            ← 就近：契约真源 + 触发条件 + 同步指针
src/<服务端边界>/AGENTS.md         ← 就近：浏览器 / Node.js 边界
src/agents/AGENTS.md               ← 就近：高风险文件修改前自查
```

每份子 AGENTS.md 顶部用 blockquote 显式声明 closest-file-wins：

```markdown
# <dir>/ 子规约

> 本规约就近覆盖根 [AGENTS.md](../../AGENTS.md) "xx" 段；按 agents.md 标准 closest-file-wins 生效。

## ...
```

每份子文件 ≤ 30 行，只放就近细节（触发条件、本目录硬约束、修改前自查），不复制根文件。根文件对应段写：

```markdown
## xx 边界

本边界完整规则就近见 [<dir>/AGENTS.md](<dir>/AGENTS.md)：<一句话摘要 + 一个最关键的命令或路径>。
```

---
# 13 · 三层边界（始终 / 先问后做 / 禁止）

## 边界三层

每次改动按以下三层判定。指令性表述（"始终" / "禁止"）一律按字面执行。

**始终**

- 改动有可观测行为的代码：先读对应 contract（`{{契约真源}}`）。
- 写代码前先写或补一条失败测试，覆盖根因而非症状。
- 任务收口跑 `{{validate命令}}`；契约、构建配置、跨端边界变更提前跑。
- 修改 `AGENTS.md` 或 `docs/`：跑 `{{lint命令}}` 与 `{{check命令}}`。
- 修改 skill 模板：只允许改 `skills/<name>.md`，跑 `{{sync命令}}` 重生镜像。

**先问后做**

- 触发契约变更（条件见 `docs/agents-governance.md`）。
- 跨端边界（浏览器 ↔ Node.js）的能力归属调整。
- 接入第三方凭证或外部服务真实端点。
- 删除或重命名公共 API、CLI 命令、JSON 输出字段。

**禁止**

- `--no-verify` 或 `--force` 绕过验证 / 签名 / 任何 hook。
- 复制契约值到 `AGENTS.md`（指针化即可）。
- 直接编辑 `.claude/skills/` 或 `.agents/skills/` 下任何文件（这些是 generated）。
- 在浏览器边界目录直接或副作用 import `node:*` 模块或 Node-only 文件。

---
# 14 · 模型角色路由

## 模型角色路由

不同任务派给不同模型 / agent；subagent 委派必须显式声明写入范围。

| 任务类型                     | 推荐模型 / agent            | 调度方式                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------- |
| plan / review / 契约决策     | Opus 级 thinking model      | 主流程；或 `.claude/agents/contract-reviewer.md` 子代理 |
| implement / debug / refactor | Sonnet 级 / Codex / GPT-5.x | 主流程；或 `codex:rescue` subagent                      |
| 大批量独立改动               | 多并发 subagent             | 每个 subagent prompt 显式列出写入文件白名单             |

主流程亲自跑收口命令（`{{validate命令}}`），不依赖 subagent 自报成功；subagent 返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。

---
# 15 · 剪枝信号 + 触发式审计（操作化）

## 剪枝信号

满足以下任一即将该规则标为**剪枝候选**：

- 规则在 `{{lint命令}}` / `{{check命令}}` 中无对应 enforcement，且模型审计时 `git log --oneline -50` + `grep` 找不到近期相关代码 / 文档引用证据。
- 规则措辞含"建议 / 尽量 / 通常 / 一般"等非强制副词（违反"指令性"原则）。
- 规则与更近的子 AGENTS.md 或 `docs/` 条款语义重复。

**候选标记方式**：在该规则当行末尾加 HTML 注释 `<!-- prune-candidate: <reason> · <YYYY-MM-DD> -->`，下次审计批量处理。grep `prune-candidate` 即可拉清单。

## 触发式审计

满足以下任一即触发批量审计（**不依赖日历**——agent 项目节奏远快于人类季度）：

- `grep -rn "prune-candidate" AGENTS.md docs/` 返回 ≥ 5 条候选。
- 距上次 `docs(governance): audit ...` commit 已过 50 个项目 commit（`git log --grep="docs(governance): audit" -1` 拿到上次 hash，`git rev-list HEAD ^<hash> --count` 算距离）。
- maintainer 显式触发。

审计步骤：

1. 全文 `grep -rn "prune-candidate" AGENTS.md docs/` 列出全部候选（含可能的子 AGENTS.md）。
2. 对每个候选评估：
   - 能用 lint / hook / test 替代吗？是则删 prose、加机械检查；否则保留。
   - 能并入更近的子 AGENTS.md 吗？是则迁移，根文件改指针。
   - 实际工程已不再需要？是则删。
3. 同步：若变更触及契约或 `expectedHeadings`，按相应 checklist 同步。
4. 跑 `{{validate命令}}` 收口；commit message 用 `docs(governance): audit — <精简变更摘要>`（用于回溯算下次审计触发距离）。

---
# 16 · Claude Code hooks（PreToolUse 机械边界）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

## `.claude/settings.json`（项目级）

`.claude/settings.json` 加 `hooks` 节，agent 触发任意工具调用时自动执行。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | grep -qE '^({{generated前缀}})' && echo '{\"decision\":\"block\",\"reason\":\"generated 镜像 — 改 skills/ 真源后跑 sync 命令\"}' || echo '{}'",
            "timeout": 3
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' | grep -qE '(rm -rf|git push --force|git reset --hard)' && echo '{\"decision\":\"ask\",\"reason\":\"危险命令 — 用户确认\"}' || echo '{}'",
            "timeout": 3
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "{{validate命令}}",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

hook 命令读 stdin JSON（`tool_input` 字段），stdout 写 JSON decision（`decision: block|ask` + `reason`）。返回空对象 `{}` = 默认放行。

## 何时该拦 / 该问 / 该放行

- `block`：100% 确定的违规（编辑 generated 镜像 / 触碰 secret 路径 / 强制改写历史）。
- `ask`：高破坏性但偶有正当用法（`rm -rf` / `git push --force` / `git reset --hard`）——交用户裁定。
- 默认放行：低风险或语义不明的——避免 hook 成为生产力阻塞。

---
# 17 · Codex CLI hooks（确定性脚本兜底）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

## `~/.codex/config.toml`（用户级）或项目级 `.codex/config.toml`

Codex CLI hook 通过 config.toml 声明，命令读 stdin JSON、stdout 写 JSON decision。

```toml
# 写到 ~/.codex/config.toml 全局生效；或项目 .codex/config.toml 项目级生效

[[hooks.pre_tool_use]]
match_tool = "shell"
command = "node {{repo_root}}/scripts/hooks/guard-dangerous-shell.mjs"
timeout_ms = 3000

[[hooks.pre_tool_use]]
match_tool = "apply_patch"
command = "node {{repo_root}}/scripts/hooks/guard-generated-mirror.mjs"
timeout_ms = 3000

[[hooks.stop]]
command = "{{validate命令}}"
timeout_ms = 60000
```

## 示例 hook 脚本（节选）

```js
// scripts/hooks/guard-dangerous-shell.mjs
// stdin: { tool_input: { command: "rm -rf ..." } }
// stdout: { decision: "block" | "ask" | "allow", reason: "..." }
import { readFileSync } from 'node:fs';
const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = input.tool_input?.command ?? '';
if (/rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard/.test(cmd)) {
  console.log(JSON.stringify({ decision: 'ask', reason: '危险命令 — 用户裁定' }));
  process.exit(0);
}
console.log('{}'); // 默认放行
```

## 何时打 hook vs 用 sandbox profile

- **sandbox profile**（`~/.codex/config.toml` 内 `sandbox = "read-only" | "workspace-write" | "danger-full-access"`）：能力级硬约束，agent 无权突破。
- **hooks**：行为级软约束，可 ask 用户裁定、可记日志。
- 通常组合：sandbox 给最低权限基线，hooks 给用户感知 + 审计 trail。

---
# 18 · Claude Code permissions（deny / ask / allow 三档）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

## `.claude/settings.json`（项目级）

permissions 三层 ladder：`deny` > `ask` > `allow`。命中越早越优先。

```json5
{
  "permissions": {
    "deny": [
      "Edit({{generated前缀}}**)",
      "Write({{generated前缀}}**)",
      "MultiEdit({{generated前缀}}**)",
      "Read({{secret 路径}}**)",
      "Bash(rm -rf ./*)",
      "Bash(git push --force *)",
      "Bash(curl * | sh)",
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(npm publish *)",
      "Bash(gh pr merge *)",
      "Bash(docker push *)",
      "WebFetch(domain:internal.company.com)",
    ],
    "allow": [
      "Read(*)",
      "Grep(*)",
      "Glob(*)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(./tasks.sh *)",
    ],
  },
}
```

## "readonly profile"（适合 review / research / audit 类任务）

启用时把 `Edit` / `Write` / `MultiEdit` / `NotebookEdit` 全列 deny；保留 Read / Grep / Glob / 只读 Bash 命令。

```json5
{
  "permissions": {
    "deny": [
      "Edit(*)", "Write(*)", "MultiEdit(*)", "NotebookEdit(*)",
      "Bash(rm *)", "Bash(mv *)", "Bash(git commit *)", "Bash(git push *)",
    ],
    "allow": [
      "Read(*)", "Grep(*)", "Glob(*)",
      "Bash(git status)", "Bash(git diff *)", "Bash(git log *)",
      "Bash(./tasks.sh *)",
    ],
  },
}
```

切换 profile：把 readonly 版存为 `.claude/settings.review.json`，临时 `cp .claude/settings.review.json .claude/settings.local.json` 切换。

---
# 19 · Codex CLI sandbox + approval（readonly profile）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

## Codex sandbox 三档

| sandbox 档 | 能力 | 适用任务 |
|---|---|---|
| `read-only` | 只读文件 + 只读 shell 命令 | code review / research / audit / agent 探索阶段 |
| `workspace-write` | 写 cwd 工作区 + 网络受限 | 实现 / 修 bug / refactor（**默认推荐**） |
| `danger-full-access` | 任意 shell + 任意网络 | 仅本地隔离 VM / 短时 / 显式用户授权 |

## `~/.codex/config.toml`（用户级默认）

```toml
# 全局默认 sandbox + approval — 偏保守
sandbox_mode = "workspace-write"
approval_policy = "untrusted"
# untrusted = 所有未在 trusted_commands 白名单的命令都问用户
# on-failure = 默认放行，失败后才问
# never = 永不问（仅在 sandbox 已隔离时安全）

[[trusted_commands]]
match = "^(git status|git diff|git log|ls|cat|grep|rg|fd)"
```

## 项目级 `.codex/config.toml`（覆盖用户级）

```toml
# 项目强制 readonly profile（review / audit 类项目）
sandbox_mode = "read-only"
approval_policy = "on-failure"

[[trusted_commands]]
match = "^({{repo_root}}/tasks.sh|./tasks.sh) (validate|check-|sync-skills-check)$"
```

## 切 readonly profile（任务级临时）

```bash
codex --sandbox read-only --approval on-failure '<review prompt>'
```

或写入项目 `.codex/profiles/readonly.toml`，用 `codex --profile readonly` 启动。

## 与 hooks 配套

sandbox 是能力级硬约束；hooks（见 `17-codex-cli-hooks.md`）是行为级软约束。常见组合：

- sandbox = `workspace-write`（基线最低权限）
- hooks PreToolUse 拦特定危险命令 → `ask` 用户裁定
- hooks Stop 强制跑 `{{validate命令}}`

---
