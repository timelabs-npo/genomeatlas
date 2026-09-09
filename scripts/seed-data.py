"""Build original, sanitized registry content. Never inspect accounts or devices."""
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def write(name, data): (ROOT/'docs/data'/name).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
rows=[
 ('rdc','Remote Desktop Commander','Bounded device and terminal probes.','Exposed in this session. Parent reports Windows and Ubuntu responded; no broad device execution authorization.',['session-tools','parent-wd'],{'exposed':'yes','probed':'yes'}),
 ('github','GitHub / Copilot','Repository review and code assistance.','Local gh public metadata fetch executed. Parent reports WD gh authenticated and active org-admin verified. Copilot execution is not tested.',['local-gh','parent-gh'],{'exposed':'yes','installed':'yes','probed':'yes','executed':'yes'}),
 ('codex','Codex','Reviewable code implementation and bounded jobs.','Parent reports codex-cli 0.153.4 logged in using ChatGPT on WD. This workspace has no codex command on PATH; new persisted CLI session is not verified.',['parent-codex','session-tools'],{'exposed':'yes'}),
 ('wsl','WSL','Linux runtime boundary for scientific tools.','Parent reports Ubuntu responded and is WSL1, not WSL2. This says nothing about pipeline installation.',['parent-wsl'],{'installed':'yes','probed':'yes'}),
 ('datasets','NCBI Datasets','Versioned RefSeq metadata and genome packages.','Frozen accession text fetched through gh. No live Datasets CLI or genome download ran here.',['stage1-journal'],{}),
 ('gtotree','GToTree','Conserved single-copy marker workflow.','Host-tree chain; live marker extraction not tested.',[],{}),
 ('hmmer','HMMER','Profile-based conserved marker searches.','Retain marker identity; audit copy number and homology.',[],{}),
 ('mafft','MAFFT','Separate alignments for homologous markers.','Do not align all proteins as one homologous set.',[],{}),
 ('trimal','trimAl','Review alignment trimming per marker.','Retain pre/post lengths, masks and marker provenance.',[],{}),
 ('iqtree','IQ-TREE','Protein host-tree inference with support estimates.','No tree, model fit or bootstrap/support run executed here.',[],{}),
 ('defensefinder','DefenseFinder','Independent R-M candidate annotation.','Needs ordered per-replicon genes and matching GFF; candidates require review.',[],{}),
 ('rebase','REBASE','R-M curation reference.','Review source terms and cite record identities; no content bulk import.',[],{}),
 ('literature','Literature search','Find primary evidence for curated system claims.','Web and literature connectors exposed; no R-M literature search executed in this build.',['session-tools'],{'exposed':'yes'}),
 ('geneious','Geneious / iTOL','Sequence review and annotated figure presentation.','Figure layer only. Product access, license and execution remain unknown.',[],{}),
 ('bionemo','NVIDIA BioNeMo Agent Toolkit','Optional GPU/model workflow assistance.','Parent verified 0.1.0 plugin files and read genomics-workflow-acceleration and msa-search-nim skills on WD. No GPU/NIM job executed; not full readiness.',['parent-bionemo'],{'installed':'yes','probed':'yes','executed':'no'}),
 ('smarts','smarts.bio','Optional external scientific assistant.','Parent direct invocation returned user not logged in. Authentication blocked; scientific execution not established.',['parent-smarts'],{'exposed':'yes','authenticated':'blocked','probed':'yes','executed':'no'}),
 ('alphagenome','AlphaGenome','Optional regulatory-model investigation.','Not a replacement for bacterial host phylogeny or R-M review. Vendor terms remain separate; no model called.',[],{}),
 ('sites','Native ChatGPT Sites','Separate native helper delivery target.','Create, save and deploy tools exposed. Save requires source push; parent review hold prevents publication. No preview/version/deployment receipt exists.',['session-sites'],{'exposed':'yes','executed':'blocked'})
]
records=[]
for id,name,purpose,notes,evidence,states in rows:
    dimensions={key:'unknown' for key in ['exposed','installed','authenticated','probed','executed']}
    dimensions['executed']='not-tested'
    dimensions.update(states)
    records.append(dict(id=id,name=name,purpose=purpose,states=dimensions,evidenceIds=evidence,notes=notes))
write('registry.json',dict(schemaVersion=1,kind='registry',records=records))
observations=[
 ('parent-wd','Windows + Ubuntu','Both responded to parent probes. No private host identifiers published.'),
 ('parent-wsl','WSL generation','Ubuntu is WSL1, not WSL2.'),
 ('parent-gh','WD GitHub','gh authenticated; active org-admin verified by parent. No account IDs or tokens retained.'),
 ('parent-codex','WD Codex','codex-cli 0.153.4 logged in using ChatGPT, as reported by parent.'),
 ('parent-bionemo','BioNeMo 0.1.0','Plugin files verified; genomics-workflow-acceleration and msa-search-nim skills read. No GPU/NIM job executed.'),
 ('parent-smarts','smarts.bio','Direct invocation returned user not logged in. Authentication blocked.')
]
write('observations.json',{'source':'User task handoff, 2026-09-09','observedAt':None,'independentlyReprobed':False,'records':[dict(id=i,title=t,summary=s) for i,t,s in observations]})
write('import-example.json',{'schemaVersion':1,'kind':'probes','records':[{'id':'example-observation','toolId':'iqtree','observedAt':'2026-09-09T00:00:00Z','dimension':'executed','state':'not-tested','summary':'Example only. No run has been observed.'}]})
write('probe-manifest.json',{'handoff':{'source':'User task handoff dated 2026-09-09','originalObservedAt':None,'evidenceIds':[x[0] for x in observations],'trust':'parent-reported; not independently reprobed'},'local':{'status':'unknown','source':'public-probes.json','reason':'No snapshot synchronized yet'},'session':{'cwd':'genomeatlas-ops-20260909/repo','branch':'feat/site-helper-suite-20260909','initialCommit':'9b7c396f7f40efc9d7b943920affba47a366bb2b','sessionId':None,'newPersistedSession':'BLOCKED: no local codex command on PATH and no exposed Codex session creation API','resumed':False,'tools':['PowerShell exec','Node 24.19.0','Python 3.14.6','gh 2.96.0','CUA Chrome browser','native Sites create/save/deploy','Remote Desktop Commander'],'rg':'unavailable','sites':{'exposed':True,'status':'BLOCKED','missingCapability':None,'reason':'Save version requires a source push. User holds all pushes/publication for parent review.','version':None,'previewUrl':None,'deploymentReceipt':None}},'evidence':[{'id':'local-gh','scope':'Public repository visibility and five commit-pinned content fetches through gh','source':'data/source-manifest.json'},{'id':'session-tools','scope':'Tool metadata discovery in current session; exposure only'},{'id':'session-sites','scope':'sites_create_site, sites_save_site_version and deployment schemas discovered; no mutation called'}]})
