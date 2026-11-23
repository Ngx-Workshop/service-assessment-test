import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';

const baseline = JSON.parse(
  await readFile(new URL('../.quality-baseline.json', import.meta.url), 'utf8')
);

if (process.argv[2] === 'lint') {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(['src/**/*.ts', 'test/**/*.ts']);
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) console.log(output);
  let failed = false;
  for (const result of results) {
    const path = result.filePath.slice(process.cwd().length + 1);
    const counts = {};
    for (const message of result.messages.filter((m) => m.severity === 2)) {
      const rule = message.ruleId ?? 'parser';
      counts[rule] = (counts[rule] ?? 0) + 1;
    }
    for (const [rule, count] of Object.entries(counts)) {
      if (count > (baseline.lint[path]?.[rule] ?? 0)) {
        console.error(`New lint errors: ${path} (${rule}: ${count})`);
        failed = true;
      }
    }
  }
  console.log(
    'Inherited lint diagnostics remain visible; lint:strict rejects all errors.'
  );
  process.exitCode = failed ? 1 : 0;
} else if (process.argv[2] === 'format') {
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (/\.(ts|js|mjs|json)$/.test(entry.name)) files.push(path);
    }
  }
  await collect('src');
  await collect('test');
  files.push(
    'package.json',
    '.prettierrc',
    'scripts/quality-check.mjs',
    'scripts/verify-maintenance.mjs',
    '.quality-baseline.json',
    '.github/workflows/check.yml',
    '.github/workflows/deploy.yml'
  );
  let failed = false;
  for (const path of files) {
    const info = await prettier.getFileInfo(path, {
      ignorePath: '.prettierignore',
    });
    if (info.ignored) continue;
    const source = await readFile(path, 'utf8');
    const hash = createHash('sha256').update(source).digest('hex');
    if (baseline.format[path] === hash) {
      console.log(`Unchanged inherited formatting: ${path}`);
      continue;
    }
    const options = await prettier.resolveConfig(path);
    if (!(await prettier.check(source, { ...options, filepath: path }))) {
      console.error(`Formatting violation: ${path}`);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
} else {
  throw new Error('Expected lint or format');
}
