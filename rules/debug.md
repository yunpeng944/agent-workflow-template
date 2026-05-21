# Debug Rules — regression / CI red / failing test

Apply when: 已知 failing test / CI 红 / 复现稳定但 root cause 不明 / 跨多 commit regression。

**Use base.md 同时叠加**。

## Reproducer First

- **不许猜 root cause / 不许写 fix** 直到复现稳定
- Reproducer 脚本放 **git tree 外**（如 `/tmp/reproducer-<task>.sh`），避免 bisect checkout 替换
- 跑 reproducer ≥ 2 次确认稳定失败（非 flaky）

## Flake Handling (4 档协议)

跑 reproducer 20 次记失败率：
- **100% (20/20)** STABLE → 直接进 bisect
- **≥ 80% (16-19/20)** NEAR-STABLE → bisect 时包装"重试 3 次都失败才算 bad"
- **30-80%** FLAKY-HIGH → **先解决 flake**（找非确定性源），否则 bisect 失真
- **< 30%** FLAKY-LOW → **必须**先 deflake，不允许带噪声进 bisect

## Bisect Discipline

- 用 Stage 1 Known-Good Anchor 作 good，HEAD 作 bad
- `git bisect run <reproducer-cmd>`
- build 失败的 commit 标 `git bisect skip` 而非 `bad`
- monorepo / lockfile 失真：每步跑 `pnpm install --frozen-lockfile` 同步依赖
- skip > 30% → BISECT-INCONCLUSIVE，停下让用户收窄 anchor
- 多父 merge commit（父 ≥ 3）：每父跑 reproducer；全 PASS → first-bad 是 merge；有父 FAIL → 缩到那条分支重启
- 父 ≥ 3 且复杂 → 自动建议 hand-scan-mode（git log 肉眼定位，不跑 bisect）

## Fix Strategy (4 态 Decision)

拿到 first-bad 后选一个：

- **FORWARD-FIX**：在 first-bad 上下游写 minimal fix（默认）
- **REVERT**：直接 `git revert <SHA>`（first-bad 改动小、独立、无后续依赖）
- **REVERT-WITH-CHERRY-PICK**：first-bad commit 含多个独立 patch，1+ 是好的 → revert 然后 cherry-pick 好的
- **PARTIAL-REVERT-PLUS-FORWARD-FIX**：first-bad 暴露上游 latent bug + 自己也带新 bug → 需改 first-bad commit 之外的代码

判据：
- 是否需要改 first-bad commit **之外**的代码？是 → PARTIAL-REVERT-PLUS-FORWARD-FIX；否 → REVERT-WITH-CHERRY-PICK

## Verification (三项 PASS)

所有 Decision 分支都跑：
1. Stage 1 reproducer 转**绿**（验证 fix / revert 真覆盖了 root cause）
2. **新增 negative test**（持久 test，不能用 reproducer 临时脚本代替）
3. `./tasks.sh validate` 全绿

不允许：
- "reproducer 转绿了就够" 跳过 negative test
- "revert-only 路径豁免持久 test"——必须将 `/tmp/reproducer-*.sh` 转写为 `tests/regression/<name>.sh` 入仓

## Known Cause Mode (skip Stage 1/2)

root cause 已通过其他途径定位（second-opinion / 既有 issue / 人工分析）：
- 必填 **Equivalent Reproducer Command**（一条 failing 命令）
- 写 negative test 前必须本机跑出 fail——若该命令未跑红 → 升级回完整 bisect 流程（防 root cause 错位）
- Stage 3 输入用 `KNOWN-CAUSE-DESCRIPTION` 块代替 `BISECT-RESULT`

## Anti-Patterns

- 跳 Stage 1 复现直接 bisect → FLAKY 现场 bisect 失真
- 复用同 session 跑多 stage 而不隔离 → reproducer / bisector 互相污染
- Decision 含混"先 revert 一下看看" → 必须明示四态之一
