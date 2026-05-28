const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

const targets = new Map([
  ['main', pkg.main],
  ['types', pkg.types],
]);

for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
  if (typeof target === 'string') {
    targets.set(`exports:${subpath}`, target);
    continue;
  }

  for (const [condition, conditionalTarget] of Object.entries(target)) {
    targets.set(`exports:${subpath}:${condition}`, conditionalTarget);
  }
}

const missing = [];
for (const [label, target] of targets) {
  if (typeof target !== 'string') {
    missing.push(`${label} is not a string target`);
    continue;
  }

  const targetPath = path.resolve(root, target);
  if (!fs.existsSync(targetPath)) {
    missing.push(`${label} -> ${target}`);
  }
}

if (missing.length > 0) {
  console.error('Package metadata points at missing files:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Verified ${targets.size} package entry points.`);
