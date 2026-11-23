/**
 * Checks every service for every game and writes public/status.json.
 * Reads API keys from environment variables (see .env.example). Run: npm run status
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GAMES } from '../src/data/games.ts';
import { checkAll } from '../src/status/checks.ts';
import { coreChecks, gameLevel } from '../src/theme.ts';

// Minimal .env loader so `npm run status` works locally without extra deps.
const envFile = resolve('.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const out = resolve(process.argv[2] ?? 'public/status.json');
const report = await checkAll(GAMES, process.env);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');

for (const g of GAMES) {
  const core = Object.entries(coreChecks(report, g.id))
    .map(([k, s]) => `${k}:${s?.level ?? 'n/a'}`)
    .join('  ');
  console.log(`${g.id.padEnd(16)} light:${gameLevel(report, g.id).padEnd(8)} ${core}`);
}
console.log(`\nWrote ${out}`);
