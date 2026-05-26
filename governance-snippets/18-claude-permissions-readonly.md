# 18 · Claude Code permissions（deny / ask / allow 三档）

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
