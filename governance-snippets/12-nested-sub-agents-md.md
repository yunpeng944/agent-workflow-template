# 12 · 嵌套子 AGENTS.md（agents.md closest-file-wins）

**何时用**：项目有 ≥ 3 个高风险目录（契约真源 / 浏览器 ↔ Node 边界 / agent 运行时 / 第三方凭证 / 高频被改的核心模块等）；单一根 AGENTS.md 装不下所有强约束，又不想稀释首屏密度。
**占位符**：高风险目录路径按项目替换。
**反模式**：把所有强约束塞根 AGENTS.md（首屏稀释 + agent 注意力分散）；写多个但复制根文件内容（双源 + 同步负担）；子文件超 30 行（违反 closest-file-wins 的"就近补充"语义）。

---

## 就近规约文件

在每个高风险目录放一份 `<dir>/AGENTS.md`，承载本目录的强约束。根 AGENTS.md 对应段改为 1–2 行指针，不复制下层内容。

```
AGENTS.md                          ← 根：入口 + 通用边界 + 指针
src/contracts/AGENTS.md            ← 就近：契约真源 + 触发条件 + 同步指针
src/<服务端边界>/AGENTS.md         ← 就近：浏览器 / Node.js 边界
src/agents/AGENTS.md               ← 就近：高风险文件修改前自查
```

每份子 AGENTS.md 顶部用 blockquote 显式声明 closest-file-wins：

```markdown
# <dir>/ 子规约

> 本规约就近覆盖根 [AGENTS.md](../../AGENTS.md) "xx" 段；按 agents.md 标准 closest-file-wins 生效。

## ...
```

每份子文件 ≤ 30 行，只放就近细节（触发条件、本目录硬约束、修改前自查），不复制根文件。根文件对应段写：

```markdown
## xx 边界

本边界完整规则就近见 [<dir>/AGENTS.md](<dir>/AGENTS.md)：<一句话摘要 + 一个最关键的命令或路径>。
```

---

## 为什么 closest-file-wins 比"集中规则"好

- **命中率**：agent 改 `src/contracts/` 下任何文件时，**第一份就近文件**就是契约规则；不用先读根 AGENTS.md 几百行再 grep 出契约触发条件。
- **首屏预算**：根文件保持精简（≤ 150 行），新增子目录强约束不挤占主入口。
- **演化局部化**：契约规则改了只动 `src/contracts/AGENTS.md`，不动根；agent reviewer 也只需 grep `src/contracts/AGENTS.md` 的 diff。

## 来源

- 本仓库 `src/contracts/AGENTS.md` + `src/gateway/ui/AGENTS.md` + `src/agents/AGENTS.md`（commit `a223c5d`）
- agents.md 官方规范："agents automatically read the nearest file in the directory tree, so the closest one takes precedence"
- OpenAI Codex AGENTS.md discovery chain：global → project root → cwd，越近越覆盖
- Mercari 2025-10 "Taming Agents in the Web Monorepo"：每包独立 AGENTS.md 是 monorepo 标准做法

## 改写建议

- 项目只有 1 个高风险目录：合并到根 AGENTS.md 即可，不必单独子文件。
- 有 ≥ 5 个高风险目录：考虑分层（先按一级目录归一份，再视需要拆深层）；避免子文件总数超过 5 个让 agent 难以 grep。
- 团队用 monorepo workspaces：每个 workspace package 一份 AGENTS.md 是更自然的边界。
- 想要 lint 守护"子文件不能与根重复"：写一个 `check-nested-agents.mjs`，grep 两份文件共同 bullet 报警。
