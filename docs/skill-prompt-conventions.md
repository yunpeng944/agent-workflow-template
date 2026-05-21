# Skill Prompt Conventions

> 9 个 `wf-*` skill 共用的 prompt 模式 / 调度合约 / 验证规则的单点真源。skill 真源中重复出现的约束在此**集中定义**；skill 内引用本文件，不再展开。

修一条共用约束 → 改本文件一处 → 跑 `./tasks.sh sync-skills` 重生镜像。各 skill 不复制本文件内容。

## 1. Fresh Subagent 独立性约束

多段 workflow 的某些 stage 强制由**全新 session 的 subagent** 执行——不读上一段的 self-narrative / summary / reasoning trace，只读**结构化交付物**（PLAN / DIFF / OBSERVATIONS / DIAGNOSIS 等显式 block）。

**适用 stage**：
- `wf-coding-relay` Stage 3 REVIEWER（只读 STAGE-1 PLAN + STAGE-2 DIFF，不读 STAGE-2 SUMMARY）
- `wf-red-team` Stage 3 RED-TEAMER（同上）
- `wf-convoy-refactor` 每批 Stage 3 REVIEWER
- `wf-second-opinion` Stage 1/2 DIAGNOSER-A/B（互不可见）+ Stage 3 RECONCILER（fresh，未参与 Stage 1/2）
- `wf-bake-off` Stage 2 PROTOTYPER-A/B（互不可见）+ Stage 3 SCORER（fresh）
- `wf-coauthor-doc` Stage 2 AUDITOR（fresh；**例外**：Stage 3 FINALIZER 允许读 AUDIT 输出）
- `wf-spike` Stage 3 SYNTHESIZER（只读 PROBES + OBSERVATIONS，不读 EXPLORER caveats）
- `wf-incident-rescue` 每个 Stage（REPRODUCER / BISECTOR / FIX-DESIGNER / FIX-IMPLEMENTER）独立 subagent
- `wf-code-review` 默认单段 REVIEWER fresh；`--mode=double-review` Stage 2A/2B + Stage 3 RECONCILER 全 fresh

**硬约束**：fresh subagent dispatch 时 input **仅含本约定列出的 block**——不带 reasoning summary / 上游 agent 的解释性叙述。独立性是**单向不可逆**：reviewer 形成初稿后不得"事后补给 summary 作补充信号"——这会软化结论。

## 2. Paste Boundary Markers

每个 stage 的 prompt 用 `===== BEGIN STAGE-N-<ROLE> PROMPT =====` ↔ `===== END … =====` 严格界定。编排者**整段复制**为 dispatch payload，不重写 / 不省略 / 不补充。

边界内的子 block（如 STAGE-1 PLAN / STAGE-2 DIFF）有自己的 BEGIN/END 标记，由编排者填实际内容（占位符如 `[PASTE STAGE-1 PLAN HERE]`）。

**禁止**：跨 workflow 复制 stage prompt 段拼新流程——独立性约束 / SCOPE-EXPANSION / 验证逻辑是各 skill 设计的一部分，拼接后保护失效。新需求走 `wf-coauthor-doc` 建新 skill。

## 3. SCOPE-EXPANSION 协议

实现 stage（IMPLEMENTER / FIX-IMPLEMENTER）发现需要**超出 PLAN 写入集**的相邻改动时：

1. **标记** `SCOPE-EXPANSION`：列具体文件 + 改动 why + 是否已停手
2. **停等用户裁定**：编排者把 SCOPE-EXPANSION 透传给用户；用户回 `EXPAND` 或 `OUT-OF-SCOPE`
3. **不允许**：implementer 自行扩 PLAN 不报、或假装是 PLAN 的一部分

**例外**：修 Stage 3 review 给的 🔴 时揭露的**同类 bug 在相邻函数**——不超过 5 行 + 同文件可直接修 + 在 SUMMARY 标注；超此阈值仍走完整 SCOPE-EXPANSION。

## 4. DIFF Block 完整性要求

