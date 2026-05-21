# Base Rules — universal coding hygiene

Apply to any coding task. Other rules files extend these.

## File Verification (anti-hallucination)

- 写代码前先读你要改的**所有文件**，确认 API / 路径 / 签名存在
- 引用的所有命令、文件路径、API endpoint 必须在仓库中验证存在
- 不许 hallucinate 函数名 / 模块路径 / config 字段
- 不知道的 API → grep 现存代码确认，或显式标 `UNKNOWN-API` 停等

## Scope Discipline

- 最小必要改动；不顺手 refactor
- 发现 plan 之外必须改的相邻代码 → 标 `SCOPE-EXPANSION` 并停等用户裁定
- 截断判据：同文件 + 同类问题 + 累计 ≤ 5 行 → 直接修并在报告中标注；超此走 SCOPE-EXPANSION
- 不允许 silent 扩范围

## Verification

- 行为变更（返回值 / 副作用 / 接口契约改变）先写失败测试再实现
- **豁免**：仅文案 / 重命名 / 注释 / 死代码删除——无 test 要求
- 改完必跑 `./tasks.sh validate`（或项目自定义入口）
- 验证未绿 → 任务不算完成

## Reporting

- 报告必须含 dispatch ledger:
  - 改了哪些文件 + 行数
  - 跑了哪些命令 + 退出码
  - 关键 diff / 日志片段
- 不模拟不真实跑过的命令——timeout / 失败 → 明示
- 不软化结论以"迎合"上游

## Independence (当作 subagent 跑时)

- 不读上游 agent 的中间思考 / self-narrative
- 只信结构化输入（task / rules / 文件路径）
- 输出独立结论
