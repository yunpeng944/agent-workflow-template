# 多模型协作工作流（Workflows）

> 7 个 `wf-*` user-invocable skill 的选择指南与共享机制单点真源。skill 真源在 [skills/](../skills/)，本文件不复制 prompt。

## Role / Model 映射

skill 内不写死 model 名；模型分类用 role 描述。模型 → role 推荐映射**单点维护于此**，升级时只改本表，所有 wf-\* skill 不动：

| 当前模型类 | 当前推荐具体 model                 |
| ---------- | ---------------------------------- |
| Claude     | Claude Opus 4.7（其次 Sonnet 4.6） |
| Codex      | OpenAI Codex 1.x / GPT-5.5         |

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

## Preset Index

slash command 第一位 token（可省，默认 `claude-codex`）：

| preset          | 行为                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude-codex`  | 默认。Claude 段（PLANNER/REVIEWER/RED-TEAMER/AUDITOR/FINALIZER/RECONCILER/CRITERIA-LOCKER/SCORER/FIX-DESIGNER/DIAGNOSER-A）+ Codex 段（IMPLEMENTER/PROTOTYPER/REPRODUCER/BISECTOR/FIX-IMPLEMENTER/DIAGNOSER-B） |
| `claude-claude` | 全 Claude；evaluator stage fresh Claude subagent                                                                                                                                                                |
| `codex-claude`  | 反向 cross                                                                                                                                                                                                      |
| `codex-codex`   | 全 Codex                                                                                                                                                                                                        |
| `custom`        | 显式 `--<role>=<model>` 覆盖该 skill 全部 role；缺任一 → **fail-fast**                                                                                                                                          |

**同产品 preset 警告**（仅 `wf-second-opinion` / `wf-bake-off`）：`claude-claude` 或 `codex-codex` 下这两 skill 的独立性仅靠 session 隔离，丢失跨厂商多样性。编排者打印静态警告（不阻塞）。触发时机：second-opinion 在 Stage 1 dispatch 前；bake-off 在 Stage 2 dispatch 前（Stage 1 仅锁判据）。其他 5 个 wf-\* 不触发——独立性靠 role 视角切换 / INVARIANTS 机械校验 / fresh subagent 隔离。

### simplification × preset 两轴

- **preset**：选 model 编排（位置参数）
- **`--mode=<name>`**：选 simplification 模式（每 skill 自定义，命名 flag）

例：`/wf-bake-off claude-claude --mode=paper-bakeoff <task>`

**真源**：skill 真源是 [skills/wf-\<name\>.md](../skills/)；`.claude/skills/`（Claude Code 消费）与 `.agents/skills/`（Codex CLI 消费）是 `./tasks.sh sync-skills` 生成的镜像。

## 三层边界（workflow 特有）

**始终**：匹配「快速选择」时调对应 `/wf-<name>`；skill prompt 整段作为 dispatch payload，**不重写**（内置的独立性约束 / SCOPE-EXPANSION / paste boundary 是设计的一部分）；workflow 收口走对应 stage 的 Stop / Handoff，不"差不多就过"。

**先问后做**：同任务对应多 workflow（如 refactor + 高风险面）→ 与用户确认主路径；workflow 中段需切换 → 明示理由。

**禁止**：直接编辑 `.claude/skills/wf-*/SKILL.md` 或 `.agents/skills/wf-*/SKILL.md`（generated）；跨 workflow 复制 prompt 段拼新流程（新需求走 `wf-coauthor-doc` 建新 skill）；跳过 Stage 3/4 review-fix 直接 commit（除非用 Simplification 降级）。

## 快速选择

| 任务特征                                           | 主 workflow                                           | 降级路径                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 新功能 / 跨多文件 / 不熟模块 / 触及契约或跨端边界  | [wf-coding-relay](../skills/wf-coding-relay.md)       | < 200 行单文件 + 已熟模块 → `plan-and-implement`；typo / 文案 → `single-agent`             |
| 凭证 / token / 状态文件 / 权限 / 跨端信任边界      | [wf-red-team](../skills/wf-red-team.md)               | 单点输入校验 ≤ 50 行 → `single-agent-with-redteam-prompt`                                  |
| ≥ 3 模块 / ≥ 5 文件 / 改公共抽象的大重构           | [wf-convoy-refactor](../skills/wf-convoy-refactor.md) | 可清晰切 ≤ 2 批且同质 → `dual-batch`；机械 rename → `codemod-pass`                         |
| AGENTS.md / SKILL.md / governance 类文档新建或大改 | [wf-coauthor-doc](../skills/wf-coauthor-doc.md)       | < 30 行单段内 → `audit-only`；typo / 单行 → `mechanical-fix`                               |
| 疑难 bug / 单 agent 已转圈 / 跨子系统问题          | [wf-second-opinion](../skills/wf-second-opinion.md)   | 已有 1 份诊断 → `single-counterpoint`；1-2 分钟 sanity check → `quick-poll`                |
| 架构 / 框架 / 库 / 性能策略选型（难回退）          | [wf-bake-off](../skills/wf-bake-off.md)               | 都熟悉 + 可逆 → `paper-bakeoff`；A 明显占优需 validate → `single-prototype-poc`            |
| 失败测试 / 断分支 / regression / CI 红             | [wf-incident-rescue](../skills/wf-incident-rescue.md) | 已知 root cause → `known-cause-fix`；< 10 commit → `no-bisect`；独立可回退 → `revert-only` |

**何时不用 workflow**：单文件 typo / 改文案 / 已写过 3+ 次的同类模式——能在 60 秒内说清"该改哪、为什么改、怎么验证"且不触及契约 / 高风险面。

## 7 个 workflow 速览

| skill                                                 | 拓扑                                                                                             | 核心保护                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| [wf-coding-relay](../skills/wf-coding-relay.md)       | 4 段顺序：PLANNER → IMPLEMENTER (Phase A 校验 + Phase B 实现) → REVIEWER fresh → IMPLEMENTER fix | Stage 3 不读 IMPLEMENTER summary 保独立             |
| [wf-red-team](../skills/wf-red-team.md)               | 4 段，Stage 3 红队 review（攻击者视角：绕过 / 越权 / 泄露 / 静默丢数据）                         | Stage 4 每 🔴 1:1 配 negative 测试                  |
| [wf-convoy-refactor](../skills/wf-convoy-refactor.md) | 4 段 × N 批，Stage 1 出 INVARIANTS（跨批机械校验）                                               | 每批单一 commit 锚点；BATCH ABORT 即弃 working tree |
| [wf-coauthor-doc](../skills/wf-coauthor-doc.md)       | 3 段：PLANNER 起草 → AUDITOR 严苛 audit → FINALIZER 综合                                         | FINALIZER 例外允许读 AUDITOR 输出                   |
| [wf-second-opinion](../skills/wf-second-opinion.md)   | 3 段，Stage 1/2 平行双盲 + Stage 3 reconciliation                                                | A/B 互不可见；RECONCILER 从未参与 Stage 1/2         |
| [wf-bake-off](../skills/wf-bake-off.md)               | 3 段：CRITERIA-LOCKER → PROTOTYPER (A/B 平行 ≤ 500 行) → SCORER                                  | Stage 1 判据冻结；A/B prompt 字符级一致             |
| [wf-incident-rescue](../skills/wf-incident-rescue.md) | 4 段倒置：REPRODUCER → BISECTOR → FIX-DESIGNER (四态决策门) → FIX-IMPLEMENTER                    | REPRODUCER 不许猜 root cause                        |

每个 skill 都有 `## Simplification` 段定义降级变体（`full-*` / 中间 / `single-*`）。

