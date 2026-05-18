# Python adapter

`adapters/node/check_structure.mjs` / `adapters/node/check_refs.mjs` / `adapters/node/sync_skills.mjs` 的 Python 等价实现，**仅用 Python 3 标准库**（`json` / `re` / `pathlib` / `sys`），零 pip 依赖。

## 用途

证明 `agents-md.config.json` 真源跨语言可消费——Node / Python / Shell adapter 读同一份 config，产出等价 lint / codegen 行为。下游模板项目可直接挑任一 lane（顶层 `tasks.sh` 用 `ADAPTER=python ./tasks.sh <target>` 切换），不被语言生态绑死。

## 用法

通过顶层 `tasks.sh`（推荐）：

```bash
ADAPTER=python ./tasks.sh check-structure
ADAPTER=python ./tasks.sh check-refs
ADAPTER=python ./tasks.sh sync-skills        # 写入 mirror
ADAPTER=python ./tasks.sh sync-skills-check  # 漂移检测
ADAPTER=python ./tasks.sh validate           # 三项合一
```

或直接调脚本：

```bash
python3 adapters/python/check_structure.py
python3 adapters/python/check_refs.py
python3 adapters/python/sync_skills.py [--check]
```

退出码：0 = 通过，1 = 失败。

## 等价契约

完整规范见 [adapters/README.md](../README.md)：所有 adapter 必须实现的入口、退出码、判定逻辑与报错 token 形态，以及可自由变化的部分。

| 行为                                       | Node                  | Python               | Shell                | Parity |
| ------------------------------------------ | --------------------- | -------------------- | -------------------- | ------ |
| AGENTS.md 章节顺序 + 行预算校验            | `check_structure.mjs` | `check_structure.py` | `check_structure.sh` | ✅     |
| Markdown 路径引用（backtick + link）存在性 | `check_refs.mjs`      | `check_refs.py`      | `check_refs.sh`      | ✅     |
| skill 真源 → 双镜像 生成 + 漂移检测        | `sync_skills.mjs`     | `sync_skills.py`     | `sync_skills.sh`     | ✅     |

parity 由 `tools/adapter-parity.test.mjs` 显式断言：相同输入下三 adapter 退出码一致 + 强制 token 集合相等；不比对消息文案与 ref 总数（每语言一种风格）。

## 为什么 Python

- 几乎所有开发机器有 Python 3，跨 Java / Go / Rust / C# / Ruby 项目通用。
- 仅用 stdlib，无 `pip install` 摩擦。
- 行数与 Node 版相当（~80–120 行 / 文件），可读性接近。
- 后续如做编译型单二进制（Go / Rust），Python 版作为参考实现保留——三套 adapter 共享同一 config + 同一 parity test 套件。
