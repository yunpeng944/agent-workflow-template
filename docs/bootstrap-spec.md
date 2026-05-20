# Agent 自治 Bootstrap 规范

> **真源**：本仓 `docs/bootstrap-spec.md`。另有 working copy 在 Obsidian (`AgentSpace/40-agent-autonomy-bootstrap-spec.md`) 与 Notion (`34199080acdf81dd8d4cf30c3bda7e1a`)，改动以本仓为准；working copy 仅供作者编辑使用，回流前需 cp 同步到本仓。
>
> **与项目 `docs/agents-governance.md` 的分层关系**：本 spec 是高层 SOP，可能列比项目 governance 入口段更全的场景（例如 §1.6 第 5 条「新团队成员首次接触」在项目 governance.md 故意精简掉，只保留 4 条高频 ops-level 触发条件）。不算漂移，按"spec 覆盖完整场景 / governance 精简入口"分层；spec 跟项目 governance **直接矛盾**才视为漂移。
>
> **元规则**：本文件是 agent 自治 bootstrap 的完整规范，单文件自包含。结构：使用指南（三种场景的 launch prompt）→ Layer 1 执行卡片（agent 必读）→ Layer 2 设计原理（人类按需）→ Layer 3 评估附录（bootstrap 后自评）。

---

## 使用指南

以下三种场景的 launch prompt 可直接复制粘贴给任意 agent（Claude Code、Codex、Cursor、Gemini CLI 等）。

### 场景一：首次 Bootstrap

**适用于**：仓库还没有 `AGENTS.md`，或现有治理结构不足以支撑 agent 自治。

> [!tip]
> **Launch prompt（直接复制）：**
> 严格按本文档 Layer 1 执行 agent 自治 bootstrap，按 §1.2 Step 1-6 逐步执行，并叠加 §1.7 的 4 条 2026 实践补丁。完成判据以 §1.4 Done When 为准；Layer 2/3 仅按需引用。

### 场景二：重审 Bootstrap

**适用于**：架构变化或治理失效，满足 §1.6 触发条件任一即可。

> [!warning]
> **Launch prompt（直接复制）：**
> 仓库治理结构需要重审。按 Layer 1 重新执行 bootstrap，**对比现有 `AGENTS.md`，只做最小必要补丁**——不要整文件覆盖。同样需满足 §1.7 与 §1.4 Done When。

### 场景三：日常修补（最常见）

**不需要重新读规范。** agent 直接依赖仓库内 `AGENTS.md` 自身的失效信号自行修补；操作清单见 §1.6 "日常修补"。

> [!info]
> **核心设计**：bootstrap 是低频的，日常靠 `AGENTS.md` 自我维持。仅当日常修补无法覆盖、或触发 §1.6 Bootstrap 条件时，才回到场景二。

---

# Layer 1：执行卡片（Agent 必读）

> [!info]
> **本层是 agent 每次执行 bootstrap 时唯一必须阅读的内容。** Layer 2（设计原理）和 Layer 3（附录）仅在需要判断边界时按需引用。

## §1.1 目标

以最小必要增量，为仓库建立可自我维持的 agent 自治骨架。

**自治** = agent 能依赖仓库内规则恢复局部上下文、在边界内行动、证明完成结果、在必要时小幅修补治理骨架。

自治 **不等于**：无约束修改、任意扩张范围、跳过验证、脱离事实猜测架构。

## §1.2 执行步骤

### Step 1：识别仓库事实

- 仓库类型、主要语言、框架、包管理
- 顶层目录职责
- 执行入口、验证入口
- 现有治理载体（`AGENTS.md`、README、`.github/instructions`、`docs/`）
- **不要为满足模板虚构模块、入口或分层**

### Step 2：判断仓库规模，选择治理档位

| | 小仓库（<20 文件） | 中型仓库（20–200 文件） | 大仓库 / Monorepo |
|---|---|---|---|
| **主规则入口** | README 中加 agent 章节 | 独立 `AGENTS.md` | 根 `AGENTS.md` + 子包局部规则 |
| **局部规则** | 不需要 | 1–2 个高价值目录 | 每个子包可选 |
| **架构文档** | 不需要 | 可选 | 建议有 |
| **验证路径** | 能跑测试即可 | 统一验证命令 | 分包验证 + 顶层 validate |
| **自治等级目标** | Level 1 | Level 2–3 | Level 3 |
| **失效/自愈机制** | 不需要专门写 | 建议有 | 必须有 |

### Step 3：判断当前自治状态

检查仓库是否已具备自治最小闭环的六要素：

1. 一个主规则入口
2. 一套局部上下文恢复机制
3. 一条可执行的验证路径
4. 一个明确的自治状态判断
5. 一组可观察的失效信号
6. 一组明确的更新触发条件

