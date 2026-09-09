// GenomeAtlas Site Helper Suite. Original MIT code; see LICENSE.
import rawSnapshot from './data.mjs';
import {deepFreeze, filterRegistry, previewImport, createRequest, normalizeInterval, safeFilename, MAX_IMPORT_BYTES} from './core.mjs';

const data = deepFreeze(rawSnapshot);
const main = document.querySelector('main');
const dialog = document.querySelector('#inspector');
const content = document.querySelector('#inspector-content');
const notice = document.querySelector('#notice');
const requests = [];
let pendingChain = 'panel';
let returnFocus;
let noticeTimer;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const badge = (text, tone = '') => el('span', {class:`badge ${tone}`}, text);
const para = text => el('p', {}, text);
const link = (text, href) => el('a', {href}, text);
const button = (text, action, secondary = false) => el('button', {type:'button', class:`button${secondary ? ' secondary' : ''}`, onClick:action}, text);
const sectionHead = (title, action) => el('div', {class:'section-head'}, el('h2', {}, title), action);
const field = (label, control) => el('div', {class:'form-row'}, el('label', {for:control.id}, label), control);
const jsonView = value => el('pre', {}, JSON.stringify(value, null, 2));
const option = (value, text) => el('option', {value}, text);
const facts = pairs => el('dl', {}, pairs.map(([label, value]) => el('div', {class:'fact-row'}, el('dt', {}, label), el('dd', {}, value))));
const callout = (text, warning = false) => el('div', {class:`callout${warning ? ' warning' : ''}`}, text);
const pageHeader = (number, title, description, label = 'REVIEW WORKSPACE') => el('div', {class:'page-header'},
  el('div', {}, el('p', {class:'eyebrow'}, `${number} / GENOMEATLAS`), el('h1', {}, title), para(description)), badge(label));

