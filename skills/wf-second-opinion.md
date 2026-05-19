---
name: wf-second-opinion
description: Parallel dual-blind diagnostic workflow — DIAGNOSER-A & DIAGNOSER-B independently diagnose the same incident, then RECONCILER extracts consensus / divergence / blind spots before any fix.
argument-hint: '[preset] [--mode=<name>] <task>'
disable-model-invocation: true
user-invocable: true
---

## Goal

疑难 bug / 跨子系统 / 单 agent 陷入隧道视野的诊断场景拆成 **DIAGNOSER-A 与 DIAGNOSER-B 平行双盲诊断**：双方 fresh subagent 拿**完全相同的输入**、互不可见，各自给 root-cause 假设 + 证据链 + 验证命令 + 盲区声明，再由独立 RECONCILER 提取共识 / 分歧 / 重叠盲区，决定下一步跑哪个 probe 而非直接动手 fix。核心差异于 `wf-coding-relay`：**Stage 1 与 Stage 2 是平行的，不是接力**；输入相同、输出格式相同；任一方在交出诊断前**绝不读对方**。

## Orchestration

- **preset**: `<vendor1>-<vendor2>` 按 [docs/workflows.md](../docs/workflows.md) 「Role / Model 映射 / Vendor 字典」节查；默认 `claude-codex`；`custom` (`--diagnoser-a=<m> --diagnoser-b=<m> --reconciler=<m>` 缺任一 fail-fast)
- **调度优先级**：CLI (`claude -p` / `codex exec`) → host subagent (Claude Code `general-purpose` / `codex:codex-rescue`) → fail-fast
- **role slots**: DIAGNOSER-A (Stage 1) / DIAGNOSER-B (Stage 2，与 A 平行) / RECONCILER (Stage 3，从未参与 Stage 1/2)
- **evaluator stage**: 三 stage 全部 fresh subagent；Stage 1/2 平行 dispatch 互不可见；Stage 3 第三个独立 fresh subagent
- **特有约束**: input **字符级一致**（建议固化为 fixture 文件，两 dispatch 共用）；Blind Spots 不许写"无"；**同产品 preset 警告在 Stage 1 dispatch 前打印**（`claude-claude` / `codex-codex` 下双盲仅靠 session 隔离，丢失跨厂商多样性）
- 详细 model 映射 / host-specific routing / worktree 隔离 / 调度执行约束 / dispatch ledger / 同产品 preset 警告触发时机 → [docs/workflows.md](../docs/workflows.md)

**调用语法**：`/wf-second-opinion [preset] [--mode=<simplification>] <task>`

**双盲硬约束**：Stage 1/2 必须**两个独立 dispatch**（绝不复用任一 session）；Stage 3 必须是**第三个独立 dispatch**（从未参与 Stage 1/2）。

## When to use / Skip if

**用**：单 agent 多轮 debug 在原地打转；跨子系统问题（前端崩 / 状态污染 / Node-UI 边界异常）；复现稳定但 root cause 不明（"知道哪里崩、不知道为什么"）；临 release 高风险 bug。

**跳过**：已知 root cause 只想修 → `wf-incident-rescue known-cause-fix`；failing test / regression 需先复现 + 二分 → `wf-incident-rescue`；高风险面新功能（非 debug）→ `wf-red-team`；普通新功能 → `wf-coding-relay`。

**降级**：已有一份诊断只想反驳 → `single-counterpoint`；只要 high-level sanity check → `quick-poll`。

---

## Stages

> **平行执行重点**：Stage 1/2 拿到的 input **字符级相同**，且任一方在交出诊断前**绝不读对方**。把 INCIDENT INPUT 写成 fixture 文件，两 dispatch 共用——彻底消除字符级偏差。

### Stage 1 — DIAGNOSER-A（fresh subagent，独立）

````
===== BEGIN STAGE-1-DIAGNOSER-A PROMPT =====
基于以下事故 input 独立给出 root-cause 假设。**不要写修复代码**。

