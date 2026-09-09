import './core.test.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
test('independent Python contracts and build under the CI/WSL platform',()=>{
 const exe=process.platform==='win32'?'python':'python3';
 const r=spawnSync(exe,['-m','unittest','discover','-s','tests','-v'],{cwd:root,encoding:'utf8',timeout:90000});
 assert.equal(r.status,0,`${r.stdout}\n${r.stderr}`);
 console.log(r.stderr);
});
