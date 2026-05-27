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
