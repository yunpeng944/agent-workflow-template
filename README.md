# agent-workflow-template

**不绑语言 / 不绑栈** 的多模型协作工作流脚手架。让 Claude / Codex / GPT 级模型按你的指挥协作完成任务——一个负责编排，另一个负责执行；或两个独立做同一件事互相对照。

## 三必带能力

| 目录 / 文件                            | 作用                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| [skills/](skills/)                     | 2 个 user-invocable workflow skill：`wf-orchestrate`（编排 1:N）+ `wf-parallel`（双盲对比）|
| [rules/](rules/)                       | 可选的任务规则文件（base / security / refactor / review / research / debug）        |
| [adapters/](adapters/)                 | 治理 config 的 Node adapter 实现（消费 `agents-md.config.json`）                    |

## 用法

### 1. Fork 此模板

```bash
git clone <this-repo> my-project
cd my-project
```

镜像已随模板入仓（Claude Code / Codex CLI 直接读镜像），首次 clone 后无需立即跑。
只有修改 `skills/<name>.md` 真源后才需要：

```bash
./tasks.sh sync-skills     # 修 skill 真源后重生镜像
```

### 2. 调用 workflow

**编排模式**（N=1 接力 / N>1 fan-out，A 自动判）：

```
/wf-orchestrate <task>                                # 省略 executor → 调用方反义默认（Claude 调时默认 codex）
/wf-orchestrate codex <task>                          # Claude 编排，N 由 A 自动判（1=接力 / >1=fan-out）
/wf-orchestrate codex @rules/security.md <task>       # 叠加安全规则
/wf-orchestrate codex @rules/base.md @rules/refactor.md <task>  # 多规则
```

**平行模式**（两模型独立做同一事，编排者综合）：

```
/wf-parallel <task>                             # 省略 pair → 默认 claude-codex
/wf-parallel claude-codex <task>                # 跨厂商双盲
/wf-parallel claude-codex @rules/review.md <task>  # 叠加 review 规则
```

`@rules/<file>.md` 由 host 原生处理，自动注入 prompt——不传则用 host 默认规则。
`<executor>` / `<v1-v2>` 同样可省略——不传则用上方默认值。

### 3. Adapter 调度

```bash
./tasks.sh validate                     # check-structure + check-refs + sync-skills-check
./tasks.sh help                         # 列全部 target
```

调度脚本 `tasks.sh` 是 POSIX bash，adapter 是 Node：需 **Node 20.11+**（仅 stdlib，无第三方依赖）。

### 4. 追加你的项目规则

两种方式：

1. **AGENTS.md「项目特定规则」节**：契约真源 / 高风险文件 / CLI 命令面 / 自家 lint 命令 / 凭证策略 / CI 入口。**不要动**模板自身其他节（标题集合由 [agents-md.config.json](agents-md.config.json) `expectedHeadings` 锁定）
2. **新建 `rules/<name>.md`**：按 [rules/README.md](rules/README.md) 格式，覆盖你常用的任务类型——以后用 `/wf-orchestrate codex @rules/<name>.md <task>` 调用

**追加规则**：直接在 AGENTS.md「项目特定规则」节按需写入；或新建 `rules/<name>.md` 供 skill 调用。

### 5. external paste 模板（人 → AI 交接）

[prompts/](prompts/) 内 3 个填空模板——与 `skills/` 互补：在没有 Claude Code / Codex CLI 的环境下，直接 paste 让外部 LLM 进入协作角色。

## 设计原则

- **最小依赖**：`tasks.sh` 是 POSIX bash；adapter 需 Node 20.11+（仅 stdlib，无 npm install）
- **真源单点**：skill 真源在 `skills/`，镜像 generated；治理规则在 `agents-md.config.json`，adapter 是消费者
- **可执行契约**：[adapters/README.md](adapters/README.md) 定义 adapter 的 MUST 行为
- **下游可覆盖**：[AGENTS.md](AGENTS.md) 提供「项目特定规则」占位节
- **规则 vs 编排分离**：skill 只管编排骨架（orchestrate / parallel），具体任务约束写在 `rules/`，互相独立演化

## Contributing

见 [CONTRIBUTING.md](CONTRIBUTING.md) ——git 是 spec 真源，人 + agent 都通过 PR 提议 spec 演进。

## 不带什么

- 不带 `package.json` / `pyproject.toml` / `tsconfig.json` / 任何编译器配置
- 不带 `src/` 或具体语言代码
- 不带 CI yml（下游 CI 平台未知，自加）
- 不 `git init`（fork / clone 你自己决定）
