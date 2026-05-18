# 11 · skill 单源 + 双工具镜像 codegen

**何时用**：项目需要 Claude Code（`.claude/skills/`）+ OpenAI Codex（`.agents/skills/`）双工具共用 in-session skill；workflow 模板要跨工具同步且 CI 防漂移。
**占位符**：`{{validate命令}}` / `{{check命令}}`（按项目替换）。
**反模式**：双工具各自维护 SKILL.md（手动同步必漂移）；symlink 镜像（Windows / 部分 CI 容器退化为普通文件）；混入既有 `prompts/`（语义不同：`prompts/` 是给人粘贴的外部模板，`skills/` 是工具自动发现的会话内 skill）；不加 prettier ignore（prettier 会把 `<!-- comment --> --- frontmatter ---` 误判为标题、弄碎 YAML frontmatter）。

---

## 真源单点 + codegen 双镜像

`skills/<name>.md` 是 skill 模板的**唯一可编辑位置**。两个工具特定镜像由生成器产出，提交进 git，CI 校验漂移。

```
skills/<name>.md                 ← 真源（frontmatter + 五段式正文）
adapters/node/sync_skills.mjs    ← 生成器（写模式 / --check 模式）
.claude/skills/<name>/SKILL.md   ← Claude Code 镜像（generated · committed）
.agents/skills/<name>/SKILL.md   ← OpenAI Codex 镜像（generated · committed）
.prettierignore                  ← 排除两镜像目录
```

frontmatter 约定：`name`（kebab-case，与文件名 stem 一致）+ `description`（≤ 200 字符，可含 1-2 个跨语言别名以扩大隐式触发匹配面）。正文五段：`## Role` / `## Goal` / `## Boundaries` / `## Validation` / `## Output`（保留 Anthropic SKILL.md 官方示例的英文 heading）。

生成器输出格式（两镜像字节级一致）：

```
<!-- generated · do not edit · source: skills/<name>.md -->
---
name: <name>
description: <description>
---

<body 原样拷贝>
```

`{{validate命令}}` 链入 `sync:skills --check`：产物 ≠ 真源时退出码 ≠ 0，与 `{{lint命令}}` / `{{check命令}}` 同闸。

**修改流程**：只改 `skills/<name>.md` → 跑生成器 → `git add` 真源 + 两镜像 → 同提交。禁止直接编辑 `.claude/skills/**` 或 `.agents/skills/**`。

---

## 为什么不用 symlink / 手动镜像

- symlink：WSL/Linux/macOS 可用，但 Windows 客户端 + 部分 CI 容器退化为文本文件，跨平台不稳。
- 手动镜像：CLAUDE.md 类规则 80% 遵从率（Anthropic 数据），双向手动同步必漂移。
- codegen + CI：与 `{{lint命令}}` / `{{check命令}}` 同范式（真源 → 衍生品 → CI 退出码兜底），无需新心智模型。

## 为什么需要 `.prettierignore`

prettier 把生成产物里的 `<!-- ... --> ---\nname: ...\n---` 序列误判为 markdown 标题语法，会把它重写为 `## <!-- ... -->` + 删 frontmatter 分隔符，**直接弄碎 SKILL.md 格式**导致 gray-matter 解析失败。必须把两个镜像目录加入 `.prettierignore`。

## 来源

- 本仓库 `adapters/node/sync_skills.mjs` + `skills/` + `.claude/skills/` + `.agents/skills/`（commit `5dda1c0`）
- agents.md 官方规范（Linux Foundation Agentic AI Foundation）
- Anthropic Claude Code Skills 文档
- OpenAI Codex Agent Skills 文档（`.agents/skills/` 发现路径 + SKILL.md frontmatter 约定）

## 改写建议

- 只用单一工具（仅 Claude Code 或仅 Codex）：删另一边的镜像目录，生成器只产出一份；但日后接入另一工具时 codegen 范式已就位，零迁移成本。
- 团队全 Linux / macOS / WSL：可用 symlink 替代 codegen 减少一道生成步骤；跨平台仍建议保留 codegen。
- 增量加 skill：只新建 `skills/<name>.md` + 跑生成器，无需改任何脚本。
- 想要 skill 的 description 同时匹配中英文 prompt：写中文主描述 + 英文别名 `（plan workflow）`，扩大 frontmatter 隐式触发面。
