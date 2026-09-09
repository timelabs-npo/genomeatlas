import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createServer} from '../scripts/serve.mjs';

test('static server serves only public files, uses correct headers, and is read-only',async t=>{
  const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port,base=`http://127.0.0.1:${port}`;
  t.after(()=>{server.closeAllConnections();server.close();});
  await t.test('HTML and module MIME types',async()=>{const response=await fetch(base);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/);assert.match(await response.text(),/GenomeAtlas/);assert.match((await fetch(base+'/assets/app.js')).headers.get('content-type'),/javascript/);});
  await t.test('CSP disallows bridges and embedding',async()=>{const r=await fetch(base);assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');});
  await t.test('private and nonexistent paths rejected',async()=>{for(const p of ['/.git/config','/CODEX_TASK.md','/package.json','/tests/helpers.mjs','/missing.json','/%2e%2e%5cLICENSE','/%00'])assert.equal((await fetch(base+p)).status,404,p);});
  await t.test('encoded traversal rejected via raw HTTP request',async()=>{const status=await new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:'/%2e%2e/%2e%2e/.git/config'},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(status,404);});
  await t.test('POST cannot write and HEAD has no body',async()=>{assert.equal((await fetch(base,{method:'POST',body:'SYNTHETIC'})).status,405);const r=await fetch(base,{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');});
  await t.test('registry and schemas parse',async()=>{for(const p of ['/data/registry.json','/schemas/plan.schema.json','/schemas/receipt.schema.json']){const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(typeof await r.json(),'object');}});
});
test('subdirectory mount redirects, serves assets, and rejects paths outside prefix',async t=>{
  const server=createServer(undefined,'/GenomeAtlas');server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  t.after(()=>{server.closeAllConnections();server.close();});
  const redirect=await fetch(base+'/GenomeAtlas',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/GenomeAtlas/');
  for(const p of ['/GenomeAtlas/','/GenomeAtlas/assets/app.js','/GenomeAtlas/data/registry.json'])assert.equal((await fetch(base+p)).status,200);
  for(const p of ['/','/assets/app.js','/GenomeAtlasOther/','/GenomeAtlas/%2e%2e/.git/config'])assert.equal((await fetch(base+p)).status,404);
});
