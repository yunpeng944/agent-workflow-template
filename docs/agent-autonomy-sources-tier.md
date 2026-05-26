# Agent 自治：业界演进来源分层

drift-scan 时 [docs/agents-governance.md](agents-governance.md) 引用本表。本表自身随 `docs(governance): drift-scan` commit 演化。

**Tier 1（强权威，跟模型一起发布）—— Anthropic + OpenAI 必须并列防营销偏向**：
- Anthropic：`docs.anthropic.com` / `anthropic.com/{engineering,news,research}`
- OpenAI：`developers.openai.com/codex/` / `openai.com/blog` / `openai/codex` GitHub repo（含 `AGENTS.override.md` precedence + `~/.codex/config.toml` 配置机制）

**Tier 2（跨厂商中立标准）**：Linux Foundation AAIF (`aaif.io`, 2025-12 起治理 AGENTS.md + MCP + Goose, 2026-05 已 190 orgs) / NIST autonomous AI standards (2026-02) / ISO 跨厂商规范

**Tier 3（弱权威，仅佐证；必须 ≥ 1 Tier 1/2 cross-check）—— 标 `industry view`**：
- peer-reviewed paper（ETH SRI Lab / arxiv 等）
- 第三方博客（Addy Osmani / Swarmia / Augment / Stack Overflow 等）