全部具备 = Level 3（可持续自治）。缺少任一项 = 按缺失程度判定 Level 0–2。

### Step 4：只补最小必要增量

> [!tip]
> **不可推断过滤器** —— 写入 `AGENTS.md` 的每条规则必须通过：
> 1. 这条信息能否通过读 README / package.json / 目录结构推断？→ **能推断 = 不写**
> 2. 不写这条，agent 下次会犯什么**具体**错误？→ **说不出 = 不写**
> 3. 这条规则过去 30 天内被违反过吗？→ **没有 = 可能不需要**

`AGENTS.md` 应覆盖的最小内容（仅通过过滤器的才写入）：

- 仓库用途摘要
- 关键目录与入口导航
- 默认工作方式（先读什么、先复用什么）
- 修改边界与高风险区域
- 最低验证要求
- 明确禁止事项
- 失效信号与更新触发条件
- 指向局部规则 / 专题文档的导航

**`AGENTS.md` 是控制平面，不是知识库。** 只保留稳定的入口规则、边界、导航和验证要求。流程细节、案例、历史背景拆到 `docs/`。

**`AGENTS.md` 行数控制**：根 `AGENTS.md` 建议控制在 150–200 行以内。超过时优先将细节拆分到局部规则文件或 `docs/` 专题文档，而非继续在根文件中堆积。对于小仓库（<20 文件），50 行以内通常足够。

### Step 5：验证与判定

- 执行仓库的验证命令（如 `pnpm validate`、`npm test`）
- **路径存活检查（必须）**：扫描 `AGENTS.md` 中所有反引号内的文件路径引用，逐一确认是否真实存在。如发现失效引用，在本次 bootstrap 中修复或标注
- 判断当前自治等级（Level 0–3）
- 如果仓库有 CI 流程，建议将路径存活检查脚本加入验证流程（见 §2.7A）

### Step 6：输出结论

最终输出必须包含以下栏目：

- **Created / Updated**：创建或更新了哪些文件
- **Not applied / Not applicable**：不落地或不适用的事项
- **Autonomy status**：当前自治等级与判定依据
- **Verification**：验证结果
- **Risks / Gaps**：风险或认知空白
- **Next update triggers**：下一次更新触发条件

## §1.3 硬性禁止

- 禁止在没有明确边界的情况下扫描并总结整个仓库
- 禁止修改无关代码或无关文档
- 禁止为形式完整而撰写空洞治理内容
- 禁止虚构模块、分层、入口、依赖关系或职责边界
- 禁止将未来规划或理想结构写成当前事实
- 禁止建立平行规则体系

## §1.4 Done When

以下条件同时满足时，bootstrap 完成：

- [ ] 已基于仓库事实完成自治状态判断
- [ ] 已落地最小必要治理增量（或说明为何无需新增）
- [ ] 已给出可核验的验证结果
- [ ] 已明确当前自治等级、主要风险与后续更新触发条件
- [ ] 已把长期规则写入仓库根 `AGENTS.md`

## §1.5 多 Agent 兼容

- `AGENTS.md` 为所有 agent 的主规则入口（已被 Claude Code、Codex、Cursor、Gemini CLI 等支持）
- 平台专用文件（`CLAUDE.md`、`.cursorrules`、`codex.md`）仅放平台特有配置
- 平台专用文件不得与 `AGENTS.md` 冲突；冲突时以 `AGENTS.md` 为准
- 禁止在平台专用文件中复制 `AGENTS.md` 的内容

**常见模式处理：**

- **引用模式**：`CLAUDE.md` 中使用 `@AGENTS.md` 引用（而非复制内容）是推荐做法，不算"重复"
- **层级发现**：Codex 沿目录树向上合并所有 `AGENTS.md`；Claude Code 只读最近的 `CLAUDE.md` + 根 `CLAUDE.md`。子目录局部规则应放在 `AGENTS.md`（跨平台可见），而非 `CLAUDE.md` 子目录文件中
- **并发编辑**：多 agent 在独立 worktree 并行开发时，`AGENTS.md` 修改应通过 PR 合入主分支，不得在 feature branch 中直接修改根 `AGENTS.md` 的规则内容（导航更新除外）

## §1.6 Bootstrap vs 日常修补

| 日常修补（agent 自行执行） | 完整 Bootstrap（需人工触发） |
|---|---|
| 单条路径引用失效 → 修掉 | 项目架构结构性变化（单体→微服务等） |
| 一条规则不再适用 → 删掉或更新 | 主要技术栈切换 |
| 新增高频模块 → 补一行导航 | `AGENTS.md` >30% 路径引用失效 |
| 删除过时的规则条目 | 最近 10 次 agent 任务中 >3 次需人工补同类背景 |
|   | 新团队成员（人或 agent）首次接触仓库 |

