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

- **A 段 role 集**（计划 / 评审 / 综合）：PLANNER / REVIEWER / REVIEWER-A / RED-TEAMER / AUDITOR / FINALIZER / RECONCILER / CRITERIA-LOCKER / SCORER / FIX-DESIGNER / DIAGNOSER-A / PROBE-DESIGNER / SYNTHESIZER
- **B 段 role 集**（实现 / 复现 / 二分 / 探索）：IMPLEMENTER / PROTOTYPER / REPRODUCER / BISECTOR / FIX-IMPLEMENTER / DIAGNOSER-B / REVIEWER-B / EXPLORER
- **single-role workflow 例外**：当 skill 默认只用单一 A 段 role（如 `wf-code-review` single-mode 只用 REVIEWER），preset 中的 vendor2 被忽略；仅当 skill 升级到含 B 段 role 的多段模式（如 `wf-code-review --mode=double-review` 启用 REVIEWER-A / REVIEWER-B）时 vendor2 才生效。skill 真源在 Orchestration 段标注 single-role 例外。

**默认 `claude-codex`**：A 段 Claude / B 段 Codex。举例如 `claude-claude` / `codex-codex` / `codex-claude`——所有合法 pair 由字典 N×N 自动生成，**docs / skill 不再枚举**。

### Preset Policy（跨 vendor 强制 / 警告 / 允许 三档）

| 场景 | preset policy | 触发条件 |
|---|---|---|
| **强制跨 vendor** | `v1 != v2` 必须 | 暂无（保留扩展位） |
| **同 vendor 警告** | 打印警告但不阻塞 | `wf-second-opinion` / `wf-bake-off` / `wf-code-review --mode=double-review` 且 `v1 == v2` |
| **允许同 vendor** | 静默通过 | 其余 6 个 wf-\*（独立性靠 role 视角切换 / INVARIANTS / fresh subagent，不依赖跨厂商） |

实现不需完整 N×N 矩阵，按规则表表达即可。

### Role Slot → Custom Flag 总表

| Skill | Role slots | `--custom` flag 名 |
|---|---|---|
| wf-coding-relay | PLANNER / IMPLEMENTER / REVIEWER | `--planner=<m>` / `--implementer=<m>` / `--reviewer=<m>` |
| wf-red-team | PLANNER / IMPLEMENTER / RED-TEAMER | `--planner=<m>` / `--implementer=<m>` / `--red-teamer=<m>` |
| wf-convoy-refactor | PLANNER / IMPLEMENTER / REVIEWER | `--planner=<m>` / `--implementer=<m>` / `--reviewer=<m>` |
| wf-coauthor-doc | PLANNER / AUDITOR / FINALIZER | `--planner=<m>` / `--auditor=<m>` / `--finalizer=<m>` |
| wf-second-opinion | DIAGNOSER-A / DIAGNOSER-B / RECONCILER | `--diagnoser-a=<m>` / `--diagnoser-b=<m>` / `--reconciler=<m>` |
| wf-bake-off | CRITERIA-LOCKER / PROTOTYPER / SCORER | `--criteria-locker=<m>` / `--prototyper=<m>` / `--scorer=<m>` |
| wf-incident-rescue | REPRODUCER / BISECTOR / FIX-DESIGNER / FIX-IMPLEMENTER | `--reproducer=<m>` / `--bisector=<m>` / `--fix-designer=<m>` / `--fix-implementer=<m>` |
| wf-spike | PROBE-DESIGNER / EXPLORER / SYNTHESIZER | `--probe-designer=<m>` / `--explorer=<m>` / `--synthesizer=<m>` |
| wf-code-review | REVIEWER（single-mode）/ REVIEWER-A / REVIEWER-B / RECONCILER（`--mode=double-review`） | `--reviewer=<m>` 或 `--reviewer-a=<m> --reviewer-b=<m> --reconciler=<m>` |

**unknown flag fail-fast**——adapter 解析时遇到不在本表的 flag → 报错列可用 flag 清单，不静默忽略。

