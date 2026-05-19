# 多模型协作工作流（Workflows）

> 9 个 `wf-*` user-invocable skill 的选择指南与共享机制单点真源。skill 真源在 [skills/](../skills/)，本文件不复制 prompt。

## Role / Model 映射 / Vendor 字典

skill 内不写死具体 model 字符串；preset 不枚举固定 vendor pair 而**按字典查**。vendor key → 推荐 model + 调度入口、role → vendor 段位规则**单点维护于此**，升级 / 新 vendor 接入只改本表，所有 wf-\* skill 不动：

| vendor key | 推荐具体 model                     | 调度入口（CLI / host subagent）                                                 |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `claude`   | Claude Opus 4.7（其次 Sonnet 4.6） | `claude -p <prompt>` / Claude Code `Agent(subagent_type="general-purpose")`     |
| `codex`    | OpenAI Codex 1.x / GPT-5.5         | `codex exec <prompt>` / Claude Code `Agent(subagent_type="codex:codex-rescue")` |

**新 vendor 接入**：本表加一行（key + 推荐 model + 入口）即生效。

## 调度优先级（CLI → host-specific subagent → fail-fast）

编排者派任何 stage 给某 role 时按 3 级优先级择优。priority 1 (CLI) 是 host-agnostic，两 host 都能仅靠它跑全流程。

| 优先级 | Claude role                        | Codex role                          | 备注                                                                     |
| ------ | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| 1      | `claude -p <prompt>` (Bash 子进程) | `codex exec <prompt>` (Bash 子进程) | host-agnostic；CLI 子进程本身即 fresh session，天然满足 evaluator 独立性 |
| 2      | host-specific（见下）              | host-specific                       | 仅当 host 装有对应机制                                                   |
| 3      | **fail-fast**                      | 同左                                | 报错列需要的 CLI / 插件，不降级到 manual paste                           |

### host-specific routing（priority 2 各 host 实现）

| host        | Claude role priority 2                                                 | Codex role priority 2                               | 推荐                                                   |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Claude Code | `Agent(subagent_type="general-purpose", isolation="worktree", prompt)` | `Agent(subagent_type="codex:codex-rescue", prompt)` | Codex 推荐 priority 1（plugin queue 历史有 hang case） |
| Codex CLI   | n/a（`Agent` tool 是 Claude Code 专属）                                | Codex CLI 自家 task 机制                            | 两 role 走 priority 1                                  |
| 脚本 / CI   | n/a                                                                    | n/a                                                 | 强制 priority 1                                        |

**Worktree 隔离（CLI 路径补偿）**：CLI 子进程无 `Agent` 工具的 `isolation=worktree` 自动隔离；编排者在 Bash 子进程前 `git worktree add /tmp/wt-<run-id>` 并 `cd` 进去，stage 收尾后 merge / drop。

### 调度执行约束

- preset 是**实际 dispatch 合约**，不是写作视角标签。选择任意 `<v1>-<v2>` vendor pair（如 `claude-codex` / `codex-claude` / `claude-claude` 等）后，必须按字典真实拉起对应 vendor 的 CLI / host-specific agent；若对应 CLI / agent 不可用、未登录、失败、超时或被中断，必须 fail-fast 并明示，不得用当前模型模拟该 role 的意见。
- 调度 Claude Code 或 Codex 时必须给足够执行时间；不得因短时间无输出草率中断。没有完善的后台沟通 / 状态回收机制时，优先使用前台同步执行；若使用后台 / agent / 长任务方式，必须持续跟踪最终状态。
- 收口汇报必须包含 dispatch ledger：每个外部 role 的执行方式、状态（completed / unavailable / failed / timed out / interrupted）和产物来源。没有真实完成的 role 不得写成"Claude 侧意见"或"Codex 侧意见"。

## Preset Index

