import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const result=spawnSync(process.execPath,['--test','--test-reporter=tap','tests/core.test.mjs'],{encoding:'utf8'});
// Prevent runtime stack traces from publishing absolute workspace paths.
const sanitize=s=>s.replaceAll(process.cwd(),'[workspace]').replaceAll(process.cwd().replaceAll('\\','/'),'[workspace]');
writeFileSync('evidence/unit-tests.tap',sanitize(result.stdout||''));
writeFileSync('evidence/unit-tests.stderr.log',sanitize(result.stderr||''));
writeFileSync('evidence/unit-test-command.json',JSON.stringify({command:'node --test --test-reporter=tap tests/core.test.mjs',wrapper:'node scripts/test.mjs',exitCode:result.status},null,2)+'\n');
console.log(sanitize(result.stdout||''));
process.exitCode=result.status??1;
