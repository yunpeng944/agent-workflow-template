#!/usr/bin/env node
/**
 * 校验 AGENTS.md 的二级标题集合、顺序与章节长度，避免入口结构漂移和章节膨胀。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.env.AGENTS_MD_ROOT
  ? resolve(process.env.AGENTS_MD_ROOT)
  : resolve(import.meta.dirname, '../..');
const CONFIG = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'agents-md.config.json'), 'utf8'),
);
const EXPECTED_HEADINGS = CONFIG.expectedHeadings;

/**
 * 章节最大行数（含 `## ` 标题行）。来自 agents-md.config.json。
 * 保留 named export 以兼容现有测试与下游引用。
 */
export const SECTION_LINE_LIMITS = CONFIG.sectionLineLimits;

function collectHeadings(md) {
  return [...md.matchAll(/^## (.+)$/gm)].map((match, index) => ({
    title: match[1].trim(),
    /** Index of this heading line in `md` split by '\n', for length measurement. */
    lineIndex: md.slice(0, match.index).split('\n').length - 1,
  }));
}

function measureSections(md, headings) {
  const totalLines = md.split('\n').length;
  return headings.map((heading, i) => {
    const next = headings[i + 1];
    const endLine = next ? next.lineIndex : totalLines;
    return { title: heading.title, lineCount: endLine - heading.lineIndex };
  });
}

export function checkAgentsStructure(md) {
  const headings = collectHeadings(md);
  const actualTitles = headings.map((h) => h.title);
  const failures = [];

  if (actualTitles.length !== EXPECTED_HEADINGS.length) {
    failures.push(`expected ${EXPECTED_HEADINGS.length} ## headings, found ${actualTitles.length}`);
  }

  const maxLen = Math.max(actualTitles.length, EXPECTED_HEADINGS.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (actualTitles[i] !== EXPECTED_HEADINGS[i]) {
      failures.push(
        `heading ${i + 1}: expected "${EXPECTED_HEADINGS[i] ?? '<missing>'}", found "${actualTitles[i] ?? '<missing>'}"`,
      );
    }
  }

  const sections = measureSections(md, headings);
  for (const { title, lineCount } of sections) {
    const limit = SECTION_LINE_LIMITS[title];
    if (limit !== undefined && lineCount > limit) {
      failures.push(`section "${title}" exceeds line budget: ${lineCount} > ${limit}`);
    }
  }

  return { failures };
}

function runCli() {
  const md = readFileSync(resolve(REPO_ROOT, 'AGENTS.md'), 'utf8');
  const { failures } = checkAgentsStructure(md);

  if (failures.length > 0) {
    console.error('AGENTS.md structure check FAILED:\n');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log('AGENTS.md structure check PASSED');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