function announce(message) {
  notice.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ''; }, 6500);
}
function inspect(title, ...children) {
  returnFocus = document.activeElement;
  content.replaceChildren(el('p', {class:'eyebrow'}, 'RECORD INSPECTOR'), el('h2', {id:'inspector-title'}, title), ...children);
  dialog.showModal();
}
dialog.addEventListener('close', () => returnFocus?.isConnected && returnFocus.focus());
function download(value, kind) {
  const name = safeFilename(kind);
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = el('a', {href:url, download:name});
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Exported ${name}`);
}

const chainDetails = {
  panel:{steps:['Versioned RefSeq IDs', 'Check frozen selection', 'Reviewed accession set'],
    detail:'Keep accession versions and the original order. Metadata has not been refreshed. Taxonomic exclusion, including the no-Enterococcus rule, remains a review gate until independent metadata is available.',
    evidence:'Versioned accession manifest; duplicate report; independently verified taxonomy and selection rationale.'},
  download:{steps:['Batch NCBI request', 'Parse annotated files', 'Hashed file manifest'],
    detail:'Proposed batch acquisition of annotated assemblies with genome, protein, CDS, GFF and GBFF files. Parse the files and match exact accession sets; distinguish CDS suffixes before generic genome suffixes. No full genomes have been downloaded in this task.',
    evidence:'Acquisition receipt; per-file hashes; accession-set parity; parse checks; replicon-to-assembly map.'},
  markers:{steps:['Annotated proteomes', 'Conserved single-copy markers', 'Per-marker sequence sets'],
    detail:'Recover conserved single-copy markers with versioned marker definitions. Audit orthology, copy number, contamination and missingness before any alignment. Never invent a missing marker or accession.',
    evidence:'Marker/HMM versions and hashes; exact protein accessions; copy-number and missingness tables.'},
  tree:{steps:['Align each marker separately', 'Concatenate + partitions', 'IQ-TREE supports → Geneious'],
    detail:'Align each accepted marker separately, review alignment quality and trimming, then concatenate in a fixed taxon/marker order. Record IQ-TREE model, seed and support settings. Export tree, alignment and partitions for Geneious. The host tree is independent of RM calls; no topology is inferred here.',
    evidence:'Per-marker alignments; trimming logs; concatenation map; partition file; IQ-TREE support outputs; Geneious import check.'},
  rm:{steps:['Each replicon separately', 'DefenseFinder + raw components', 'Reviewed RM calls'],
    detail:'Run DefenseFinder independently per replicon with protein order and genomic context retained. Review raw components and complete system calls. A raw hit does not establish a curated partial system. Failed, unrun and incomplete analyses cannot become absence.',
    evidence:'Tool/database versions; per-replicon run receipts; raw component hits; system calls; reviewer decisions.'},
  evidence:{steps:['Exact strain + system', 'REBASE / primary literature', 'Evidence-linked interpretation'],
    detail:'Match the exact strain and system to primary literature. Record methylation evidence separately from restriction evidence. Related-strain evidence stays contextual; it cannot validate a different exact strain.',
    evidence:'Citation identifiers; exact-strain mapping; separate methylation/restriction evidence; review rationale.'},
  figure:{steps:['Accepted host tree + RM matrix', 'Four rings: I / II / III / IV', 'SVG / PDF / iTOL design'],
    detail:'Join a validated conserved-marker host tree to an independently reviewed RM matrix by exact accession. Type II includes IIG. Keep complete, reviewed partial, unreviewed, not detected, failed and unrun states distinct. These are figure specifications, not sample measurements.',
    evidence:'Validated join keys; tree provenance; matrix provenance; explicit state legend; final figure review.'},
  release:{steps:['Code + analysis receipts', 'Independent review gate', 'Version + actual publication receipt'],
    detail:'Separate code validation, scientific acceptance and publication. A local confirmation creates a request only. A native Sites URL requires an actual saved version and deployment receipt. Parent reviews and publishes; this task does not push, merge or deploy.',
    evidence:'Reviewed commit; input/output hashes; test evidence; explicit scientific acceptance; native deployment receipt if published.'}
};

function inspectChain(id, part = 'Chain') {
  const row = data.chains.find(item => item.id === id);
  const extra = chainDetails[id];
  inspect(row.title, badge(row.status, 'amber'), para(extra.detail), facts([
    ['Inspecting', part], ['Source input', row.input], ['Source output', row.output], ['Acceptance gate', row.gate], ['Required evidence', extra.evidence], ['Source', `data/chains.json · ${id}`]
  ]), button('Prepare task request', () => {pendingChain = id; dialog.close(); location.hash = '#workbench';}));
}
function flowNode(id, title, small, number) {
  return el('button', {type:'button', class:'flow-node', onClick:() => inspectChain(id, title), 'aria-label':`Inspect ${title}`},
    el('span', {class:'step'}, number || id.toUpperCase()), el('strong', {}, title), el('small', {}, small));
}
function scienceMap() {
  return el('div', {class:'science-map', 'aria-label':'Proposed scientific data chain. Host phylogeny and RM are separate branches.'},
    el('div', {class:'map-caption'}, el('span', {}, 'SCIENTIFIC CHAIN / SELECT ANY STEP TO INSPECT'), badge('PROPOSED · NOT EXECUTED', 'amber')),
    el('div', {class:'flow-row'}, flowNode('panel','Frozen panel','Versioned IDs · metadata not refreshed','01'), flowNode('download','Annotated genomes','Batch NCBI · accession & file checks','02')),
    el('div', {class:'branch-grid'},
      el('div', {class:'branch'}, el('p', {class:'fork-label'}, 'A / CONSERVED-MARKER HOST PHYLOGENY'),
        el('div', {class:'flow-row'}, flowNode('markers','Single-copy markers','Orthology · copy number · missingness','03'), flowNode('tree','Host tree','Separate alignments → concatenate → IQ-TREE / Geneious','04'))),
      el('div', {class:'branch'}, el('p', {class:'fork-label'}, 'B / INDEPENDENT RM CHARACTERIZATION'),
        el('div', {class:'flow-row'}, flowNode('rm','Per-replicon RM','DefenseFinder → raw component review','05'), flowNode('evidence','Exact-strain evidence','Methylation & restriction evidence','06')))),
    el('div', {class:'merge-line'}, 'Join reviewed outputs by exact accession. RM does not define the host tree.'),
    el('div', {class:'flow-row'}, flowNode('figure','Four RM rings','I · II (including IIG) · III · IV','07'), flowNode('release','Review & publication','Independent acceptance · real receipt','08')));
}

function overview() {
  const metrics = [[data.panel.length,'frozen accessions'],[data.registry.entries.length,'catalogued tools'],[data.chains.length,'proposed data chains'],[0,'accepted analysis receipts']];
  main.append(pageHeader('01','A clear path from data to evidence.','The frozen LAB panel, scientific workflow and tool inventory in one review workspace. Inspect the chain, check what is known, and prepare the next bounded request.'),
    el('div', {class:'metrics'}, metrics.map(([value, text]) => el('div', {class:'metric'}, el('strong', {}, value), el('span', {}, text)))),
    sectionHead('The research chain', link('Inspect all eight chains →','#chains')), scienceMap(),
    el('div', {class:'split'},
      el('section', {}, sectionHead('What the snapshot establishes'),
        el('ul', {class:'compact-list'},
          el('li', {}, el('strong', {}, 'Frozen identifiers, no refreshed taxonomy'), el('small', {}, '177 versioned accessions. Species and strain labels have not been inferred.')),
          el('li', {}, el('strong', {}, 'BioNeMo skill read by parent'), el('small', {}, 'Package0.1.0 manifest and relevant skills read · no inference executed.')),
          el('li', {}, el('strong', {}, 'smarts.bio authentication is required in the parent chat'), el('small', {}, 'Latest parent call required login. Earlier scoped discovery/404 records are retained; no analysis accepted.')))),
      el('section', {}, sectionHead('Evidence boundaries'),
        facts([['Catalogued','Listed capability only'],['Probed / authenticated','Scoped observations; supplied receipts are not reverified here'],['Executed','No biological execution receipts supplied'],['Accepted','No scientific acceptance receipts supplied']]))),
    callout('Native Sites provider confirms an active public GenomeAtlas URL (HTTP200). Saved version1 is documented; the read API did not expose explicit live-version binding. See Probe receipts.'),
    el('div', {class:'actions'}, link('Open delegation workbench →','#workbench'), link('Review source receipts →','#receipts')));
}

function authState(row) {
  if (row.status === 'AUTH_REQUIRED') return 'Required';
  if (row.status === 'AUTH_PROBED' || row.id === 'GitHub') return 'Parent-reported';
  return 'Not established';
}
function registry() {
  main.append(pageHeader('02','Tool registry','The complete supplied catalog. Filters describe the source snapshot; a probe flag does not establish authentication, execution or scientific acceptance.'));
  const query = el('input', {id:'tool-query', type:'search', placeholder:'Search name, layer or scope…'});
  const layer = el('select', {id:'tool-layer'}, option('','All layers'), [...new Set(data.registry.entries.map(row => row.layer))].map(value => option(value,value)));
  const status = el('select', {id:'tool-status'}, option('','All reported states'), [...new Set(data.registry.entries.map(row => row.status))].map(value => option(value,value)));
  const probed = el('select', {id:'tool-probed'}, option('','All probe flags'),option('true','Reported probed'),option('false','Not probed'));
  const count = el('p', {class:'count', id:'registry-count', 'aria-live':'polite'});
  const rows = el('tbody', {id:'registry-rows'});
  const empty = el('div', {class:'empty', hidden:true}, 'No tools match these filters. ', button('Clear filters', reset, true));
  const table = el('div', {class:'table-wrap'}, el('table', {}, el('caption', {}, 'Source: data/registry.json · select a tool to inspect the original record and scope.'),
    el('thead', {}, el('tr', {}, ['Tool / layer','Reported state','Probed','Authentication','Executed','Accepted'].map(title => el('th', {scope:'col'}, title)))), rows));
  function reset() {query.value = ''; layer.value = ''; status.value = ''; probed.value = ''; render(); query.focus();}
  function render() {
    const filtered = filterRegistry(data.registry.entries,{query:query.value,layer:layer.value,status:status.value,probed:probed.value});
    count.textContent = `${filtered.length} of ${data.registry.entries.length} tools · execution and acceptance columns refer to biological analysis`;
    rows.replaceChildren(...filtered.map(row => el('tr', {},
      el('td', {}, el('button', {type:'button', class:'text-button', onClick:() => inspectTool(row)}, row.id),el('span', {class:'scope'},row.layer)),
      el('td', {}, badge(row.status, row.status === 'AUTH_REQUIRED' ? 'amber' : '')),el('td', {},row.probed ? 'Yes¹' : 'No'),
      el('td', {},authState(row)),el('td', {},'No receipt'),el('td', {},'Not accepted'))));
    empty.hidden = !!filtered.length; table.hidden = !filtered.length;
  }
  [query,layer,status,probed].forEach(control => control.addEventListener(control === query ? 'input' : 'change',render));
  main.append(el('div', {class:'toolbar'}, el('div',{class:'search'},field('Search tools',query)),field('Layer',layer),field('Reported status',status),field('Probed flag',probed)),
    count,table,empty,para('¹ Probed is the supplied flag, which includes discovery attempts and skill reads. Scope matters; reported facts have not been independently re-probed by this website.'),
    callout('AlphaGenome is excluded from LAB host phylogeny. Its broad source-catalog scope is retained for provenance; only coordinate-validation and reproducible-configuration concepts are used here.'));
  render();
}
function inspectTool(row) {
  const special = row.id === 'AlphaGenome' ? 'Excluded from LAB host phylogeny. Concepts only; no API or inference executed.' : row.id === 'ChatGPT_Sites' ? 'Current session: native Sites tools are exposed, not invoked. This supersedes only the discovery observation, not the preserved source record.' : row.id === 'bionemo-agent-toolkit' ? 'Parent actually read genomics-workflow-acceleration v1.1.0. Skill use does not establish GPU readiness or inference.' : 'Catalog and probe scope are separate from scientific acceptance.';
  inspect(row.id, badge(row.status), para(special), facts([['Scope',row.scope],['Source probe flag',String(row.probed)],['Authentication',authState(row)],['Biology execution','No receipt'],['Scientific acceptance','Not accepted']]),
    el('details', {},el('summary', {},'Original source record'),jsonView(row)));
}

function chains() {
  main.append(pageHeader('03','Eight inspectable data chains','Inputs, transformations, expected artifacts and review gates. Every chain remains proposed: no actual analysis receipts were supplied.','PROPOSED · NOT EXECUTED'),
    el('nav', {class:'chain-nav','aria-label':'Jump to data chain'},data.chains.map((row,i) => link(`${String(i+1).padStart(2,'0')} ${row.title}`,`#chains/${row.id}`))));
  const list = el('div', {class:'stage-list'});
  for (const [index,row] of data.chains.entries()) {
    const extra = chainDetails[row.id];
    list.append(el('article', {class:'stage-card',id:`chain-${row.id}`},
      el('div',{class:'stage-heading'},el('span',{class:'stage-number'},String(index+1).padStart(2,'0')),el('div',{},el('h2',{},row.title),el('small',{class:'muted'},`${row.input} → ${row.output}`)),badge('PROPOSED','amber')),
      el('div',{class:'stage-pipeline','aria-label':`${row.title} diagram`},extra.steps.map((step,i) => flowNode(row.id,step,['Input','Transformation / review','Expected output'][i],String(i+1)))),
      el('p',{class:'stage-detail'},extra.detail),el('div',{class:'gate'},el('strong',{},'Acceptance gate / '),row.gate),
      el('div',{class:'actions'},button('Inspect evidence requirements',() => inspectChain(row.id),true),button('Prepare request',() => {pendingChain = row.id; location.hash = '#workbench';},true))));
  }
  main.append(list);
}

