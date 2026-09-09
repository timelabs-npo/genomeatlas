// Read-only with respect to the parent-owned file. Never promote imported claims.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseImport,parseParentSnapshot} from '../docs/core.mjs';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('docs/data/probe-manifest.json',root),'utf8'));
let snapshot;
try {
  const raw=await readFile(new URL('public-probes.json',root),'utf8');
  let claims;
  try { claims=parseImport(raw).claims; } catch { claims=parseParentSnapshot(raw); }
  if(claims.kind!=='probes') throw new Error('Parent snapshot must use a supported probes schema');
  snapshot={status:'supplied',origin:'parent-supplied-file',verified:false,claims};
  manifest.local={status:'supplied',source:'public-probes.json',sha256:createHash('sha256').update(raw).digest('hex'),verified:false,reason:'Validated shape only; not independently reprobed. No registry state promotion.'};
} catch(error) {
  const missing=error.code==='ENOENT';
  snapshot={status:missing?'unknown':'blocked',origin:'parent-supplied-file',verified:false,claims:null};
  manifest.local={status:snapshot.status,source:'public-probes.json',verified:false,reason:missing?'File absent at synchronization; states remain unknown.':'File rejected by strict schema or read failed. No content published.'};
}
await writeFile(new URL('docs/data/local-probes.json',root),JSON.stringify(snapshot,null,2)+'\n');
await writeFile(new URL('docs/data/probe-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.local,null,2));
