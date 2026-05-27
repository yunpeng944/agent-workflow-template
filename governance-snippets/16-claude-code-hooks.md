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
