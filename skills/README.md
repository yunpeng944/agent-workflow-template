# 会话内工作流 Skills

## 用途

`skills/` 是 Claude Code 与 OpenAI Codex 使用的 user-invocable workflow skill 真源。当前 2 个：

- **`wf-orchestrate`** — 编排模式：当前 LLM 计划 + 拆分判别 → N 个 fresh executor 执行（N=1 接力 / N>1 fan-out 自动判）+ 当前 LLM 汇总 review
- **`wf-parallel`** — 平行模式：两个 executor 独立做同一任务 + 当前 LLM 综合两份产物

运行时镜像位置是 `.claude/skills/`（Claude Code 消费）与 `.agents/skills/`（Codex CLI 消费）。

## 调用

```
/wf-orchestrate [executor] <prompt>
/wf-parallel [v1-v2] <prompt>
```

可选叠加规则文件（host 原生处理，skill 不需特殊解析）：

```
/wf-orchestrate codex @rules/security.md <task>
/wf-parallel claude-codex @rules/base.md @rules/review.md <task>
```

不传 `@<file>` 则用 host 默认规则。

## 编辑

只编辑 `skills/<name>.md`，不要编辑 `.claude/skills/` 或 `.agents/skills/` 下的 generated 文件。

编辑后跑 `./tasks.sh sync-skills`，同一次 commit 提交源文件与镜像。

只检查漂移：`./tasks.sh sync-skills-check`。

## 添加新 skill

按 [skills/wf-orchestrate.md](wf-orchestrate.md) 或 [skills/wf-parallel.md](wf-parallel.md) 的格式起新文件。frontmatter 必含 `name` + `description`（"Use when..." 格式）+ `argument-hint`。

## 与 `prompts/` 和 `rules/` 的区别

- `skills/` — 会话内 user-invocable workflow，host 加载到 LLM context
- `rules/` — 可选的任务约束，通过 `@<file>` 叠加到 skill 调用
- `prompts/` — 外部 paste 模板（人 → AI 交接，无 host 时用）
