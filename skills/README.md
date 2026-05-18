# 会话内工作流 Skills

## 用途

`skills/` 是 Claude Code 与 OpenAI Codex 使用的会话内工作流 skill 单一真源。

运行时镜像位置是 `.claude/skills/` 与 `.agents/skills/`。

每个源文件都是紧凑的工作流契约，包含 YAML frontmatter 与五个必需章节：
Role, Goal, Boundaries, Validation, and Output.

镜像由脚本生成，确保两个工具加载同一份工作流文本。

## 编辑

只编辑 `skills/<name>.md`。

不要编辑 `.claude/skills/` 或 `.agents/skills/` 下的 generated 文件。

编辑任一 skill 源文件后，运行 `./tasks.sh sync-skills`。

同一次 commit 中提交源文件与两份 generated 镜像。

只需检查漂移时，运行 `./tasks.sh sync-skills-check`。

## 与 `prompts/` 的区别

现有 `prompts/` 目录保存用于人到 AI 交接的外部粘贴模板。

`skills/` 保存会话内、可自动发现的工作流，由工具按需加载。