slash command 第一位 token 形如 `<vendor1>-<vendor2>`（可省，默认 `claude-codex`）。vendor key 按上节字典查；字典缺项 → **fail-fast** 列出可用 vendor，**不静默 fallback**。

| preset 形式 | 解析规则                                                               |
| ----------- | ---------------------------------------------------------------------- |
| `<v1>-<v2>` | vendor1 跑 A 段 role；vendor2 跑 B 段 role                             |
| `custom`    | 显式 `--<role>=<model>` 覆盖该 skill 全部 role；缺任一 → **fail-fast** |

- **A 段 role 集**（计划 / 评审 / 综合）：PLANNER / REVIEWER / REVIEWER-A / REVIEWER-B / RED-TEAMER / AUDITOR / FINALIZER / RECONCILER / CRITERIA-LOCKER / SCORER / FIX-DESIGNER / DIAGNOSER-A / PROBE-DESIGNER / SYNTHESIZER
- **B 段 role 集**（实现 / 复现 / 二分 / 探索）：IMPLEMENTER / PROTOTYPER / REPRODUCER / BISECTOR / FIX-IMPLEMENTER / DIAGNOSER-B / EXPLORER
- **single-role workflow 例外**：当 skill 默认只用单一 A 段 role（如 `wf-code-review` single-mode 只用 REVIEWER），preset 中的 vendor2 被忽略；仅当 skill 升级到含 B 段 role 的多段模式（如 `wf-code-review --mode=double-review` 启用 REVIEWER-A / REVIEWER-B）时 vendor2 才生效。skill 真源在 Orchestration 段标注 single-role 例外。

**默认 `claude-codex`**：A 段 Claude / B 段 Codex。举例如 `claude-claude` / `codex-codex` / `codex-claude`——所有合法 pair 由字典 N×N 自动生成，**docs / skill 不再枚举**。

**同产品 preset 警告**（`wf-second-opinion` / `wf-bake-off` / `wf-code-review --mode=double-review`）：当 `vendor1 == vendor2`（任意同 vendor pair）时，这三 skill 的独立性仅靠 session 隔离，丢失跨厂商多样性。编排者打印静态警告（不阻塞）。触发时机：second-opinion 在 Stage 1 dispatch 前；bake-off 在 Stage 2 dispatch 前；wf-code-review --mode=double-review 在 Stage 2 dispatch 前（single-mode 单一 A 段 role 无 B 对照，不触发）。其他 6 个 wf-\* 不触发——独立性靠 role 视角切换 / INVARIANTS 机械校验 / fresh subagent 隔离。

### simplification × preset 两轴

- **preset**：选 model 编排（位置参数）
- **`--mode=<name>`**：选 simplification 模式（每 skill 自定义，命名 flag）

例：`/wf-bake-off claude-claude --mode=paper-bakeoff <task>`

**真源**：skill 真源是 [skills/wf-\<name\>.md](../skills/)；`.claude/skills/`（Claude Code 消费）与 `.agents/skills/`（Codex CLI 消费）是 `./tasks.sh sync-skills` 生成的镜像。

## 三层边界（workflow 特有）

**始终**：匹配「快速选择」时调对应 `/wf-<name>`；skill prompt 整段作为 dispatch payload，**不重写**（内置的独立性约束 / SCOPE-EXPANSION / paste boundary 是设计的一部分）；workflow 收口走对应 stage 的 Stop / Handoff，不"差不多就过"；涉及外部 Claude / Codex role 时按「调度执行约束」给足时间、跟踪状态并汇报 dispatch ledger。

**先问后做**：同任务对应多 workflow（如 refactor + 高风险面）→ 与用户确认主路径；workflow 中段需切换 → 明示理由。

**禁止**：直接编辑 `.claude/skills/wf-*/SKILL.md` 或 `.agents/skills/wf-*/SKILL.md`（generated）；跨 workflow 复制 prompt 段拼新流程（新需求走 `wf-coauthor-doc` 建新 skill）；跳过 Stage 3/4 review-fix 直接 commit（除非用 Simplification 降级）。

