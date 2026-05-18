# 08 · Agent 协作机制

**何时用**：放在 AGENTS.md 一级章节（建议位于"开发约定"和"输出规范"之间）。
**占位符**：`{{state目录}}` 按项目替换。
**反模式**：把"subagent 派发自由" / "随便读 docs" 留给 agent 自行决定——长 ctx 模型会 dump-everything。

---

## Agent 协作机制

- **上下文导航**：先读本文件，再按任务关键词读对应 `docs/` 文件；禁止一次性 ingest 整个 `docs/`。多文件任务顺序：目录地图 → grep 符号 → 局部 Read → 阶段摘要，不读整目录。

- **Subagent 委派**：仅当任务可独立 / 可并行 / 写入范围在 prompt 中可显式描述时派 subagent；返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。主流程亲自跑收口命令再确认 subagent 报告的成功。

- **优先级**：用户显式指令 > CLAUDE.md / AGENTS.md > project skill > user / plugin skill > 默认 system prompt。skill / subagent / plan 决定执行机制，不替代 contract 同步、目标测试与收口验证。

- **信任边界**：project skill（本仓库 `.claude/` / `.codex/`）可读写本仓库与 `{{state目录}}`；user / plugin skill 不能写 `{{state目录}}`，除非由 project skill 显式委托。

---

## 为什么这一段属于 always-on

- 长 ctx 模型（Opus 4.x 1M / GPT-5.x / Gemini 2.5）面对大 docs/ 的默认反应是 dump-everything；不写约束就吃 60K+ token
- subagent 调用没有边界协议就会被滥用：写超出范围的文件、塞 raw 日志、报告假成功
- skill / plugin 优先级不清就会出现 "skill 说 X，AGENTS.md 说 Y，谁赢？" 的歧义

## 来源

- 本仓库 `AGENTS.md` "Agent 协作机制" 段
- Oakheart "subagent-driven development" + Anthropic effective-harnesses
- Mem0 2026 "context is RAM": 超 100K token 召回精度断崖式下降
- Anthropic Skills best-practices + Claude Code Skills 优先级模型

## 改写建议

- 单 agent 项目（不派 subagent）：删 "Subagent 委派" 那条
- 没有 skill 系统：删 "优先级" + "信任边界" 两条
- ctx 不够长（≤32K）：删 "上下文导航" 中的"不读整目录"，因为整目录本来就读不下
