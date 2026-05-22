/**
 * Adapter 测试共享工具：建临时 fixture 仓 + spawn adapter 子进程。
 *
 * 为什么用子进程而非 import：adapter 模块 load 时从 REPO_ROOT 读 config 到
 * module-level 常量；ESM cache 不允许重复 import 用不同 config。子进程 +
 * AGENTS_MD_ROOT env 是 zero-dep 下的干净隔离方式。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const ADAPTER_DIR = import.meta.dirname;

export function makeTmpRepo({ config = {}, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'awt-test-'));
  writeFileSync(join(root, 'agents-md.config.json'), JSON.stringify(config));
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = join(root, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content);
  }
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

export function runAdapter(script, root, args = []) {
  const result = spawnSync(
    process.execPath,
    [resolve(ADAPTER_DIR, `${script}.mjs`), ...args],
    {
      env: { ...process.env, AGENTS_MD_ROOT: root },
      encoding: 'utf8',
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
