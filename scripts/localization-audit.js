import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedExt = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html'];

const projectRoot = path.join(__dirname, '..');

const targetDirs = [
  path.join(projectRoot, 'client', 'src'),
  path.join(projectRoot, 'server'),
  path.join(projectRoot, 'migrations'),
  projectRoot // root config files
];

const ignoreDirs = new Set(['node_modules', '.git', 'dist']);

const results = [];

function getCategory(filePath) {
  const rel = path.relative(projectRoot, filePath);
  if (rel.startsWith(path.join('client', 'src'))) return 'client';
  if (rel.startsWith('server')) return 'server';
  if (rel.startsWith('migrations') || rel.includes(path.join('db'))) return 'database';
  return 'config';
}

async function collectFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(full);
    } else if (allowedExt.includes(path.extname(entry.name))) {
      await processFile(full);
    }
  }
}

function extractStrings(line) {
  const matches = [];
  const stringRegex = /['"`][^'"`]*[A-Za-z][^'"`]*['"`]/g;
  const attrRegex = /(placeholder|title|label|alt|aria-label)=(['"])([^'"]*[A-Za-z][^'"]*)\2/gi;
  const jsxTextRegex = />[^<>]*[A-Za-z][^<>]*</g;
  let m;
  while ((m = stringRegex.exec(line))) {
    matches.push(m[0]);
  }
  while ((m = attrRegex.exec(line))) {
    matches.push(m[3]);
  }
  while ((m = jsxTextRegex.exec(line))) {
    const text = m[0].slice(1, -1).trim();
    matches.push(text);
  }
  return matches;
}

async function processFile(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/^\s*import\s/.test(line)) return;
    if (/^\s*\/\//.test(line)) return;
    const found = extractStrings(line);
    found.forEach(text => {
      if (/[A-Za-z]{2,}/.test(text) && !/\.(js|ts|tsx|jsx)$/.test(text) && !text.includes('/')) {
        results.push({
          category: getCategory(filePath),
          file: path.relative(projectRoot, filePath),
          line: index + 1,
          text: text.replace(/[\n\r]/g, ''),
          context: line.trim()
        });
      }
    });
  });
}

function generateReport() {
  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(projectRoot, `localization-audit-${date}.md`);
  const grouped = results.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});
  const categories = ['client', 'server', 'config', 'database'];
  let md = `# Localization Audit - ${date}\n\n`;
  categories.forEach(cat => {
    const arr = grouped[cat] || [];
    if (!arr.length) return;
    md += `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
    arr.forEach(r => {
      md += `- **${r.file}:${r.line}** - \`${r.text}\`\n`;
      md += `  - ${r.context}\n`;
    });
    md += '\n';
  });
  // Statistics
  const total = results.length;
  md += '## Statistics\n';
  categories.forEach(cat => {
    const count = (grouped[cat] || []).length;
    md += `- ${cat}: ${count}\n`;
  });
  md += `- total: ${total}\n`;
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`Report written to ${outPath}`);
}

(async () => {
  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      await collectFiles(dir);
    }
  }
  generateReport();
})();