## 快速选择

| 任务特征                                              | 主 workflow                                           | 降级路径                                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 新功能 / 跨多文件 / 不熟模块 / 触及契约或跨端边界     | [wf-coding-relay](../skills/wf-coding-relay.md)       | < 200 行单文件 + 已熟模块 → `plan-and-implement`；typo / 文案 → `single-agent`             |
| 凭证 / token / 状态文件 / 权限 / 跨端信任边界         | [wf-red-team](../skills/wf-red-team.md)               | 单点输入校验 ≤ 50 行 → `single-agent-with-redteam-prompt`                                  |
| ≥ 3 模块 / ≥ 5 文件 / 改公共抽象的大重构              | [wf-convoy-refactor](../skills/wf-convoy-refactor.md) | 可清晰切 ≤ 2 批且同质 → `dual-batch`；机械 rename → `codemod-pass`                         |
| AGENTS.md / SKILL.md / governance 类文档新建或大改    | [wf-coauthor-doc](../skills/wf-coauthor-doc.md)       | < 30 行单段内 → `audit-only`；typo / 单行 → `mechanical-fix`                               |
| 疑难 bug / 单 agent 已转圈 / 跨子系统问题             | [wf-second-opinion](../skills/wf-second-opinion.md)   | 已有 1 份诊断 → `single-counterpoint`；1-2 分钟 sanity check → `quick-poll`                |
| 架构 / 框架 / 库 / 性能策略选型（难回退）             | [wf-bake-off](../skills/wf-bake-off.md)               | 都熟悉 + 可逆 → `paper-bakeoff`；A 明显占优需 validate → `single-prototype-poc`            |
| 失败测试 / 断分支 / regression / CI 红                | [wf-incident-rescue](../skills/wf-incident-rescue.md) | 已知 root cause → `known-cause-fix`；< 10 commit → `no-bisect`；独立可回退 → `revert-only` |
| 开放探索 / 不熟领域 / 概念验证（候选 < 2 或判据不清） | [wf-spike](../skills/wf-spike.md)                     | 单一明确 probe → `single-probe`；无需跑代码 → `learning-only`                              |
| 外部 diff / PR review / 历史代码审计（无 PLAN 对照）  | [wf-code-review](../skills/wf-code-review.md)         | 单一维度 → `focus-review`；粗看 → `quick-comment`；高价值 PR → `double-review`（升级）     |

**何时不用 workflow**：单文件 typo / 改文案 / 已写过 3+ 次的同类模式——能在 60 秒内说清"该改哪、为什么改、怎么验证"且不触及契约 / 高风险面。

## 9 个 workflow 速览

