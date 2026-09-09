import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8765/';
const checks=[];
async function check(path){const response=await fetch(new URL(path,base));assert.equal(response.status,200,path);checks.push({path,status:response.status,contentType:response.headers.get('content-type')});return response.text();}
let exitCode=0;
try{
 const html=await check('index.html');
 for(const path of new Set([...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(p=>!p.startsWith('http'))))await check(path);
 for(const path of ['core.mjs','data/observations.json','data/local-probes.json','data/journal-summaries.json','data/science.json'])await check(path);
 assert.ok(checks.filter(x=>x.path.endsWith('.mjs')).every(x=>/javascript/.test(x.contentType)),'Modules have JavaScript MIME');
 assert.ok(html.includes("form-action 'none'"),'CSP prevents form network submission');
 const response=await fetch(base+'../public-probes.json');assert.equal(response.status,404,'Parent input outside docs is not served');checks.push({path:'../public-probes.json',status:404,expected:'not served'});
}catch(error){exitCode=1;checks.push({failure:error.message.replaceAll(process.cwd(),'[workspace]')});}
const result={command:'node scripts/http-check.mjs',serverCommand:'python -m http.server 8765 --bind 127.0.0.1 --directory docs',scope:'HTTP response and asset checks only; NOT browser tests',exitCode,httpChecks:checks.filter(x=>x.status).length,additionalAssertions:['JavaScript module MIME types','CSP form-action restriction'],checks};
await writeFile('evidence/http-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=exitCode;
