# 仓库指南（模板）

> **元规则**：本仓是 `agent-workflow-template` —— 一个**不绑语言 / 不绑栈**的多模型协作工作流脚手架。本文件只列模板自身的稳定元规则、边界与入口。**下游 fork 后**：在「项目特定规则」节追加你自家的契约 / 模块 / CLI / 高风险面规则；保留 skills/ adapters/ docs/workflows.md 三必带不动。

## 项目目标

本模板把 Opus 级 + Codex/GPT 级模型的协作 workflow（PLANNER / IMPLEMENTER / REVIEWER 等接力）从某个具体项目抽出来，做成**任何语言 / 任何栈**的项目都能复用的底座：

- 9 个 user-invocable `wf-*` skill 在 `skills/`（真源单点）
- 同一份治理 config 由 Node adapter 消费，在 `adapters/`（需 Node 20.11+，仅 stdlib）
- 顶层 `tasks.sh` 调度（POSIX bash），`./tasks.sh validate` 收口
- 工作流选择 / Role-Model 映射 / 调度优先级在 [docs/workflows.md](docs/workflows.md)

**贡献流程**：见 [CONTRIBUTING.md](CONTRIBUTING.md) ——git 是 spec 真源，人 + agent 都走 PR。

## 优先做什么

- **任何修改前**：判断是改「模板自身」（skills/ adapters/ docs/workflows.md 等通用层）还是「项目特定规则」（下游 fork 后追加的部分）。模板自身改动要保持语言中性 / 仅依赖 Node 20.11+ stdlib（无 npm install）。
- **修 skill 真源后**：必须跑 `./tasks.sh sync-skills` 重生 `.claude/skills/` 与 `.agents/skills/` 镜像；同 commit 提交真源 + 两份镜像。
- **修 `agents-md.config.json` / adapter 契约**：按 [adapters/README.md](adapters/README.md)「变更治理」节同步各 lane 实现。
- **任务收口**：跑 `./tasks.sh validate`（含 check-structure / check-refs / sync-skills-check 三项）。

## 边界三层

**始终**：

- 改 `skills/wf-*.md` 真源后跑 `./tasks.sh sync-skills`，同 commit 提交镜像。
- 改 AGENTS.md 二级标题集合或顺序时同步 `agents-md.config.json` 的 `expectedHeadings`。
- 新增引用路径前确认文件存在，或显式加入 `intentionallyAbsentRefs` 白名单。
- 任务收口跑 `./tasks.sh validate`。

**先问后做**：

- 改 adapter 行为契约（[adapters/README.md](adapters/README.md) MUST 节）—— 属契约变更，需同步更新 adapter 实现 + 自检。
- 改 `tasks.sh` target 命名 —— 影响所有下游用法。
- 修 wf-\* skill 内 Stage prompt 文本 —— 工作流独立性约束 / paste boundary / SCOPE-EXPANSION 是设计的一部分，改前先读 [docs/workflows.md](docs/workflows.md) 三层边界节。

**禁止**：

- 直接编辑 `.claude/skills/` 或 `.agents/skills/` 下任何文件（generated · 改源跑 `./tasks.sh sync-skills`）。
- 复制 wf-\* skill 段拼新流程（新需求走 `wf-coauthor-doc` 建新 skill）。
- 给模板加 `package.json` / `pyproject.toml` / 编译器配置 —— 模板只依赖 Node 20.11+ stdlib（无 npm install / 无第三方依赖）。

## 最小流程

1. 看 [docs/workflows.md](docs/workflows.md)「快速选择」表，匹配任务到对应 `wf-*` skill；不匹配（typo / 单行）直接改。
2. 用 `wf-*` skill：在 Claude Code 或 Codex CLI 内输入 `/wf-<name> [preset] [<options>] <task>` 触发；或按 SKILL.md 内 `## Stages` 节定义的接力顺序手动操作。仅 4 个 skill 接受 `--mode`（`wf-bake-off` / `wf-incident-rescue` / `wf-spike` / `wf-code-review`），共 5 个 mode 值（详见 [docs/workflows.md](docs/workflows.md)）；其余 skill 默认即完整流程。
3. 模板自身变更：改源 → `./tasks.sh sync-skills`（如改 skill）→ `./tasks.sh validate` → commit。
4. 下游项目变更：按下游自家 AGENTS.md「项目特定规则」节流程走。

