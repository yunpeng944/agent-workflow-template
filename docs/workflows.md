# 多模型协作工作流（Workflows）

> 2 个 user-invocable skill（`wf-relay` / `wf-parallel`）的多模型调度核心机制单点真源。skill 真源在 [skills/](../skills/)；可选规则在 [rules/](../rules/)。

## Vendor 字典

skill 内不写死具体 model 字符串；vendor key → 推荐 model + 调度入口**单点维护于此**，升级 / 新 vendor 接入只改本表，所有 skill 不动：

| vendor key | 推荐具体 model                     | 调度入口                                                                        |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `claude`   | Claude Opus 4.7（其次 Sonnet 4.6） | `claude -p <prompt>` / Claude Code `Agent(subagent_type="general-purpose")`     |
| `codex`    | OpenAI Codex 1.x / GPT-5.5         | `codex exec <prompt>` / Claude Code `Agent(subagent_type="codex:codex-rescue")` |

**新 vendor 接入**：本表加一行（key + 推荐 model + 入口）即生效。

## 调度优先级（CLI → host-specific subagent → fail-fast）

编排者派任何 executor 时按 3 级优先级择优：

| 优先级 | Claude executor                    | Codex executor                      | 备注                                                                     |
| ------ | ---------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| 1      | `claude -p <prompt>` (Bash 子进程) | `codex exec <prompt>` (Bash 子进程) | host-agnostic；CLI 子进程本身即 fresh session，天然满足独立性             |
| 2      | host-specific subagent（见下）     | host-specific subagent              | 仅当 host 装有对应机制                                                   |
| 3      | **fail-fast**                      | 同左                                | 报错列需要的 CLI / 插件，不降级到 manual paste                           |

### host-specific routing（priority 2）

| host        | Claude executor priority 2                                             | Codex executor priority 2                           | 推荐                                                   |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Claude Code | `Agent(subagent_type="general-purpose", isolation="worktree", prompt)` | `Agent(subagent_type="codex:codex-rescue", prompt)` | Codex 推荐 priority 1（plugin queue 历史有 hang case） |
| Codex CLI   | n/a（`Agent` tool 是 Claude Code 专属）                                | Codex CLI 自家 task 机制                            | 两 executor 走 priority 1                              |
| 脚本 / CI   | n/a                                                                    | n/a                                                 | 强制 priority 1                                        |

## 调度执行约束

- preset 是**实际 dispatch 合约**，不是写作视角标签。选择任意 vendor 后必须按字典真实拉起对应 CLI / host-specific agent；若不可用、未登录、失败、超时或被中断，**必须 fail-fast 并明示**，不得用当前模型模拟该 executor 的产物
- 调度时给足够执行时间；不得因短时间无输出草率中断。无完善后台沟通时优先前台同步执行；用后台 / agent 方式则必须跟踪最终状态
- 收口汇报必须含 **dispatch ledger**：每个外部 executor 的执行方式、状态（`completed` / `unavailable` / `failed` / `timed_out` / `interrupted`）和产物来源。没真实完成的 executor 不得写成"它的意见"

## 跨厂商保护（同 vendor 警告）

`wf-parallel` 当 `<v1>-<v2>` 中 `v1 == v2`（如 `claude-claude` / `codex-codex`）→ 编排者在 dispatch 前打印警告：**两份产物 blind spot 高度相似，跨厂商多样性丢失**。不阻塞，但鼓励用户切换到不同 vendor pair。

`wf-relay` 无此警告——只有一个 executor，跨厂商通过 `<orchestrator>-<executor>` 隐式保证（编排者总是当前 LLM，executor 是另一 vendor 才有意义）。

## Worktree 隔离（CLI 路径补偿）

CLI 子进程无 `Agent` 工具的 `isolation=worktree` 自动隔离；编排者在 Bash 子进程前 `git worktree add /tmp/wt-<run-id>` 并 `cd` 进去，executor 收尾后 merge / drop。

## 失败模式

- **没真实 dispatch 就写"它的意见"**——把 `claude-codex` 理解成"当前模型模拟 Codex 视角"，必须 fail-fast 或明确标缺失角色
- **vendor key 不在字典就静默 fallback**——必须 fail-fast 列出可用 vendor，不静默走默认
- **同 vendor 跑 parallel 不警告**——丢失跨厂商多样性，warning 必打
- **executor 失败后伪造产物**——必须 fail-fast 明示，不模拟

## 真源 / 镜像

- skill 真源：[skills/](../skills/) 下 `wf-relay.md` / `wf-parallel.md`
- 镜像（generated · 勿改）：`.claude/skills/wf-*/SKILL.md`（Claude Code 消费）· `.agents/skills/wf-*/SKILL.md`（Codex CLI 消费）
- 改 skill 后必跑 `./tasks.sh sync-skills` 重生镜像
- 收口跑 `./tasks.sh validate`

## 可选规则文件

`@rules/<name>.md` 由 host 原生处理（不限于本 skill），编排者读取后可 inline 给 executor。可用规则文件：见 [rules/README.md](../rules/README.md)。
