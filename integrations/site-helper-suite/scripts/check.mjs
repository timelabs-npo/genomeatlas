import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../site/',import.meta.url));
let checked=0;const errors=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}if(!/\.(html|css|js|json|svg|md|txt)$/.test(file))continue;const text=await readFile(file,'utf8');checked++;if(file.endsWith('.json')){try{JSON.parse(text);}catch{errors.push(`${path.relative(root,file)}: invalid JSON`);}}for(const pattern of [/C:\\Users\\/i,/C:\/Users\//i,/\/home\/[a-z0-9_-]+/i,/gh[pousr]_[A-Za-z0-9]{20,}/,/sk-[A-Za-z0-9]{20,}/,/Bearer\s+[A-Za-z0-9._-]{15,}/,/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i])if(pattern.test(text))errors.push(`${path.relative(root,file)}: private-data pattern detected`);}}
await walk(root);
const html=await readFile(path.join(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const target=match[1];if(target.startsWith('#')||target.startsWith('https://'))continue;try{await readFile(path.join(root,target));}catch{errors.push(`Missing asset: ${target}`);}}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS: ${checked} public text files checked; JSON, linked assets, and bounded privacy patterns passed. This is not exhaustive data-loss prevention.`);