function genomes() {
  main.append(pageHeader('04','The frozen genome panel','177 unique, versioned RefSeq accessions from frozen_stage1. Metadata has not been refreshed; no species, strain or replicon names have been invented.','NOT_REFRESHED'));
  const query = el('input',{id:'genome-query',type:'search',placeholder:'Find a versioned accession…'});
  const count = el('p',{class:'count','aria-live':'polite',id:'genome-count'});
  const body = el('tbody',{id:'genome-rows'});
  function render() {
    const matches = data.panel.filter(row => row.accession.toLowerCase().includes(query.value.trim().toLowerCase()));
    count.textContent = `${matches.length} of ${data.panel.length} frozen accessions`;
    body.replaceChildren(...matches.map(row => el('tr',{},el('td',{class:'mono'},el('button',{type:'button',class:'text-button',onClick:() => inspect(row.accession,badge('NOT_REFRESHED','amber'),facts([['Source',row.source],['Metadata',row.metadata_status],['Species / strain','Not supplied'],['Analysis','Not executed']]),jsonView(row))},row.accession)),el('td',{},row.metadata_status),el('td',{},row.source),el('td',{},'Not supplied'))));
    if (!matches.length) body.append(el('tr',{},el('td',{colspan:4},'No accession matches. Clear the search to see the frozen panel.')));
  }
  query.addEventListener('input',render);
  main.append(el('div',{class:'toolbar'},el('div',{class:'search'},field('Search accession',query)),el('a',{href:'data/selected_accessions.txt',download:'genomeatlas-selected-accessions.txt',class:'button secondary'},'Export all IDs (.txt)')),
    callout('No Enterococcus is permitted. Because taxonomy is not supplied, this exclusion remains a scientific review gate; accession syntax checks do not verify taxonomy.'),count,
    el('div',{class:'table-wrap'},el('table',{},el('caption',{},'Original order retained · data/panel.json'),el('thead',{},el('tr',{},['Accession','Metadata','Provenance','Species / strain'].map(title => el('th',{scope:'col'},title)))),body)));
  render();
}

