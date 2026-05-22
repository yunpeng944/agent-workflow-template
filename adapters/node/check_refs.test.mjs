import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTmpRepo, runAdapter } from './_helpers.mjs';

test('check_refs: PASS when all known-prefix refs exist', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { knownPrefixes: ['lib/'] },
    files: {
      'AGENTS.md': 'see `lib/foo.md` for details\n',
      'README.md': '',
      'lib/foo.md': 'content',
    },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED/);
  } finally {
    cleanup();
  }
});

test('check_refs: FAIL when ref does not exist', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { knownPrefixes: ['lib/'] },
    files: { 'AGENTS.md': 'broken `lib/missing.md` ref\n' },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /DEAD: lib\/missing\.md/);
  } finally {
    cleanup();
  }
});

test('check_refs: intentionallyAbsentRefs whitelist skips existence', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      knownPrefixes: ['lib/'],
      intentionallyAbsentRefs: ['lib/contract.ts'],
    },
    files: { 'AGENTS.md': 'placeholder `lib/contract.ts` for fork\n' },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED/);
  } finally {
    cleanup();
  }
});

test('check_refs: refs outside knownPrefixes are ignored', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { knownPrefixes: ['lib/'] },
    files: { 'AGENTS.md': 'random `some/random/path.md` should not be checked\n' },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /0 dead/);
  } finally {
    cleanup();
  }
});

test('check_refs: markdown links resolved relative to source dir', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { knownPrefixes: ['docs/'] },
    files: {
      'AGENTS.md': '',
      'README.md': '',
      'docs/index.md': '[ref](./sub/page.md)\n',
      'docs/sub/page.md': 'target',
    },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED/);
  } finally {
    cleanup();
  }
});

test('check_refs: scanExcludeDirs skips matched directories', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      knownPrefixes: ['lib/'],
      scanExcludeDirs: ['docs/archive'],
    },
    files: {
      'AGENTS.md': '',
      'docs/archive/old.md': '`lib/deleted.md` historical ref\n',
    },
  });
  try {
    const r = runAdapter('check_refs', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  } finally {
    cleanup();
  }
});
