import {DIMENSIONS,MAX_BYTES,validateScience,validateDocument,validateAccessions,parseImport,exportImport,makeJob,serializeJob} from './core.mjs';
const $=id=>document.getElementById(id);
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function status(id,message,error=false){$(id).textContent=message;$(id).classList.toggle('error',error);}
async function json(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('Snapshot unavailable');return response.json();}
const views=[...document.querySelectorAll('.view')];
function route(focus=false){const hash=location.hash.slice(1);const target=views.find(x=>x.id===hash)||$('overview');views.forEach(x=>x.hidden=x!==target);document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+target.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.title=`GenomeAtlas · ${target.querySelector('h1').textContent}`;if(focus)$('main').focus();}
addEventListener('hashchange',()=>route(true));route();
// Standard links and native controls support Tab, Enter, Space and browser history.
let registry;
function renderRegistry(){
 const query=$('tool-search').value.toLowerCase().trim(),dimension=$('dimension').value,state=$('state').value;
 const rows=registry.records.filter(row=>(row.name+' '+row.purpose+' '+row.notes).toLowerCase().includes(query)&&(state==='all'||(dimension==='all'?Object.values(row.states).includes(state):row.states[dimension]===state)));
 $('registry-cards').replaceChildren();
 for(const row of rows){const card=el('article',undefined,'card');card.append(el('h2',row.name),el('p',row.purpose));const badges=el('div',undefined,'states');for(const key of DIMENSIONS)badges.append(el('span',key+': '+row.states[key].replace('-',' '),'badge '+row.states[key]));card.append(badges,el('p',row.notes),el('p',row.evidenceIds.length?'Evidence: '+row.evidenceIds.join(' · '):'Evidence: none · not tested','evidence'));$('registry-cards').append(card);}
 status('registry-count',`${rows.length} of ${registry.records.length} tools shown. Unknown is not a negative result.`);
}
async function load(){
 try{validateScience(await json('data/science.json'));}catch{const warning=el('p','Scientific design contract unavailable or invalid. Do not treat these workflow instructions as validated.','notice error');warning.setAttribute('role','alert');$('overview').prepend(warning);$('chains').prepend(warning.cloneNode(true));}
 try{registry=validateDocument(await json('data/registry.json'));renderRegistry();['tool-search','dimension','state'].forEach(id=>$(id).addEventListener('input',renderRegistry));}catch{status('registry-count','Registry unavailable or invalid; all states unknown.',true);}
 try{const response=await fetch('sources/selected_accessions_stage1.txt');if(!response.ok)throw Error();const entries=validateAccessions(await response.text(),true);$('panel-check').textContent=`${entries.length} unique IDs validated · taxonomy not rechecked`;}catch{$('panel-check').textContent='Accession validation failed · inspect source';}
 try{const observations=await json('data/observations.json');for(const row of observations.records){const card=el('article',undefined,'card');card.append(el('h2',row.title),el('span','Parent-reported snapshot','badge'),el('p',row.summary),el('p',row.id+' · task handoff 2026-09-09 · original time not supplied','evidence'));$('probe-cards').append(card);}}catch{$('probe-cards').append(el('p','Parent observations unavailable. States unknown.'));}
 try{const manifest=await json('data/probe-manifest.json');status('local-probe-status',`${manifest.local.status.toUpperCase()}: ${manifest.local.reason}`);const local=await json('data/local-probes.json');if(local.claims){validateDocument(local.claims);$('local-probe-data').textContent=JSON.stringify({origin:'parent-supplied-file',verified:false,claims:local.claims},null,2);$('local-probe-data').hidden=false;}}catch{status('local-probe-status','UNKNOWN: no usable local probe snapshot.',true);}
 try{const manifest=await json('data/source-manifest.json');for(const source of manifest.sources){if(source.status!=='fetched')continue;const link=el('a',source.id+' · '+source.commit.slice(0,12));const url=new URL(source.url);if(url.protocol!=='https:'||url.hostname!=='github.com')continue;link.href=url.href;$('source-links').append(link);}}catch{$('source-links').append(el('p','Source manifest unavailable.'));}
}
await load();
let imported=null,job=null;
function resetImport(){imported=null;$('export-import').disabled=true;$('import-preview').hidden=true;$('import-preview').textContent='';}
function inspect(raw){resetImport();try{imported=parseImport(raw);$('import-preview').textContent=exportImport(imported);$('import-preview').hidden=false;$('export-import').disabled=false;status('import-status',`USER-SUPPLIED: ${imported.claims.records.length} claims validated for shape only. Verified: false. Registry unchanged.`);}catch(error){status('import-status',error.message,true);}}
$('validate-import').addEventListener('click',()=>inspect($('import-json').value));
$('import-file').addEventListener('change',async event=>{resetImport();const file=event.target.files[0];if(!file)return;if(file.size>MAX_BYTES){status('import-status','JSON exceeds 100,000 bytes',true);return;}try{inspect(await file.text());}catch{status('import-status','Unable to read supplied file',true);}});
$('clear-import').addEventListener('click',()=>{resetImport();$('import-json').value='';$('import-file').value='';status('import-status','No user-supplied document loaded.');});
function download(name,content){const blob=new Blob([content],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-import').addEventListener('click',()=>{if(imported)download('genomeatlas-user-supplied.json',exportImport(imported));});
$('job-form').addEventListener('input',()=>{job=null;$('prepared-job').hidden=true;status('job-status','Draft changed. Prepare again to export the current request.');});
$('job-form').addEventListener('submit',event=>{event.preventDefault();job=null;$('prepared-job').hidden=true;try{job=makeJob(Object.fromEntries(new FormData(event.target)));$('job-preview').textContent=serializeJob(job);$('prepared-job').hidden=false;status('job-status','Request prepared. Execution: not executed. Certification: false. Reviewer decision is user-supplied.');}catch(error){status('job-status',error.message,true);}});
$('download-job').addEventListener('click',()=>{if(job)download('genomeatlas-job-request.json',serializeJob(job));});
