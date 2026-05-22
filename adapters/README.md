# Node adapter

Node 实现 `agents-md.config.json` 三个治理入口：

- `check_structure.mjs` — AGENTS.md 二级标题集合与顺序 + 各节行数上限校验
- `check_refs.mjs` — AGENTS.md / README.md / docs/**.md 内反引号 + markdown link 路径存在性校验
- `sync_skills.mjs` — `skills/<name>.md` 真源 → `.claude/skills/` + `.agents/skills/` 双镜像同步

## 运行环境

- Node 20.11+（用 `import.meta.dirname`）
- 仅依赖 Node stdlib（`node:fs` / `node:path` / `node:url`）
- 零 npm / pnpm / package.json

## Config schema

`agents-md.config.json` 字段（全部可选，缺失字段按下表 fallback）：

| 字段 | 类型 | Fallback | 用途 |
|---|---|---|---|
| `expectedHeadings` | `string[]` | `[]` | AGENTS.md 应有的二级标题集合 + 顺序 |
| `sectionLineLimits` | `{ heading: number }` | `{}` | 每个二级标题节的行数上限 |
| `knownPrefixes` | `string[]` | `[]` | 已知合法路径前缀（如 `skills/` / `docs/`），check_refs 仅扫这些前缀的引用 |
| `runtimePrefixes` | `string[]` | `[]` | 运行时生成的路径前缀，check_refs 跳过存在性校验 |
| `generatedPrefixes` | `string[]` | `[]` | 构建产物前缀，同 runtimePrefixes |
| `intentionallyAbsentRefs` | `string[]` | `[]` | 显式声明"暂不存在"的路径白名单 |
| `mirrorRoots` | `string[]` | `[]` | skill 真源 → 镜像的目标根（`.claude/skills` / `.agents/skills`） |
| `scanExcludeDirs` | `string[]` | `[]` | check_refs 扫描时跳过的目录（如 plan 目录） |

> `sectionLineLimits` 阈值取当前节实际行数 + ~50% 余量，触阈是"拆分到 docs/"的信号、非硬上限。`intentionallyAbsentRefs` 用于 `{{契约真源}}` 等下游 fork 后才存在的占位符路径。

## 入口契约

- 全部入口读 `AGENTS_MD_ROOT` env var（默认仓库根），cwd 不敏感
- 退出码：`0` 全绿；`1` 有违规
- 错误消息写 stderr；成功写 stdout（如 `PASSED`）

## 生成产物格式

`sync_skills.mjs` 写入 `mirrorRoots` 下的镜像时，每份 SKILL.md 严格按以下格式：

```
---
name: wf-<kebab-case>
description: <≤500 chars>
<其他 frontmatter 字段 verbatim 透传>
---
<!-- generated · do not edit · source: skills/wf-<name>.md -->

<skill body>
```

首行必须是 `---`（Anthropic SKILL.md spec 硬约束）。`name` 字段必须 kebab-case 且等于源文件 stem（如 `skills/wf-relay.md` → `name: wf-relay`）。
