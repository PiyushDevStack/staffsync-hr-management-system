import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const targets = ['src', 'tests', 'scripts'];
const files = [];
function visit(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}
for (const target of targets) visit(join(root, target));
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
