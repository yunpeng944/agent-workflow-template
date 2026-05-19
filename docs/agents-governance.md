# 治理 / AGENTS.md 自治维护规则（模板版）

> 本文档定义**下游 fork 此模板后**何时与如何更新自家 AGENTS.md 与治理骨架。
> 模板自身的最小治理（heading 锁定 / refs 校验 / skill mirror 漂移）由 [agents-md.config.json](../agents-md.config.json) + [adapters/README.md](../adapters/README.md) + 模板自家的 `./tasks.sh validate` 兜底。
>
> 本文档使用 `{{占位符}}` 风格，与 [governance-snippets/README.md](../governance-snippets/README.md) 「占位符约定」表对齐。模板自身具体命令是 `./tasks.sh validate` 等；下游 fork 后按自家栈替换占位符（如 `{{validate命令}}` → `pnpm validate` / `make test`）。模板自身**不引用**此文档作强制规则。

## 何时更新 / 修补 AGENTS.md

满足以下任一条件应触发更新或修补：

- **契约变更**（同步要求见下节「契约变更 checklist」）。
- **顶层子目录 / 验证路径变化**：项目代码顶层目录增删；`{{validate命令}}` 内部步骤或脚本调整；开发约定（技术栈、依赖策略、文件上限等）修改（详见 [development-conventions.md](development-conventions.md)）。
- **「快速定位」漂移**：路径或职责描述与代码实际不一致；新增高频修改模块未在「快速定位」/「高风险区域」体现。
- **同一事实两种描述**：AGENTS.md / README / docs 对同一命令、路径、字段、默认值出现两种描述。
- **最小流程引用失效**：「最小流程」中引用的命令或工具不再存在或语义已变。
- **重复犯错信号**：agent 在同类任务中反复犯同一类错误，或反复出现的误改 / 遗漏 / 验证失败 / 协作摩擦 —— 应沉淀为长期规则，而非依赖临时提醒。
- **文档膨胀信号**：本文件持续膨胀、混入执行细节或背景材料，影响快速通读和导航效率 —— 应触发拆分、收缩或重组（机械化阈值见 `agents-md.config.json` 的 `sectionLineLimits`）。

## 日常修补 vs 完整 Bootstrap

阈值粗略量化（**由 maintainer 估算**，无 grep 工具兜底；机械化路径见下节「剪枝信号」+「季度审计」）：

- **日常修补**（agent 自行执行）：单条路径引用失效修掉、一条规则过时删掉、新增高频模块补一行导航、删除过时条目。
- **完整 Bootstrap**（需人工触发）：项目架构结构性变化、主要技术栈切换、AGENTS.md > 30% 路径引用失效、最近 10 次 agent 任务中 > 3 次需人工补同类背景。

## 维护责任

- 发现失效信号时，以最小必要范围修补，**不借机扩张**到无关区域。
- 修补后按任务类型选择验证：仅改 AGENTS 导航或说明文字 → `{{check命令}}`；触及契约描述、状态路径、CLI / JSON / 错误码 / schema 说明、验证策略或 `{{契约真源}}` → `{{validate命令}}`。
- 每次更新同时审计本文件中至少 5 条周边规则（用 `git log --oneline -50` + `grep` 查近期引用证据），无证据的进入删除候选，**防止只增不减**。

## 删除候选信号

维护是双向的：每次新增规则都应同步检查删除候选清单。满足以下任一即进入删除候选（更机械化的剪枝信号与季度审计见下两节）：

- 同类问题的统一处理已下沉到 lint / hook / harness / CI，prose 在文档层成了装饰。
- 规则引用的命令、路径、API、协议帧已废弃或重命名。
- 规则在重复其他文档或 harness（如 Claude Code / Codex CLI）默认行为，无项目特异约束。
- 模型审计时用 `git log --oneline -50` + `grep` 关键词无法找到近期代码 / 文档引用该规则的证据。

候选标记后，下次维护任务时按本节判据重新审计；仍命中则删除。删除同样适用 `{{check命令}}` / `{{lint命令}}` 验证。

## 规则质量判据

写入 AGENTS.md 的每条规则必须同时满足**可执行、可判定、可快速定位**，再兼顾人类可读性：

- **可执行**：规则描述了一个具体动作（读什么文件、跑什么命令、写什么测试），不只是劝告或意图声明。
- **可判定**：agent 能机械判断「这条规则是否适用」和「是否被违反」，不依赖主观解读。模糊词（如「必要时」、「通常」、「尽量」）应给出客观触发条件或换为决策树。
- **可快速定位**：相关代码 / 契约 / 真源能用 grep 找到；引用的路径必须真实存在（由 `{{check命令}}` 兜底）。

新增规则前自检：**不能列出「如果没有这条规则，agent 在什么真实场景会犯什么错」的，一律不加**。同样的标准用于决定是否删除已有规则。

