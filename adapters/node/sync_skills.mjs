#!/usr/bin/env node
/**
 * 生成并校验 Claude Code 与 OpenAI Codex 的 workflow skill 镜像。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * 极简 frontmatter parser（zero-dep，stdlib only，替代 gray-matter）。
 * 抽首块 `---` ↔ `---` 内顶层标量 `key: value` 行；嵌套 / list 不解析。
 * adapter 契约只用到 `name` / `description`，其余字段由 extractFrontmatterBlock
 * verbatim 透传到镜像（不经过本 parser）。
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {} };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[kv[1]] = value;
  }
  return { data };
}

const REPO_ROOT = process.env.AGENTS_MD_ROOT
  ? resolve(process.env.AGENTS_MD_ROOT)
  : resolve(import.meta.dirname, '../..');
const CONFIG = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'agents-md.config.json'), 'utf8'),
);
const MIRROR_ROOTS = CONFIG.mirrorRoots ?? [];

const GENERATED_HEADER = '<!-- generated · do not edit · source:';
const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function normalizeBody(content) {
  const withoutFrontmatterSpacer = content.replace(/^\r?\n/, '');
  return withoutFrontmatterSpacer.replace(/\r\n/g, '\n').replace(/\n*$/, '');
}

function validateSkill(sourcePath, stem, data) {
  const failures = [];
  const { name, description } = data;

  if (typeof name !== 'string' || name.trim() === '') {
    failures.push('name is required');
  } else {
    if (name !== name.trim()) failures.push('name must not contain leading or trailing whitespace');
    if (!KEBAB_CASE_RE.test(name)) failures.push('name must be kebab-case');
    if (name !== stem) failures.push(`name must match filename stem "${stem}"`);
  }

  if (typeof description !== 'string' || description.trim() === '') {
    failures.push('description is required');
  } else {
    if (description !== description.trim()) {
      failures.push('description must not contain leading or trailing whitespace');
    }
    if (description.length > 500) {
      failures.push(`description must be <= 500 chars, got ${description.length}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${sourcePath}: ${failures.join('; ')}`);
  }
}

function readSkillSources(root) {
  const skillsDir = resolve(root, 'skills');
  if (!existsSync(skillsDir)) {
    throw new Error('skills/: directory not found');
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    throw new Error('skills/: no skill source files found');
  }

  return entries.map((entry) => {
    const sourceRelativePath = join('skills', entry).replaceAll('\\', '/');
    const sourcePath = resolve(skillsDir, entry);
    const stem = basename(entry, '.md');
    const content = readFileSync(sourcePath, 'utf8');
    const { frontmatterBlock, bodyContent } = extractFrontmatterBlock(sourceRelativePath, content);
    const parsed = parseFrontmatter(content);

    validateSkill(sourceRelativePath, stem, parsed.data);

    const body = normalizeBody(bodyContent);
    const generated = `${frontmatterBlock}\n\n${GENERATED_HEADER} ${sourceRelativePath} -->\n\n${body}\n`;

    return { name: parsed.data.name, sourceRelativePath, generated };
  });
}

/** Extract the frontmatter block ("---" through closing "---") verbatim, so any
 *  fields beyond name/description (e.g. disable-model-invocation) pass through. */
function extractFrontmatterBlock(sourcePath, content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    throw new Error(`${sourcePath}: missing frontmatter open marker`);
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    throw new Error(`${sourcePath}: missing frontmatter close marker`);
  }
  return {
    frontmatterBlock: lines.slice(0, endIdx + 1).join('\n'),
    bodyContent: lines.slice(endIdx + 1).join('\n'),
  };
}

function targetPaths(root, name) {
  return MIRROR_ROOTS.map((mirrorRoot) => resolve(root, mirrorRoot, name, 'SKILL.md'));
}

function writeMirrors(root, skills) {
  const failures = [];

  for (const skill of skills) {
    for (const targetPath of targetPaths(root, skill.name)) {
      const relativeTarget = targetPath.replace(`${resolve(root)}/`, '').replaceAll('\\', '/');
      try {
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, skill.generated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${skill.sourceRelativePath}: failed to write ${relativeTarget}: ${message}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
}

function checkMirrors(root, skills) {
  const mismatches = [];

  for (const skill of skills) {
    for (const targetPath of targetPaths(root, skill.name)) {
      const relativeTarget = targetPath.replace(`${resolve(root)}/`, '').replaceAll('\\', '/');
      if (!existsSync(targetPath)) {
        mismatches.push(`${relativeTarget} missing`);
        continue;
      }

      const actual = readFileSync(targetPath, 'utf8');
      if (actual !== skill.generated) {
        mismatches.push(`${relativeTarget} diverges from ${skill.sourceRelativePath}`);
      }
    }
  }

  return mismatches;
}

export function runSyncSkills(argv = process.argv.slice(2), root = REPO_ROOT) {
  const checkMode = argv.includes('--check');
  const unknownArgs = argv.filter((arg) => arg !== '--check');

  if (unknownArgs.length > 0) {
    throw new Error(`unknown arguments: ${unknownArgs.join(' ')}`);
  }

  const skills = readSkillSources(root);

  if (checkMode) {
    const mismatches = checkMirrors(root, skills);
    if (mismatches.length > 0) {
      console.error('sync-skills check FAILED:');
      for (const mismatch of mismatches) console.error(`  ${mismatch}`);
      return 1;
    }

    console.log('sync-skills check PASSED');
    return 0;
  }

  writeMirrors(root, skills);
  console.log(`sync-skills wrote ${skills.length * MIRROR_ROOTS.length} mirror files`);
  return 0;
}

function runCli() {
  try {
    process.exitCode = runSyncSkills();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
