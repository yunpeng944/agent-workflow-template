# 04 · Don't / Do 配对

**何时用**：任何"硬约束 / 边界 / 禁令"章节。
**占位符**：示例中的 `{{服务端边界}}`、`{{state目录}}` 等按项目替换。
**反模式**：写纯禁令清单（"❌ 禁止 X / ❌ 禁止 Y"）而不给替代——Augment 在 2,500+ 仓库实测 agent 完成度下降 25%。

> **v2 更新 (2026-05)**：本片段保留为两层简化版（Don't / Do）。若项目需要"无条件必做 / 先问后做 / 禁止"三层精细分级，见 [13-three-tier-boundaries.md](13-three-tier-boundaries.md)。两者可二选一，不必同时存在。

---

## 不可逾越的边界

> 格式：违反即拦截 · 替代方案显式给出。每条 Don't 必配 Do。

- 🚫 在 UI 包 import `node:*` 或 `fs` / `path` / `child_process` / `os` 模块
  ✅ 把 Node.js 能力放服务端，UI 通过 `POST {{服务端边界}}/api/<cmd>/execute` 调用

- 🚫 隐式 GUI 状态 / 仅内存运行态
  ✅ 全部落 `{{state目录}}` 下 JSON / JSONL，agent 用 `cat` / `jq` / Read 工具即可检查与编辑

- 🚫 抛出无 `code` 的不透明字符串错误
  ✅ 用 `{ code, message, context, action }` 四元组结构化错误；agent 可机械分类（`code`）、决策恢复路径（`action`）、向用户呈现（`message`）

- 🚫 真实第三方平台凭证接入（messaging / OAuth / paid API）
  ✅ 用本地文件读写模拟；端到端测试通过 mock fixture 完成

---

## 为什么配 Do 这么重要

- 纯禁令让 agent 转去探索代码寻找"绕过路径"，token 浪费 + 偶尔出错
- 配 Do 让 agent 立刻看到"该走哪条替代路径"，决策秒级完成

## 来源

- 本仓库 `AGENTS.md` 浏览器/Node 边界节 + `src/contracts/system/system-contract.ts`（结构化错误真源）+ `docs/skill-plugin-compat.md` 重构后的 ✅ 替代段
- Augment Code "good AGENTS.md" 博客 2026 实测：纯禁令完成度 -25%
- Anthropic Claude Code best-practices 反模式 "over-correcting without alternatives"

## 改写建议

- 每个新边界都按这个模板补一对 🚫 / ✅
- 若某 Don't 暂时没有替代方案：写明 "✅ 替代：当前没有替代方案，遇到时停下来告诉用户"，让 agent 知道这是 escalation 信号