## 与 AGENTS.md 的边界

AGENTS.md 是**入口与触发器**，本文件是**详细执行规则**：

- AGENTS.md 的「自治维护」节只保留入口与触发条件：何时检查、何时改、改完跑什么、详细规则在哪里。
- 本文件保留全部失效信号清单、触发条件清单、修补 vs Bootstrap 的判别、维护责任。
- 新规则若不通用（仅适用于某专题域），不要进 AGENTS.md 也不要进本文件，应进对应 `docs/<专题>.md`。
- 文档优先引用契约、schema、paths、commands 等真源；只复制稳定入口和导航，不复制容易漂移的契约值。
- 新增示例路径或历史删除路径时，若路径不应存在于当前工作树，必须同步 [agents-md.config.json](../agents-md.config.json) 的 `intentionallyAbsentRefs` 白名单（由 `{{check命令}}` 校验）。

## 契约变更触发条件

以下任一条件为**最小触发集**（下游可扩，不可削）：

- CLI 命令名或命令语义变了。
- 状态文件路径或名称变了。
- JSON 输出 / 响应结构变了。
- 错误码、修复动作或 schema 要求变了。
- 跨端协议帧结构、method / event / capability 名变了。

## 契约变更 checklist

契约变更时，除了代码和测试，还要检查并同步：

- 项目 CLI 命令注册位置（`{{CLI 注册目录}}`）。
- JSON output schema。
- 状态路径真源（`{{state-paths 真源}}`）。
- 跨端协议（`{{协议真源}}`）。
- 系统契约 schema（`{{契约真源}}`）。
- `README.md`。
- `AGENTS.md` 的导航和触发规则。
- 相关专题文档（`docs/*.md`）。

checklist 只列类别，**不复制契约值**。详细字段以契约真源为准。

## 治理脚本配置

[adapters/](../adapters/)（node / python / shell 三 lane）+ [tools/adapter-parity.test.mjs](../tools/adapter-parity.test.mjs) 的项目特异常量（章节顺序、行预算、路径前缀、豁免清单、镜像目录）集中在 [agents-md.config.json](../agents-md.config.json)。改 AGENTS.md 章节、引入新一级目录、追加豁免路径，**先改 config 再跑 `{{validate命令}}`**，不要回到 adapter 脚本里改字面值（违背 universal layer 设计）。

模板抽取这套机制专为多项目复用：下游只需替换 `agents-md.config.json` 即可复用全部 lint / codegen 行为。adapter 行为契约的真源见 [adapters/README.md](../adapters/README.md)。

## skill 修改流程

`skills/<name>.md` 是 skill 模板真源，`.claude/skills/` 与 `.agents/skills/` 是生成产物（带 `<!-- generated · do not edit -->` 头注释）。修改步骤：

1. 只改 `skills/<name>.md`（frontmatter：`name` + `description` 必填）。
2. 跑 `{{sync命令}}` 重新生成两份镜像。
3. `git add` 真源与两份镜像（**必须同提交**）。
4. `{{validate命令}}` 会跑 `{{sync命令}} --check`，产物 ≠ 真源时退出码 ≠ 0。

禁止：直接编辑 `.claude/skills/**` 或 `.agents/skills/**`；任何手改在下一次 `{{sync命令}}` 时被覆盖。

## 剪枝信号

满足以下任一即将该规则标为 **剪枝候选**：

- 规则在 `{{lint命令}}` / `{{check命令}}` 中无对应 enforcement，且模型审计时 `git log --oneline -50` + `grep` 找不到近期相关代码 / 文档引用证据。
- 规则措辞含「建议 / 尽量 / 通常 / 一般」等非强制副词（违反「指令性」原则）。
- 规则与更近的子 AGENTS.md 或 docs 条款语义重复。

候选标记方式：在该规则当行末尾加 HTML 注释 `<!-- prune-candidate: <reason> · <YYYY-MM-DD> -->`，下次审计批量处理。`grep prune-candidate` 即可拉清单。

## 季度审计

每季度首月（1 / 4 / 7 / 10 月）由 maintainer 触发，节奏与 contract review 对齐：

1. 全文 `grep -rn "prune-candidate" AGENTS.md docs/` 列出全部候选（含可能的子 AGENTS.md）。
2. 对每个候选评估：
   - 能用 lint / hook / test 替代吗？是则删 prose、加机械检查；否则保留。
   - 能并入更近的子 AGENTS.md 吗？是则迁移，根文件改指针。
   - 实际工程已不再需要？是则删。
3. 同步：若变更触及契约或 `expectedHeadings`，按本文件相应 checklist 同步。
4. 跑 `{{validate命令}}` 收口；commit message 用 `docs(governance): quarterly audit YYYY-QN — <精简变更摘要>`。