function cheatbook() {
  main.append(pageHeader('05','Workflow cheatbook','Practical handoff contracts for the proposed analysis. These notes define expected evidence; they do not claim that the tools or analyses have run.'),
    el('div',{class:'split'},el('section',{class:'panel'},el('h2',{},'From frozen IDs to reviewable artifacts'),data.chains.map(row => el('details',{},el('summary',{},row.title),para(chainDetails[row.id].detail),para(`Required evidence: ${chainDetails[row.id].evidence}`),button('Inspect chain',() => inspectChain(row.id),true)))),
    el('section',{},el('div',{class:'panel'},el('h2',{},'Four rings, explicit states'),el('div',{class:'rings'},['I','II · includes IIG','III','IV'].map(text => el('span',{class:'ring-label'},text))),
      para('Ring labels are a proposed figure specification. No taxon values or tree topology are shown.'),
      el('ul',{class:'compact-list'},[
        ['Complete','Reviewed complete system call.'],['Reviewed partial','Supported by raw-component review; never assigned directly from a raw hit.'],['Unreviewed','A candidate or component awaiting review.'],['Not detected','A successfully completed, adequate analysis with no accepted detection. White may encode this state only.'],['Failed / unrun / missing','Distinct states with explicit labels or hatching. Never white absence.']
      ].map(([title,text]) => el('li',{},el('strong',{},title),el('small',{},text))))),
      el('div',{class:'callout'},el('strong',{},'CPU remains the default.'),para('GPU acceleration is optional and off. Keep the CPU path. Compare the same inputs, reference and intervals in separate output locations; document versions, parameters and measured differences before claiming parity. No mapping or parity is presumed for these marker tools.'),link('NVIDIA BioNeMo workflow policy ↗','https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/blob/main/library-skills/genomics-workflow-acceleration/SKILL.md')))),
    sectionHead('Coordinate and configuration sanity check'),
    para('Local arithmetic only. AlphaGenome documents 0-based intervals and 1-based variant positions. We use that distinction as a validation concept; AlphaGenome is not part of LAB host phylogeny. Reference identity, sequence bounds and alleles still require independently checked sequence data.'),
    coordinateForm(),
    el('p',{class:'note-line'},link('AlphaGenome coordinate definitions ↗','https://github.com/google-deepmind/alphagenome/blob/main/src/alphagenome/data/genome.py'),' · ',link('AlphaGenome reproducible API configuration ↗','https://github.com/google-deepmind/alphagenome/blob/main/src/alphagenome/models/dna_client.py')),
    callout('Reproducible configuration: retain exact reference accession and hash, coordinate convention, tool/database/model versions where applicable, output selections, parameters and random seed. This is a local reproducibility policy informed by the linked API concepts; it is not evidence of an AlphaGenome run.'));
}
function coordinateForm() {
  const start = el('input',{id:'coord-start',type:'number',step:1,min:0,required:true,placeholder:'Start'});
  const end = el('input',{id:'coord-end',type:'number',step:1,min:1,required:true,placeholder:'End'});
  const length = el('input',{id:'coord-length',type:'number',step:1,min:1,required:true,placeholder:'Replicon length'});
  const convention = el('select',{id:'coord-convention'},option('zero','0-based, half-open [start, end)'),option('one','1-based, inclusive [start, end]'));
  const output = el('div',{class:'coordinate-output','aria-live':'polite',id:'coordinate-output'});
  const form = el('form',{id:'coordinate-form',class:'panel',onSubmit:event => {
    event.preventDefault();
    try {
      const normalized = normalizeInterval(Number(start.value),Number(end.value),Number(length.value),convention.value);
      output.replaceChildren(badge('LOCAL ARITHMETIC VALID','teal'),para(`[${normalized.start}, ${normalized.end}) · ${normalized.length} bases. Reference and alleles NOT_VERIFIED.`),button('Export coordinate preview',() => download({state:'ARITHMETIC_ONLY_REFERENCE_UNVERIFIED',...normalized},'config'),true));
    } catch(error) {output.replaceChildren(el('p',{class:'error'},error.message));}
  }},field('Input coordinate convention',convention),el('div',{class:'form-grid'},field('Start',start),field('End',end),field('Replicon length (provided by you)',length)),
  el('div',{class:'actions'},el('button',{type:'submit',class:'button'},'Validate interval'),button('Load synthetic example',() => {start.value = '1';end.value = '10';length.value = '100';convention.value = 'one';output.replaceChildren(para('SYNTHETIC EXAMPLE · fabricated numbers for arithmetic testing only.'));},true)),output);
  for (const input of [start,end,length,convention]) input.addEventListener('input',() => output.replaceChildren());
  return form;
}

