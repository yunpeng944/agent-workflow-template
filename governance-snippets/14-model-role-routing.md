# 14 · 模型角色路由

**何时用**：团队同时用 frontier thinking model（Claude Opus 4.x / GPT-5.x）做 plan / review，普通编程 model（Claude Sonnet / OpenAI Codex / GPT-5.x）做 implement / debug；或有多种 subagent（codex-rescue / security-reviewer / contract-reviewer）需要按任务类型分派。
**占位符**：模型名 / subagent 类型按项目替换。
**反模式**：把"用哪个模型"留给 agent 自决（每次决策开销 + 不一致结果）；subagent 委派不显式声明写入白名单（scope creep 风险）；让 subagent 自报成功不亲跑收口（"假绿"风险）。

---

## 模型角色路由

不同任务派给不同模型 / agent；subagent 委派必须显式声明写入范围。

| 任务类型                     | 推荐模型 / agent            | 调度方式                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------- |
| plan / review / 契约决策     | Opus 级 thinking model      | 主流程；或 `.claude/agents/contract-reviewer.md` 子代理 |
| implement / debug / refactor | Sonnet 级 / Codex / GPT-5.x | 主流程；或 `codex:rescue` subagent                      |
| 大批量独立改动               | 多并发 subagent             | 每个 subagent prompt 显式列出写入文件白名单             |

主流程亲自跑收口命令（`{{validate命令}}`），不依赖 subagent 自报成功；subagent 返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。

---

## 为什么显式路由

- **plan / review 需要 thinking**：长上下文 + 多步推理，强模型边际收益 >> 成本；用便宜模型会丢风险信号。
- **implement 不需要思考深度**：步骤明确（依 plan + contract），快模型 + 大批并发更划算；省下的 thinking 预算让给主流程做最终评审。
- **subagent 白名单是 sandbox**：subagent 在写入范围之外的"顺手修一下"是事故主因；prompt 里列文件白名单 = 显式 sandbox。
- **主流程跑收口不是冗余**：subagent 看到的是它自己的 context，可能漏掉跨文件 side-effect；主流程跑 `{{validate命令}}` 才能闭环。

## 来源

- 本仓库 `AGENTS.md` "模型角色路由" 章节（commit `68d7be8`）
- agent-playbook-template 的 Opus-style ↔ Codex-style 路由约定
- Anthropic Claude Code Subagents 官方文档（独立 context window + 工具白名单）
- OpenAI Codex 多 agent 协作模式

## 改写建议

- 单模型项目（只用 Sonnet 一档）：删本片段；模型路由表退化为"全任务用 <唯一模型>"。
- 双模型项目（不引入 subagent）：保留模型路由两行，删 subagent 委派条款。
- 团队有自定义 subagent（如 `security-reviewer.md`）：按任务类型在表中加一行；显式标注哪些任务类型派给它。
- 子代理 prompt 模板没有强制"返回结构化 summary"：写一份内部 SUBAGENT_PROMPT_TEMPLATE.md，把行动 / 证据 / 阻塞三段作为 return format 固化，避免随机 dump 日志。
