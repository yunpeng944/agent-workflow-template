import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTmpRepo, runAdapter } from './_helpers.mjs';

test('check_structure: PASS when headings match order + sections within budget', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      expectedHeadings: ['One', 'Two'],
      sectionLineLimits: { One: 5 },
    },
    files: { 'AGENTS.md': '## One\n\nbody-a\n\n## Two\n\nbody-b\n' },
  });
  try {
    const r = runAdapter('check_structure', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED/);
  } finally {
    cleanup();
  }
});

test('check_structure: FAIL when heading order wrong', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { expectedHeadings: ['One', 'Two'] },
    files: { 'AGENTS.md': '## Two\n\n## One\n' },
  });
  try {
    const r = runAdapter('check_structure', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /heading 1/);
  } finally {
    cleanup();
  }
});

test('check_structure: FAIL when section exceeds line budget', () => {
  const { root, cleanup } = makeTmpRepo({
    config: {
      expectedHeadings: ['One'],
      sectionLineLimits: { One: 2 },
    },
    files: { 'AGENTS.md': '## One\nline2\nline3\nline4\n' },
  });
  try {
    const r = runAdapter('check_structure', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /exceeds line budget/);
  } finally {
    cleanup();
  }
});

test('check_structure: FAIL when expected heading missing', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { expectedHeadings: ['One', 'Two'] },
    files: { 'AGENTS.md': '## One\n' },
  });
  try {
    const r = runAdapter('check_structure', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /expected 2.*found 1/);
  } finally {
    cleanup();
  }
});
