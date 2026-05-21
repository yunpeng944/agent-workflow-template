# Refactor Rules — large cross-module refactors

Apply when: ≥ 3 modules / ≥ 5 files / 改动公共抽象 / 改动模块边界。

**Use base.md 同时叠加**。

## Batch Discipline

- 把大重构拆成可独立验证的 batches（每批 ≤ 600 行 / ≤ 15 文件）
- 每批必须有：依赖、rollback 策略、acceptance 命令、估算大小
- 不允许"一次完成 diff 大、回滚成本高"的 big-bang 重构

## INVARIANTS (机械可校验)

每批运行前后**重跑** invariants，对照退出码——任何 PASS → FAIL 即 BATCH REWORK：

- **命令型 invariants**（必带命令 + 退出码，禁止只写 PASS/FAIL）：
  - `pnpm typecheck` 或项目对应 typecheck 命令
  - `./tasks.sh validate`
  - 项目自家 test 命令
- **Diff 型 invariants**（reviewer 读 diff 自判）：
  - 公共 API 表面是否动了
  - 模块边界是否被穿透
  - 命名 / 风格是否与周边一致

## Cross-Batch Recheck

- 本批 commit 后，**重跑所有命令型 invariants**对照上一批基线退出码
- 任何 invariant 从 PASS 变 FAIL（即使本批 invariants 自身 PASS）→ BATCH REWORK
- 首批跳过对比但仍记录退出码作下一批基线

## Batch Lifecycle

- **BATCH ACCEPT**：本批 PASS + cross-batch recheck PASS → commit
- **BATCH REWORK**：invariants FAIL → 回 Stage 2 重做本批（丢 working tree）
- **BATCH ABORT**：根本性方向错 → 回 Stage 1 改 batch plan（本批 working tree 丢弃；不需 git revert，因未 commit）

## Commit Discipline

- 每批一个 commit
- 每批 commit message 含本批 invariants 验证结果

## Codemod Mode

机械改写（pure rename / import path / API 替换）：
- PLAN 内标 `MODE=codemod` + codemod 脚本规范
- Stage 2 跑脚本，Stage 3 review 产出 diff（不 review 脚本逻辑——review 结果）
- 上限：单次 codemod diff ≤ 1500 行 / ≤ 30 文件
- 超即拆 2+ codemod-pass