## §1.7 2026 实践补丁

以下 4 条是 2026 年沉淀的新实践，作为 §1.2 Step 1-6 的横切强化（不替代步骤，但在每一步执行时叠加）：

- **Lazy doc loading**：先读现有 `AGENTS.md` + 近期 `git log`，按触发词读对应 `docs/`；禁止一次性 ingest 整个 `docs/` 或 `src/`。多文件调研顺序：目录地图 → grep 符号 → 局部 Read → 阶段摘要。
- **Subagent 委派**：调研同类产品、扫现有代码、对比对标矩阵等可独立任务派 Explore subagent；返回结构化 summary（行动 + 证据 + 阻塞），不堆原始日志。主流程亲自验证 `AGENTS.md` 草稿。
- **Don't / Do 配对**：产出的硬约束规则必须配 ✅ 替代——纯禁令会让下游 agent 转去探索"绕过路径"，完成度下降 25%（Augment 2026 在 2,500+ 仓库实测）。
- **真源不复制**：`AGENTS.md` 不复制 schema 字段、命令名、错误码、默认值；只列真源指针（contract / schema / state-paths）+ 自动校验命令（如 `pnpm check:refs` / `pnpm lint:agents`）。

---

# Layer 2：设计原理（人类按需阅读）

> [!quote]
> 本层解释 Layer 1 中规则的设计依据。agent 执行 bootstrap 时不需要阅读本层。

## §2.1 为什么是"最小必要增量"

ETH Zurich SRI Lab（2026.02）研究发现：

- LLM 生成的 context file 使任务成功率平均降低 3%
- 推理成本增加 20–23%
- 即使人类撰写的 context file，也仅带来约 4% 的成功率提升

核心结论：**agent 能自行发现的信息不需要重复写入 `AGENTS.md`。**

> "Treat AGENTS.md as a living list of codebase smells you haven't fixed yet, not a permanent configuration." — Addy Osmani

## §2.2 自治等级定义

- **Level 0（未形成自治）**：没有主规则入口，没有稳定验证路径，后续工作依赖人工反复补充背景
- **Level 1（初始骨架）**：已具备主规则入口与最小骨架，但局部规则或验证机制仍不完整
- **Level 2（部分自治）**：后续 agent 可在多数高频任务中依赖仓库内规则完成上下文恢复与执行
- **Level 3（可持续自治）**：具备稳定的上下文恢复、边界执行、结果验证、失效识别与最小治理更新能力

参考：Anthropic "Measuring Agent Autonomy in Practice" (2026)、Swarmia "Five Levels of AI Agent Autonomy" (2026)

## §2.3 治理原则

1. 优先复用现有机制（README、docs、`AGENTS.md`、`.github/instructions`）
2. 新增规则必须由真实摩擦驱动（重复错误、边界不清、验证失败）
3. 不适用项标记为"不适用"，未知项标记为"待确认"
4. 不建立平行规则体系
5. 重复出现的协作摩擦应沉淀为长期规则，而非依赖临时提醒
6. 关键规则应具备基本可验证性
7. 治理不能只增不减 —— 每次更新同时检查是否有过时内容可删除或合并

**删除候选信号**（定量补充原则 7）：满足任一条进入删除候选清单——

- 同类问题已下沉到 lint / hook / harness / CI，prose 在文档层成了装饰
- 规则引用的命令、路径、API、协议帧已废弃或重命名
- 规则在重复其他文档或 harness（Claude Code / Codex CLI 等）默认行为，无项目特异约束
- 模型审计时用 `git log --oneline -50` + `grep` 关键词无法找到近期代码 / 文档引用该规则的证据

候选标记后，下次维护任务时按本节判据重新审计；仍命中则删除。项目级具体判据 + 触发式审计流程见项目自家 `docs/agents-governance.md`「剪枝信号」/「触发式审计」节。

## §2.4 AGENTS.md 分层关系

- 根 `AGENTS.md` 负责全局约束、共享边界与通用验证要求
- 局部规则只补充局部差异，不重复根规则
- 更接近修改位置且更具体的规则可覆盖上层通用规则
- `AGENTS.md` 承担导航与引用职责

## §2.5 局部规则文件判断标准

只在同时满足以下全部条件时创建：

- 目录职责稳定
- 该目录被高频修改或查阅
- 该目录边界清晰且常被误触
- 局部规则能显著降低上下文恢复成本

## §2.6 失效信号

当出现以下情况时，视为自治骨架已退化：