**盲区原则**：你不知道是否有其他诊断者并行工作；不要假设你的假设会被采纳。
**反证优先**：目标不是"听起来合理"，是"可被快速证伪"——给出 5 分钟内能跑出结果的 probe。

输出格式（**严格按下列结构，缺一不可**——平行诊断比对的基础）：

```
===== BEGIN STAGE-1 DIAGNOSIS =====
## Primary Hypothesis
1-2 句话 root cause。

## Falsifier
什么观测出现就说明此假设错了？

## Evidence Chain
从现场到假设的逻辑路径，每跳引用具体 file:line 或 log line。不写"通常"/"应该"。

## Verification Command
≤ 5 分钟最小 probe（vitest run <file> / curl -i / git log -S "..." / shell）。明确写：期望 PASS = 假设被支持；期望 FAIL = 假设被证伪。

## Confidence
high / med / low + 一句话理由。

## Alternative Hypotheses
≥ 1 个 alternative + **反对它的证据**（不是简单否定，是为什么 evidence chain 不支持）。

## Blind Spots
你**没有**调查的方向（如"未读 src/foo/" / "未跑实际 reproducer 仅静读" / "未询问 X 配置"）。
**不许写"无"**——任何诊断都有盲区，承认它。
===== END STAGE-1 DIAGNOSIS =====
```

约束：不臆造命令 / 路径 / API；不写没有具体引用的断言；不把 alternative 写成稻草人。

```
===== BEGIN INCIDENT INPUT =====
[PASTE: 症状 / 复现步骤 / 错误日志 / failing test 名 / 已尝试但失败的修法]
===== END INCIDENT INPUT =====
```
===== END STAGE-1-DIAGNOSER-A PROMPT =====
````

**Artifact**：STAGE-1 DIAGNOSIS 块（7 section 全填，Blind Spots 不可"无"）。
**Handoff**：诊断保存原样，**不**给 Stage 2 看。Stage 1/2 可同时跑或异步跑，但 Stage 3 必须双方完成后才进。

### Stage 2 — DIAGNOSER-B（fresh subagent，与 A 平行，互不可见）

````
===== BEGIN STAGE-2-DIAGNOSER-B PROMPT =====
基于以下事故 input 独立给出 root-cause 假设。**不要写修复代码**。

**盲区原则**：你不知道是否有其他诊断者并行工作；不要假设你的假设会被采纳。
**反证优先**：目标不是"听起来合理"，是"可被快速证伪"——给出 5 分钟内能跑出结果的 probe。

输出格式（**严格按下列结构，缺一不可**，与 Stage 1 完全同构）：

```
===== BEGIN STAGE-2 DIAGNOSIS =====
## Primary Hypothesis
1-2 句话 root cause。

## Falsifier
什么观测出现就说明此假设错了？

## Evidence Chain
每跳引用具体 file:line 或 log line。不写"通常"/"应该"。

## Verification Command
≤ 5 分钟最小 probe。明确写期望 PASS / FAIL 含义。

## Confidence
high / med / low + 一句话理由。

## Alternative Hypotheses
≥ 1 个 alternative + 反对它的证据。

## Blind Spots
你**没有**调查的方向。**不许写"无"**。
===== END STAGE-2 DIAGNOSIS =====
```

约束：不臆造；不写没有具体引用的断言；**不要**问"另一个诊断者怎么说"——你不知道也不该假设。

```
===== BEGIN INCIDENT INPUT =====
[PASTE: 完全相同的 input 块，与 Stage 1 字符级一致]
===== END INCIDENT INPUT =====
```
===== END STAGE-2-DIAGNOSER-B PROMPT =====
````

**Artifact**：STAGE-2 DIAGNOSIS 块（与 Stage 1 完全同构）。
**Handoff**：与 Stage 1 同。

### Stage 3 — RECONCILER（fresh subagent，从未参与 Stage 1/2）

> **本 stage 不能让 Stage 1/2 任一方做**——他们已"押注"自己的假设。用户可独立完成，或用第三个 fresh subagent。

````
===== BEGIN STAGE-3-RECONCILER PROMPT =====
你是仲裁者，从未参与这两份诊断。**不要重新诊断**——工作是**比对 + 提取行动**。

