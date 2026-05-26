# 17 · Codex CLI hooks（确定性脚本兜底）

**何时用**：项目用 OpenAI Codex CLI，需要在 agentic loop 注入确定性脚本——密钥扫描、停止时验证、操作前权限检查。
**占位符**：`{{validate命令}}`（按项目替换）；`{{repo_root}}`（仓库绝对路径）。
**反模式**：把 hook 脚本写进 `~/.codex/config.toml` 全局区（影响所有项目）—— 项目级 hooks 应放项目级 config；hook 输出非确定性日志（agent 困惑）—— 严格按 stdin/stdout 契约。

---

## `~/.codex/config.toml`（用户级）或项目级 `.codex/config.toml`

Codex CLI hook 通过 config.toml 声明，命令读 stdin JSON、stdout 写 JSON decision。

```toml
# 写到 ~/.codex/config.toml 全局生效；或项目 .codex/config.toml 项目级生效

[[hooks.pre_tool_use]]
match_tool = "shell"
command = "node {{repo_root}}/scripts/hooks/guard-dangerous-shell.mjs"
timeout_ms = 3000

[[hooks.pre_tool_use]]
match_tool = "apply_patch"
command = "node {{repo_root}}/scripts/hooks/guard-generated-mirror.mjs"
timeout_ms = 3000

[[hooks.stop]]
command = "{{validate命令}}"
timeout_ms = 60000
```

## 示例 hook 脚本（节选）

```js
// scripts/hooks/guard-dangerous-shell.mjs
// stdin: { tool_input: { command: "rm -rf ..." } }
// stdout: { decision: "block" | "ask" | "allow", reason: "..." }
import { readFileSync } from 'node:fs';
const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = input.tool_input?.command ?? '';
if (/rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard/.test(cmd)) {
  console.log(JSON.stringify({ decision: 'ask', reason: '危险命令 — 用户裁定' }));
  process.exit(0);
}
console.log('{}'); // 默认放行
```

## 何时打 hook vs 用 sandbox profile

- **sandbox profile**（`~/.codex/config.toml` 内 `sandbox = "read-only" | "workspace-write" | "danger-full-access"`）：能力级硬约束，agent 无权突破。
- **hooks**：行为级软约束，可 ask 用户裁定、可记日志。
- 通常组合：sandbox 给最低权限基线，hooks 给用户感知 + 审计 trail。

## 来源

- OpenAI Codex Hooks 官方文档：`developers.openai.com/codex/hooks`（hook 触发点 + 决策协议 + sandbox 配套）
- OpenAI Codex permissions：`developers.openai.com/codex/permissions`（sandbox 三档 + approval 三档）

## 改写建议

- 不用 Node 写 hook：换 Python / bash / Deno 都行，保持 stdin/stdout JSON 契约。
- 跨项目共享 hook：脚本放 `~/.codex/hooks/`，config.toml 写绝对路径。
- 项目想强制 sandbox：在 `.codex/config.toml` 强制 `sandbox = "workspace-write"`（覆盖用户级），并在 README 说明 trust boundary。
