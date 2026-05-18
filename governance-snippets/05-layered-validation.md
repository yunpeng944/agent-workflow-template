# 05 · 分层验证策略

**何时用**：放在 `docs/development.md`（或同等开发约定文档），定义"内循环跑啥 / 收口跑啥"。
**占位符**：`{{validate命令}}` / `{{check命令}}` / `{{lint命令}}` 按项目替换。
**反模式**：每次小修复机械跑全套件，慢且让 agent 学会"等到全过才能交付"——浪费时间。

---

## 验证策略

验证分为开发内循环和收口闸门，目标是保留最终可信证据，同时避免每个小修复重复运行完整套件。

- **RED / GREEN 内循环**：优先运行受影响的目标测试（修改 WS router 时先跑对应 `*.test.ts`；修改 schema 或契约时同时跑对应 contract / schema 测试）。
- **review fix 内循环**：先跑覆盖该反馈的目标测试；类型或公共接口受影响时加跑 `typecheck`；文档链接或 AGENTS 导航受影响时加跑 `{{check命令}}`；AGENTS 结构受影响时加跑 `{{lint命令}}`。
- **任务 / Phase 收口**：在 spec review 和 code quality review 都通过后，运行一次 `{{validate命令}}`，作为该阶段的完整证据。
- **最终交付**：主流程必须亲自运行收口验证并读取退出码，**不能只引用 subagent 报告**。
- **高风险改动**：契约、构建配置、跨端边界、共享基础设施、状态布局、协议帧或错误 schema 变更，可在 review fix 后提前运行 `{{validate命令}}`；但同一 Phase 不应因每个小修复机械重复全量验证。
- **派 subagent 时**：prompt 必须写明本次任务的目标测试和收口验证要求；不要默认要求每个窄修复都运行完整 `{{validate命令}}`，除非该修复本身触发高风险条件。

---

## 来源

- 本仓库 `docs/development.md` 验证策略段（开发内循环 / 收口闸门 / 高风险提前跑）
- Anthropic effective-harnesses for long-running agents
- Datadog "harness-first agents" 2026：generation → harness verifies → 人改 invariant

## 改写建议

- 项目无独立的 `typecheck` / `lint:agents`：把对应行删掉，但保留分层骨架
- 项目要求每次都跑全套件（小项目 / CI 速度 OK）：删掉"内循环"那几条，只保留"收口"
- 高风险定义不同：把"契约 / 跨端 / 协议帧"换成你的高风险信号
