# Security Rules — credential / auth / permission / state

Apply when task touches: auth flow / token / session / secrets / state files / cross-trust boundary.

**Use base.md 同时叠加** —— security 规则在 base 之上。

## Threat Modeling First

实现前列：

- **滥用路径 ≥ 3 条**：每条标 likelihood（high / med / low）+ impact（critical / high / med）
- **信任假设**：哪些输入可信 / 哪些必须验证 / 跨端边界在哪
- **替代防御方案 ≥ 1**，给排除原因
- **残留风险**：修完后仍存在但已接受的风险

## Adversarial Mindset

不验"正向能跑"，问"我作为攻击者能怎么让它崩 / 越权 / 泄露 / 静默丢数据"。每条至少尝试一次：

- **输入毒化**：超长 / 控制字符 / Unicode 同形 / null byte / path traversal / 引号注入——能到达深层逻辑？校验是否真在入口最早可拒绝点？
- **信任边界越权**：能绕过 auth / admin token？凭证比对是否 constant-time？错误消息是否泄露用户存在性 / token 形状？
- **状态文件污染**：状态文件被改成异常内容（缺字段 / 类型错 / 循环引用 / 巨大值）会崩还是 fail-safe？读路径是否有 schema 校验？
- **TOCTOU / 并发**：两次读之间状态被改？同 session 并发写互踩？
- **失败模式**：依赖（fs / network / 子进程）抛错时**失败封闭**还是 fall back 到"宽松默认"？
- **错误信息泄露**：log / stderr / JSON error payload 含敏感数据（token / 路径 / 内部结构）？
- **跨端污染**：跨 UI ↔ service / client ↔ runtime 边界数据两侧都被信任？

## Defense Principles

- 输入校验放在**入口最早可拒绝点**，不在深层逻辑兜底
- **失败封闭**：异常路径默认拒绝 / 不副作用 / 不静默吞错
- **最小权限**：能用 read-only 不用 read-write
- 不引入"运行时 feature flag 兜底"等绕过路径

## Negative Tests Required

- 每条 high / critical impact 滥用路径必配 negative test（红 → 修 → 绿）
- 测试名 ↔ 滥用路径 1:1 映射
- 不允许"reproducer 即起 regression test 作用"豁免——必须新增持久 test
- 测试验"行为"（被拒绝 / 抛错 / 不副作用），不只验"路径走过"

## Hard Gate (机械)

凭证 / 权限 / 状态破坏的改动**禁止降级**——不允许"小改动跳过红队 review"。任何"小行数高影响"组合（如 token 验证 40 行）都必须走完整防御 + 测试流程。
