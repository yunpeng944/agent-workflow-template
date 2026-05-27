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

**何时用**：放在 AGENTS.md / CLAUDE.md 顶部 blockquote，作为本文件演化的元约束。
**占位符**：无（直接可用，也可把 `docs/` 替换为你的子文档目录名）。
**反模式**：把流程示例、具体命令值、契约字段写进根文件——元规则就是用来挡这些的。

---

> **元规则**：本文件只保留稳定的入口规则、边界、导航和验证要求。流程细节、实现细节、案例和专题规则放到 `docs/`。更接近修改位置且更具体的局部规则可在局部范围内覆盖上层通用规则。

---

## 来源

- 本仓库 `AGENTS.md` 顶部元规则 blockquote
- 业界对照：Augment Code "100–150 行最优 · 超过推理成本 +20%" 实测（2,500+ 仓库）
- Anthropic Claude Code best-practices "delete-if-won't-break-agent" 测试同源

## 改写建议

- 如果项目没有 `docs/` 子目录，把 "放到 `docs/`" 改为 "放到对应专题文件"
- 如果项目是单文件治理（AGENTS.md 不引用其他文件），把这段缩短为："本文件只保留稳定的入口规则与边界；细节通过 grep 源码自助发现"

---

# 02 · 能力假设声明

**何时用**：放在 AGENTS.md 第一个二级章节（"项目目标" / "概述"）末尾，明示读者档次。
**占位符**：无（如果团队主力是更弱模型，请删除本段或改为相反方向的指引）。
**反模式**：写"请使用 Conventional Commits / 请遵循 TDD / 请使用强类型" 等所有 frontier model 已内化的 SE 常识。

---

**能力假设**：本文件假定 agent 为前沿 thinking model（Claude Opus 4.x / GPT-5.x 或同档及以上）。已内化的 SE 常识（TDD、强类型、模块化、结构化错误、Conventional Commits、PR 礼仪、git rebase 语义、长 ctx 懒加载）默认成立，本文件只列项目特异的约束、入口与边界。若使用更弱模型（如 haiku / gpt-4o-mini），需补充 procedural 指引或用 skill 触发执行。

---

## 为什么需要这一段

- 没有这一段，文档会被写成入门教程（"请使用 TypeScript" / "请记得测试" / "请使用 ESLint"）
- 有这一段，所有 reviewer 在加规则前会问：这条 frontier model 不会自己做吗？

## 来源

- 本仓库 `AGENTS.md` "项目目标" 段末 (能力假设)
- Anthropic Claude Code best-practices 反模式清单："over-correcting" / "kitchen sink" / "over-specified CLAUDE.md"
- Augment Code 实测：写入 frontier model 已内化的内容会让推理成本 +20%、收益接近 0

## 改写建议

- 团队混用模型（既有 Opus 4.x 也有 4o-mini）：保留两段，分别指引
- 仅用一种模型：简化为一句 "本文件假定 agent 为 {{模型名}}；已内化能力不复述。"

---

# 03 · 规则质量三判据

**何时用**：放在 `docs/agents-governance.md`（或同等的治理细则文档）中，作为 add/keep/delete 规则的入场标准。
**占位符**：`{{src目录}}` 改为你的源码根（默认 `src/`）
**反模式**：写"必要时" / "通常" / "尽量" / "应当" 这类模糊词，没有客观触发条件。

---

## 规则质量判据

写入 AGENTS.md 的每条规则必须同时满足"可执行、可判定、可快速定位"，再兼顾人类可读性：

- **可执行**：规则描述了一个具体动作（读什么文件、跑什么命令、写什么测试），不只是劝告或意图声明。
- **可判定**：agent 能机械判断"这条规则是否适用"和"是否被违反"，不依赖主观解读。模糊词（如"必要时"、"通常"、"尽量"）应给出客观触发条件或换为决策树。
- **可快速定位**：相关代码 / 契约 / 真源在 `{{src目录}}` 中能用 grep 找到；引用的路径必须真实存在。

