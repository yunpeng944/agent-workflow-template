/**
 * Adapter parity test：验证所有可用 adapter（Node / Python / Shell / …）在同一
 * agents-md.config.json 与同一输入上产出等价行为。
 *
 * Hard contract（见 adapters/README.md）：
 * - 全绿场景（real repo）：所有 adapter 退出码同为 0
 * - corrupt 场景（隔离 fixture，AGENTS_MD_ROOT 注入）：所有 adapter 退出码同为 1，
 *   且报错关键 token（heading 失配 / dead ref / 漂移文件名）集合一致
 *
 * 不比对消息文案与 ref 总数（每语言一种风格）。若某 adapter 解释器不可用则被跳过；
 * 至少需要 2 个 adapter 可用才有 parity 可比性。
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const PYTHON = process.env.PYTHON3 ?? 'python3';

function probe(cmd) {
  return spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
}

/** Adapter 表：name → 解释器命令 + 三入口脚本路径。 */
const ADAPTERS = [
  {
    name: 'node',
    cmd: 'node',
    check_structure: ['adapters/node/check_structure.mjs'],
    check_refs: ['adapters/node/check_refs.mjs'],
    sync_skills: ['adapters/node/sync_skills.mjs'],
  },
  {
    name: 'python',
    cmd: PYTHON,
    check_structure: ['adapters/python/check_structure.py'],
    check_refs: ['adapters/python/check_refs.py'],
    sync_skills: ['adapters/python/sync_skills.py'],
  },
  {
    name: 'shell',
    cmd: 'bash',
    check_structure: ['adapters/shell/check_structure.sh'],
    check_refs: ['adapters/shell/check_refs.sh'],
    sync_skills: ['adapters/shell/sync_skills.sh'],
  },
];

const AVAILABLE = ADAPTERS.filter((a) => probe(a.cmd));
const skipReason =
  AVAILABLE.length < 2
    ? `parity needs ≥2 adapters, got ${AVAILABLE.length} (${AVAILABLE.map((a) => a.name).join(',')})`
    : false;

