import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTmpRepo, runAdapter } from './_helpers.mjs';

const SKILL_WITH_INVARIANTS = `---
name: wf-test
description: Test skill
---

## Goal

fail-fast 不模拟. fresh / isolated executor. 字符级一致.
`;

test('check_skills: PASS when all invariants present', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      skillInvariants: { 'wf-test': ['fail-fast', 'fresh', '字符级一致'] },
    },
    files: { 'skills/wf-test.md': SKILL_WITH_INVARIANTS },
  });
  try {
    const r = runAdapter('check_skills', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED — 1 skills checked/);
  } finally {
    cleanup();
  }
});

test('check_skills: FAIL when invariant keyword missing', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      skillInvariants: { 'wf-test': ['fail-fast', 'NEVER-PRESENT'] },
    },
    files: { 'skills/wf-test.md': SKILL_WITH_INVARIANTS },
  });
  try {
    const r = runAdapter('check_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /wf-test: missing "NEVER-PRESENT"/);
  } finally {
    cleanup();
  }
});

test('check_skills: skips skills not in skillInvariants config', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { skillInvariants: {} },
    files: { 'skills/wf-other.md': '---\nname: wf-other\n---\nno keywords\n' },
  });
  try {
    const r = runAdapter('check_skills', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED — 0 skills checked/);
  } finally {
    cleanup();
  }
});

test('check_skills: skips README.md', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      skillInvariants: { README: ['MUST-NOT-CHECK-README'] },
    },
    files: { 'skills/README.md': 'no invariant keyword here\n' },
  });
  try {
    const r = runAdapter('check_skills', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED — 0 skills checked/);
  } finally {
    cleanup();
  }
});