新增规则前自检：**"不能确定一定有用就不要加。"** 不能列出"如果没有这条规则，agent 在什么真实场景会犯什么错"的，一律不加。同样的标准用于决定是否删除已有规则。

---

## 为什么这三条

- **可执行 vs 劝告**：劝告会被忽略，动作会被执行
- **可判定 vs 解读**：解读分歧导致 agent 在边缘案例摇摆
- **可快速定位 vs 凭空**：路径不存在的规则等于幻觉

## 来源

- 本仓库 `docs/agents-governance.md` "规则质量判据" 段
- Anthropic Claude Code best-practices "delete-if-won't-break-agent" 测试
- agents.md 官方规范隐含原则："无必填字段；规则要可执行才有价值"

## 改写建议

- 团队不重视形式约束：可只保留"可执行 + 可判定"两条
- 引入自动化校验：用 `lint:agents` 类脚本扫模糊词（必要时 / 通常 / 尽量），命中即 fail

---

# 05 · 分层验证策略

**何时用**：放在 `docs/development.md`（或同等开发约定文档），定义"内循环跑啥 / 收口跑啥"。
**占位符**：`{{validate命令}}` / `{{check命令}}` / `{{lint命令}}` 按项目替换。
**反模式**：每次小修复机械跑全套件，慢且让 agent 学会"等到全过才能交付"——浪费时间。

---

## 验证策略

验证分为开发内循环和收口闸门，目标是保留最终可信证据，同时避免每个小修复重复运行完整套件。

- **RED / GREEN 内循环**：优先运行受影响的目标测试（修改 WS router 时先跑对应 `*.test.ts`；修改 schema 或契约时同时跑对应 contract / schema 测试）。
- **review fix 内循环**：先跑覆盖该反馈的目标测试；类型或公共接口受影响时加跑 `typecheck`；文档链接或 AGENTS 导航受影响时加跑 `{{check命令}}`；AGENTS 结构受影响时加跑 `{{lint命令}}`。
- **任务 / Phase 收口**：在 spec review 和 code quality review 都通过后，运行一次 `{{validate命令}}`，作为该阶段的完整证据。
- **最终交付**：主流程必须亲自运行收口验证并读取退出码，**不能只引用 subagent 报告**。
- **高风险改动**：契约、构建配置、跨端边界、共享基础设施、状态布局、协议帧或错误 schema 变更，可在 review fix 后提前运行 `{{validate命令}}`；但同一 Phase 不应因每个小修复机械重复全量验证。
- **派 subagent 时**：prompt 必须写明本次任务的目标测试和收口验证要求；不要默认要求每个窄修复都运行完整 `{{validate命令}}`，除非该修复本身触发高风险条件。

---

## 来源

- 本仓库 `docs/development.md` 验证策略段（开发内循环 / 收口闸门 / 高风险提前跑）
- Anthropic effective-harnesses for long-running agents
- Datadog "harness-first agents" 2026：generation → harness verifies → 人改 invariant

## 改写建议

- 项目无独立的 `typecheck` / `lint:agents`：把对应行删掉，但保留分层骨架
- 项目要求每次都跑全套件（小项目 / CI 速度 OK）：删掉"内循环"那几条，只保留"收口"
- 高风险定义不同：把"契约 / 跨端 / 协议帧"换成你的高风险信号

---

# 06 · 治理失效信号 / 何时改 AGENTS.md

**何时用**：放在 `docs/agents-governance.md` 顶部（如不存在，建该文件），定义"什么时候触发文档维护"。
**占位符**：`{{src目录}}`、阈值数字（30% / 10 / 3 / 6 月）可按团队偏好微调。
**反模式**：只靠"感觉"决定何时改 AGENTS.md，结果是要么 stale 要么膨胀。

> **v2 更新 (2026-05)**：本片段定义"何时触发文档维护"的宏观信号；具体的剪枝判定（违规频次 / lint 无 enforcement / 含建议性副词 / 与子规约重复）+ 季度审计的操作化流程，见 [15-prune-signal-quarterly-audit.md](15-prune-signal-quarterly-audit.md)。两者配合：本片段定义 WHEN，15 定义 HOW。

---

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

