const fs = require('fs');
const { execFileSync } = require('child_process');

const path = 'app/add-balance.tsx';
const current = fs.readFileSync(path, 'utf8');
const original = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });
const marker = 'const styles = StyleSheet.create({';
const start = original.indexOf(marker);

if (start < 0 || current.includes(marker)) {
  throw new Error('Expected the original style block to exist and the current one to be missing.');
}

fs.writeFileSync(path, `${current.trimEnd()}\n\n${original.slice(start)}`);
