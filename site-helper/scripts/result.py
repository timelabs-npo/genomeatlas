"""Assemble a review handoff from existing real test receipts. Runs no tests."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def result():
    checks = read('evidence/checks-latest.json')
    native = read('evidence/native-tools.json')
    package = read('evidence/static-package.json')
    browser = read('evidence/browser-access.json')
    compatibility = read('evidence/compatibility-observation.json')
    branch_result = subprocess.run(['git','branch','--show-current'],cwd=ROOT,capture_output=True,text=True,check=True)
    branch = branch_result.stdout.strip()
    if branch != 'codex/site-helper-94c65b1d':
        raise ValueError('Unexpected active branch')
    files = ['index.html','.gitignore','IMPLEMENTATION.md','THIRD_PARTY_NOTICES.md']
    for directory in ['assets','schemas','templates','scripts','tests']:
        files.extend(file.relative_to(ROOT).as_posix() for file in (ROOT / directory).iterdir() if file.is_file())
    file_records = [{'path':name,'sha256':hashlib.sha256((ROOT / name).read_bytes()).hexdigest()} for name in sorted(files)]
    sources = read('dist/manifest.json')
    python_test = next(record for record in checks['records'] if record['command'][1:3] == ['-m','unittest'])
    js_test = next(record for record in checks['records'] if record['command'][1:2] == ['--test'])
    python_count = int(re.search(r'Ran (\d+) tests',python_test['stderr'])[1])
    js_count = int(re.search(r'tests (\d+)',js_test['stdout'])[1])
    output = {
        'schema':'genomeatlas.codex-result/1',
        'generated_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),
        'status':'IMPLEMENTED_WITH_VERIFICATION_BLOCKERS','branch':branch,'session_id':None,
        'session_id_note':'No real Codex session ID was exposed to this task. Worktree/run names are not session receipts.',
        'git_actions':{'branch_preexisted':True,'committed':False,'pushed':False,'merged':False,'deployed':False},
        'code_files':file_records,
        'source_data':{'registry_entries':len(read('data/registry.json')['entries']),'frozen_genome_ids':len(read('data/panel.json')),
                       'chains':len(read('data/chains.json')),'input_sha256':{key:value for key,value in sources.items() if key.startswith('data/')},
                       'metadata_status':'NOT_REFRESHED','biological_status':'PROPOSED_NOT_EXECUTED'},
        'views':['Overview/status','Full searchable registry with layer/status/probed filters','Eight inspectable data-chain diagrams',
                 'Frozen accession search and export','Workflow cheatbook and local coordinate arithmetic','Delegation/confirmation task requests',
                 'Source probe receipts and separate native-tool discovery','Schema-bound import preview and original-data/template exports'],
        'tests':{'latest_non_browser_status':checks['status'],'python_tests':python_count,'javascript_tests':js_count,
                 'synthetic_scope':'Synthetic fixtures are explicitly labelled; PASS here is code verification, never a biology/probe result.',
                 'executed_commands':checks['records'],'full_history':sorted(file.relative_to(ROOT).as_posix() for file in (ROOT / 'evidence').glob('checks-*.json'))},
        'observed_tool_availability':native,'browser':browser,'compatibility':compatibility,'static_package':package,
        'blockers':[
            {'code':'BLOCKED_BROWSER_ACCESS','scope':'Browser smoke and screenshots','reason':'Two isolated Chrome GPU-process crashes, then connected-browser policy denied local-preview access. No further browser attempts after denial.'},
            {'code':'BLOCKED_WSL_ACCESS','scope':'Ubuntu/WSL runtime validation','reason':'wsl.exe reported Wsl/Service/E_ACCESSDENIED.'}],
        'native_site_action':'AVAILABLE_NOT_INVOKED_LOCAL_ONLY_USER_INSTRUCTION',
        'native_missing_fallback':'BLOCKED_NATIVE_SITE_ACTION applies if a future session exposes no native Sites tools; it is not this session\'s observation.',
        'screenshots':[],
        'not_tested':['Browser rendering and interactive smoke checks','Mobile layout and keyboard interactions in a browser',
                      'Browser download and file-upload behavior','Screen-reader/WCAG audit','Ubuntu/WSL execution',
                      'Native Sites authentication, provisioning, archive compatibility, save and deployment',
                      'Actual endpoint re-probes or supplied-receipt hash verification','Genome acquisition or metadata refresh',
                      'Taxonomic exclusion verification','Conserved-marker extraction, alignment, IQ-TREE or Geneious',
                      'Per-replicon DefenseFinder and raw-component scientific review','Exact-strain literature verification',
                      'Scientific acceptance and phylogenetic topology','GPU readiness, GPU/CPU parity, AlphaGenome or other paid inference'],
        'official_sources_read':[
            {'url':'https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit','purpose':'Catalog and dual-license statement'},
            {'url':'https://raw.githubusercontent.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/main/library-skills/genomics-workflow-acceleration/SKILL.md','purpose':'v1.1.0; optional default-off GPU path; no unmeasured parity claims'},
            {'url':'https://github.com/google-deepmind/alphagenome','purpose':'API scope and Apache-2.0 license'},
            {'url':'https://raw.githubusercontent.com/google-deepmind/alphagenome/main/src/alphagenome/data/genome.py','purpose':'Interval and variant coordinate conventions'},
            {'url':'https://raw.githubusercontent.com/google-deepmind/alphagenome/main/src/alphagenome/models/dna_client.py','purpose':'Versioned model/client configuration concepts'},
            {'url':'https://learn.chatgpt.com/docs/sites','purpose':'Native Sites project/version/deployment distinction'}],
        'documentation_read_limits':'Two alphagenomedocs.com pages returned Internal Error; official repository definitions were read instead. Links to main are mutable, not pinned executed configurations.',
        'parent_handoff':'Review and integrate local worktree changes. No publishing is authorized in this task. Browser and Ubuntu checks remain open.',
    }
    (ROOT / 'evidence/codex-result.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    test_rows = '\n'.join('| `'+' '.join(record['command'])+'` | '+str(record['exit_code'])+' | ['+record['stdout_path'].split('/')[-1]+']('+record['stdout_path']+') / [stderr]('+record['stderr_path']+') |' for record in checks['records'])
    text = f'''# CODEX_RESULT

Implemented the GenomeAtlas Site Helper Suite on `{branch}`.
Status: **IMPLEMENTED_WITH_VERIFICATION_BLOCKERS**. Source code and the static
package are ready for parent review. No commit, push, merge or deployment was
performed. The branch already existed. Original README, MIT LICENSE, AGENTS.md
and supplied data remain unchanged.

## Implementation

- [index.html](index.html), [CSS](assets/styles.css), [application](assets/app.mjs),
  [validation and pure logic](assets/core.mjs), and generated [data module](assets/data.mjs).
- Eight native-text views: overview; complete registry with intersecting filters;
  eight clickable chain diagrams; 177 frozen genome IDs; workflow cheatbook;
  request-only delegation workbench; probe receipts; safe import/export.
- Navy/teal editorial layout, left navigation, responsive CSS, keyboard focus
  styles, native dialog/form semantics and reduced-motion support. Rendering and
  keyboard behavior were not verified in a browser due to the blocker below.
- [Task-request schema](schemas/task-request.schema.json),
  [probe-result schema](schemas/probe-result.schema.json) and labelled templates.
  Import is size/depth bounded and quarantined. No execution or deployment route
  exists. Imported claims never change actual source records.
- [Build](scripts/build.py), [loopback preview](scripts/serve.py),
  [checks](scripts/check.py), [browser smoke harness](scripts/browser-smoke.mjs),
  [packaging](scripts/package.py), [implementation notes](IMPLEMENTATION.md).
- [Third-party notices](THIRD_PARTY_NOTICES.md) link the official NVIDIA and
  AlphaGenome references with separate licenses. No third-party source or docs
  were vendored under MIT.

## Scientific boundaries

The {output['source_data']['registry_entries']} registry entries, {output['source_data']['frozen_genome_ids']} frozen IDs and {output['source_data']['chains']} chains use actual
supplied data. Metadata is NOT_REFRESHED; species are not invented. Every
biological chain remains PROPOSED_NOT_EXECUTED: batch NCBI annotated genomes →
conserved single-copy markers → separate marker alignments → concatenation →
IQ-TREE supports/Geneious. Independent per-replicon DefenseFinder → raw component
review → exact-strain literature → I / II (including IIG) / III / IV rings.
RM never determines the host tree. No Enterococcus is permitted; exclusion is
not claimed verified from IDs alone. Failed and unrun analyses never become
white/not-detected.

smarts.bio is AUTH_REQUIRED. The parent actually read BioNeMo
genomics-workflow-acceleration v1.1.0; no inference executed. CPU remains default.
GPU parity is a future comparison requirement, not a result. AlphaGenome supplies
coordinate/configuration concepts only and is excluded from LAB host phylogeny.

## Executed checks

Latest non-browser checks: **{checks['status']}** — {python_count} Python standard-library tests,
{js_count} Node tests, JS syntax, build integrity and archive hash/CRC verification.
Synthetic adversarial fixtures are labelled and are not biological/probe receipts.
Python 3.14.6 and Node 24.19.0 were observed. Exact commands, UTC, stdout/stderr,
exit codes and transcript hashes are in [checks-latest.json](evidence/checks-latest.json).
Earlier failed attempts remain in the check history; nothing has been rewritten
as a successful browser test.

| Executed command | Exit code | stdout / stderr |
| --- | --- | --- |
{test_rows}

## Browser and WSL blockers

The isolated Chrome smoke harness was executed twice. Both attempts failed at
`Page.enable` after the browser GPU process crashed, including the retry with
`--disable-gpu`. **No browser checks completed. No screenshots were captured.**
Actual screenshot paths: `[]`. See [first failure](evidence/browser-smoke-first-gpu-failure.json)
and [second failure](evidence/browser-smoke.json).

Automatic approval review then rejected opening the local preview in connected
Chrome because browser access was declined. No workaround or further browser
attempt followed. See [browser-access.json](evidence/browser-access.json).

`wsl.exe -d Ubuntu --exec python3 --version` returned
`Wsl/Service/E_ACCESSDENIED` (shell exit 1). Ubuntu/WSL tests are NOT_TESTED.
The diagnostic tool interleaved UTF-16 output; separate stdout/stderr were not
captured for that one diagnostic. See [compatibility observation](evidence/compatibility-observation.json).
The temporary local preview server was stopped.

## Native Sites observation

**Native Sites tools are exposed in this session**: {len(native['native_tools'])} actual
tool names, including create, save-version and deploy operations, are recorded
in [native-tools.json](evidence/native-tools.json). Availability is discovery
only. No Sites action was invoked; authentication and runtime capability are
NOT_TESTED, and deployment is NOT_DEPLOYED. The supplied registry's older
observation is preserved and shown separately.

This is not a missing-native-tool case. `BLOCKED_NATIVE_SITE_ACTION` is the
required fallback if a future parent session lacks those tools. No Sites URL,
project/version/session ID, or publication receipt is invented. GitHub Pages
is not native ChatGPT Sites.

## Artifacts and handoff

- [Static site ZIP](evidence/genomeatlas-static.zip): {package['file_count']} public files;
  [package manifest and SHA-256](evidence/static-package.json). This is a generic
  static package, not a native saved version or deployment archive.
- [Machine-readable result](evidence/codex-result.json): code-file hashes,
  original input hashes, complete latest command transcripts, tool observations,
  blockers, explicit NOT_TESTED items and empty screenshot/session fields.
- [Local use and implementation](IMPLEMENTATION.md). Build/preview commands are
  provided for parent review; do not retry browser access in this session.

Still NOT_TESTED: browser/mobile/keyboard/download/upload behavior, screen-reader
accessibility, Ubuntu runtime, native Sites compatibility/authentication/save/
deployment, real endpoint re-probes, receipt-artifact hashes, taxonomy refresh,
genome analyses, scientific acceptance and GPU/CPU parity. No full genome
download, paid service call or heavy biology run occurred.

BUILD and code VERIFY are complete within the available environment. DOC records
the limits. Independent parent review and CUT/integration/publication remain
with the parent; no second-agent review is claimed.
'''
    (ROOT / 'CODEX_RESULT.md').write_text(text,encoding='utf-8',newline='\n')
    print('Wrote CODEX_RESULT.md and evidence/codex-result.json from actual evidence.')
    print(f'Code checks: {python_count} Python tests + {js_count} JavaScript tests; browser screenshots: 0 (blocked).')


if __name__ == '__main__':
    result()
