# AGENTS.md 治理片段库

> **定位**：本目录是 paste 素材库，下游 fork 后按需挑一两段；模板自身不强制采用任一。

> **目录用途**：本目录**仅放治理 snippet（按编号 NN-\*.md 命名）**。
> 不放计划文档、决策报告、临时笔记 —— 调研报告见 `docs/research-reports/`，完工 plan / proposal 归档见 `docs/archive/`。
> Snippet 是设计期快照，**不与本仓 AGENTS.md 实时同步**；模板抽取（`agent-playbook-template`）时此目录是 source material。

> 13 段项目无关、可直接 copy-paste 到任意项目 `AGENTS.md` / `CLAUDE.md` / `docs/*.md` 的治理片段。
> 每个文件分三层：**何时用**（标题下） · **可直接复制的内容**（`---` 之间） · **来源 / 改写建议**（底部）。

## 使用方式

```bash
# 1. 浏览索引（本文件）
cat README.md

# 2. 选段，看 frontmatter 决定是否合适
cat 03-rule-quality-criteria.md

# 3. 复制 ── 之间的内容到目标项目
# （或直接 sed/awk 抽取）
awk '/^─{3,}$/{f=!f;next} f' 03-rule-quality-criteria.md
```

占位符约定（全库一致）：

| 占位符               | 含义                          | 替换示例                                                  |
| -------------------- | ----------------------------- | --------------------------------------------------------- |
| `{{项目名}}`         | 仓库 / 产品名                 | `mybot` / `next-app`                                      |
| `{{契约真源}}`       | 系统契约真源文件路径          | `src/contracts/system/system-contract.ts`                 |
| `{{schema真源}}`     | 主 schema 文件路径            | `src/agents/agent-config-schema.ts`                       |
| `{{state目录}}`      | 本地运行状态目录              | `.mybot/` / `.state/`                                     |
| `{{validate命令}}`   | 收口验证命令                  | `pnpm validate` / `make test` / `./tasks.sh validate`     |
| `{{check命令}}`      | 文档引用校验命令              | `pnpm check:refs` / `./tasks.sh check-refs`               |
| `{{lint命令}}`       | AGENTS 结构校验命令           | `pnpm lint:agents` / `./tasks.sh check-structure`         |
| `{{sync命令}}`       | skill 镜像生成命令            | `pnpm sync:skills` / `./tasks.sh sync-skills`             |
| `{{服务端边界}}`     | 服务端/客户端分界目录         | `src/gateway/ui/`                                         |
| `{{CLI 注册目录}}`   | 项目 CLI 命令注册位置         | `src/commands/`                                           |
| `{{state-paths 真源}}` | 状态路径定义真源              | `src/state/session-paths.ts`                              |
| `{{协议真源}}`       | 跨端通信协议定义真源          | `src/contracts/gateway/`                                  |
| `{{typecheck 命令}}` | 类型检查命令                  | `tsc --noEmit` / `mypy .` / `cargo check` / `go vet`      |

## 索引

| 序号 | 文件                                                                       | 落点                                                   | 一句话用途                                                                            |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 01   | [01-meta-rule.md](01-meta-rule.md)                                         | AGENTS.md 顶部 blockquote                              | 约束本文件本身不膨胀                                                                  |
| 02   | [02-capability-assumption.md](02-capability-assumption.md)                 | AGENTS.md "项目目标" 末                                | 声明面向 Opus 4.x / GPT-5.x，免去入门教程                                             |
| 03   | [03-rule-quality-criteria.md](03-rule-quality-criteria.md)                 | docs/agents-governance.md                              | "可执行/可判定/可快速定位" 三判据                                                     |
| 05   | [05-layered-validation.md](05-layered-validation.md)                       | docs/development.md                                    | 开发内循环 vs 收口闸门分层                                                            |
| 06   | [06-governance-signals.md](06-governance-signals.md)                       | docs/agents-governance.md                              | 何时修补 / 何时 Bootstrap 的宏观信号（操作化见 15）                                   |
| 07   | [07-source-of-truth.md](07-source-of-truth.md)                             | AGENTS.md 导航段                                       | 真源指针 + 自动校验回路                                                               |
| 08   | [08-agent-collaboration.md](08-agent-collaboration.md)                     | AGENTS.md 一级章节                                     | subagent 委派 + lazy 导航 + 优先级 + 信任边界                                         |
| 09   | [09-verification-anchors.md](09-verification-anchors.md)                   | AGENTS.md 验证段                                       | prose 不替代命令；命令锚点表                                                          |
| 11   | [11-skill-codegen-source-of-truth.md](11-skill-codegen-source-of-truth.md) | skills/ + scripts/ + .claude/skills/ + .agents/skills/ | skill 真源 + sync codegen + Claude/Codex 双工具镜像 + CI 防漂移                       |
| 12   | [12-nested-sub-agents-md.md](12-nested-sub-agents-md.md)                   | src/<高风险目录>/AGENTS.md                             | agents.md closest-file-wins 嵌套子规约（≤ 30 行，根文件改指针）                       |
| 13   | [13-three-tier-boundaries.md](13-three-tier-boundaries.md)                 | AGENTS.md "任务分流" 前                                | 三层边界：始终 / 先问后做 / 禁止（简单配对的进阶）                                    |
| 14   | [14-model-role-routing.md](14-model-role-routing.md)                       | AGENTS.md "最小流程" 后                                | 模型角色路由：plan/review → Opus；implement/debug → Sonnet/Codex；subagent 写入白名单 |
| 15   | [15-prune-signal-quarterly-audit.md](15-prune-signal-quarterly-audit.md)   | docs/agents-governance.md                              | 剪枝信号操作化（grep prune-candidate + 事件触发审计）                                 |

## 哲学

这些片段全部满足 **可执行 / 可判定 / 可快速定位** 三条标准（见 03-）。

- 每段都不依赖具体技术栈（TS / Python / Rust / Go 等都适用）
- 每段都不依赖具体 agent（Claude Code / Codex CLI / Cursor 均适用，仅命令名需替换）
- 每段都内嵌"为什么写它"——你可以删，但删之前应能反驳来源

## 升级与同步

这是 **copy-paste 片段库**，不是 npm package。一旦复制到目标项目，它属于那个项目，不向上游同步。
如果你后来改进了某段（例如把新 best-practice 写回 03-），请手动 git diff 检查已分发到哪些下游项目并按需同步。
若需要自动同步机制（plugin / preset），见调研结论中的方案 A / C。

## 来源

- 本仓库 (CommandTest / mybot) 2026-05-14 AGENTS.md 审计：[git log c407052](../README.md)
- Anthropic Claude Code best practices · Anthropic Skills best-practices
- Augment Code "good AGENTS.md" 博客 · agents.md 官方规范
- Mercari "Taming Agents in the Web Monorepo" (2025-10)
- Stack Overflow Blog "Coding guidelines for AI agents" (2026-03)
