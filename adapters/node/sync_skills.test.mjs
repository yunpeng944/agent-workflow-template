import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeTmpRepo, runAdapter } from './_helpers.mjs';

const VALID_SKILL = `---
name: my-skill
description: A test skill
disable-model-invocation: true
---

## Goal

Do something.
`;

test('sync_skills: writes mirrors with generated header + verbatim frontmatter', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills', '.agents/skills'] },
    files: { 'skills/my-skill.md': VALID_SKILL },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /wrote 2 mirror files/);

    const claudeMirror = readFileSync(
      join(root, '.claude/skills/my-skill/SKILL.md'),
      'utf8',
    );
    assert.match(claudeMirror, /name: my-skill/);
    assert.match(claudeMirror, /disable-model-invocation: true/);
    assert.match(
      claudeMirror,
      /<!-- generated · do not edit · source: skills\/my-skill\.md -->/,
    );
    assert.match(claudeMirror, /Do something\./);

    const agentsMirror = readFileSync(
      join(root, '.agents/skills/my-skill/SKILL.md'),
      'utf8',
    );
    assert.equal(claudeMirror, agentsMirror);
  } finally {
    cleanup();
  }
});

test('sync_skills --check: PASS when mirrors in sync', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': VALID_SKILL },
  });
  try {
    runAdapter('sync_skills', root);
    const r = runAdapter('sync_skills', root, ['--check']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /PASSED/);
  } finally {
    cleanup();
  }
});

test('sync_skills --check: FAIL when mirror diverges', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: {
      'skills/my-skill.md': VALID_SKILL,
      '.claude/skills/my-skill/SKILL.md': '--- garbage content ---',
    },
  });
  try {
    const r = runAdapter('sync_skills', root, ['--check']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /diverges/);
  } finally {
    cleanup();
  }
});

test('sync_skills --check: FAIL when mirror missing', () => {
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': VALID_SKILL },
  });
  try {
    const r = runAdapter('sync_skills', root, ['--check']);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing/);
  } finally {
    cleanup();
  }
});

test('sync_skills: rejects skill name not matching filename stem', () => {
  const skill = VALID_SKILL.replace('name: my-skill', 'name: other-name');
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': skill },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /name must match filename stem/);
  } finally {
    cleanup();
  }
});

test('sync_skills: rejects description > 500 chars', () => {
  const longDesc = 'a'.repeat(501);
  const skill = VALID_SKILL.replace(
    'description: A test skill',
    `description: ${longDesc}`,
  );
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': skill },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /description must be <= 500/);
  } finally {
    cleanup();
  }
});

test('sync_skills: rejects skill name not in kebab-case', () => {
  const skill = VALID_SKILL.replace('name: my-skill', 'name: MySkill');
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': skill },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /kebab-case/);
  } finally {
    cleanup();
  }
});

test('sync_skills: rejects skill missing frontmatter open marker', () => {
  const skill = '# Just markdown\n\nNo frontmatter at all\n';
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': skill },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing frontmatter open marker/);
  } finally {
    cleanup();
  }
});

test('sync_skills: rejects skill missing frontmatter close marker', () => {
  const skill = '---\nname: my-skill\ndescription: x\n\nbody without close\n';
  const { root, cleanup } = makeTmpRepo({
    config: { mirrorRoots: ['.claude/skills'] },
    files: { 'skills/my-skill.md': skill },
  });
  try {
    const r = runAdapter('sync_skills', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing frontmatter close marker/);
  } finally {
    cleanup();
  }
});