涉及代码改动的 stage 输出**必含 `git diff` 完整文本**——禁止用 SHA / "见 commit X" 替代。下游 fresh REVIEWER / RED-TEAMER 需 diff 本身做独立分析，不能要它再 checkout。

**Block 格式**：
```
===== BEGIN STAGE-N DIFF =====
[完整 git diff 文本]
===== END STAGE-N DIFF =====
```

`wf-convoy-refactor` 例外：Stage 2 期间 commit 推迟到 Stage 4 后，diff 来自 `git diff HEAD` 而非 commit range。

## 5. `./tasks.sh validate` 收口规则

每个修改代码 / docs / skills 的 workflow **收口必跑** `./tasks.sh validate`（含 `check-structure` / `check-refs` / `sync-skills-check`）。

退出码 ≠ 0 → 工作流不算完成，必须修到绿。

**例外**：纯诊断 workflow（`wf-second-opinion` / `wf-spike` / `wf-code-review`）不修代码，不强制 validate（但其 follow-up workflow 会跑）。

**特殊**：修 `skills/wf-*.md` 真源后必须先跑 `./tasks.sh sync-skills` 重生 `.claude/skills/` 与 `.agents/skills/` 镜像；同 commit 提交真源 + 两份镜像。

## 6. Dispatch Ledger

编排者每次 dispatch 外部 role（Claude / Codex agent / CLI 子进程）必须维护 ledger，**收口汇报必含**：

| 字段 | 内容 |
|---|---|
| `role` | PLANNER / IMPLEMENTER / REVIEWER 等 |
| `vendor` | claude / codex / 其他字典 key |
| `entrypoint` | `claude -p` / `codex exec` / `Agent(subagent_type=...)` |
| `status` | `completed` / `unavailable` / `failed` / `timed_out` / `interrupted` |
| `产物来源` | 文件路径 / agent 返回 ID |
| `开始时间` | ISO 8601 |
| `dispatch_id` | 唯一标识（用于跨 dispatch 追溯） |

**硬约束**（[docs/workflows.md](workflows.md) 调度执行约束节）：若对应 CLI / agent 不可用、未登录、失败、超时或被中断，必须 fail-fast 并明示，**不得用当前模型模拟该 role 的意见**。没有真实完成的 role 不得写成 "Claude 侧意见" / "Codex 侧意见"。

## 7. 同产品 Preset 警告

当 preset `<v1>-<v2>` 满足 `v1 == v2`（任意同 vendor pair，如 `claude-claude` / `codex-codex`），以下 3 个 skill 的独立性仅靠 session 隔离，丢失跨厂商多样性：

- `wf-second-opinion`（Stage 1 dispatch 前打印警告）
- `wf-bake-off`（Stage 2 dispatch 前打印警告）
- `wf-code-review --mode=double-review`（Stage 2 dispatch 前打印警告）

警告**不阻塞**——编排者打印静态文本即可。

**其他 6 个 skill 不触发**——独立性靠 role 视角切换（PLANNER vs REVIEWER）/ INVARIANTS 机械校验 / fresh subagent 隔离。

## 8. Tracked Follow-up 落点

Stage 3/4 review 输出的 🟡 类问题（合并前修或 tracked follow-up）**不允许**只留 `// TODO` 注释。允许的 tracked 落点：

1. **GitHub issue**（若仓库用 issue）—— follow-up 在 SUMMARY 中带 issue URL
2. **仓内 `follow-ups.md`**（若仓库约定此文件）—— follow-up 在 SUMMARY 中带行号
3. **PR description 的 follow-up section** —— 在 PR 描述显式列出

任一落点必须含：**file:line** + **描述** + **责任人或触发条件**。

## 维护

- 修本文件 → 跑 `./tasks.sh validate` 收口
- 9 个 skill 引用本文件时使用相对路径 `[docs/skill-prompt-conventions.md](../docs/skill-prompt-conventions.md)`
- 新增共用约束 → 加节于此 + 各 skill 增引用，不复制条款本身