## 来源

- 本仓库 `docs/agents-governance.md` "何时更新 / 修补 AGENTS.md" + "日常修补 vs 完整 Bootstrap" 段
- 业界对照：agents.md 官方"无必填字段" + Mercari "self-enforcing self-updating docs"

## 改写建议

- 阈值调整：小团队可降到 "10% 路径失效 / 5 次任务"
- 没有"日常修补 vs Bootstrap"的二分需求：合并成一段统一描述
- 配套自动化：用 `git diff --stat` 监控 AGENTS.md 改动频次，超阈值自动开 issue

---

# 07 · 真源指针 + 自动校验回路

**何时用**：放在 AGENTS.md 的"导航"或"快速定位"段，让 agent 知道事实在哪里，文档只是路标。
**占位符**：表格里的具体文件路径与命令按项目替换。
**反模式**：把 schema 字段、命令名、错误码、默认值复制到文档里——文档一旦滞后就开始误导 agent。

---

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

## 为什么这条最重要

- 文档腐烂的根因是"复制契约值"。一旦复制，schema 改了文档没改，agent 就被误导。
- 真源指针 + 自动校验回路把"文档过时"从"靠人发现"变成"CI 拦截"。

## 来源

- 本仓库 `AGENTS.md` "什么时候算契约变更" 段 + `docs/agents-governance.md` "契约变更 checklist" 段
- Anthropic context engineering 2025: "context is RAM, not storage"
- Stack Overflow Blog 2026-03 "Coding guidelines for AI agents": "Reference the canonical rule"

## 改写建议

- 没有自动校验命令：先把检查脚本写出来（grep 反引号路径 → 检查文件是否存在），这是高 ROI 的初次投入
- 多种真源（OpenAPI / Protobuf / Zod）：每种一行，校验命令分开
- 没有 contract / schema 的项目：把表替换为 `README.md` / 入口文件路径即可

---

# 08 · Agent 协作机制

**何时用**：放在 AGENTS.md 一级章节（建议位于"开发约定"和"输出规范"之间）。
**占位符**：`{{state目录}}` 按项目替换。
**反模式**：把"subagent 派发自由" / "随便读 docs" 留给 agent 自行决定——长 ctx 模型会 dump-everything。

---

## Agent 协作机制

- **上下文导航**：先读本文件，再按任务关键词读对应 `docs/` 文件；禁止一次性 ingest 整个 `docs/`。多文件任务顺序：目录地图 → grep 符号 → 局部 Read → 阶段摘要，不读整目录。

- **Subagent 委派**：仅当任务可独立 / 可并行 / 写入范围在 prompt 中可显式描述时派 subagent；返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。主流程亲自跑收口命令再确认 subagent 报告的成功。

- **优先级**：用户显式指令 > CLAUDE.md / AGENTS.md > project skill > user / plugin skill > 默认 system prompt。skill / subagent / plan 决定执行机制，不替代 contract 同步、目标测试与收口验证。

- **信任边界**：project skill（本仓库 `.claude/` / `.codex/`）可读写本仓库与 `{{state目录}}`；user / plugin skill 不能写 `{{state目录}}`，除非由 project skill 显式委托。

---

## 为什么这一段属于 always-on

- 长 ctx 模型（Opus 4.x 1M / GPT-5.x / Gemini 2.5）面对大 docs/ 的默认反应是 dump-everything；不写约束就吃 60K+ token
- subagent 调用没有边界协议就会被滥用：写超出范围的文件、塞 raw 日志、报告假成功
- skill / plugin 优先级不清就会出现 "skill 说 X，AGENTS.md 说 Y，谁赢？" 的歧义

## 来源

- 本仓库 `AGENTS.md` "Agent 协作机制" 段
- Oakheart "subagent-driven development" + Anthropic effective-harnesses
- Mem0 2026 "context is RAM": 超 100K token 召回精度断崖式下降
- Anthropic Skills best-practices + Claude Code Skills 优先级模型

## 改写建议

