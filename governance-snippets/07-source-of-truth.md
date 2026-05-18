# 07 · 真源指针 + 自动校验回路

**何时用**：放在 AGENTS.md 的"导航"或"快速定位"段，让 agent 知道事实在哪里，文档只是路标。
**占位符**：表格里的具体文件路径与命令按项目替换。
**反模式**：把 schema 字段、命令名、错误码、默认值复制到文档里——文档一旦滞后就开始误导 agent。

---

## 真源

| 真源类别             | 文件 / 入口                             | 自动校验命令       |
| -------------------- | --------------------------------------- | ------------------ |
| 系统契约             | `{{契约真源}}`                          | `{{lint命令}}`     |
| 协议帧 / WS / RPC    | `src/contracts/<protocol>/...`          | `{{validate命令}}` |
| 配置 schema          | `{{schema真源}}`                        | `{{check命令}}`    |
| 路径 / 命令 / 子命令 | `src/state/*-paths.ts`、`src/commands/` | `{{check命令}}`    |

**文档永远不复制契约值**。如需快速定位关键词，只列搜索锚点（protocol topic / method 名 / 字段名 / 状态文件名），完整清单、参数语义、TTL、错误码、schema 以代码为准。

变更触发 → 见 contract checklist（另存于 `docs/agents-governance.md`）。

---

## 为什么这条最重要

- 文档腐烂的根因是"复制契约值"。一旦复制，schema 改了文档没改，agent 就被误导。
- 真源指针 + 自动校验回路把"文档过时"从"靠人发现"变成"CI 拦截"。

## 来源

- 本仓库 `AGENTS.md` "什么时候算契约变更" 段 + `docs/agents-governance.md` "契约变更 checklist" 段
- Anthropic context engineering 2025: "context is RAM, not storage"
- Stack Overflow Blog 2026-03 "Coding guidelines for AI agents": "Reference the canonical rule"

## 改写建议

- 没有自动校验命令：先把检查脚本写出来（grep 反引号路径 → 检查文件是否存在），这是高 ROI 的初次投入
- 多种真源（OpenAPI / Protobuf / Zod）：每种一行，校验命令分开
- 没有 contract / schema 的项目：把表替换为 `README.md` / 入口文件路径即可