## 工作流入口

- skill 真源（编辑只动这里）：[skills/](skills/) 下 9 个 `wf-*.md`
- 镜像（generated · 勿改）：`.claude/skills/wf-*/SKILL.md`（Claude Code 消费）· `.agents/skills/wf-*/SKILL.md`（Codex CLI 消费）
- 选择 / Role-Model 映射 / 调度 / 跨 workflow 流转：[docs/workflows.md](docs/workflows.md)
- 9 个 workflow：`wf-coding-relay`（默认开发）· `wf-red-team`（高风险面）· `wf-convoy-refactor`（大重构）· `wf-coauthor-doc`（治理文档）· `wf-second-opinion`（疑难诊断）· `wf-bake-off`（选型）· `wf-incident-rescue`（regression / CI 红）· `wf-spike`（探索 / 概念验证）· `wf-code-review`（外部 diff / PR review）

## Adapter 调度

- Node adapter 实现见 [adapters/](adapters/)；行为契约真源 [adapters/README.md](adapters/README.md)。
- 顶层 `tasks.sh` 直接调用 Node adapter（需 Node 20.11+，仅 stdlib）。
- target：`validate`（三项合一）· `check-structure` · `check-refs` · `sync-skills` · `sync-skills-check`。
- adapter 内**不复制** `agents-md.config.json` 字段值；adapter 是消费者。

## 项目特定规则

> ⬇⬇⬇ 下游 fork 此模板后，在本节追加你自家项目的规则 ⬇⬇⬇
>
> 建议涵盖：契约真源指针 / 高风险文件 / CLI 命令面 / 状态文件 / 跨端边界 / 凭证策略 / 自家 lint 与 typecheck 命令 / CI 入口。
>
> **填料速成**：[governance-snippets/](governance-snippets/) 内 13 段治理片段（`{{项目名}}` / `{{validate命令}}` 等占位符），按需 paste + 替换。

（模板默认为空；保留本节标题不要删 —— `agents-md.config.json.expectedHeadings` 依赖。）

## 快速定位

- **模板真源**：[skills/](skills/) · [adapters/](adapters/) · [docs/workflows.md](docs/workflows.md) · [agents-md.config.json](agents-md.config.json) · [tasks.sh](tasks.sh)
- **镜像（generated）**：`.claude/skills/` · `.agents/skills/`
- **可粘贴素材**：[governance-snippets/](governance-snippets/)（13 段治理片段 · `{{占位符}}` 风格 · 给「项目特定规则」节填料） · [prompts/](prompts/)（3 个 external paste 模板 · 人→AI 交接）
- **下游治理基线**（建议保留 · 下游可自定义内容）：[docs/agents-governance.md](docs/agents-governance.md)（AGENTS.md 自治维护：修补 vs Bootstrap / 删除候选 / 触发式审计 + 「Bootstrap Spec」节完整 Bootstrap 流程详规；`wf-coauthor-doc` / `wf-red-team` Stage prompt 引用） · [docs/development-conventions.md](docs/development-conventions.md)（TDD 判定 / 调研降级 / 文件大小 / 分层验证 / 依赖策略）
- **验证入口**：`./tasks.sh sync-skills`（修 skill 后必跑）· `./tasks.sh validate`（收口）
- **下游用法 / 集成指南**：[README.md](README.md)

## 自治维护

治理细节、失效信号、修补 vs Bootstrap 判别、剪枝信号、触发式审计见 [docs/agents-governance.md](docs/agents-governance.md)。Agent 自行做日常修补（最小必要范围），完整 Bootstrap 需人工触发（流程见 [docs/agents-governance.md#bootstrap-spec](docs/agents-governance.md#bootstrap-spec)「Bootstrap Spec」节）。
做日常修补时，必须读 `docs/agents-governance.md`「维护责任」节（每次至少审计 5 条周边规则）+「删除候选信号」/「剪枝信号」两节，顺手处理可删条目。