- 单 agent 项目（不派 subagent）：删 "Subagent 委派" 那条
- 没有 skill 系统：删 "优先级" + "信任边界" 两条
- ctx 不够长（≤32K）：删 "上下文导航" 中的"不读整目录"，因为整目录本来就读不下

---

# 09 · 验证命令锚点

**何时用**：放在 AGENTS.md "验证与安全" / "开发约定" 段末，作为 agent 自检的命令清单。
**占位符**：所有命令名按项目替换。
**反模式**：用 prose 描述"应该跑测试 / 应该跑 lint"——agent 会问"具体哪条命令"，浪费 round-trip。

---

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

## 为什么不让 agent 凭"记忆"跑命令

- agent 在长 session 里会逐渐"忘"具体命令名（被压缩或漂移）
- 显式锚点让任何阶段都能直接看到正确命令，零猜测

## 来源

- 本仓库 `AGENTS.md` "先做什么" 段验证锚点行
- Datadog "harness-first agents" 2026：harness 退出码是 ground truth
- Karpathy Software 3.0：generation-verification loop 决定可用自治度

## 改写建议

- 仅一条收口命令的项目：缩成一句话 "收口跑 `{{validate命令}}`"
- 多 monorepo workspace：每个 workspace 列一行，加 `cd <workspace> && ...`
- 没有自动 lint 的项目：写明 "暂无自动校验，依赖 review" 而不是留空

---

# 11 · skill 单源 + 双工具镜像 codegen

**何时用**：项目需要 Claude Code（`.claude/skills/`）+ OpenAI Codex（`.agents/skills/`）双工具共用 in-session skill；workflow 模板要跨工具同步且 CI 防漂移。
**占位符**：`{{validate命令}}` / `{{check命令}}`（按项目替换）。
**反模式**：双工具各自维护 SKILL.md（手动同步必漂移）；symlink 镜像（Windows / 部分 CI 容器退化为普通文件）；混入既有 `prompts/`（语义不同：`prompts/` 是给人粘贴的外部模板，`skills/` 是工具自动发现的会话内 skill）；不加 prettier ignore（prettier 会把 `<!-- comment --> --- frontmatter ---` 误判为标题、弄碎 YAML frontmatter）。

---

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

## 为什么不用 symlink / 手动镜像

- symlink：WSL/Linux/macOS 可用，但 Windows 客户端 + 部分 CI 容器退化为文本文件，跨平台不稳。
- 手动镜像：CLAUDE.md 类规则 80% 遵从率（Anthropic 数据），双向手动同步必漂移。
- codegen + CI：与 `{{lint命令}}` / `{{check命令}}` 同范式（真源 → 衍生品 → CI 退出码兜底），无需新心智模型。

## 为什么需要 `.prettierignore`

prettier 把生成产物里的 `<!-- ... --> ---\nname: ...\n---` 序列误判为 markdown 标题语法，会把它重写为 `## <!-- ... -->` + 删 frontmatter 分隔符，**直接弄碎 SKILL.md 格式**导致 gray-matter 解析失败。必须把两个镜像目录加入 `.prettierignore`。

## 来源

- 本仓库 `adapters/node/sync_skills.mjs` + `skills/` + `.claude/skills/` + `.agents/skills/`（commit `5dda1c0`）
- agents.md 官方规范（Linux Foundation Agentic AI Foundation）
- Anthropic Claude Code Skills 文档
- OpenAI Codex Agent Skills 文档（`.agents/skills/` 发现路径 + SKILL.md frontmatter 约定）

## 改写建议

- 只用单一工具（仅 Claude Code 或仅 Codex）：删另一边的镜像目录，生成器只产出一份；但日后接入另一工具时 codegen 范式已就位，零迁移成本。
- 团队全 Linux / macOS / WSL：可用 symlink 替代 codegen 减少一道生成步骤；跨平台仍建议保留 codegen。
- 增量加 skill：只新建 `skills/<name>.md` + 跑生成器，无需改任何脚本。
- 想要 skill 的 description 同时匹配中英文 prompt：写中文主描述 + 英文别名 `（plan workflow）`，扩大 frontmatter 隐式触发面。

---

# 12 · 嵌套子 AGENTS.md（agents.md closest-file-wins）

