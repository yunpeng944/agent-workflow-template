#!/usr/bin/env node
/**
 * 校验 skills/<name>.md 真源含 skillInvariants 配置的必备关键词。
 * 防止 governance refactor 软化关键设计约束（fail-fast / 字符级一致 / fresh / 不读上游等）。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.env.AGENTS_MD_ROOT
  ? resolve(process.env.AGENTS_MD_ROOT)
  : resolve(import.meta.dirname, '../..');
const CONFIG = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'agents-md.config.json'), 'utf8'),
);
const SKILL_INVARIANTS = CONFIG.skillInvariants ?? {};

export function checkSkillInvariants(root = process.cwd()) {
  const skillsDir = resolve(root, 'skills');
  if (!existsSync(skillsDir)) {
    return { checkedCount: 0, failures: [] };
  }

  const failures = [];
  let checkedCount = 0;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const stem = basename(entry.name, '.md');
    if (stem === 'README') continue;
    const required = SKILL_INVARIANTS[stem];
    if (!required || required.length === 0) continue;

    const md = readFileSync(resolve(skillsDir, entry.name), 'utf8');
    checkedCount += 1;
    for (const keyword of required) {
      if (!md.includes(keyword)) {
        failures.push({ skill: stem, missing: keyword });
      }
    }
  }

  return { checkedCount, failures };
}

function runCli() {
  const { checkedCount, failures } = checkSkillInvariants(REPO_ROOT);

  if (failures.length > 0) {
    console.error(`Skill invariants check FAILED — ${failures.length} missing keyword(s):\n`);
    for (const { skill, missing } of failures) {
      console.error(`  ${skill}: missing "${missing}"`);
    }
    process.exit(1);
  }

  console.log(`Skill invariants check PASSED — ${checkedCount} skills checked.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
