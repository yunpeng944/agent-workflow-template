# 02 · 能力假设声明

**何时用**：放在 AGENTS.md 第一个二级章节（"项目目标" / "概述"）末尾，明示读者档次。
**占位符**：无（如果团队主力是更弱模型，请删除本段或改为相反方向的指引）。
**反模式**：写"请使用 Conventional Commits / 请遵循 TDD / 请使用强类型" 等所有 frontier model 已内化的 SE 常识。

---

**能力假设**：本文件假定 agent 为前沿 thinking model（Claude Opus 4.x / GPT-5.x 或同档及以上）。已内化的 SE 常识（TDD、强类型、模块化、结构化错误、Conventional Commits、PR 礼仪、git rebase 语义、长 ctx 懒加载）默认成立，本文件只列项目特异的约束、入口与边界。若使用更弱模型（如 haiku / gpt-4o-mini），需补充 procedural 指引或用 skill 触发执行。

---

## 为什么需要这一段

- 没有这一段，文档会被写成入门教程（"请使用 TypeScript" / "请记得测试" / "请使用 ESLint"）
- 有这一段，所有 reviewer 在加规则前会问：这条 frontier model 不会自己做吗？

## 来源

- 本仓库 `AGENTS.md` "项目目标" 段末 (能力假设)
- Anthropic Claude Code best-practices 反模式清单："over-correcting" / "kitchen sink" / "over-specified CLAUDE.md"
- Augment Code 实测：写入 frontier model 已内化的内容会让推理成本 +20%、收益接近 0

## 改写建议

- 团队混用模型（既有 Opus 4.x 也有 4o-mini）：保留两段，分别指引
- 仅用一种模型：简化为一句 "本文件假定 agent 为 {{模型名}}；已内化能力不复述。"