function runAdapter(adapter, entry, extraArgs = [], env = {}) {
  return spawnSync(adapter.cmd, [...adapter[entry], ...extraArgs], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

/** 断言所有 adapter 退出码一致；返回 results 供后续 token 比对。 */
function assertSameExit(entry, extraArgs, env, expected = undefined) {
  const results = AVAILABLE.map((a) => ({ name: a.name, result: runAdapter(a, entry, extraArgs, env) }));
  const summary = results
    .map((r) => `${r.name}=${r.result.status}\n  stderr: ${r.result.stderr.split('\n').slice(0, 3).join(' | ')}`)
    .join('\n');
  const first = results[0].result.status;
  for (const r of results.slice(1)) {
    assert.equal(r.result.status, first, `exit-code mismatch:\n${summary}`);
  }
  if (expected !== undefined) {
    assert.equal(first, expected, `expected exit ${expected}, got ${first}:\n${summary}`);
  }
  return results;
}

/** 抽 token + sort，断言各 adapter 集合相等。 */
function assertSameTokens(results, tokenRe, mapper, lowerBound = 0, label = 'tokens') {
  const tokensByAdapter = results.map((r) => ({
    name: r.name,
    tokens: [...r.result.stderr.matchAll(tokenRe)].map(mapper).sort(),
  }));
  const summary = tokensByAdapter
    .map((t) => `${t.name}: ${JSON.stringify(t.tokens)}`)
    .join('\n');
  const base = tokensByAdapter[0].tokens;
  for (const t of tokensByAdapter.slice(1)) {
    assert.deepEqual(t.tokens, base, `${label} diverge\n${summary}`);
  }
  if (lowerBound > 0) {
    assert.ok(base.length >= lowerBound, `expected ≥${lowerBound} ${label}, got ${base.length}\n${summary}`);
  }
}

/** 在 tmpdir 下铺设 fixture：写 config、AGENTS.md、skills/ 真源、镜像产物。 */
function makeFixture({ config, agentsMd, skills, mirrorFiles }) {
  const tmp = mkdtempSync(resolve(tmpdir(), 'agents-md-parity-'));
  writeFileSync(resolve(tmp, 'agents-md.config.json'), JSON.stringify(config, null, 2));
  if (agentsMd !== undefined) {
    writeFileSync(resolve(tmp, 'AGENTS.md'), agentsMd);
  }
  if (skills) {
    const skillsDir = resolve(tmp, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    for (const [name, body] of Object.entries(skills)) {
      writeFileSync(resolve(skillsDir, `${name}.md`), body);
    }
  }
  if (mirrorFiles) {
    for (const [path, body] of Object.entries(mirrorFiles)) {
      const fullPath = resolve(tmp, path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, body);
    }
  }
  return tmp;
}

function withFixture(content, callback) {
  const fixture = makeFixture(content);
  try {
    return callback(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

function configBase(overrides = {}) {
  return {
    version: 1,
    expectedHeadings: [],
    sectionLineLimits: {},
    knownPrefixes: [],
    runtimePrefixes: [],
    generatedPrefixes: [],
    intentionallyAbsentRefs: [],
    mirrorRoots: [],
    scanExcludeDirs: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 全绿场景（real repo state）：所有 adapter 同入口必须同时退 0。
// ---------------------------------------------------------------------------

test('adapter parity — check-structure (all-green)', { skip: skipReason }, () => {
  assertSameExit('check_structure', [], {}, 0);
});

test('adapter parity — check-refs (all-green)', { skip: skipReason }, () => {
  assertSameExit('check_refs', [], {}, 0);
});

test('adapter parity — sync-skills --check (all-green)', { skip: skipReason }, () => {
  assertSameExit('sync_skills', ['--check'], {}, 0);
});

// ---------------------------------------------------------------------------
// Corrupt 场景：通过 AGENTS_MD_ROOT 把 adapter 指向隔离 fixture，
// 注入特定 corruption，断言所有 adapter 都退 1 且报错 token 集合一致。
// ---------------------------------------------------------------------------

test('adapter parity — check-structure (corrupt heading order)', { skip: skipReason }, () => {
  withFixture(
    {
      config: configBase({ expectedHeadings: ['alpha', 'beta', 'gamma'] }),
      agentsMd: '# Title\n\n## alpha\n\nbody\n\n## gamma\n\nbody\n\n## beta\n\nbody\n',
    },
    (fixture) => {
      const results = assertSameExit('check_structure', [], { AGENTS_MD_ROOT: fixture }, 1);
      assertSameTokens(
        results,
        /heading (\d+): expected "([^"]+)", found "([^"]+)"/g,
        (m) => `${m[1]}|${m[2]}|${m[3]}`,
        2,
        'heading-mismatch tokens',
      );
    },
  );
});

test('adapter parity — check-refs (corrupt dead path ref)', { skip: skipReason }, () => {
  withFixture(
    {
      config: configBase({ knownPrefixes: ['src/'] }),
      agentsMd: '# Title\n\n`src/nonexistent-a.ts` 与 `src/nonexistent-b.ts` 是 dead ref。\n',
    },
    (fixture) => {
      const results = assertSameExit('check_refs', [], { AGENTS_MD_ROOT: fixture }, 1);
      assertSameTokens(results, /DEAD:\s+(\S+)/g, (m) => m[1], 2, 'dead-ref tokens');
      const baseTokens = [...results[0].result.stderr.matchAll(/DEAD:\s+(\S+)/g)].map((m) => m[1]);
      assert.ok(
        baseTokens.includes('src/nonexistent-a.ts'),
        `expected src/nonexistent-a.ts in dead refs, got ${JSON.stringify(baseTokens)}`,
      );
    },
  );
});

test('adapter parity — sync-skills passthrough (extra frontmatter fields preserved)', { skip: skipReason }, () => {
  const skillBody = [
    '---',
    'name: foo',
    'description: passthrough fixture',
    'disable-model-invocation: true',
    'user-invocable: true',
    '---',
    '',
    '## Role',
    '',
    'body',
    '',
  ].join('\n');
  withFixture(
    {
      config: configBase({ mirrorRoots: ['.claude/skills'] }),
      skills: { foo: skillBody },
    },
    (fixture) => {
      // 各 adapter 都生成镜像（写入模式），然后 --check 应通过且镜像含全部 frontmatter 字段。
      for (const adapter of AVAILABLE) {
        const writeResult = runAdapter(adapter, 'sync_skills', [], { AGENTS_MD_ROOT: fixture });
        assert.equal(
          writeResult.status,
          0,
          `${adapter.name} write failed: ${writeResult.stderr}`,
        );
        const mirror = readFileSync(resolve(fixture, '.claude/skills/foo/SKILL.md'), 'utf8');
        assert.match(mirror, /disable-model-invocation: true/, `${adapter.name} dropped disable-model-invocation`);
        assert.match(mirror, /user-invocable: true/, `${adapter.name} dropped user-invocable`);
        // 清理后让下个 adapter 从头生成
        rmSync(resolve(fixture, '.claude'), { recursive: true, force: true });
      }
    },
  );
});

test('adapter parity — sync-skills mirror is SKILL.md-spec-compliant (frontmatter starts at line 1)', { skip: skipReason }, () => {
  const skillBody = [
    '---',
    'name: foo',
    'description: passthrough fixture',
    'disable-model-invocation: true',
    'user-invocable: true',
    '---',
    '',
    '## Role',
    '',
    'body',
    '',
  ].join('\n');
  withFixture(
    {
      config: configBase({ mirrorRoots: ['.claude/skills'] }),
      skills: { foo: skillBody },
    },
    (fixture) => {
      for (const adapter of AVAILABLE) {
        rmSync(resolve(fixture, '.claude'), { recursive: true, force: true });
        const writeResult = runAdapter(adapter, 'sync_skills', [], { AGENTS_MD_ROOT: fixture });
        assert.equal(
          writeResult.status,
          0,
          `${adapter.name} write failed: ${writeResult.stderr}`,
        );
        const mirror = readFileSync(resolve(fixture, '.claude/skills/foo/SKILL.md'), 'utf8');
        const lines = mirror.split('\n');
        assert.equal(lines[0], '---', `${adapter.name} mirror must start with frontmatter delimiter`);
        assert.ok(
          lines.indexOf('---', 1) > 0,
          `${adapter.name} mirror must include closing frontmatter delimiter`,
        );
        assert.ok(
          mirror.includes('<!-- generated · do not edit · source: skills/foo.md -->'),
          `${adapter.name} mirror must retain generated comment`,
        );
      }
    },
  );
});

test('adapter parity — sync-skills --check (corrupt mirror divergence)', { skip: skipReason }, () => {
  const skillBody = '---\nname: foo\ndescription: a fixture skill.\n---\n\n## Role\n\nbody\n';
  withFixture(
    {
      config: configBase({ mirrorRoots: ['.claude/skills', '.agents/skills'] }),
      skills: { foo: skillBody },
      mirrorFiles: {
        '.claude/skills/foo/SKILL.md': 'corrupted claude mirror',
        '.agents/skills/foo/SKILL.md': 'corrupted agents mirror',
      },
    },
    (fixture) => {
      const results = assertSameExit('sync_skills', ['--check'], { AGENTS_MD_ROOT: fixture }, 1);
      assertSameTokens(
        results,
        /(\.(?:claude|agents)\/skills\/foo\/SKILL\.md)/g,
        (m) => m[1],
        // 两 mirror 各被引用 ≥1 次，但每 adapter 输出次数可能不同；用去重后下界
        0,
        'mirror-divergence tokens',
      );
      const baseTokens = new Set(
        [...results[0].result.stderr.matchAll(/(\.(?:claude|agents)\/skills\/foo\/SKILL\.md)/g)].map((m) => m[1]),
      );
      assert.equal(baseTokens.size, 2, `expected both mirrors flagged, got ${JSON.stringify([...baseTokens])}`);
    },
  );
});

test('repo wf-* mirror SKILL.md frontmatter at line 1 (real repo)', () => {
  const mirrorRoots = ['.claude/skills', '.agents/skills'];
  const failures = [];
  for (const root of mirrorRoots) {
    const rootDir = resolve(REPO_ROOT, root);
    if (!existsSync(rootDir)) continue;
    const skills = readdirSync(rootDir).filter((name) => name.startsWith('wf-'));
    for (const skillName of skills) {
      const mirrorPath = resolve(rootDir, skillName, 'SKILL.md');
      if (!existsSync(mirrorPath)) continue;
      const content = readFileSync(mirrorPath, 'utf8');
      const firstLine = content.split('\n')[0];
      if (firstLine !== '---') {
        failures.push(
          `${root}/${skillName}/SKILL.md first line = ${JSON.stringify(firstLine)}, expected "---"`,
        );
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `mirror SKILL.md spec violations:\n${failures.join('\n')}`,
  );
});
