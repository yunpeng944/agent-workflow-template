# adapters/ — universal layer for `agents-md.config.json`

本目录是 `agents-md.config.json` 治理体系的 **universal layer**：同一份 JSON config，由多语言 adapter 等价消费。子目录是各语言实现：

- [`node/`](node/) — Node.js（zero-dep，stdlib only；含内联 mini frontmatter parser）
- [`python/`](python/) — Python 3 stdlib，零 pip 依赖
- [`shell/`](shell/) — POSIX bash + jq + awk，零运行时依赖（**模板默认 lane**）

顶层 `tasks.sh` 调度任一 lane（`ADAPTER=shell|node|python ./tasks.sh <target>`，默认 `shell`）。

剩余正文是所有 adapter 必须遵守的 **行为契约**：任何语言（含未来 Go / Rust / …）的实现都必须按下述规则解析输入、判定失败、输出可观测 token，从而通过 [`tools/adapter-parity.test.mjs`](../tools/adapter-parity.test.mjs) 的 parity 断言。

真源始终是 [`agents-md.config.json`](../agents-md.config.json)；adapter 是消费者，不得复制或固化 config 值。

## 范围

每个 adapter 实现 **三个独立可执行入口**，对应 universal 治理的三个检查：

| 入口              | 职责                                             | 当前实现（Node / Python / Shell）                                                                              |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `check_structure` | AGENTS.md 二级标题集合 / 顺序 / 章节行数限制     | `adapters/node/check_structure.mjs`、`adapters/python/check_structure.py`、`adapters/shell/check_structure.sh` |
| `check_refs`      | Markdown 文件中路径引用（backtick + link）存在性 | `adapters/node/check_refs.mjs`、`adapters/python/check_refs.py`、`adapters/shell/check_refs.sh`                |
| `sync_skills`     | `skills/*.md` 真源 → mirror 目录生成 / 漂移检测  | `adapters/node/sync_skills.mjs`、`adapters/python/sync_skills.py`、`adapters/shell/sync_skills.sh`             |

## MUST — 强制契约

### 1. 退出码

- `0` = 检查通过 / 写入成功
- `1` = 检查失败 / 无效参数 / 输入读取错误
- 不得用其他退出码区分错误类型（消息文案才区分）。

### 2. 仓库根定位

```
ROOT = env.AGENTS_MD_ROOT (绝对路径) ?? <adapter 文件相对路径推导>
```

- 若 `AGENTS_MD_ROOT` 已设置，必须 `resolve` 为绝对路径并完全替代默认值。
- 默认值由 adapter 自行决定（Node 用 `import.meta.dirname/..`，Python 用 `__file__.parents[2]`），但 env 优先级最高。
- parity test 通过此 env 注入隔离 fixture；adapter 不得读取 `process.cwd()` 或硬编码路径。

### 3. 配置消费

- 必须读 `<ROOT>/agents-md.config.json`，解析为 UTF-8 JSON。
- 必须消费的字段：
  - `expectedHeadings: string[]` — check_structure
  - `sectionLineLimits: Record<string, number>` — check_structure
  - `knownPrefixes: string[]` — check_refs
  - `runtimePrefixes: string[]` — check_refs（跳过存在性校验）
  - `generatedPrefixes: string[]` — check_refs（跳过存在性校验）
  - `intentionallyAbsentRefs: string[]` — check_refs（白名单）
  - `scanExcludeDirs: string[]` — check_refs（扫描时跳过的目录，相对 ROOT）
  - `mirrorRoots: string[]` — sync_skills
- 缺字段时兜底（不得报错退出）：
  - 全部 `string[]` 字段（`expectedHeadings` / `knownPrefixes` / `runtimePrefixes` / `generatedPrefixes` / `intentionallyAbsentRefs` / `scanExcludeDirs` / `mirrorRoots`）→ `[]`
  - `sectionLineLimits` (`Record<string, number>`) → `{}`
- 不得增加 adapter 私有字段；新字段必须先入 config schema 并对全部 adapter 适配。

### 4. check_structure 判定逻辑