**何时用**：项目有 ≥ 3 个高风险目录（契约真源 / 浏览器 ↔ Node 边界 / agent 运行时 / 第三方凭证 / 高频被改的核心模块等）；单一根 AGENTS.md 装不下所有强约束，又不想稀释首屏密度。
**占位符**：高风险目录路径按项目替换。
**反模式**：把所有强约束塞根 AGENTS.md（首屏稀释 + agent 注意力分散）；写多个但复制根文件内容（双源 + 同步负担）；子文件超 30 行（违反 closest-file-wins 的"就近补充"语义）。

---

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

## 为什么 closest-file-wins 比"集中规则"好

- **命中率**：agent 改 `src/contracts/` 下任何文件时，**第一份就近文件**就是契约规则；不用先读根 AGENTS.md 几百行再 grep 出契约触发条件。
- **首屏预算**：根文件保持精简（≤ 150 行），新增子目录强约束不挤占主入口。
- **演化局部化**：契约规则改了只动 `src/contracts/AGENTS.md`，不动根；agent reviewer 也只需 grep `src/contracts/AGENTS.md` 的 diff。

## 来源

- 本仓库 `src/contracts/AGENTS.md` + `src/gateway/ui/AGENTS.md` + `src/agents/AGENTS.md`（commit `a223c5d`）
- agents.md 官方规范："agents automatically read the nearest file in the directory tree, so the closest one takes precedence"
- OpenAI Codex AGENTS.md discovery chain：global → project root → cwd，越近越覆盖
- Mercari 2025-10 "Taming Agents in the Web Monorepo"：每包独立 AGENTS.md 是 monorepo 标准做法

## 改写建议

- 项目只有 1 个高风险目录：合并到根 AGENTS.md 即可，不必单独子文件。
- 有 ≥ 5 个高风险目录：考虑分层（先按一级目录归一份，再视需要拆深层）；避免子文件总数超过 5 个让 agent 难以 grep。
- 团队用 monorepo workspaces：每个 workspace package 一份 AGENTS.md 是更自然的边界。
- 想要 lint 守护"子文件不能与根重复"：写一个 `check-nested-agents.mjs`，grep 两份文件共同 bullet 报警。

---

# 13 · 三层边界（始终 / 先问后做 / 禁止）

**何时用**：项目有"无条件必做"和"先问后做"和"绝对禁止"三种强度的规则。放在 AGENTS.md 顶部（紧邻"任务分流"上方），承担首屏非协商项的载体。相对于简单的 Don't/Do 配对，三层边界更完整地覆盖 escalation 场景。
**占位符**：命令 / 路径 / 契约文件按项目替换。
**反模式**：用纯二分（"应该 / 不应该"——丢失"先问后做"的中间层）；用五分以上（agent 决策疲劳）；把"先问后做"写为模糊词（"通常需要确认"——必须明确触发条件）。

---

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

## 为什么三层比二层好

- **二层（04 风格）丢失中间态**：很多动作不是绝对禁止也不是无条件允许——例如"契约变更"应当允许但必须先 escalate。二层会逼着把这类规则要么提升到"禁止"（过严）要么降到"始终允许"（过松）。
- **三层让 escalation 显式**："先问后做"明确标示 agent 应停下来 ask_user 的场景，比把规则塞进 prose 描述更可执行。
- **比五层简洁**：3 个 bucket × 5 条 = 15 条上限，正好是 working memory 友好的规模；agent 决策树深度浅。

## 来源

- 本仓库 `AGENTS.md` "边界三层" 章节（commit `68d7be8`）
- Microsoft agent-governance-toolkit "Three-tier Boundaries" model
- Augment Code 2026 实测：纯禁令完成度 -25%；补"先问后做"中间态让 escalation 比例 +18%

## 改写建议