function workbench() {
  main.append(pageHeader('06','Delegation workbench','Prepare a bounded task for a reviewer or future execution environment. A local confirmation records intent only. Requests remain in this tab until exported.','REQUESTS ONLY'),
    el('div',{class:'role-grid'},[['BUILD','Prepare artifacts and record their provenance.'],['VERIFY','Independently check inputs, outputs and claims; veto unsupported results.'],['DOC','Explain methods, limitations and evidence gaps.'],['CUT','Parent integrates and publishes only after review.']].map(([role,text]) => el('div',{},el('strong',{},role),para(text)))));
  const chain = el('select',{id:'request-chain'},data.chains.map(row => option(row.id,row.title)));chain.value = pendingChain;
  const role = el('select',{id:'request-role'},['VERIFY','BUILD','DOC','CUT'].map(value => option(value,value)));
  const endpoint = el('select',{id:'request-endpoint'},option('review-queue','Review queue (alias)'),option('local-cpu','Local CPU (alias)'));
  const scope = el('select',{id:'request-scope'},option('all',`All ${data.panel.length} frozen accessions`),data.panel.map(row => option(row.accession,row.accession)));
  const confirm = el('input',{id:'request-confirm',type:'checkbox',required:true});
  const submit = el('button',{type:'submit',class:'button',id:'create-request',disabled:true},'Create task request');
  const requirements = el('div',{class:'gate',id:'request-requirements'});
  const result = el('div',{id:'request-result','aria-live':'polite'});
  const queue = el('div',{id:'request-queue'});
  function describe() {requirements.textContent = `Review prerequisite: ${chainDetails[chain.value].evidence}`;confirm.checked = false;submit.disabled = true;result.replaceChildren();}
  confirm.addEventListener('change',() => {submit.disabled = !confirm.checked;});
  [chain,role,endpoint,scope].forEach(control => control.addEventListener('change',describe));
  function renderQueue() {
    queue.replaceChildren(el('h2',{},`Local requests (${requests.length})`),para('No job has been queued or executed on a remote endpoint. Reloading clears these requests. Export any request you need to keep.'));
    if (!requests.length) queue.append(el('p',{class:'empty'},'No local task requests yet.'));
    for (const request of requests) queue.append(el('details',{},el('summary',{},`${request.role} · ${request.chain_id} · ${request.genome_accessions.length} accession(s)`),badge('TASK_REQUEST_ONLY','amber'),jsonView(request),button('Export request JSON',() => download(request,'request'),true)));
  }
  const form = el('form',{id:'request-form',class:'panel',onSubmit:event => {
    event.preventDefault();if(!confirm.checked) return;
    try {
      if (requests.length >= 20) throw new Error('This tab holds at most 20 requests. Export and clear the local queue before adding more.');
      const request = createRequest({chain:chain.value,role:role.value,endpoint:endpoint.value,accessions:scope.value === 'all' ? data.panel.map(row => row.accession) : [scope.value]},data);
      requests.unshift(request);confirm.checked = false;submit.disabled = true;
      result.replaceChildren(callout('Task request created locally. Execution: NOT_EXECUTED. Scientific acceptance: NOT_ACCEPTED.'),button('Export this request',() => download(request,'request'),true));
      renderQueue();announce('Local task request created. No execution occurred.');
    } catch(error) {result.replaceChildren(el('p',{class:'error'},error.message));}
  }},el('h2',{},'Prepare a handoff'),el('div',{class:'form-grid'},field('Data chain',chain),field('Responsible role',role),field('Endpoint alias',endpoint),field('Frozen accession scope',scope)),
    facts([['Compute','CPU default · optional GPU disabled'],['Runtime','No execution service connected'],['Acceptance','Independent review required']]),requirements,
    el('label',{class:'check-label',for:'request-confirm'},confirm,'I confirm the scope above and understand this creates a task request only.'),
    el('div',{class:'actions'},submit,el('button',{type:'button',class:'button secondary',disabled:true,'aria-describedby':'execute-prerequisite'},'Execute unavailable')),
    el('p',{class:'note-line',id:'execute-prerequisite'},'Requires a separately authorized execution service, authenticated endpoint and verified prerequisites. This static site has no execution route.'),result);
  main.append(form,sectionHead('Review handoffs',button('Clear local queue',() => {requests.length = 0;renderQueue();result.replaceChildren();announce('Local requests cleared.');},true)),queue);
  describe();renderQueue();
}

