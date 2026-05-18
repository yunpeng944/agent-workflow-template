# Tracked follow-ups

来自 wf-coding-relay Stage 3 REVIEWER 的 🟡 项，未在 Stage 4 直接处理，记此追踪。

## R7 · parity test 缺 2 个 MUST 契约 case

**Owner**: TBD（首位接此模板的维护者）

**位置**: `tools/adapter-parity.test.mjs`

**缺失覆盖**:

1. **kebab-case name 校验 + `name === stem` 校验** — `adapters/README.md` MUST §6 contract，三 lane 都实现了（node `sync_skills.mjs` L20 `KEBAB_CASE_RE` + L36 `name !== stem`；python / shell 对齐），但 parity test 无 corrupt fixture 注入 `name: Foo` 或 `name: foo_bar` 验证三 lane 同时退 1 + 报错 token 集合一致。
2. **生成产物字节级一致** — `adapters/README.md` MUST §6 「字节级一致，含换行」是硬契约；当前 passthrough test (L214-250) 仅 regex match `disable-model-invocation` / `user-invocable` 两个字段，未做三 lane 间 mirror 文件的 `assert.equal(nodeMirror, pythonMirror)` / `assert.equal(pythonMirror, shellMirror)` 字节比对。三 lane 实现若在末尾换行 / 空行处理上有 1 字节差异，当前测试不会暴露。

**建议**: 加 2 个新 test case 到 `tools/adapter-parity.test.mjs`，复用现有 `withFixture` + `assertSameExit` 基础设施。预估 ~40 行测试代码。

**优先级**: 中。当前实现三 lane 在 baseline 输入下行为一致（9/9 parity 全绿即证），但 corrupt 路径下的覆盖盲区会让契约 drift 不被发现。