- 从 `<ROOT>/AGENTS.md` 提取所有 `^## (.+)$` 标题，按出现顺序排列。
- 比较顺序与 `expectedHeadings`，**任一位置不一致都算失败**。
- 测量每节行数 = 当前标题行号到下一标题行号（最后一节到 EOF），含 `## ` 标题行本身。
- 节标题在 `sectionLineLimits` 中且行数超限，算失败。

**报错 token（parity test 锚点）：**

```
heading <i>: expected "<expected>", found "<found>"
```

其中 `<i>` 为 1-based 索引；缺失位置以字面值 `<missing>` 填充。其余失败消息（数量不匹配、行数超限）文案自由，但本 token 形态严格固定。

### 5. check_refs 判定逻辑

扫描以下 Markdown 文件：

- `<ROOT>/AGENTS.md`、`<ROOT>/README.md`
- `<ROOT>/docs/` 递归下所有 `*.md`，但跳过 `scanExcludeDirs` 列出的目录（含其子目录）

从每个文件抽取两类引用：

1. **Backtick refs**：正则 `` `([^`]+)` `` 内容，满足以下全部才视为路径引用：
   - 含 `/`
   - 不含 `*` 或 `<`（排除 glob 与模板占位符）
   - 不含空格（排除 CLI 命令）
   - 以 `knownPrefixes` 任一前缀开头
2. **Markdown link refs**：正则 `\[[^\]]*\]\(([^)\s]+)\)`，去掉 `#fragment` 后：
   - 跳过 scheme（`^[a-z][a-z0-9+.\-]*:`，i 不敏感）
   - 跳过绝对路径（`/` 开头）
   - 解析为相对 ROOT 的 POSIX 路径；越界（`..` 开头）跳过

引用按路径去重，保留首次出现位置。对剩余引用：

- 若路径以 `runtimePrefixes` 或 `generatedPrefixes` 任一前缀开头，跳过存在性校验
- 若路径在 `intentionallyAbsentRefs`，跳过
- 否则要求 `<ROOT>/<path>` 存在；不存在算失败

**报错 token：**

```
DEAD: <path> (referenced by <source>)
```

`<path>` 为相对 ROOT 的 POSIX 路径；`<source>` 为引用来源文件（相对 ROOT 的 POSIX 路径）。

### 6. sync_skills 判定逻辑

读取 `<ROOT>/skills/*.md`（不含 `README.md`），按文件名字典序排列。每个文件：

- 定位 YAML frontmatter 块（首行 `---` 到下一 `---` 闭合）
- 校验 frontmatter 必含字段：
  - `name` 必须存在、非空、无前后空白、kebab-case（`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`）、等于文件名 stem
  - `description` 必须存在、非空、无前后空白、≤ 500 字符
- 任一校验失败：退出 1，消息含来源路径

**额外 frontmatter 字段透传**：除 `name` / `description` 外，源文件 frontmatter 内的任何其他字段（如 Anthropic SKILL.md 规范定义的 `user-invocable` / `disable-model-invocation` / `allowed-tools` / `command-dispatch`，及未来扩展字段）必须**整块 verbatim 透传**到镜像。adapter 不解析、不校验、不重排其他字段——把 frontmatter 块作为字符串原样复制到生成产物。

**生成产物格式（字节级一致，含换行）：**

```
<verbatim frontmatter block 从源 `---` 到 `---`，含其间所有字段>

<!-- generated · do not edit · source: skills/<name>.md -->

<normalized body>
```

例：源文件含

```yaml
---
name: wf-coding-relay
description: Multi-model 4-stage default development workflow
disable-model-invocation: true
user-invocable: true
---
```

镜像生成产物 frontmatter 段必须保留全部 4 行字段，不能只剩 `name` / `description`。

`<normalized body>` = frontmatter 后的内容，去掉开头单个 `\n`、`\r\n` → `\n`、末尾换行去除后补一个 `\n`。

**强制 token：** MUST: 生成产物首行必须是 `---`（Anthropic SKILL.md spec 合规）

