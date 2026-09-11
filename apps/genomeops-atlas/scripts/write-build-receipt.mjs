import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

function gitValue(args) {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { return null }
}
const status = gitValue(['status', '--porcelain'])
writeFileSync(new URL('../dist/build-receipt.json', import.meta.url), JSON.stringify({
  schema: 'genomeatlas.web-build/1',
  repository: 'https://github.com/timelabs-npo/genomeatlas',
  sourceCommit: gitValue(['rev-parse', 'HEAD']) ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  sourceTree: gitValue(['rev-parse', 'HEAD^{tree}']),
  workingTreeClean: status === null ? null : status.length === 0,
  builtAtUtc: new Date().toISOString(),
  evidenceSourceCommit: '50dc45fe790cb28f323d66382a4595ecd3a5234c',
  scope: 'Web application build identity; not scientific acceptance or a signature.',
}, null, 2) + '\n')
