"""Real snapshot integrity and explicitly synthetic adversarial contract tests."""
import copy
import hashlib
import json
from pathlib import Path
import re
import sys
import unittest
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build import load_snapshot, PUBLIC_FILES
from validate import validate, validate_probe


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))


class SourceIntegrity(unittest.TestCase):
    def test_actual_panel_is_exact_frozen_selection(self):
        snapshot = load_snapshot()
        ids = [row['accession'] for row in snapshot['panel']]
        self.assertEqual(len(ids), 177)
        self.assertEqual(len(set(ids)), 177)
        self.assertTrue(all(set(row) == {'accession', 'source', 'metadata_status'} for row in snapshot['panel']))

    def test_actual_full_registry_is_retained(self):
        rows = read('data/registry.json')['entries']
        self.assertEqual(len(rows), 134)
        self.assertEqual(len({row['id'] for row in rows}), len(rows))
        self.assertEqual(next(row for row in rows if row['id'].startswith('smarts.bio'))['status'], 'AUTH_REQUIRED')
        bio = next(row for row in rows if row['id'] == 'bionemo-agent-toolkit')
        self.assertEqual(bio['status'], 'SKILL_READ')
        self.assertIn('Package0.1.0', bio['scope'])

    def test_all_actual_chains_are_proposed(self):
        chains = read('data/chains.json')
        self.assertEqual(len(chains), 8)
        self.assertTrue(all(row['status'] == 'PROPOSED_NOT_EXECUTED' for row in chains))

    def test_legacy_receipts_do_not_meet_new_verified_contract(self):
        schema = read('schemas/probe-result.schema.json')
        for receipt in read('data/probes.json')['receipts']:
            self.assertTrue(validate_probe(receipt, schema))

    def test_built_inputs_are_byte_identical(self):
        for name in PUBLIC_FILES:
            self.assertEqual((ROOT / name).read_bytes(), (ROOT / 'dist' / name).read_bytes(), name)

    def test_build_manifest_is_complete_and_correct(self):
        manifest = read('dist/manifest.json')
        self.assertEqual(set(manifest), set(PUBLIC_FILES))
        for name, digest in manifest.items():
            self.assertEqual(hashlib.sha256((ROOT / 'dist' / name).read_bytes()).hexdigest(), digest)

    def test_build_does_not_publish_evidence_or_private_roots(self):
        names = [file.relative_to(ROOT / 'dist').as_posix() for file in (ROOT / 'dist').rglob('*') if file.is_file()]
        self.assertEqual(set(names), set(PUBLIC_FILES + ['manifest.json']))
        for name in names:
            text = (ROOT / 'dist' / name).read_text(encoding='utf-8')
            self.assertNotRegex(text, r'(?i)(?:[A-Z]:[\\/]Users[\\/]|/home/|Bearer\s+[A-Za-z0-9_-]{16,})')

    def test_native_observation_is_discovery_only(self):
        result = read('evidence/native-tools.json')
        self.assertEqual(result['status'], 'NATIVE_TOOLS_EXPOSED_NOT_INVOKED')
        self.assertIn('mcp__codex_apps__sites_create_site', result['native_tools'])
        self.assertEqual(result['authentication'], 'NOT_TESTED')
        self.assertEqual(result['deployment'], 'NOT_DEPLOYED')
        self.assertIsNone(result['site_id'])
        self.assertIsNone(result['session_id'])