- 项目无 escalation / ask_user 流程：保留"始终"+"禁止"两层，删"先问后做"（退化为简单配对）。
- 团队接受两层简化版：本片段是其进阶；若要纯二分规则，手工改写为"应该 vs 不应该"即可。
- 想加 lint 拦截"建议 / 尽量 / 通常"等模糊副词：写 `check-imperatives.mjs` 扫这三层下的副词，命中即 fail（防止规则从"始终"被改成"通常"）。
- 单独一栏内容超 5 条：拆出子专题文档（如把契约边界全搬 `docs/agents-governance.md`），三层各自保留 ≤ 5 条。

---

# 14 · 模型角色路由

**何时用**：团队同时用 frontier thinking model（Claude Opus 4.x / GPT-5.x）做 plan / review，普通编程 model（Claude Sonnet / OpenAI Codex / GPT-5.x）做 implement / debug；或有多种 subagent（codex-rescue / security-reviewer / contract-reviewer）需要按任务类型分派。
**占位符**：模型名 / subagent 类型按项目替换。
**反模式**：把"用哪个模型"留给 agent 自决（每次决策开销 + 不一致结果）；subagent 委派不显式声明写入白名单（scope creep 风险）；让 subagent 自报成功不亲跑收口（"假绿"风险）。

---

## 模型角色路由

不同任务派给不同模型 / agent；subagent 委派必须显式声明写入范围。

| 任务类型                     | 推荐模型 / agent            | 调度方式                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------- |
| plan / review / 契约决策     | Opus 级 thinking model      | 主流程；或 `.claude/agents/contract-reviewer.md` 子代理 |
| implement / debug / refactor | Sonnet 级 / Codex / GPT-5.x | 主流程；或 `codex:rescue` subagent                      |
| 大批量独立改动               | 多并发 subagent             | 每个 subagent prompt 显式列出写入文件白名单             |

主流程亲自跑收口命令（`{{validate命令}}`），不依赖 subagent 自报成功；subagent 返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。

---

## 为什么显式路由

- **plan / review 需要 thinking**：长上下文 + 多步推理，强模型边际收益 >> 成本；用便宜模型会丢风险信号。
- **implement 不需要思考深度**：步骤明确（依 plan + contract），快模型 + 大批并发更划算；省下的 thinking 预算让给主流程做最终评审。
- **subagent 白名单是 sandbox**：subagent 在写入范围之外的"顺手修一下"是事故主因；prompt 里列文件白名单 = 显式 sandbox。
- **主流程跑收口不是冗余**：subagent 看到的是它自己的 context，可能漏掉跨文件 side-effect；主流程跑 `{{validate命令}}` 才能闭环。

## 来源

- 本仓库 `AGENTS.md` "模型角色路由" 章节（commit `68d7be8`）
- agent-playbook-template 的 Opus-style ↔ Codex-style 路由约定
- Anthropic Claude Code Subagents 官方文档（独立 context window + 工具白名单）
- OpenAI Codex 多 agent 协作模式

## 改写建议

- 单模型项目（只用 Sonnet 一档）：删本片段；模型路由表退化为"全任务用 <唯一模型>"。
- 双模型项目（不引入 subagent）：保留模型路由两行，删 subagent 委派条款。
- 团队有自定义 subagent（如 `security-reviewer.md`）：按任务类型在表中加一行；显式标注哪些任务类型派给它。
- 子代理 prompt 模板没有强制"返回结构化 summary"：写一份内部 SUBAGENT_PROMPT_TEMPLATE.md，把行动 / 证据 / 阻塞三段作为 return format 固化，避免随机 dump 日志。

---

# 15 · 剪枝信号 + 触发式审计（操作化）

**何时用**：需要可被 grep / lint / 前沿 thinking model 机械判定的剪枝判定 + 事件驱动的批量审计流程。放在 `docs/agents-governance.md`。相对于抽象的剪枝讨论，本片段强调操作化的触发条件与批量处理流程。
**占位符**：阈值数字（≥ 5 条候选 / > 50 个 commit）按团队节奏微调。
**反模式**：模糊地"定期清理"（无触发条件 → agent 不知何时该提议剪枝）；只删不审计（节奏断裂 → 半年后又膨胀）；用主观判定（"这条好像没人用了"——无 grep-able 标记）；日历驱动季度审计（agent 项目节奏远快于人类季度，等不到下次首月膨胀已发生）。