| skill                                                 | 拓扑                                                                                              | 核心保护                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [wf-coding-relay](../skills/wf-coding-relay.md)       | 4 段顺序：PLANNER → IMPLEMENTER (Phase A 校验 + Phase B 实现) → REVIEWER fresh → IMPLEMENTER fix  | Stage 3 不读 IMPLEMENTER summary 保独立             |
| [wf-red-team](../skills/wf-red-team.md)               | 4 段，Stage 3 红队 review（攻击者视角：绕过 / 越权 / 泄露 / 静默丢数据）                          | Stage 4 每 🔴 1:1 配 negative 测试                  |
| [wf-convoy-refactor](../skills/wf-convoy-refactor.md) | 4 段 × N 批，Stage 1 出 INVARIANTS（跨批机械校验）                                                | 每批单一 commit 锚点；BATCH ABORT 即弃 working tree |
| [wf-coauthor-doc](../skills/wf-coauthor-doc.md)       | 3 段：PLANNER 起草 → AUDITOR 严苛 audit → FINALIZER 综合                                          | FINALIZER 例外允许读 AUDITOR 输出                   |
| [wf-second-opinion](../skills/wf-second-opinion.md)   | 3 段，Stage 1/2 平行双盲 + Stage 3 reconciliation                                                 | A/B 互不可见；RECONCILER 从未参与 Stage 1/2         |
| [wf-bake-off](../skills/wf-bake-off.md)               | 3 段：CRITERIA-LOCKER → PROTOTYPER (A/B 平行 ≤ 500 行) → SCORER                                   | Stage 1 判据冻结；A/B prompt 字符级一致             |
| [wf-incident-rescue](../skills/wf-incident-rescue.md) | 4 段倒置：REPRODUCER → BISECTOR → FIX-DESIGNER (四态决策门) → FIX-IMPLEMENTER                     | REPRODUCER 不许猜 root cause                        |
| [wf-spike](../skills/wf-spike.md)                     | 3 段：PROBE-DESIGNER（≤ 3 可观察子问题） → EXPLORER（≤ 500 LOC 丢弃式） → SYNTHESIZER（4 态决策） | 问题收敛 + 代码可丢弃 + 必含 NO-GO                  |
| [wf-code-review](../skills/wf-code-review.md)         | 1 段（默认）：REVIEWER 6 维度无 PLAN 评审；升级 `double-review` 3 段双盲 + reconcile              | REVIEWER 不许猜规格；不含实现段                     |

每个 skill 都有 `## Simplification` 段定义降级变体（`full-*` / 中间 / `single-*`）。

## 跨 workflow 流转

- **诊断 → 落地**：`wf-second-opinion` 共识 → `wf-incident-rescue`（regression）或 `wf-coding-relay`（新写 fix）
- **选型 → 落地**：`wf-bake-off` Winner → `wf-coding-relay`，或大改 → `wf-convoy-refactor`
- **落地 → 加固**：`wf-coding-relay` 完成发现触及高风险面 → `wf-red-team`
- **重构遇 regression**：`wf-convoy-refactor` BATCH ABORT / INVARIANTS FAIL → 暂停 → `wf-incident-rescue` → 回原批重做
- **写 skill 自身**：`wf-coauthor-doc` 起草 `skills/wf-<name>.md` → 终稿跑 `./tasks.sh sync-skills` + `./tasks.sh validate`
- **探索 → 选型**：`wf-spike` Stage 3 浮现 ≥ 2 候选 + 判据可定 → `wf-bake-off`
- **探索 → 落地**：`wf-spike` Stage 3 Decision = CONTINUE-TO-CODING-RELAY → `wf-coding-relay`（按 spike 给的 PLAN 草图）
- **Review → 修复**：`wf-code-review` REQUEST-CHANGES → `wf-coding-relay`（按 review 起 PLAN）或派回原作者
- **Review → 加固**：`wf-code-review` 发现高风险面（安全维度 ≥ 2 🔴/🟡）→ `wf-red-team` 复扫

## 升级 / 降级判据

| 场景                                                                                 | 动作                                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `wf-coding-relay` 中段发现触及高风险面                                               | 中断当前 stage，升级 `wf-red-team`                                                                            |
| `wf-incident-rescue` Stage 2 bisect inconclusive                                     | 降级 `no-bisect` 或回 Stage 1 缩 anchor；root cause 仍未明 → 升级 `wf-second-opinion`                         |
| `wf-convoy-refactor` 某批 BATCH ABORT 影响后续                                       | 回 Stage 1 改 batch plan；本批 working tree 丢弃                                                              |
| `wf-bake-off` Stage 2 发现 Stage 1 漏写维度                                          | 回 Stage 1 改 criteria（version bump）+ 两 prototype 受影响维度重跑——不在 Stage 3 偷加                        |
| `wf-second-opinion` Stage 3 共识但 confidence 低                                     | 跑 Stage 3 给的 Next Probe；FAIL 重跑带新 input + 已排除假设                                                  |
| `wf-coauthor-doc` Stage 2 audit 失败需回 Stage 1                                     | 改初稿；不允许在 Stage 3 直接润色绕过                                                                         |
| `wf-spike` Stage 1 决策门浮现 ≥ 2 候选 + 判据可定                                    | 输出 `EXIT-TO-BAKEOFF` 不进 Stage 2；Stage 3 综合后浮现同类信号则给 SWITCH-DIRECTION 并标下一步 `wf-bake-off` |
| `wf-spike` Stage 2 全 probe BLOCKED-OVER-BUDGET / ABORT-OVER-LOC                     | 回 Stage 1 缩 probe scope / 缩 Time Budget；问题太宽 → SYNTHESIZER 给 NEED-MORE-PROBES                        |
| `wf-code-review` 单段发现 🔴 ≥ 3 / 改动文件数 ≥ 8 / 触及凭证或公共 API / 跨 ≥ 3 模块 | 升级 `double-review` 3 段双盲 + reconcile                                                                     |