class SyntheticSchemaTests(unittest.TestCase):
    def setUp(self):
        self.task = read('templates/task-request.json')
        self.probe = read('templates/probe-result.synthetic.json')
        self.task_schema = read('schemas/task-request.schema.json')
        self.probe_schema = read('schemas/probe-result.schema.json')

    def test_synthetic_templates_are_structurally_valid_only(self):
        self.assertEqual(validate(self.task, self.task_schema), [])
        self.assertEqual(validate_probe(self.probe, self.probe_schema), [])
        self.assertEqual(self.probe['claimed_result'], 'NOT_TESTED')
        self.assertEqual(self.probe['verification'], 'UNVERIFIED')
        self.assertEqual(self.probe['test_scope'], 'synthetic')

    def test_synthetic_probe_requires_every_receipt_field(self):
        for key in self.probe_schema['required']:
            with self.subTest(missing=key):
                sample = copy.deepcopy(self.probe)
                del sample[key]
                self.assertTrue(validate_probe(sample, self.probe_schema))

    def test_synthetic_rejects_execution_and_pass_escalation(self):
        for value in ['PASS', 'EXECUTED', 'ACCEPTED', 'DEPLOYED']:
            sample = copy.deepcopy(self.task)
            sample['state'] = value
            self.assertTrue(validate(sample, self.task_schema))
        for key, value in [('command', 'echo synthetic'), ('auto_approve', True), ('site_url', 'https://example.invalid')]:
            sample = dict(self.task, **{key:value})
            self.assertTrue(validate(sample, self.task_schema))

    def test_synthetic_rejects_bad_utc_and_types(self):
        for utc in ['not-a-date', '2026-02-30T00:00:00Z', '2026-01-01T00:00:00+03:00', '2026-01-01T00:00:00']:
            self.assertTrue(validate_probe(dict(self.probe, observed_at_utc=utc), self.probe_schema))
        for code in [True, '0', 0.5, 2147483648]:
            self.assertTrue(validate_probe(dict(self.probe, exit_code=code), self.probe_schema))

    def test_synthetic_rejects_secrets_paths_shell_and_html_as_alias(self):
        for alias in ['https://example.invalid', '../outside', 'C:\\private', 'name@example.invalid', '<img src=x onerror=alert(1)>', 'host;whoami']:
            self.assertTrue(validate_probe(dict(self.probe, endpoint_alias=alias), self.probe_schema))
        self.assertTrue(validate_probe(dict(self.probe, command_tool_id='probe && echo synthetic'), self.probe_schema))

    def test_synthetic_rejects_forged_verification_and_unredacted_results(self):
        for field, value in [('verification', 'VERIFIED'), ('redacted', False), ('redacted', 'true'), ('test_scope', 'production')]:
            self.assertTrue(validate_probe(dict(self.probe, **{field:value}), self.probe_schema))

    def test_synthetic_requires_artifact_hashes(self):
        for hashes in [{}, {'input':'short'}, {'../file':'0'*64}, {'input':'z'*64}, {'input':'0'*64+'\n'}]:
            self.assertTrue(validate_probe(dict(self.probe, input_hashes=hashes), self.probe_schema))

    def test_synthetic_rejects_trailing_newlines_and_huge_integer(self):
        self.assertTrue(validate_probe(dict(self.probe, endpoint_alias='local\n'), self.probe_schema))
        self.assertTrue(validate_probe(dict(self.probe, exit_code=10**1000), self.probe_schema))

    def test_synthetic_rejects_pass_with_nonzero_exit(self):
        self.assertTrue(validate_probe(dict(self.probe, claimed_result='PASS', exit_code=1), self.probe_schema))

    def test_synthetic_rejects_gpu_and_rm_host_tree(self):
        for key, value in [('use_gpu',True),('host_tree','RM-system-similarity'),('rm_independent',False)]:
            sample = copy.deepcopy(self.task)
            sample['config'][key] = value
            self.assertTrue(validate(sample,self.task_schema))

    def test_synthetic_rejects_duplicate_or_unversioned_ids(self):
        for ids in [[], [self.task['genome_accessions'][0]]*2, ['GCF_023499275'], ['invented-species']]:
            self.assertTrue(validate(dict(self.task, genome_accessions=ids),self.task_schema))


class StaticBoundaryTests(unittest.TestCase):
    def test_no_html_injection_or_execution_sinks(self):
        source = (ROOT / 'assets/app.mjs').read_text(encoding='utf-8') + (ROOT / 'assets/core.mjs').read_text(encoding='utf-8')
        for pattern in [r'\.innerHTML\s*=',r'insertAdjacentHTML',r'\beval\s*\(',r'new Function',r'child_process',r'localStorage',r'\.exec\s*\(',r'fetch\s*\(']:
            self.assertNotRegex(source,pattern)

    def test_html_security_and_local_dependencies(self):
        class Parser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.scripts = []
                self.csp = None
            def handle_starttag(self, tag, attrs):
                values = dict(attrs)
                if tag == 'script':
                    self.scripts.append(values)
                if tag == 'meta' and values.get('http-equiv') == 'Content-Security-Policy':
                    self.csp = values['content']
        parser = Parser()
        parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
        self.assertEqual(parser.scripts,[{'type':'module','src':'assets/app.mjs'}])
        self.assertIn("form-action 'none'",parser.csp)
        self.assertNotIn('unsafe-inline',parser.csp)

    def test_upstream_license_preserved(self):
        license_text = (ROOT / 'LICENSE').read_text(encoding='utf-8')
        self.assertIn('Copyright (c) 2026 timelabs non-profit corp',license_text)
        self.assertIn('MIT License',license_text)


if __name__ == '__main__':
    unittest.main()