---

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

## 为什么操作化比抽象更稳

- **抽象版（10 风格）**："近 5 个 PR 没触发"——但谁负责数？什么时候数？没人主动数 = 永远不剪。
- **操作化版**：剪枝信号 = 前沿 thinking model 直接审计 + `grep prune-candidate` 注释；批量审计 = 事件触发（≥ 5 候选或 > 50 commit），不靠日历；机械判定 = `expectedHeadings` / `knownPrefixes` 等已有 lint 配套。每条都能 grep / 模型审计 / CI 触发，不依赖人记。
- **HTML 注释标记是关键**：当下不删（避免在常规 PR 中混入治理改动），但留下 grep-able 痕迹，触发审计时批量处理。
- **事件触发 ≠ 日历驱动**：agent 项目一周 commit 几十次，季度（3 个月）的节奏跟 agent 时间尺度脱节。换成 "≥ N 候选" 或 "> M commit" 这种事件阈值，跟 agent 实际节奏对齐。

## 来源

- 本仓库 `docs/agents-governance.md` "剪枝信号" + "触发式审计" 两节
- Anthropic Claude Code best-practices："If Claude keeps doing X despite the rule, the rule is getting lost in noise — prune."
- Augment Code 2026 实测：超 150 行的 AGENTS.md 推理成本 +20%；治理无剪枝信号则只增不减
- Mercari 2025-10 "Self-enforcing self-updating docs"
- 模型实证（CommandTest 2026-05）：前沿 thinking model（Opus 4.7 / GPT-5.5）在 84 条治理规则上 100% evidence cite + 4/4 mapped 到判据，证明 "PR 触发数据 / session 违反记录" 等不存在数据源的判据可改写为 "模型审计 + git log 兜底"。

## 改写建议

- 团队不要事件驱动，要日历：把"≥ 5 候选 / > 50 commit"换回月度 / 双月节奏；保留"grep 拉清单 + commit message 格式回溯"骨架。
- 没有契约 / `expectedHeadings` 这种机械检查：审计步骤第 3 步删契约同步。
- 想要审计前推送提醒：CI 在 `grep -rn "prune-candidate"` 返回 ≥ N 时开 issue 标 `audit-due`，审计完成关 issue。
- 想看历史剪枝：每次 audit commit 用 `docs(governance): audit — <摘要>` 格式，`git log --grep "docs(governance): audit"` 即可回溯所有审计。

---

# 16 · Claude Code hooks（PreToolUse 机械边界）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

**何时用**：项目用 Claude Code，需要在 prose 规则之外加机械兜底——拦危险 Bash、保护 generated 镜像、Stop 时强制验证。
**占位符**：`{{validate命令}}`（按项目替换，如 `./tasks.sh validate` / `pnpm validate`）；`{{generated前缀}}`（如 `.claude/skills/` `.agents/skills/`）。
**反模式**：把 hooks 当主防线（prose 规则仍是真源，hooks 是冗余兜底）；hook 命令依赖大量外部工具（脆且慢——保留 grep / jq / 内置工具）；超时设过长（hook 阻塞 agent 交互，3-5 秒上限）。

---

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

## 来源

- Anthropic Claude Code Hooks 官方文档：`code.claude.com/docs/en/hooks`（PreToolUse / Stop / UserPromptSubmit 生命周期 + `permissionDecision: deny/ask/allow`）
- MCP spec：`modelcontextprotocol.io/specification`（"Tools represent arbitrary code execution and must be treated with appropriate caution"——hooks 是 trust boundary 的客户端兜底）

## 改写建议

- 单 hook 项目（不要 Stop 自动 validate）：删 `Stop` 节，只留 `PreToolUse`。
- 多个 generated 前缀：`grep -qE` 改为多 alt 串：`'^(\.claude/skills/|\.agents/skills/|dist/)'`。
- 用 Python / Node 替换 jq + grep：保留 hook stdin/stdout JSON 契约即可，命令实现自由。
- 团队启用 hooks 但不入 git：把 `.claude/settings.json` 移到 `.claude/settings.local.json`（claude code 自动合并，后者不入 git）。

