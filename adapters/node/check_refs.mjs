#!/usr/bin/env node
/**
 * 扫描 scanMarkdownRoots 配置的 .md 文件 / 目录中反引号内与 Markdown link 内的文件路径引用，报告不存在的路径。
 * 只检查含 "/" 的引用（完整路径），跳过裸文件名、glob 模式和模板占位符。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.env.AGENTS_MD_ROOT
  ? resolve(process.env.AGENTS_MD_ROOT)
  : resolve(import.meta.dirname, '../..');
const CONFIG = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'agents-md.config.json'), 'utf8'),
);
const KNOWN_PREFIXES = CONFIG.knownPrefixes ?? [];
const RUNTIME_PREFIXES = CONFIG.runtimePrefixes ?? [];
const GENERATED_PREFIXES = CONFIG.generatedPrefixes ?? [];
const INTENTIONALLY_ABSENT_REFS = new Set(CONFIG.intentionallyAbsentRefs ?? []);
const SCAN_EXCLUDE_DIRS = CONFIG.scanExcludeDirs ?? [];
const SCAN_MARKDOWN_ROOTS = CONFIG.scanMarkdownRoots ?? ['AGENTS.md', 'README.md', 'docs/'];

function toUnixPath(path) {
  return path.split('\\').join('/');
}

function collectMarkdownFiles(root, dir) {
  if (!existsSync(dir)) return [];
  const relPath = toUnixPath(relative(root, dir));
  if (SCAN_EXCLUDE_DIRS.some((p) => relPath === p || relPath.startsWith(`${p}/`))) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(root, fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * KNOWN_PREFIXES 用正向匹配排除 CLI 命令 / npm 包名 / 路由 / slash command 等误报；
 * RUNTIME_PREFIXES / GENERATED_PREFIXES / INTENTIONALLY_ABSENT_REFS 跳过存在性校验。
 * 真源在 agents-md.config.json。
 */

function isPathRef(ref) {
  if (!ref.includes('/')) return false;
  if (ref.includes('*') || ref.includes('<')) return false;
  if (ref.includes(' ')) return false; // CLI 命令含空格
  return KNOWN_PREFIXES.some((p) => ref.startsWith(p));
}

function extractRefs(root, filePath) {
  const md = readFileSync(filePath, 'utf8');
  const source = toUnixPath(relative(root, filePath));
  const sourceDir = dirname(filePath);
  const refs = [];

  for (const match of md.matchAll(/`([^`]+)`/g)) {
    const ref = match[1];
    if (isPathRef(ref)) refs.push({ path: ref, source });
  }

  for (const match of md.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const normalized = normalizeMarkdownLink(root, sourceDir, match[1]);
    if (normalized) refs.push({ path: normalized, source });
  }

  return refs;
}

function normalizeMarkdownLink(root, sourceDir, target) {
  const hashIdx = target.indexOf('#');
  const path = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
  if (!path) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null;
  if (path.startsWith('/')) return null;
  const rel = toUnixPath(relative(root, resolve(sourceDir, path)));
  if (!rel || rel.startsWith('..')) return null;
  return rel;
}

function shouldCheckExistence(path) {
  if (RUNTIME_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (GENERATED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (INTENTIONALLY_ABSENT_REFS.has(path)) return false;
  return true;
}

function resolveScanTargets(root, scanRoots) {
  const targets = [];
  for (const entry of scanRoots) {
    const abs = resolve(root, entry);
    if (!existsSync(abs)) continue;
    const st = statSync(abs);
    if (st.isDirectory()) {
      targets.push(...collectMarkdownFiles(root, abs));
    } else if (st.isFile() && entry.endsWith('.md')) {
      targets.push(abs);
    }
  }
  return targets;
}

export function checkMarkdownRefs(root = process.cwd()) {
  const markdownFiles = resolveScanTargets(root, SCAN_MARKDOWN_ROOTS);

  /** 去重，保留每个路径最早出现的位置 */
  const unique = new Map();
  for (const ref of markdownFiles.flatMap((filePath) => extractRefs(root, filePath))) {
    if (!unique.has(ref.path)) unique.set(ref.path, ref.source);
  }

  /** 运行态和构建产物路径只检查形态，不要求本地文件存在 */
  const dead = [...unique.entries()].filter(([path]) => {
    if (!shouldCheckExistence(path)) return false;
    return !existsSync(resolve(root, path));
  });

  return {
    checkedCount: unique.size,
    dead: dead.map(([path, source]) => ({ path, source })),
  };
}

function runCli() {
  const result = checkMarkdownRefs(REPO_ROOT);
  if (result.dead.length > 0) {
    console.error(`Markdown reference check FAILED — ${result.dead.length} dead ref(s):\n`);
    for (const { path, source } of result.dead) {
      console.error(`  DEAD: ${path} (referenced by ${source})`);
    }
    process.exit(1);
  }

  console.log(`Markdown reference check PASSED — ${result.checkedCount} path refs, 0 dead.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
