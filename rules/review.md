# Review Rules — external code / PR / diff review

Apply when reviewing code **you didn't write**, **without a PLAN to compare against**.

**Use base.md 同时叠加**。

## Don't Guess Intent

按以下锚点逐项核意图：

- (a) 同 PR 测试覆盖（grep test files for changed symbols）
- (b) 命名是否唯一暗示意图
- (c) 调用点（grep 改动符号被谁调用）
- (d) 同模块 grep 既有惯例
- (e) commit message / inline 文档

**任一无法唯一证明意图 → 标 🟡 "需向作者澄清"** —— 不擅自评对错。

历史代码审计豁免（commit > 90 天且原作者不可联系）：意图锚点缺失不自动标 🟡，改为 standalone 评判（仅看代码自身语义自洽），输出 Summary 时声明"历史审计模式"。

## 6 Dimensions（每条机械锚点，不主观）

### 1. 正确性 (Correctness)
- bug / off-by-one / null / undefined / 并发竞态 / 异常路径未处理
- 判据：能写出"输入 X → 期望 Y / 实际 Z"反例 → 🔴
- 异常路径未 catch / 资源未释放 → 🔴

### 2. 安全 / 信任面 (Security)
- 输入校验缺失 → 🔴
- 凭证 / token 硬编码 / log 泄露 → 🔴
- 注入风险（SQL / 命令 / XSS / SSRF）→ 🔴
- 资源泄露（fd / connection / memory）→ 🟡

### 3. 可读性 (Readability)
- 命名：`f` / `tmp` / `data2` → 🔴；`processedUserIds` → 🟢
- **项目 lint config 阈值优先**：仓内有 `eslint.config.*` / `ruff.toml` / `.golangci.yml` / `.rubocop.yml` / `pyproject.toml [tool.ruff]` / `clippy.toml` → 用项目阈值
- 默认阈值（无 lint config）：单函数 > 50 行 / 嵌套 > 4 层 / cyclomatic > 10 → 任一超 🟡，超两项 🔴
- 注释合理性（解释 why 而非 what）
- 死代码 / commented-out code → 🟡

### 4. 测试 (Tests)
- 改动符号被哪些 test cite（grep）
- 测试真测了改动 vs 只跑通 happy path（grep `expect`/`assert` 数）
- 边界覆盖（empty / null / max / 并发 / 错误路径）

### 5. 架构 (Architecture)
- YAGNI：新抽象有 ≥ 2 调用点 / ≥ 2 已知用例（无 → 🟡）
- 与周边代码风格一致（grep 同模块现有模式）
- 抽象层次有既有同位先例

### 6. 跨文件影响 (Cross-file)
- 改动符号 / API / schema 全仓引用是否都更新了（`grep -r <symbol>`）
- 暗示其他地方该改 → SCOPE-EXPANSION
- breaking change 风险（公开 API / CLI / JSON schema 字段）

## Output Format

每条 finding 必含：file:line + 证据（grep 输出 / 测量数字）+ review action。

**禁止补丁级实现方案**——不写"应改为 `const x = ...`"。改成什么是作者 / 后续 workflow 的事。

分级：
- 🔴 **必修**（阻断合并）
- 🟡 **建议**（合并前修或 tracked follow-up，**不许只留 TODO 注释**）
- 🟢 **接受** / 标 follow-up

## Three-State Recommendation

- **APPROVE**：0 🔴 + ≤ 2 🟡
- **REQUEST-CHANGES**：≥ 1 🔴
- **COMMENT-ONLY**：仅风格 / 建议性 🟡（非 gating）

## Upgrade Triggers (机械)

任一条件 → 派两个独立 reviewer + reconciler:
- 改动文件 ≥ 8
- 跨 ≥ 3 模块
- 触凭证 / 公共 API
- single-mode 🔴 ≥ 3
