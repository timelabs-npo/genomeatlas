#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1];p=root/'docs/app.js';s=p.read_text()
needle='    const parsed = JSON.parse(text);'
replacement='''    if (typeof text !== "string" || text.length > 1000000) throw new Error("Receipt input too large or not text.");
    const parsed = JSON.parse(text);'''
assert needle in s;s=s.replace(needle,replacement)
s=s.replace('    const normalized = [];','    if (items.length > 200) throw new Error("Too many receipts.");\n    const knownTools = new Set(FALLBACK_DATA.registry.entries.map(x => x.id));\n    const normalized = [];')
s=s.replace('      normalized.push(normalizeImportedReceipt(item));','      if (!knownTools.has(item.toolId)) throw new Error("Unknown registry tool.");\n      normalized.push(normalizeImportedReceipt(item));')
s=s.replace('    let localProbes = safeStorageGet(STORAGE_KEYS.probes);','    const storedProbes = safeStorageGet(STORAGE_KEYS.probes);\n    let localProbes = (Array.isArray(storedProbes) ? storedProbes : []).filter(p => p && registryMap[p.toolId] && validateReceipt(p).valid).slice(0,200).map(normalizeImportedReceipt);')
s=s.replace('    let requests = safeStorageGet(STORAGE_KEYS.requests);','    const storedRequests = safeStorageGet(STORAGE_KEYS.requests);\n    let requests = (Array.isArray(storedRequests) ? storedRequests : []).filter(r => r && registryMap[r.toolId]).slice(0,200).map(r => ({...r,status:"REQUESTED",verified:false,execution:null}));')
p.write_text(s,encoding='utf-8')
p=root/'tests/app.test.js';s=p.read_text();assert "search: '87 tools'" in s;s=s.replace("search: '87 tools'","search: 'smarts.bio'");p.write_text(s,encoding='utf-8')
# Actual observed panel is public input metadata, never a completed genome analysis.
import urllib.request
url='https://raw.githubusercontent.com/serg-alexv/genomeops-atlas/0f139f96494e09ff0387d2b4979318288c6cf54e/analyses/lab-rm-phylogenomics/config/selected_accessions_stage1.txt'
try:
 b=urllib.request.urlopen(url,timeout=30).read();ids=b.decode().splitlines();assert len(ids)==177 and len(set(ids))==177;assert all(__import__('re').fullmatch(r'GCF_\d+\.\d+',x) for x in ids)
 (root/'docs/data/selected_accessions.txt').write_bytes(b)
 (root/'docs/data/panel_receipt.json').write_text(json.dumps({'schema':'genomeatlas-input-receipt-v1','source':url,'sha256':hashlib.sha256(b).hexdigest(),'count':177,'unique':177,'scope':'versioned source accessions only; no genome sequence or tree inferred'},indent=2)+'\n')
except Exception as e: raise SystemExit('Panel retrieval/identity audit failed: '+str(e))
(root/'docs/CHEATBOOK.md').write_text('''# GenomeAtlas cross-device cheatbook

The public Helper Suite creates delegation and confirmation packets; it cannot grant tool access or execute a privileged job. Imported claims always stay unverified.

## Windows endpoint
Use Remote Desktop Commander list_devices, then ping and commands with the selected explicit device ID. Do not publish that ID, user paths, tokens or raw session logs. Probe wsl --list --verbose before assuming WSL2. The current observed Ubuntu kernel is WSL1; no upgrade was performed.

## Repository and tests
`git clone https://github.com/timelabs-npo/genomeatlas.git`
`cd genomeatlas`
`node --test`
Browser QA: install Playwright as a local dev dependency, then `node scripts/browser_check.cjs`. The test starts and closes a loopback-only server and isolated browser contexts; it does not use a logged-in profile.

## Proposed biology workflow
Use the frozen 177-accession input in data/selected_accessions.txt. Obtain annotated genome/protein/CDS/GFF/GBFF packages through NCBI Datasets. Host tree: conserved single-copy marker families, independent family alignments, trimmed concatenation, IQ-TREE model/support, exact original protein IDs and sequences. R-M: per-replicon ordered proteins and genomic context, DefenseFinder locked models, REBASE and exact-strain literature review, then Type I/II-including-IIG/III/IV ring matrix. Raw hits are U until manually curated; failure is not absence.

## Optional GPU/model route
NVIDIA BioNeMo genomics-workflow-acceleration guidance is referenced, not a successful NIM call. Acceleration defaults off, CPU steps remain authoritative until A/B evidence exists, and no Parabricks replacement is invented for GToTree/IQ-TREE/DefenseFinder. AlphaGenome contributes input/provenance/retry practices only; human regulatory predictions do not infer this bacterial tree.

## smarts.bio
Workspace lookup succeeded. The advertised GC tool returned 404; this adapter is BLOCKED for that operation, not authenticated-and-working for all tools. Never substitute mental arithmetic for an executed provider result.

## Native ChatGPT Site
A real WD Codex session listed the owner Site; another attempted build was blocked before source synchronization. Saving a native version requires that Site repository HEAD. No native deployment URL is claimed. Native publication and GitHub hosting are distinct.

## Receipt templates
Use schemas/probe.schema.json. Provide exact scope, timestamp, tool ID, command/RPC result, artifact location and a real 64-hex SHA-256. A valid format is not validation of the evidence. The owner must rehash payloads and independently rerun acceptance tests before scientific acceptance or main merge.
''',encoding='utf-8')
print('Guardrails applied; 177 source accessions downloaded and checked.')