function receipts() {
  main.append(sectionHead('Current parent rechecks'),callout('Software/connectivity only. No accepted biological tree or RM matrix.'),jsonView(data.live));
  main.append(pageHeader('07','Probe receipts','Read the actual supplied records and their limits. A reported PASS is scoped to that operation; it is never a biological acceptance or deployment receipt.','SOURCE CLAIMS'),
    callout('The supplied legacy receipts do not include UTC timestamps, command identifiers, input/output hashes and redaction declarations required by the new schema. They remain UNVERIFIED_PARENT_RECEIPT in this workspace.',true));
  for (const receipt of data.probes.receipts) main.append(el('article',{class:'stage-card'},
    el('div',{class:'section-head'},el('h2',{},receipt.id),badge(`REPORTED ${receipt.status}`,receipt.status === 'AUTH_REQUIRED' ? 'amber' : '')),
    facts([['Scope',receipt.scope],['Verification','UNVERIFIED_PARENT_RECEIPT'],['Biological execution','Not established'],['Scientific acceptance','Not established']]),
    el('details',{},el('summary',{},'Inspect original supplied receipt'),jsonView(receipt))));
  main.append(sectionHead('Native Sites discovery · this session'),el('div',{class:'panel'},badge(data.native.status,'teal'),
    facts([['Observation UTC',data.native.observed_at_utc],['Method',data.native.discovery_method],['Authentication',data.native.authentication],['Execution',data.native.execution],['Deployment',data.native.deployment],['Site ID',data.native.site_id || 'Not returned'],['Saved version ID',data.native.version_id || 'Not returned'],['Session ID',data.native.session_id || 'Not returned']]),
    para('Native Site read actions returned an active public URL and saved version. The original write attempt hit an existing slug; no duplicate was created. Source acceptance and live-version binding remain separate.'),
    el('details',{},el('summary',{},`Inspect ${data.native.native_tools.length} exposed native tool names`),el('ul',{class:'compact-list'},data.native.native_tools.map(name => el('li',{class:'mono'},name)))),
    callout('If native tools are absent in a future session, native action must remain BLOCKED_NATIVE_SITE_ACTION. GitHub Pages is not a native ChatGPT Site.')),
    el('div',{class:'actions'},link('Prepare or inspect a receipt template →','#exchange')));
}

