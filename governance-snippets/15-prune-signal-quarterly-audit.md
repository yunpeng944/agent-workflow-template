# 15 · 剪枝信号 + 季度审计（操作化）

**何时用**：替代 [10-deletion-candidates](10-deletion-candidates.md) 的抽象版；需要可被 grep / lint 机械判定的剪枝判定 + 节奏化的审计流程。放在 `docs/agents-governance.md`。
**占位符**：阈值数字（3 次 / 30 天 / 1·4·7·10 月）按团队节奏微调。
**反模式**：模糊地"定期清理"（无触发条件 → agent 不知何时该提议剪枝）；只删不审计（节奏断裂 → 半年后又膨胀）；用主观判定（"这条好像没人用了"——无 grep-able 标记）。

---

## 剪枝信号

满足以下任一即将该规则标为**剪枝候选**：

- 规则在 `{{lint命令}}` / `{{check命令}}` 中无对应 enforcement，且模型审计时 `git log --oneline -50` + `grep` 找不到近期相关代码 / 文档引用证据。
- 规则措辞含"建议 / 尽量 / 通常 / 一般"等非强制副词（违反"指令性"原则）。
- 规则与更近的子 AGENTS.md 或 `docs/` 条款语义重复。

**候选标记方式**：在该规则当行末尾加 HTML 注释 `<!-- prune-candidate: <reason> · <YYYY-MM-DD> -->`，下次审计批量处理。grep `prune-candidate` 即可拉清单。

## 季度审计

每季度首月（1 / 4 / 7 / 10 月）由 maintainer 触发，节奏与 contract review 对齐：

1. 全文 `grep -rn "prune-candidate" AGENTS.md docs/ src/**/AGENTS.md` 列出全部候选。
2. 对每个候选评估：
   - 能用 lint / hook / test 替代吗？是则删 prose、加机械检查；否则保留。
   - 能并入更近的子 AGENTS.md 吗？是则迁移，根文件改指针。
   - 实际工程已不再需要？是则删。
3. 同步：若变更触及契约或 `EXPECTED_HEADINGS`，按相应 checklist 同步。
4. 跑 `{{validate命令}}` 收口；commit message 用 `docs(governance): quarterly audit YYYY-QN — <精简变更摘要>`。

---

## 为什么操作化比抽象更稳

- **抽象版（10 风格）**："近 5 个 PR 没触发"——但谁负责数？什么时候数？没人主动数 = 永远不剪。
- **操作化版**：剪枝信号 = grep `prune-candidate` 注释；季度审计 = 日历驱动（1/4/7/10 月）；机械判定 = `EXPECTED_HEADINGS` / `KNOWN_PREFIXES` 等已有 lint 配套。每条都能 grep / cron / CI 触发，不依赖人记。
- **HTML 注释标记是关键**：当下不删（避免在常规 PR 中混入治理改动），但留下 grep-able 痕迹，季度审计批量处理。

## 来源

- 本仓库 `docs/agents-governance.md` "剪枝信号" + "季度审计" 两节（commit `7a1a471`）
- Anthropic Claude Code best-practices："If Claude keeps doing X despite the rule, the rule is getting lost in noise — prune."
- Augment Code 2026 实测：超 150 行的 AGENTS.md 推理成本 +20%；治理无剪枝信号则只增不减
- Mercari 2025-10 "Self-enforcing self-updating docs"

## 改写建议

- 团队节奏不是季度：把"1 / 4 / 7 / 10 月"换成实际节奏（如月度 / 双月）；保留"日历驱动 + grep 拉清单"骨架。
- 没有契约 / `EXPECTED_HEADINGS` 这种机械检查：第 2 步保留前两条评估，删第三步同步契约。
- 想要审计前推送提醒：加 GitHub Action 在每季度首月 1 号开 issue 标 `audit-due`，季度审计完成关 issue。
- 想看历史剪枝：每次 quarterly audit commit 都按 `docs(governance): quarterly audit YYYY-QN` 格式，`git log --grep "quarterly audit"` 即可回溯所有审计。
