# 15 · 剪枝信号 + 触发式审计（操作化）

**何时用**：替代 [10-deletion-candidates](10-deletion-candidates.md) 的抽象版；需要可被 grep / lint / 前沿 thinking model 机械判定的剪枝判定 + 事件驱动的批量审计流程。放在 `docs/agents-governance.md`。
**占位符**：阈值数字（≥ 5 条候选 / > 50 个 commit）按团队节奏微调。
**反模式**：模糊地"定期清理"（无触发条件 → agent 不知何时该提议剪枝）；只删不审计（节奏断裂 → 半年后又膨胀）；用主观判定（"这条好像没人用了"——无 grep-able 标记）；日历驱动季度审计（agent 项目节奏远快于人类季度，等不到下次首月膨胀已发生）。

---

## 剪枝信号

满足以下任一即将该规则标为**剪枝候选**：

- 规则在 `{{lint命令}}` / `{{check命令}}` 中无对应 enforcement，且模型审计时 `git log --oneline -50` + `grep` 找不到近期相关代码 / 文档引用证据。
- 规则措辞含"建议 / 尽量 / 通常 / 一般"等非强制副词（违反"指令性"原则）。
- 规则与更近的子 AGENTS.md 或 `docs/` 条款语义重复。

**候选标记方式**：在该规则当行末尾加 HTML 注释 `<!-- prune-candidate: <reason> · <YYYY-MM-DD> -->`，下次审计批量处理。grep `prune-candidate` 即可拉清单。

## 触发式审计

满足以下任一即触发批量审计（**不依赖日历**——agent 项目节奏远快于人类季度）：

- `grep -rn "prune-candidate" AGENTS.md docs/` 返回 ≥ 5 条候选。
- 距上次 `docs(governance): audit ...` commit 已过 50 个项目 commit（`git log --grep="docs(governance): audit" -1` 拿到上次 hash，`git rev-list HEAD ^<hash> --count` 算距离）。
- maintainer 显式触发。

审计步骤：

1. 全文 `grep -rn "prune-candidate" AGENTS.md docs/` 列出全部候选（含可能的子 AGENTS.md）。
2. 对每个候选评估：
   - 能用 lint / hook / test 替代吗？是则删 prose、加机械检查；否则保留。
   - 能并入更近的子 AGENTS.md 吗？是则迁移，根文件改指针。
   - 实际工程已不再需要？是则删。
3. 同步：若变更触及契约或 `expectedHeadings`，按相应 checklist 同步。
4. 跑 `{{validate命令}}` 收口；commit message 用 `docs(governance): audit — <精简变更摘要>`（用于回溯算下次审计触发距离）。

---

## 为什么操作化比抽象更稳

- **抽象版（10 风格）**："近 5 个 PR 没触发"——但谁负责数？什么时候数？没人主动数 = 永远不剪。
- **操作化版**：剪枝信号 = 前沿 thinking model 直接审计 + `grep prune-candidate` 注释；批量审计 = 事件触发（≥ 5 候选或 > 50 commit），不靠日历；机械判定 = `expectedHeadings` / `knownPrefixes` 等已有 lint 配套。每条都能 grep / 模型审计 / CI 触发，不依赖人记。
- **HTML 注释标记是关键**：当下不删（避免在常规 PR 中混入治理改动），但留下 grep-able 痕迹，触发审计时批量处理。
- **事件触发 ≠ 日历驱动**：agent 项目一周 commit 几十次，季度（3 个月）的节奏跟 agent 时间尺度脱节。换成 "≥ N 候选" 或 "> M commit" 这种事件阈值，跟 agent 实际节奏对齐。

## 来源

- 本仓库 `docs/agents-governance.md` "剪枝信号" + "触发式审计" 两节
- Anthropic Claude Code best-practices："If Claude keeps doing X despite the rule, the rule is getting lost in noise — prune."
- Augment Code 2026 实测：超 150 行的 AGENTS.md 推理成本 +20%；治理无剪枝信号则只增不减
- Mercari 2025-10 "Self-enforcing self-updating docs"
- wf-spike learning-only 实证（CommandTest 2026-05）：前沿 thinking model（Opus 4.7 / GPT-5.5）在 84 条治理规则上 100% evidence cite + 4/4 mapped 到判据，证明 "PR 触发数据 / session 违反记录" 等不存在数据源的判据可改写为 "模型审计 + git log 兜底"。

## 改写建议

- 团队不要事件驱动，要日历：把"≥ 5 候选 / > 50 commit"换回月度 / 双月节奏；保留"grep 拉清单 + commit message 格式回溯"骨架。
- 没有契约 / `expectedHeadings` 这种机械检查：审计步骤第 3 步删契约同步。
- 想要审计前推送提醒：CI 在 `grep -rn "prune-candidate"` 返回 ≥ N 时开 issue 标 `audit-due`，审计完成关 issue。
- 想看历史剪枝：每次 audit commit 用 `docs(governance): audit — <摘要>` 格式，`git log --grep "docs(governance): audit"` 即可回溯所有审计。
