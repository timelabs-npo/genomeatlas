import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Run from this directory so command arguments and evidence use relative paths.
const directory = fileURLToPath(new URL('.', import.meta.url));
const started = new Date().toISOString();
const runId = started.replace(/[:.]/g, '-');
const evidence = new URL(`./evidence/${runId}/`, import.meta.url);
mkdirSync(evidence, { recursive: true });
const args = ['--test', '--test-reporter=tap', 'receipt_validator.test.mjs'];
const run = spawnSync(process.execPath, args, {
  cwd: directory,
  encoding: 'buffer',
  timeout: 60000,
  maxBuffer: 8 * 1024 * 1024,
  windowsHide: true,
});
// Store the exact child-process byte streams, including failures. Never replace
// an earlier attempt; each run has its own timestamped evidence directory.
writeFileSync(new URL('stdout.log', evidence), run.stdout ?? Buffer.alloc(0));
writeFileSync(new URL('stderr.log', evidence), run.stderr ?? Buffer.alloc(0));
writeFileSync(new URL('exit-code.log', evidence), `${run.status === null ? 'null' : run.status}\n`);
const sources = ['receipt_validator.mjs', 'receipt_validator.test.mjs', 'run_tests.mjs'].map((path) => {
  const bytes = readFileSync(new URL(path, import.meta.url));
  return { path, sha256: createHash('sha256').update(bytes).digest('hex'), size_bytes: bytes.length };
});
const metadata = {
  endpoint_alias: 'WD',
  node_version: process.version,
  started_utc: started,
  completed_utc: new Date().toISOString(),
  command: ['node', ...args],
  exit_code: run.status,
  signal: run.signal,
  launch_error_code: run.error?.code ?? null,
  sources,
};
writeFileSync(new URL('run.json', evidence), JSON.stringify(metadata, null, 2) + '\n');
process.stdout.write(run.stdout ?? Buffer.alloc(0));
process.stderr.write(run.stderr ?? Buffer.alloc(0));
process.stdout.write(`Evidence: agent_review/evidence/${runId}/\n`);
process.exitCode = run.status === 0 && !run.error ? 0 : 1;
