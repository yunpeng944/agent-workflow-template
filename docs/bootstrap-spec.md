# Agent 自治 Bootstrap Spec

> **真源**：本仓 `docs/bootstrap-spec.md`（git 是 single source of truth）。spec 演进流程见根目录 `CONTRIBUTING.md`——agent 可直接提 PR / 作者 review merge。
>
> **频次分离**：本文件是场景一/二（首次 / 重审 bootstrap）低频内容，跟 [agents-governance.md](agents-governance.md) 上半段（场景三日常治理高频）物理分离。场景三日常修补**不读本文件**。
>
> **方法论指针**：完整设计原理 / Don't-Do 配对 / 横切实践 / 评估 Rubric / 检查清单见 Tier 1/3 source（[agent-autonomy-sources-tier.md](agent-autonomy-sources-tier.md)）；本文件只保项目特有触发 + 必要执行骨架。drift-scan 触发时自动跟随业界演进。

## 使用指南

三种场景的 launch prompt 直接复制给任意 agent（Claude Code / Codex CLI / Cursor / Gemini CLI 等）。

### 场景一：首次 Bootstrap

**适用**：仓库还没 `AGENTS.md`，或现有治理结构不足以支撑 agent 自治。

> 严格按本文档执行 agent 自治 bootstrap，按 §1.2 Step 1-6 逐步执行；完成判据以 §1.4 Done When 为准。横切实践（lazy doc loading / subagent 委派 / Don't-Do 配对 / 真源不复制）见 [agent-autonomy-sources-tier.md](agent-autonomy-sources-tier.md) Tier 1。

### 场景二：重审 Bootstrap

**适用**：架构变化或治理失效，满足 §1.6 触发条件任一即可。

> 仓库治理结构需要重审。按本文档执行 bootstrap，**对比现有 AGENTS.md，只做最小必要补丁**——不要整文件覆盖。同样满足 §1.4 Done When。

### 场景三：日常修补（最常见）

**不需要读本文件**。agent 直接依赖 [agents-governance.md](agents-governance.md) `## 何时更新 / 修补 AGENTS.md` 节自行修补；操作清单见同文件「触发式审计」节。

## §1.2 执行步骤

1. **识别仓库事实**：类型 / 语言 / 顶层目录职责 / 执行入口 / 验证入口 / 现有治理载体（AGENTS.md / README / `.github/instructions` / docs/）；不为满足模板虚构
2. **判断规模档位**：小（<20 文件，README 内加 agent 节即可）/ 中（20-200，独立 AGENTS.md）/ 大（monorepo，根 + 子包局部规则）；对应 Level 1/2/3 自治目标
3. **检查自治最小闭环 6 要素**：主规则入口 / 局部上下文恢复机制 / 可执行验证路径 / 自治状态判断 / 失效信号 / 更新触发条件 —— 全具备 = Level 3，缺则按缺失程度判 Level 0-2
4. **只补最小必要增量**：过「不可推断过滤器」3 问（能从 README / package.json 推断 → 不写 / 说不出 agent 会犯什么具体错 → 不写 / `git log --oneline -50` + grep 无证据 → 可能不需要）
5. **验证**：执行项目验证命令 + 扫描 AGENTS.md 反引号路径存活（如 `grep -oP '`[^`]*\.(ts|tsx|js|json|md)`' AGENTS.md` + 文件存在检查）；判断自治等级
6. **输出 6 栏结论**：Created/Updated / Not applied or Not applicable / Autonomy status (Level 0-3 + 判定依据) / Verification (退出码 + 检查输出) / Risks-Gaps / Next update triggers

## §1.4 Done When

- [ ] 已基于仓库事实完成自治状态判断
- [ ] 已落地最小必要治理增量（或说明为何无需新增）
- [ ] 已给出可核验的验证结果
- [ ] 已明确当前自治等级、主要风险与后续更新触发条件
- [ ] 已把长期规则写入仓库根 AGENTS.md

## §1.6 Bootstrap vs 日常修补

| 日常修补（agent 自行执行）| 完整 Bootstrap（人工触发）|
|---|---|
| 单条路径引用失效 → 修掉 | 项目架构结构性变化（单体→微服务等）|
| 一条规则不再适用 → 删或更新 | 主要技术栈切换 |
| 新增高频模块 → 补一行导航 | AGENTS.md >30% 路径引用失效 |
| 删除过时的规则条目 | 最近 10 次 agent 任务中 >3 次需补背景 |
| | 新团队成员（人或 agent）首次接触仓库 |

## 自治等级速查

- **Level 0**（未自治）：无主入口 / 无验证路径，依赖人工反复补背景
- **Level 1**（初始骨架）：有主入口 + 最小骨架，但局部规则 / 验证不全
- **Level 2**（部分自治）：多数高频任务 agent 可依规则恢复上下文 + 执行
- **Level 3**（可持续自治）：上下文恢复 + 边界执行 + 验证 + 失效识别 + 最小治理更新均稳定

> 注：autonomy 是 emergent 特性，不是 model 固有属性（Anthropic 2026）。Level 是仓库状态 + oversight 策略组合的快照，同一仓库在不同 oversight 下 Level 可不同。

## 自维护

本文件随业界演进同步 drift-scan 触发更新（SOP 见 [agents-governance.md](agents-governance.md) `## 业界演进同步（drift-scan）` 节）。剪枝候选信号见同文件「剪枝信号」节。