比对维度：
1. **共识区**：两份 Primary Hypothesis 是否指向同一 root cause？同 → high confidence 进 verification；异 → 进 #2
2. **分歧区**：每条标 "DIAGNOSER-A 认为 X / B 认为 Y / 分歧来自 [对证据的不同解读 / 不同搜索路径 / 不同先验]"
3. **重叠盲区**：双方 Blind Spots 段**交集**——两边都没看的地方最危险
4. **可证伪性比较**：两份 Verification Command 哪个更快裁决？哪个能同时区分两份假设？
5. **置信度对照**：若一方 high / 一方 low，看 evidence chain 是否解释差距；两方都 med 意味 input 信息不足而非诊断质量差

输出：
```
===== BEGIN STAGE-3 RECONCILIATION =====
## Consensus
- [双方都指向: ...] (若无写 NONE)

## Divergences
- [A: ... / B: ... / 分歧根源: ...]

## Joint Blind Spots
- [双方都没看的方向: ...]
（必填——若双方 Blind Spots 段确无显式交集，写"无显式重叠——但提示各自盲区为 [A: ... | B: ...]"，**不允许填 NONE / 空 / 编造**）

## Next Probe (single command)
能同时区分双方假设或验证共识的**一条**命令：[command]
- 期望 PASS 含义: ...
- 期望 FAIL 含义: ...

## Action Tree
- 若 probe PASS → 进 [wf-incident-rescue 或 wf-coding-relay] 修复
- 若 probe FAIL → 重跑 wf-second-opinion（带新 input + 已排除假设）或扩调查至 Joint Blind Spots
===== END STAGE-3 RECONCILIATION =====
```

约束：不引入第三份 hypothesis（除非 Joint Blind Spots 显示双方都遗漏明显方向）；不偏袒任一方；Next Probe 只能**一条**命令。

```
===== BEGIN STAGE-1 DIAGNOSIS =====
[PASTE]
===== END STAGE-1 DIAGNOSIS =====
```

```
===== BEGIN STAGE-2 DIAGNOSIS =====
[PASTE]
===== END STAGE-2 DIAGNOSIS =====
```
===== END STAGE-3-RECONCILER PROMPT =====
````

**Artifact**：STAGE-3 RECONCILIATION 块（5 section）+ 一条 Next Probe + 明确 Action Tree 分支。
**Stop**：用户跑 Next Probe → 按 Action Tree 进下一步 workflow（典型：`wf-incident-rescue` 做最小修，或带新证据重跑 Stage 1/2）。

---

## Simplification

- **`full-dual-blind`**：3 阶段（默认）。疑难 bug、跨子系统、临 release 高风险
- **`single-counterpoint`**：已有一份诊断，跳 Stage 1，只跑 Stage 2 但 prompt 改为"反驳模式"（见下），再进 Stage 3
- **`quick-poll`**：双方各给 **1 句话** Primary Hypothesis + 1 条 Verification Command（不展开证据链 / 盲区），1-2 分钟快速 sanity check

降级 3 维度：**复杂度**（跨子系统 / 状态污染 → full-dual-blind）/ **既有诊断**（已存在 → single-counterpoint）/ **时间预算**（< 5 分钟 → quick-poll）。

### `single-counterpoint` 反驳 prompt 简化版

替换 Stage 2 prompt 的"独立诊断"段为：

```
你是反驳者。下面是一份既有诊断。**不要 endorse**——找它错在哪 / 漏在哪。按 STAGE-2 DIAGNOSIS 格式输出：
- 若独立分析得出**实质相同**的 Primary Hypothesis（不只是措辞重合），保留之，且 Evidence Chain 给**既有诊断未引的新证据**；Alternative Hypotheses ≥ 1 个**仍未排除**的可能性
- 若**实质不同**，给不同的 Primary Hypothesis；既有诊断的核心假设作为 Alternative 列出 + 反对证据
任一情况下：Evidence Chain 必须**至少一跳引用既有诊断未引的证据**；Blind Spots 必须包含"既有诊断的盲区"。
```