function exchange() {
  main.append(pageHeader('08','Import & export','Download the original data or a clearly labelled template. Imported JSON is quarantined for local inspection; it cannot change registry truth, create a PASS state, execute work or publish a site.'));
  const exports = [
    ['Registry',`${data.registry.entries.length} supplied entries`,'data/registry.json','genomeatlas-registry.json'],['Frozen panel','177 IDs · metadata not refreshed','data/panel.json','genomeatlas-panel.json'],
    ['Data chains','Eight proposed contracts','data/chains.json','genomeatlas-chains.json'],['Source probe receipts','Legacy parent-reported claims','data/probes.json','genomeatlas-source-probes.json'],
    ['Plugin cache','71 observed manifests / 344 skills; not runtime readiness','data/plugin-cache.json','genomeatlas-plugin-cache.json'],['Current probe records','Actual endpoint-scoped observations','data/current-probes.json','genomeatlas-current-probes.json'],['Native Site provider readback','Real read actions; explicit deployment-ID limitation','data/native-site-readback.json','genomeatlas-native-site-readback.json'],['Copilot re-execution','10 inventory tests independently rerun on Ubuntu','data/copilot-reexecution.json','genomeatlas-copilot-reexecution.json'],
    ['Task request template','Intent only · example timestamp','templates/task-request.json','genomeatlas-task-template.json'],['Synthetic probe template','Placeholder hashes · NOT_TESTED','templates/probe-result.synthetic.json','genomeatlas-probe-template.synthetic.json'],
    ['Task-request schema','JSON Schema 2020-12','schemas/task-request.schema.json','genomeatlas-task-request.schema.json'],['Probe-result schema','JSON Schema 2020-12','schemas/probe-result.schema.json','genomeatlas-probe-result.schema.json'],
    ['Reproducible configuration','Concept template · no execution','templates/reproducible-config.json','genomeatlas-reproducible-config.json']];
  main.append(el('div',{class:'export-list'},exports.map(([title,description,href,name]) => el('div',{class:'export-item'},el('div',{},el('strong',{},title),el('small',{},description)),el('a',{href,download:name,class:'button secondary small'},'Download')))),
    sectionHead('Quarantined preview'),para('Accepts task requests, probe results and unchanged exported source snapshots. Schema validation checks structure, not the existence or correctness of hashed artifacts. The configuration concept template is reference material, not an import format. Maximum 256 KiB.'));
  const text = el('textarea',{id:'import-json',spellcheck:false,placeholder:'Paste JSON to inspect locally…','aria-describedby':'import-guidance'});
  const file = el('input',{id:'import-file',type:'file',accept:'.json,application/json'});
  const output = el('div',{id:'import-result','aria-live':'polite'});
  const preview = el('pre',{id:'import-preview',hidden:true});
  let staged;
  const exportButton = button('Export unverified preview',() => staged && download(staged,'preview'),true);exportButton.disabled = true;
  const clear = () => {staged = undefined;preview.hidden = true;preview.textContent = '';output.replaceChildren();exportButton.disabled = true;};
  text.addEventListener('input',clear);
  file.addEventListener('change',async () => {
    clear();const selected = file.files[0];if (!selected) return;
    if (selected.size > MAX_IMPORT_BYTES) {output.replaceChildren(el('p',{class:'error'},'Maximum import size is 256 KiB.'));file.value = '';return;}
    try {text.value = await selected.text();output.replaceChildren(para('File loaded locally. Select Validate & preview to inspect it.'));}
    catch {output.replaceChildren(el('p',{class:'error'},'Could not read this file.'));}
  });
  main.append(el('section',{class:'panel'},el('p',{id:'import-guidance',class:'note-line'},'Use endpoint aliases only. Do not paste tokens, private paths or personal metadata. File names are not used for export paths. Nothing leaves this tab.'),
    field('Load a JSON file',file),field('JSON source',text),
    el('div',{class:'actions'},button('Validate & preview',() => {
      clear();try {staged = previewImport(text.value,data);output.replaceChildren(badge('UNVERIFIED · PREVIEW ONLY','amber'),para(`${staged.kind}. Structure accepted for inspection. No actual probe, job or deployment state changed.`));preview.textContent = JSON.stringify(staged.value,null,2);preview.hidden = false;exportButton.disabled = false;}
      catch(error) {output.replaceChildren(el('p',{class:'error'},error.message));}
    }),exportButton,button('Clear preview',() => {text.value = '';file.value = '';clear();},true)),output,preview),
    el('details',{},el('summary',{},'Source SHA-256 manifest'),para('Hashes computed by the local build from the supplied files. An import cannot change this manifest.'),jsonView(data.manifest)));
}

const views = {overview,registry,chains,genomes,cheatbook,workbench,receipts,exchange};
function renderRoute() {
  const [candidate,detail] = location.hash.slice(1).split('/');
  const name = Object.hasOwn(views,candidate) ? candidate : 'overview';
  if (dialog.open) dialog.close();
  main.replaceChildren(); views[name]();
  for (const navLink of document.querySelectorAll('.sidebar nav a')) {
    if (navLink.hash === `#${name}`) navLink.setAttribute('aria-current','page');
    else navLink.removeAttribute('aria-current');
  }
  document.title = `${{overview:'Overview',registry:'Tool registry',chains:'Data chains',genomes:'Frozen genomes',cheatbook:'Workflow cheatbook',workbench:'Delegation workbench',receipts:'Probe receipts',exchange:'Import & export'}[name]} · GenomeAtlas`;
  main.focus({preventScroll:true});
  if (name === 'chains' && data.chains.some(row => row.id === detail)) document.getElementById(`chain-${detail}`).scrollIntoView();
  else window.scrollTo(0,0);
}
document.querySelector('#nav-tools').textContent = data.registry.entries.length;
document.querySelector('#nav-genomes').textContent = data.panel.length;
window.addEventListener('hashchange',renderRoute);
renderRoute();
