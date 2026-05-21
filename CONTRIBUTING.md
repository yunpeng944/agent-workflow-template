# Contributing to agent-workflow-template

本模板的 spec 真源 = git。所有 spec 文件（`docs/` / `AGENTS.md` / `skills/wf-*.md` / `governance-snippets/`）都遵循同一流程。

## 提议 spec 演进

- **人贡献者**：直接编辑 git 文件 + 提 PR；CI 自动跑 `./tasks.sh validate`
- **agent 贡献者**：同样路径——任何 agent（Claude Code / Codex CLI / 其他）都可以在 git 上 propose spec 改动，作者 review merge。**不要**通过 Notion / Obsidian 等外部真源回流，那会绕过 PR review 并让 spec 演进失去 agent 协作通道

## 修 skill 真源

修 `skills/wf-*.md` 后必须跑 `./tasks.sh sync-skills`，同 commit 提交真源 + 两份镜像（`.claude/skills/` + `.agents/skills/`）。这是 Anthropic SKILL.md / OpenAI Codex CLI 互操作的硬约束，不是冗余。

## 修 adapter / config

见 [adapters/README.md](adapters/README.md) 实现说明 + [agents-md.config.json](agents-md.config.json) schema。Node adapter 是唯一实现。

## 验证

任何 commit 前都跑 `./tasks.sh validate`（含 check-structure / check-refs / sync-skills-check 三项）。