**同产品 preset 警告**（`wf-second-opinion` / `wf-bake-off` / `wf-code-review --mode=double-review`）：当 `vendor1 == vendor2`（任意同 vendor pair）时，这三 skill 的独立性仅靠 session 隔离，丢失跨厂商多样性。编排者打印静态警告（不阻塞）。触发时机：second-opinion 在 Stage 1 dispatch 前；bake-off 在 Stage 2 dispatch 前；wf-code-review --mode=double-review 在 Stage 2 dispatch 前（single-mode 单一 A 段 role 无 B 对照，不触发）。其他 6 个 wf-\* 不触发——独立性靠 role 视角切换 / INVARIANTS 机械校验 / fresh subagent 隔离。

### simplification × preset 两轴

- **preset**：选 model 编排（位置参数）
- **`--mode=<name>`**：选保留的降级 / 升级 mode（仅 4 个 skill 接受此 flag：`wf-bake-off` / `wf-incident-rescue` / `wf-spike` / `wf-code-review`；共 5 个 mode 值：`paper-bakeoff` / `known-cause-fix` / `revert-only` / `learning-only` / `double-review`）

例：`/wf-bake-off claude-claude --mode=paper-bakeoff <task>`

**其他 5 个 skill**（`wf-coding-relay` / `wf-red-team` / `wf-convoy-refactor` / `wf-coauthor-doc` / `wf-second-opinion`）**不接受 `--mode` flag`**——默认即完整流程。

### 全局降级硬门（任何 skill 任何 mode 都不可绕过）

以下场景**禁止**走任何 `--mode=*` 降级 / 任何 skill 的「何时不该走本 workflow」短路；必须走完整流程：

- **安全 / 凭证 / 权限改动**：含 `crypto` / `auth` / `token` / `session` / `password` / `secret` / `*.state.json` / `secrets/`
- **公共 API / 契约改动**：跨子系统 CLI / JSON schema / IPC / external API surface
- **跨 ≥ 3 模块**：`git diff --name-only | awk -F/ '{print $1}' | sort -u | wc -l` ≥ 3
- **决策不可回退 / 回退窗口 > 1 周**：写进核心代码且换回需 ≥ 5 工作日

任一触发即"完整流程"，各 skill Simplification 段引用本节，不再各自重复。

**真源**：skill 真源是 [skills/wf-\<name\>.md](../skills/)；`.claude/skills/`（Claude Code 消费）与 `.agents/skills/`（Codex CLI 消费）是 `./tasks.sh sync-skills` 生成的镜像。

## 三层边界（workflow 特有）

**始终**：匹配「快速选择」时调对应 `/wf-<name>`；skill prompt 整段作为 dispatch payload，**不重写**（内置的独立性约束 / SCOPE-EXPANSION / paste boundary 是设计的一部分）；workflow 收口走对应 stage 的 Stop / Handoff，不"差不多就过"；涉及外部 Claude / Codex role 时按「调度执行约束」给足时间、跟踪状态并汇报 dispatch ledger。

**先问后做**：同任务对应多 workflow（如 refactor + 高风险面）→ 与用户确认主路径；workflow 中段需切换 → 明示理由。

**禁止**：直接编辑 `.claude/skills/wf-*/SKILL.md` 或 `.agents/skills/wf-*/SKILL.md`（generated）；跨 workflow 复制 prompt 段拼新流程（新需求走 `wf-coauthor-doc` 建新 skill）；跳过 Stage 3/4 review-fix 直接 commit。

## 60 秒自检（机械触发判据，按优先级判定）

接到新任务时按 1 → 9 顺序 grep / 判断，**第一个匹配的判据即触发对应 workflow，不再向下查**。

1. **触凭证 / 权限 / 状态 / 跨端边界？**（4 项任一可 grep）
   - 改动含 `crypto` / `auth` / `token` / `session` / `password` / `secret` 字串
   - 改动路径含 `*.state.json` / `secrets/` / `credentials/` / `.env*`
   - 跨 UI ↔ service / client ↔ runtime 信任边界入口
   - 已有 `wf-code-review` 输出含安全维度 ≥ 2 🔴/🟡
   → **`wf-red-team`**（高风险面禁降级）

2. **失败测试 / 断分支 / CI 红？**（任一）
   - `./tasks.sh validate` 或项目自家 test 命令 exit ≠ 0
   - PR / commit 标签含 `regression` / `revert` / `fix:` / `hotfix:`
   - root cause 已知 + Equivalent Reproducer Command 已给 → 直接 `--mode=known-cause-fix`
   - first-bad commit 改动 ≤ 30 行 + 独立 + 无后续依赖 → 直接 `--mode=revert-only`
   → **`wf-incident-rescue`**

3. **改公共抽象 / 跨 ≥ 3 模块 / ≥ 5 文件？**（≥ 2 项任一）
   - `git diff --name-only HEAD~..HEAD | wc -l` ≥ 5
   - `git diff --name-only HEAD~..HEAD | awk -F/ '{print $1}' | sort -u | wc -l` ≥ 3
   - 改动含 module entry points（`index.*` / `mod.rs` / `__init__.py` / `lib.rs`）
   - 触公共 API / 跨子系统 type 流向
   → **`wf-convoy-refactor`**

4. **PR / 外部 diff / 历史代码审计？**（任一）
   - 你不是作者；要看别人的 commits / PR / diff
   - 改动 ≥ 8 文件 / 跨 ≥ 3 模块 / 触凭证或公共 API / single-mode 🔴 ≥ 3 → 直接 `--mode=double-review`
   → **`wf-code-review`**

5. **疑难 bug / 单 agent 多轮转圈？**（任一）
   - 同问题已派 ≥ 2 轮 agent 但 hypothesis 互相矛盾
   - 跨 ≥ 2 子系统现象（"前端崩，state 是 Node 写的"）
   - 临 release 高风险 bug
   → **`wf-second-opinion`**

6. **架构 / 框架 / 库 / 性能策略选型？**（任一）
   - ≥ 2 候选 + 决策难回退（要写进核心代码）
   - 任务文本含 "用 X 还是 Y" / "迁移到 Z" / "选哪个"
   - 两候选均有官方文档 + 公开 benchmark + 决策可逆 → 直接 `--mode=paper-bakeoff`
   → **`wf-bake-off`**

7. **开放探索 / 不熟领域 / 概念验证？**（任一）
   - 候选 < 2 或判据不清
   - 任务文本含 "X 能不能跑通" / "X 性能如何" / "摸清 Y"
   - 答案在权威文档 / 源码 / RFC 内 + 不需跑代码 → 直接 `--mode=learning-only`
   → **`wf-spike`**

8. **AGENTS.md / SKILL.md / governance 文档新建或大改？**（任一）
   - 改动路径含 `AGENTS.md` / `skills/wf-*.md` / `docs/agents-governance.md` / `docs/workflows.md` / `governance-snippets/`
   - 任务含 "写 skill" / "起草 governance" / "新建文档"
   → **`wf-coauthor-doc`**

9. **以上都不是 + 新功能 / 重构 / 跨多文件 / 不熟模块？**
   → **`wf-coding-relay`**（默认开发 workflow）

**判据冲突时按 1 → 9 顺序优先**（如同时触发"凭证 + 跨 3 模块"→ `wf-red-team` 而非 `wf-convoy-refactor`）。

**何时不用 workflow**：单文件 typo / 改文案 / 已写过 3+ 次的同类模式 / 已熟模块 + 不动公共 API + 不触上述 1-2/4 项——直接改 + `./tasks.sh validate` 即可。

## 快速选择

| 任务特征                                              | 主 workflow                                           | 降级 / 升级 mode                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 新功能 / 跨多文件 / 不熟模块 / 触及契约或跨端边界     | [wf-coding-relay](../skills/wf-coding-relay.md)       | —（默认即完整流程；lite 场景走 AGENTS.md「何时不用 workflow」）                          |
| 凭证 / token / 状态文件 / 权限 / 跨端信任边界         | [wf-red-team](../skills/wf-red-team.md)               | —（默认即完整流程；高风险面禁降级）                                                       |
| ≥ 3 模块 / ≥ 5 文件 / 改公共抽象的大重构              | [wf-convoy-refactor](../skills/wf-convoy-refactor.md) | —（默认即完整流程；< 3 模块走 `wf-coding-relay`）                                         |
| AGENTS.md / SKILL.md / governance 类文档新建或大改    | [wf-coauthor-doc](../skills/wf-coauthor-doc.md)       | —（默认即完整流程；typo / 单行走 AGENTS.md「何时不用 workflow」）                         |
| 疑难 bug / 单 agent 已转圈 / 跨子系统问题             | [wf-second-opinion](../skills/wf-second-opinion.md)   | —（默认即完整流程；已知 root cause 走 `wf-incident-rescue`）                              |
| 架构 / 框架 / 库 / 性能策略选型（难回退）             | [wf-bake-off](../skills/wf-bake-off.md)               | `--mode=paper-bakeoff`（两候选均有官方文档 + 公开 benchmark + 决策可逆）                  |
| 失败测试 / 断分支 / regression / CI 红                | [wf-incident-rescue](../skills/wf-incident-rescue.md) | `--mode=known-cause-fix`（root cause 已定位）<br>`--mode=revert-only`（first-bad 改动小独立） |
| 开放探索 / 不熟领域 / 概念验证（候选 < 2 或判据不清） | [wf-spike](../skills/wf-spike.md)                     | `--mode=learning-only`（纯文档查询型 + 既存权威源）                                       |
| 外部 diff / PR review / 历史代码审计（无 PLAN 对照）  | [wf-code-review](../skills/wf-code-review.md)         | `--mode=double-review`（**升级**：改动 ≥ 8 文件 / 跨 ≥ 3 模块 / 触凭证或公共 API / 🔴 ≥ 3） |

本表是「60 秒自检」的详细参照——routing 决策已在前段机械化；本表用于二次校对 task 特征与 mode 触发条件。

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

每个 skill 都有 `## Simplification` 段：4 个 skill（`wf-bake-off` / `wf-incident-rescue` / `wf-spike` / `wf-code-review`）列保留的 mode + 触发判据；其余 5 个 skill 段内说明"默认即完整流程，无 mode flag"+「何时不该走本 workflow」路径。

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
| `wf-incident-rescue` Stage 2 bisect inconclusive                                     | BISECTOR 改用 git log 肉眼定位（commits 已收窄）或回 Stage 1 缩 anchor；root cause 仍未明 → 升级 `wf-second-opinion` |
| `wf-convoy-refactor` 某批 BATCH ABORT 影响后续                                       | 回 Stage 1 改 batch plan；本批 working tree 丢弃                                                              |
| `wf-bake-off` Stage 2 发现 Stage 1 漏写维度                                          | 回 Stage 1 改 criteria（version bump）+ 两 prototype 受影响维度重跑——不在 Stage 3 偷加                        |
| `wf-second-opinion` Stage 3 共识但 confidence 低                                     | 跑 Stage 3 给的 Next Probe；FAIL 重跑带新 input + 已排除假设                                                  |
| `wf-coauthor-doc` Stage 2 audit 失败需回 Stage 1                                     | 改初稿；不允许在 Stage 3 直接润色绕过                                                                         |
| `wf-spike` Stage 1 决策门浮现 ≥ 2 候选 + 判据可定                                    | 输出 `EXIT-TO-BAKEOFF` 不进 Stage 2；Stage 3 综合后浮现同类信号则给 SWITCH-DIRECTION 并标下一步 `wf-bake-off` |
| `wf-spike` Stage 2 全 probe BLOCKED-OVER-BUDGET / ABORT-OVER-LOC                     | 回 Stage 1 缩 probe scope / 缩 Time Budget；问题太宽 → SYNTHESIZER 给 NEED-MORE-PROBES                        |
| `wf-code-review` 单段发现 🔴 ≥ 3 / 改动文件数 ≥ 8 / 触及凭证或公共 API / 跨 ≥ 3 模块 | 升级 `--mode=double-review` 3 段双盲 + reconcile                                                              |

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