## 跨 workflow 流转

- **诊断 → 落地**：`wf-second-opinion` 共识 → `wf-incident-rescue`（regression）或 `wf-coding-relay`（新写 fix）
- **选型 → 落地**：`wf-bake-off` Winner → `wf-coding-relay`，或大改 → `wf-convoy-refactor`
- **落地 → 加固**：`wf-coding-relay` 完成发现触及高风险面 → `wf-red-team`
- **重构遇 regression**：`wf-convoy-refactor` BATCH ABORT / INVARIANTS FAIL → 暂停 → `wf-incident-rescue` → 回原批重做
- **写 skill 自身**：`wf-coauthor-doc` 起草 `skills/wf-<name>.md` → 终稿跑 `./tasks.sh sync-skills` + `./tasks.sh validate`

## 升级 / 降级判据

| 场景                                             | 动作                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `wf-coding-relay` 中段发现触及高风险面           | 中断当前 stage，升级 `wf-red-team`                                                     |
| `wf-incident-rescue` Stage 2 bisect inconclusive | 降级 `no-bisect` 或回 Stage 1 缩 anchor；root cause 仍未明 → 升级 `wf-second-opinion`  |
| `wf-convoy-refactor` 某批 BATCH ABORT 影响后续   | 回 Stage 1 改 batch plan；本批 working tree 丢弃                                       |
| `wf-bake-off` Stage 2 发现 Stage 1 漏写维度      | 回 Stage 1 改 criteria（version bump）+ 两 prototype 受影响维度重跑——不在 Stage 3 偷加 |
| `wf-second-opinion` Stage 3 共识但 confidence 低 | 跑 Stage 3 给的 Next Probe；FAIL 重跑带新 input + 已排除假设                           |
| `wf-coauthor-doc` Stage 2 audit 失败需回 Stage 1 | 改初稿；不允许在 Stage 3 直接润色绕过                                                  |

## 失败模式

- workflow 与任务错配（用 `wf-coding-relay` 做选型 / `wf-red-team` 做无安全面新功能 / `wf-convoy-refactor` 做单文件）——保护机制空转
- 跳过 `wf-second-opinion` reconciliation 直接看一份诊断——核心保护失效
- `wf-bake-off` Stage 1 判据留到看 prototype 再敲定——reverse-engineering，等于没做 bake-off
- `wf-incident-rescue` 跳 Stage 1 复现直接 bisect——FLAKY 现场二分失真
- `wf-coauthor-doc` 终稿忘跑 `./tasks.sh sync-skills`（skill 类目标）——validate 必失败
- 跨 wf-\* 复制 prompt 拼新流程——独立性约束 / paste boundary / SCOPE-EXPANSION 是各 skill 设计的一部分，拼接后保护失效

## 快速定位

- **skill 真源**：[skills/](../skills/) 下 7 个 `wf-*.md`
- **镜像（generated · 勿改）**：`.claude/skills/wf-*/SKILL.md` · `.agents/skills/wf-*/SKILL.md`
- **基线约束**：[AGENTS.md](../AGENTS.md)（模板元规则 + 下游「项目特定规则」占位）
- **校验入口**：`./tasks.sh sync-skills`（修 skill 后必跑）· `./tasks.sh validate`（收口；含 `sync-skills-check` / `check-structure` / `check-refs` 三项）
- **Preset / Role 映射真源**：本文件「Role / Model 映射」节是模型升级时**唯一改动点**；7 个 wf-\* skill 不复制 model 字串。
