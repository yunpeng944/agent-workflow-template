# 仓库指南（模板）

> **元规则**：本仓是 `agent-workflow-template` —— 一个**不绑语言 / 不绑栈**的多模型协作工作流脚手架。本文件只列模板自身的稳定元规则、边界与入口。**下游 fork 后**：在「项目特定规则」节追加你自家的契约 / 模块 / CLI / 高风险面规则；保留 skills/ rules/ adapters/ 三必带不动。

## 项目目标

让 Claude / Codex / GPT 等模型按你的指挥协作完成任务，从某个具体项目抽出来做成任何项目都能复用的底座：

- 2 个 user-invocable skill 在 `skills/`（真源单点）：`wf-relay` 接力 / `wf-parallel` 平行
- 可选任务规则在 `rules/`（base / security / refactor / review / research / debug）
- 同一份治理 config 由 Node adapter 消费，在 `adapters/`（需 Node 20.11+，仅 stdlib）
- 顶层 `tasks.sh` 调度（POSIX bash），`./tasks.sh validate` 收口

**贡献流程**：见 [CONTRIBUTING.md](CONTRIBUTING.md) ——git 是 spec 真源，人 + agent 都走 PR。

## 优先做什么

- **任何修改前**：判断是改「模板自身」（skills/ rules/ adapters/）还是「项目特定规则」。模板自身改动要保持语言中性 / 仅依赖 Node 20.11+ stdlib（无 npm install）
- **修 skill 真源后**：必须跑 `./tasks.sh sync-skills` 重生 `.claude/skills/` 与 `.agents/skills/` 镜像；同 commit 提交真源 + 两份镜像
- **修 `agents-md.config.json` / adapter 契约**：按 [adapters/README.md](adapters/README.md)「变更治理」节同步各 lane 实现
- **任务收口**：跑 `./tasks.sh validate`

## 边界三层

**始终**：

- 改 `skills/*.md` 真源后跑 `./tasks.sh sync-skills`，同 commit 提交镜像
- 改 AGENTS.md 二级标题集合或顺序时同步 `agents-md.config.json` 的 `expectedHeadings`
- 新增引用路径前确认文件存在，或显式加入 `intentionallyAbsentRefs` 白名单
- 任务收口跑 `./tasks.sh validate`

**先问后做**：

- 改 adapter 行为契约（[adapters/README.md](adapters/README.md) MUST 节）—— 属契约变更，需同步更新 adapter 实现 + 自检
- 改 `tasks.sh` target 命名 —— 影响所有下游用法
- 修 skill 内 Stage prompt 文本 —— fresh subagent / fail-fast 等独立性约束是设计的一部分

**禁止**：

- 直接编辑 `.claude/skills/` 或 `.agents/skills/` 下任何文件（generated · 改源跑 `./tasks.sh sync-skills`）
- 给模板加 `package.json` / `pyproject.toml` / 编译器配置 —— 模板只依赖 Node 20.11+ stdlib

## 最小流程

1. 选 workflow：`wf-relay`（接力）或 `wf-parallel`（平行）—— 见 [skills/README.md](skills/README.md)
2. 调用：`/wf-relay [executor] [@rules/<name>.md] <task>` 或 `/wf-parallel [v1-v2] [@rules/<name>.md] <task>`
3. 模板自身变更：改源 → `./tasks.sh sync-skills`（如改 skill）→ `./tasks.sh validate` → commit
4. 下游项目变更：按下游自家 AGENTS.md「项目特定规则」节流程走

## 工作流入口

- skill 真源（编辑只动这里）：[skills/](skills/) 下 `wf-relay.md` / `wf-parallel.md`
- 镜像（generated · 勿改）：`.claude/skills/wf-*/SKILL.md` · `.agents/skills/wf-*/SKILL.md`
- 可选规则：[rules/](rules/) 下 6 个任务规则文件

## Adapter 调度

- Node adapter 实现见 [adapters/](adapters/)；行为契约真源 [adapters/README.md](adapters/README.md)
- 顶层 `tasks.sh` 直接调用 Node adapter（需 Node 20.11+，仅 stdlib）
- target：`validate`（三项合一）· `check-structure` · `check-refs` · `sync-skills` · `sync-skills-check`
- adapter 内**不复制** `agents-md.config.json` 字段值；adapter 是消费者

## 项目特定规则

> ⬇⬇⬇ 下游 fork 此模板后，在本节追加你自家项目的规则 ⬇⬇⬇
>
> 建议涵盖：契约真源指针 / 高风险文件 / CLI 命令面 / 状态文件 / 跨端边界 / 凭证策略 / 自家 lint 与 typecheck 命令 / CI 入口
>
> **填料速成**：[governance-snippets/](governance-snippets/) 内 13 段治理片段，按需 paste + 替换占位符
>
> **任务规则**：常用任务约束写到 [rules/](rules/)，调用时用 `@rules/<name>.md` 叠加到 skill

（模板默认为空；保留本节标题不要删 —— `agents-md.config.json.expectedHeadings` 依赖）

## 快速定位

- **模板真源**：[skills/](skills/) · [rules/](rules/) · [adapters/](adapters/) · [agents-md.config.json](agents-md.config.json) · [tasks.sh](tasks.sh)
- **镜像（generated）**：`.claude/skills/` · `.agents/skills/`
- **可粘贴素材**：[governance-snippets/](governance-snippets/)（13 段治理片段）· [prompts/](prompts/)（3 个 external paste 模板）
- **下游治理基线**：[docs/agents-governance.md](docs/agents-governance.md) · [docs/bootstrap-spec.md](docs/bootstrap-spec.md) · [docs/development-conventions.md](docs/development-conventions.md)
- **验证入口**：`./tasks.sh sync-skills`（修 skill 后必跑）· `./tasks.sh validate`（收口）
- **下游用法**：[README.md](README.md)

## 自治维护

治理细节、失效信号、修补 vs Bootstrap 判别、剪枝信号、触发式审计、业界演进同步 (drift-scan) 见 [docs/agents-governance.md](docs/agents-governance.md)；完整 Bootstrap SOP 见 [docs/bootstrap-spec.md](docs/bootstrap-spec.md)。Agent 自行做日常修补（最小必要范围），完整 Bootstrap 需人工触发。
做日常修补时，必须读 `docs/agents-governance.md`「维护责任」节 +「删除候选信号」/「剪枝信号」两节，顺手处理可删条目。
