import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const [command, distDir, ...extraArgs] = process.argv.slice(2);

if (!command || !distDir) {
  console.error('Usage: node scripts/run-next.mjs <command> <distDir> [...args]');
  process.exit(1);
}

const nextBin = resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