---

# 17 · Codex CLI hooks（确定性脚本兜底）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

**何时用**：项目用 OpenAI Codex CLI，需要在 agentic loop 注入确定性脚本——密钥扫描、停止时验证、操作前权限检查。
**占位符**：`{{validate命令}}`（按项目替换）；`{{repo_root}}`（仓库绝对路径）。
**反模式**：把 hook 脚本写进 `~/.codex/config.toml` 全局区（影响所有项目）—— 项目级 hooks 应放项目级 config；hook 输出非确定性日志（agent 困惑）—— 严格按 stdin/stdout 契约。

---

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

## 来源

- OpenAI Codex Hooks 官方文档：`developers.openai.com/codex/hooks`（hook 触发点 + 决策协议 + sandbox 配套）
- OpenAI Codex permissions：`developers.openai.com/codex/permissions`（sandbox 三档 + approval 三档）

## 改写建议

- 不用 Node 写 hook：换 Python / bash / Deno 都行，保持 stdin/stdout JSON 契约。
- 跨项目共享 hook：脚本放 `~/.codex/hooks/`，config.toml 写绝对路径。
- 项目想强制 sandbox：在 `.codex/config.toml` 强制 `sandbox = "workspace-write"`（覆盖用户级），并在 README 说明 trust boundary。

---

# 18 · Claude Code permissions（deny / ask / allow 三档）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

**何时用**：项目希望对 agent 工具调用配机械权限边界（不仅靠 prose 规则）；review / research 类任务想限制 agent 为只读。
**占位符**：`{{generated前缀}}`（如 `.claude/skills/` / `.agents/skills/` / `dist/`）；`{{secret 路径}}`（如 `.env` / `secrets/`）。
**反模式**：把所有规则都设 `deny`（agent 寸步难行 → 改回放权全开）；只用 `allow` 不用 `deny`（漏洞 = 没列的全放行）；把 deny 规则只写 prose 不进 settings.json（规则记忆 vs 机械边界两种保障层级）。

---

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

## 来源

- Anthropic Claude Code settings：`code.claude.com/docs/en/settings`（permissions deny/ask/allow + matcher 语法 + scope）

## 改写建议

- 项目用 monorepo + 子团队不同信任面：把 `permissions` 移到 `<sub-pkg>/.claude/settings.json`（最近的 settings 文件优先）。
- 临时 review session 不想入 git：用 `.claude/settings.local.json`（自动 .gitignore）。
- 同样规则想给 Codex 一份：见 `19-codex-config-readonly.md` 的 sandbox 等价物。

---

# 19 · Codex CLI sandbox + approval（readonly profile）
<!-- prune-candidate: 加入时 refs=0，无下游实证 · 2026-05-27 -->

**何时用**：项目用 OpenAI Codex CLI，希望对 agent 设最小权限基线（review / research / audit 任务限制为只读）；想用 sandbox 机械边界替代 prose 规则。
**占位符**：`{{repo_root}}`（仓库绝对路径）。
**反模式**：让 codex 默认跑 `--yolo` / `--sandbox danger-full-access`（agent rm -rf 救不回）；把 sandbox 设错档（read-only 跑写代码任务必失败）；用户级 config 强制 sandbox 覆盖项目级（造成不可预测）。

---

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

## 来源

- OpenAI Codex permissions 官方文档：`developers.openai.com/codex/permissions`（sandbox 三档 + approval 三档）
- OpenAI Codex configuration：`developers.openai.com/codex/cli` + `github.com/openai/codex/blob/main/docs/config.md`（config.toml 字段完整表）

## 改写建议

- 不用项目级 config（保持 fork 干净）：在 README 写"建议下游运行 `codex --sandbox workspace-write` 启动"，不入 `.codex/`。
- 多 profile 切换：把 `.codex/profiles/<name>.toml` 一个 readonly / 一个 implement，README 列何时用哪个。
- 兼容 Claude Code：见 `18-claude-permissions-readonly.md`，两份 config 并存覆盖两个 host。

---