## 失败模式

- workflow 与任务错配（用 `wf-coding-relay` 做选型 / `wf-red-team` 做无安全面新功能 / `wf-convoy-refactor` 做单文件）——保护机制空转
- 跳过 `wf-second-opinion` reconciliation 直接看一份诊断——核心保护失效
- `wf-bake-off` Stage 1 判据留到看 prototype 再敲定——reverse-engineering，等于没做 bake-off
- `wf-incident-rescue` 跳 Stage 1 复现直接 bisect——FLAKY 现场二分失真
- `wf-coauthor-doc` 终稿忘跑 `./tasks.sh sync-skills`（skill 类目标）——validate 必失败
- 跨 wf-\* 复制 prompt 拼新流程——独立性约束 / paste boundary / SCOPE-EXPANSION 是各 skill 设计的一部分，拼接后保护失效
- 把 `codex-claude` / `claude-codex` 理解成"当前模型模拟另一方视角"，未真实 dispatch 外部 role 就汇总——preset 保护失效；必须 fail-fast 或明确标记缺失角色。
- preset 解析时 vendor key 不在字典——必须 fail-fast 列出可用 vendor，**不静默 fallback** 到 `claude-codex`；fallback 等于隐式切换 vendor，违反 dispatch 合约
- `wf-spike` 漫游不收敛——PROBE-DESIGNER 必输 ≤ 3 可观察子问题，**禁止 unfalsifiable 措辞**（"X 是否好用 / 优雅"）
- `wf-spike` spike code 偷偷 apply 到主仓——违反"代码可丢弃"硬约束；spike code 必须在 `/tmp/spike-<topic>/`，不入主仓 / worktree
- `wf-code-review` REVIEWER 猜规格自评对错——意图判定锚点不齐时必标 🟡 "需向作者澄清"，不擅自评对错（不然就退化成"差不多就过"）
- `wf-code-review` 在 self-PR / 自己刚写的代码上用——应该走 `wf-coding-relay` Stage 3（已嵌入 review + 配 fix stage）

## 快速定位

- **skill 真源**：[skills/](../skills/) 下所有 `wf-*.md`（当前 9 个）
- **镜像（generated · 勿改）**：`.claude/skills/wf-*/SKILL.md` · `.agents/skills/wf-*/SKILL.md`
- **基线约束**：[AGENTS.md](../AGENTS.md)（模板元规则）· [docs/agents-governance.md](agents-governance.md)（治理基线，详见 AGENTS.md 工作流入口节）
- **校验入口**：`./tasks.sh sync-skills`（修 skill 后必跑）· `./tasks.sh validate`（收口；含 `sync-skills-check` / `check-structure` / `check-refs`）
- **Preset / Role 映射真源**：本文件「Role / Model 映射 / Vendor 字典」节是新 vendor 接入 / 模型升级时**唯一改动点**；所有 wf-\* skill 不复制 model 字串。
