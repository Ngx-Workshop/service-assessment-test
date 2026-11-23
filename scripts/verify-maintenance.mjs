import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'assessment-maintenance-'));
function run(cwd, command, args, env = {}, success = true) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: '', HUSKY: '', NODE_ENV: '', ...env },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (success) assert.equal(result.status, 0, result.stdout + result.stderr);
  else assert.notEqual(result.status, 0, 'Expected command to fail');
  return result.stdout;
}
async function fixture(name, git = false) {
  const path = join(temporary, name);
  await mkdir(join(path, '.husky'), { recursive: true });
  for (const file of [
    'package.json',
    'package-lock.json',
    '.prettierrc',
    '.prettierignore',
    '.husky/pre-commit',
  ]) {
    await copyFile(join(root, file), join(path, file));
  }
  if (git) {
    run(path, 'git', ['init', '--quiet']);
    run(path, 'git', ['config', 'user.name', 'Maintenance fixture']);
    run(path, 'git', ['config', 'user.email', 'fixture@example.invalid']);
    await writeFile(join(path, '.gitignore'), 'node_modules/\n');
  }
  return path;
}

try {
  const missingHook = await fixture('missing-hook-dependency', true);
  run(missingHook, 'npm', ['run', 'prepare'], {}, false);
  const local = await fixture('local', true);
  run(local, 'npm', ['ci', '--no-audit', '--no-fund']);
  assert.equal(
    run(local, 'git', ['config', '--get', 'core.hooksPath']).trim(),
    '.husky/_'
  );
  await mkdir(join(local, 'src'));
  const file = join(local, 'src/hook-fixture.ts');
  await writeFile(
    file,
    'export const staged = 1;\nexport const unstaged = 1;\n'
  );
  run(local, 'git', ['add', '.']);
  run(
    local,
    'git',
    [
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'Fixture baseline',
    ],
    { HUSKY: '0' }
  );
  await writeFile(file, 'export const staged=2;\nexport const unstaged = 1;\n');
  run(local, 'git', ['add', 'src/hook-fixture.ts']);
  await writeFile(file, 'export const staged=2;\nexport const unstaged = 2;\n');
  await writeFile(
    join(local, 'src/staged-fixture.ts'),
    'export const value={x:1};\n'
  );
  await mkdir(join(local, 'contracts'));
  const generated = '{"generated":true}';
  await writeFile(join(local, 'contracts/generated.json'), generated);
  run(local, 'git', ['add', 'contracts/generated.json']);
  run(local, 'git', ['add', 'src/staged-fixture.ts']);
  run(local, 'git', [
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'Format staged content',
  ]);
  assert.equal(
    run(local, 'git', ['show', 'HEAD:src/hook-fixture.ts']),
    'export const staged = 2;\nexport const unstaged = 1;\n'
  );
  assert.equal(
    await readFile(file, 'utf8'),
    'export const staged = 2;\nexport const unstaged = 2;\n'
  );
  assert.equal(
    run(local, 'git', ['show', 'HEAD:src/staged-fixture.ts']),
    'export const value = { x: 1 };\n'
  );
  assert.equal(
    run(local, 'git', ['show', 'HEAD:contracts/generated.json']),
    generated
  );
  const head = run(local, 'git', ['rev-parse', 'HEAD']);
  await writeFile(join(local, 'src/broken.ts'), 'export const = ;\n');
  run(local, 'git', ['add', 'src/broken.ts']);
  run(
    local,
    'git',
    ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Must fail'],
    {},
    false
  );
  assert.equal(run(local, 'git', ['rev-parse', 'HEAD']), head);
  assert.equal(
    await readFile(file, 'utf8'),
    'export const staged = 2;\nexport const unstaged = 2;\n'
  );
  console.log(
    'PASS: clean local install, staged formatting, partial staging, failing hook blocks commit'
  );

  await mkdir(join(local, 'scripts'));
  await mkdir(join(local, 'test'));
  await mkdir(join(local, '.github/workflows'), { recursive: true });
  await rm(join(local, 'src/broken.ts'));
  await copyFile(
    join(root, 'scripts/quality-check.mjs'),
    join(local, 'scripts/quality-check.mjs')
  );
  await writeFile(
    join(local, 'scripts/verify-maintenance.mjs'),
    'export {};\n'
  );
  await copyFile(
    join(root, '.github/workflows/check.yml'),
    join(local, '.github/workflows/check.yml')
  );
  await copyFile(
    join(root, '.github/workflows/deploy.yml'),
    join(local, '.github/workflows/deploy.yml')
  );
  await writeFile(
    join(local, '.quality-baseline.json'),
    JSON.stringify({ lint: {}, format: {} }, null, 2) + '\n'
  );
  run(local, 'npm', ['run', 'format:check']);
  const badlyFormatted = 'export const staged=2;\n';
  await writeFile(file, badlyFormatted);
  run(local, 'npm', ['run', 'format:check'], {}, false);
  assert.equal(await readFile(file, 'utf8'), badlyFormatted);
  await writeFile(
    join(local, 'eslint.config.mjs'),
    "import js from '@eslint/js';\nexport default [{ ...js.configs.recommended, files: ['**/*.ts'] }];\n"
  );
  await writeFile(file, 'unknownCall();\n');
  run(local, 'npm', ['run', 'lint:check'], {}, false);
  assert.equal(await readFile(file, 'utf8'), 'unknownCall();\n');
  const baselinePath = join(local, '.quality-baseline.json');
  const baseline = {
    lint: {},
    format: {
      'src/hook-fixture.ts': createHash('sha256')
        .update(badlyFormatted)
        .digest('hex'),
    },
  };
  await writeFile(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  await writeFile(file, badlyFormatted);
  run(local, 'npm', ['run', 'format:check']);
  await writeFile(file, 'export const staged=3;\n');
  run(local, 'npm', ['run', 'format:check'], {}, false);
  console.log(
    'PASS: CI lint/format reject violations without mutation; changed legacy formatting is not exempt'
  );

  for (const [name, git, args, env] of [
    ['ci', true, [], { CI: 'true' }],
    ['hooks-disabled', true, [], { HUSKY: '0' }],
    ['docker-package-only', false, [], {}],
    ['production', true, ['--omit=dev'], { NODE_ENV: 'production' }],
  ]) {
    const path = await fixture(name, git);
    if (name === 'docker-package-only') {
      await rm(join(path, '.husky'), { recursive: true });
      await rm(join(path, '.prettierrc'));
      await rm(join(path, '.prettierignore'));
    }
    run(path, 'npm', ['ci', '--no-audit', '--no-fund', ...args], env);
    if (git) run(path, 'git', ['config', '--get', 'core.hooksPath'], {}, false);
    console.log(`PASS: ${name} installation without hook setup`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