- 规则与真实运行状态不一致
- 高价值目录被反复错误修改
- 后续 agent 反复需要人工补充相同背景
- 验证说明已无法执行
- `AGENTS.md` 持续膨胀但协作效果没有改善

## §2.7 自动化验证建议（可选）

建议将以下检查加入 CI 或验证流程：

**A. 路径存活检查（推荐）**

```bash
grep -oP '`[^`]*\.(ts|tsx|js|json|md)`' AGENTS.md | tr -d '`' | while read f; do
  [ ! -e "$f" ] && echo "DEAD REF: $f"
done
```

**B. 行数阈值告警**

```bash
lines=$(wc -l < AGENTS.md)
[ "$lines" -gt 300 ] && echo "WARNING: AGENTS.md is $lines lines (threshold: 300)"
```

**C. 更新新鲜度检查**

```bash
code_commits=$(git log --since="$(git log -1 --format=%ci AGENTS.md)" --oneline -- src/ | wc -l)
[ "$code_commits" -gt 50 ] && echo "WARNING: 50+ commits since last AGENTS.md update"
```

---

# Layer 3：评估附录（Bootstrap 完成后自评）

> [!info]
> 以下工具用于 bootstrap 完成后的质量评估，不是执行时必须阅读的内容。

## 附录 A：评分 Rubric

每项 0–2 分，总分 12 分。

| 维度 | 0 分 | 1 分 | 2 分 |
|---|---|---|---|
| **主规则入口** | 没有明确主入口或多个冲突 | 有主入口，导航或边界不完整 | 主入口明确，职责清晰，导航有效 |
| **局部上下文恢复** | 高度依赖人工重新解释背景 | 部分目录有恢复能力，覆盖不稳定 | 高价值目录已具备稳定恢复能力 |
| **验证能力** | 没有可执行的验证路径 | 部分验证，不稳定或证据不足 | 验证路径明确、可执行、可核验 |
| **边界清晰度** | 任务边界、禁止事项不清楚 | 边界基本存在，仍容易误读 | 边界、风险、禁止事项清晰明确 |
| **失效与更新机制** | 没有失效信号或更新条件 | 有部分说明，不成体系 | 失效信号、触发条件、修补方式明确 |
| **治理适度性** | 明显过度或明显不足 | 基本适配，有冗余或缺口 | 与仓库复杂度匹配，最小必要增量 |

**评分解释**：0–3 = 未形成有效自治 / 4–6 = 初始骨架 / 7–9 = 部分自治 / 10–12 = 可持续自治

## 附录 B：执行检查清单

### B.1 执行前

- [ ] 已识别仓库类型
- [ ] 已识别主要目录、入口与验证路径
- [ ] 已确认现有规则载体
- [ ] 已判断仓库规模档位（小/中/大）
- [ ] 已确定只做最小必要增量

### B.2 最小落地

- [ ] 存在唯一主规则入口
- [ ] 主入口能导航到关键目录和文档
- [ ] 存在最基本的局部上下文恢复机制
- [ ] 存在至少一条真实可用的验证路径
- [ ] 明确了任务边界与禁止事项
- [ ] 明确了自治状态、失效信号与更新触发条件

### B.3 质量检查

- [ ] 未新增不必要的文档
- [ ] 未建立平行规则体系
- [ ] 未写入未经证实的结构判断
- [ ] 未把未来规划写成当前事实
- [ ] 无只增不减的治理倾向
- [ ] 每条写入的规则都通过了"不可推断"过滤器

---

## 参考来源

- ETH Zurich SRI Lab — "Evaluating AGENTS.md" (2026)
- Anthropic — "Measuring AI Agent Autonomy in Practice" (2026)
- Anthropic — Claude Code Best Practices
- Swarmia — "Five Levels of AI Coding Agent Autonomy" (2026)
- Augment Code — "How to Build Your AGENTS.md" (2026)
- Marmelab — "Agent Experience: Best Practices" (2026)
- Addy Osmani — "Stop Using /init for AGENTS.md" (2026)
- Addy Osmani — "Self-Improving Coding Agents" (2026)
- Builder.io — "Improve Your AI Code Output with AGENTS.md" (2026)
- OpenAI — "Custom Instructions with AGENTS.md" (Codex Docs)
- AGENTS.md — Official Specification (Linux Foundation)

---

## 修订记录

- **2026-04-29**：初版从 Notion 同步。
- **2026-05-14**：合并原 v2 主规范（Layer 1/2/3 + 参考来源）进本文件，单文件自包含；新增 §1.7 2026 实践补丁、§2.3 删除候选信号；场景二改名"重审 Bootstrap"。原 v2 page 已不再被本文档引用，可在 Notion UI 手动 archive。