每个 skill 写入 `mirrorRoots` 中每个 root 下的 `<root>/<name>/SKILL.md`。

**模式：**

- 无参数：写入所有镜像；输出 `sync-skills wrote <count> mirror files`（stdout）；退出 0。
- `--check`：不写入，逐文件比对。任一缺失或字节级不一致，记录 mismatch；有 mismatch 则退出 1。
- 任何未知参数：退出 1。

**报错 token（--check 模式）：**

```
<mirror-rel-path> missing
<mirror-rel-path> diverges from <source-rel-path>
```

`<mirror-rel-path>` 形如 `.claude/skills/foo/SKILL.md`，相对 ROOT 的 POSIX 路径。

## MAY — 实现自由度

- **消息文案**：除上述强制 token 外，所有提示 / 错误 / 摘要文案可按语言习惯自由组织。parity test 只比对 token 集合，不比对完整 stderr，也不比对 ref 总数。
- **regex 扫描粒度**：可整文件 multi-line（Node / Python 默认）或逐行 line-by-line（Shell awk 默认）。两者在干净输入下等价；遇到跨行 code fence + 单 backtick ref 时 multi-line 模式可能漏抽，shell 反而更准。**这是已知差异，不算违约**——parity 只断言 dead token 集合，而 corrupt fixture 永远不构造跨 code fence 的 dead ref，因此结果一致。
- **性能策略**：可串行 / 并行 / 流式读取，可缓存 / 重读。
- **错误风格**：可抛异常、可返回错误值、可 panic；只要最终进程退出码与契约一致。
- **额外功能**：可在任一 lane 实现 universal contract 之外的项目特异检查（如下游项目自家 CLI 子命令引用校验），但不得改变 universal 项的判定，且 parity test 不会断言此类项。
- **额外 CLI 标志**：可加 `--verbose` / `--json` 等，但不得改变默认行为。
- **frontmatter 解析粒度**：sync_skills 只需读 `name` / `description` 两个**顶层标量**字段（其余字段由 frontmatter block 整段 verbatim 透传到镜像）。adapter 内若用极简 parser，**不解析 list / nested map / multi-line scalar 等非标量值**是允许的——这些值会以原始字符串形态进入 parser 的内部表示，但因为校验只看 `name` / `description` 不受影响，镜像产物仍字节级正确。下游若将来引入需读取 list 值的契约（如 `allowed-tools: [Read, Edit]`），属于**契约变更**，须按下节流程同步全 lane parser。

## NOT REQUIRED — 非通用项

- 任何与下游项目 CLI / 框架 / 状态文件强绑定的扫描逻辑都属此类。下游若需要，可在 node lane（或其他单 lane）追加，无需补齐其他 lane，parity 也不断言。

## Parity 验证

`tools/adapter-parity.test.mjs` 是契约的可执行断言（Node-only，需 Node 22+），覆盖：

- **All-green**：真实仓库状态下，各 adapter 同入口必须同时退出 0。
- **Corrupt fixtures**：通过 `AGENTS_MD_ROOT` 注入 tmpdir fixture，构造特定 corruption（heading 顺序错位、dead path ref、mirror 漂移），断言：
  - 各 adapter 同时退出 1
  - 各 adapter 从 stderr 抽出的强制 token 集合 deep-equal

由顶层 `./tasks.sh parity` 调度（如本机无 Node 可用，跳过即可，不影响 `./tasks.sh validate`）。

新增 adapter 时：

1. 实现三个入口，遵守本契约。
2. 在 parity test 添加该 adapter 的入口路径，复用现有 fixture 套件。
3. 跑 `./tasks.sh parity`（或 `node --test tools/adapter-parity.test.mjs`），全绿即合格。

## 变更治理

- 修改本契约（新增字段 / 调整 token 形态 / 增改判定逻辑）属于 **契约变更**，按 `AGENTS.md` 「什么时候算契约变更」流程同步全部 adapter、parity test、`agents-md.config.json` schema。
- 仅修文案 / 性能 / 错误风格不算契约变更，单 adapter 自治。
