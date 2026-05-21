# agent-workflow-template

**不绑语言 / 不绑栈** 的多模型协作工作流脚手架。把 Opus 级（Claude）+ Codex/GPT 级模型的接力 workflow（PLANNER / IMPLEMENTER / REVIEWER 等）从某个具体项目抽出来，做成任何项目都能 fork 即用的底座。

## 三必带能力

| 目录 / 文件                        | 作用                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| [skills/](skills/)                 | 9 个 user-invocable `wf-*` workflow skill 的**真源单点**      |
| [adapters/](adapters/)             | 治理 config 的 Node adapter 实现（消费 `agents-md.config.json`） |
| [docs/workflows.md](docs/workflows.md) | 工作流选择 / Role-Model 映射 / 调度优先级 / 跨 workflow 流转 |

## 用法

### 1. Fork 此模板

```bash
git clone <this-repo> my-project
cd my-project
./tasks.sh sync-skills     # 首次必跑：生成 .claude/skills/ + .agents/skills/ 镜像
```

镜像首生成后即应 `git add` 入仓（Claude Code / Codex CLI 直接读镜像）。

### 2. 在你的 host 里调 workflow

- **Claude Code**：`/wf-coding-relay <task>`、`/wf-red-team <task>` 等
- **Codex CLI**：同上语法
- 完整选择指南：[docs/workflows.md](docs/workflows.md) 「快速选择」表

### 3. Adapter 调度

```bash
./tasks.sh validate                     # check-structure + check-refs + sync-skills-check
./tasks.sh help                         # 列全部 target
```

调度脚本 `tasks.sh` 是 POSIX bash，但 adapter 实现是 Node：需 **Node 20.11+**（仅用 Node stdlib，无第三方依赖）。

### 4. 追加你的项目规则

在 [AGENTS.md](AGENTS.md) 「项目特定规则」节追加：契约真源 / 高风险文件 / CLI 命令面 / 自家 lint+typecheck 命令 / 凭证策略 / CI 入口。**不要动**模板自身的其他节（标题集合由 [agents-md.config.json](agents-md.config.json) `expectedHeadings` 锁定）。

**填料速成**：[governance-snippets/](governance-snippets/) 内 15 段治理片段（元规则 / 能力假设 / 三层边界 / 模型路由 / 真源 / 协作 / 命令锚点 / 删除候选 等），全用 `{{项目名}}` / `{{validate命令}}` / `{{state目录}}` 等占位符，挑相关的 paste 到 AGENTS.md「项目特定规则」节或自家 `docs/*.md`，sed 一遍替换占位符即可。

### 5. external paste 模板（人 → AI 交接）

[prompts/](prompts/) 内 3 个填空模板（backend / frontend / multi-agent-coordination）—— 与 `skills/`（in-session, auto-discoverable）互补：在没有 Claude Code / Codex CLI 的环境下（如 Web 聊天框、第三方 IDE 插件），直接 paste 这些模板填字段即可让外部 LLM 进入协作角色。

## 设计原则

- **最小依赖**：调度 `tasks.sh` 是 POSIX bash；adapter 需 Node 20.11+（仅 stdlib，无 npm install）。
- **真源单点**：skill 真源在 `skills/`，镜像 generated；治理规则在 `agents-md.config.json`，adapter 是消费者。
- **可执行契约**：[adapters/README.md](adapters/README.md) 定义 adapter 的 MUST 行为。
- **下游可覆盖**：[AGENTS.md](AGENTS.md) 提供「项目特定规则」占位节，下游 fork 后扩展。
- **workflow 独立性**：每个 `wf-*` skill 内置的 paste boundary / fresh subagent / SCOPE-EXPANSION 是设计的一部分；改 prompt 前先读 [docs/workflows.md](docs/workflows.md) 三层边界节。

## Contributing

见 [CONTRIBUTING.md](CONTRIBUTING.md) ——git 是 spec 真源，人 + agent 都通过 PR 提议 spec 演进。

## 关于 skill 内的 `pnpm` 示例

`skills/wf-incident-rescue.md` 与 `skills/wf-convoy-refactor.md` 内残留少量 `pnpm install --frozen-lockfile` / `pnpm typecheck` 等示例 —— 这些是 monorepo TypeScript 场景的 **procedural 举例**（在 backtick 内、由「如」上下文引导），下游按自家包管理器替换为相应命令即可（`npm ci` / `yarn install --frozen-lockfile` / `mypy .` / `cargo check` 等）。模板自身的调度命令（`./tasks.sh validate` 等）是 host-agnostic 的。

## 不带什么

- 不带 `package.json` / `pyproject.toml` / `tsconfig.json` / 任何编译器配置
- 不带 `src/` 或具体语言代码
- 不带 CI yml（下游 CI 平台未知，自加）
- 不 `git init`（fork / clone 你自己决定）

## 致谢

源于一个具体应用项目内的 wf-\* skill 与 adapter 治理体系，抽离时遵循「不绑语言 / 不绑栈」原则。
