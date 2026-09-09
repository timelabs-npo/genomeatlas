"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const C = require("../docs/contracts.js");
const data = JSON.parse(fs.readFileSync(require("node:path").join(__dirname, "../docs/data/atlas.json"), "utf8"));
const valid = () => ({ schema_version: 1, kind: "REVIEW_REQUEST", state: "DRAFT", job: "panel-audit", source_commit: data.source_commit, input_hashes: [{ name: "selected_accessions.txt", sha256: data.panel.sha256 }], requested_endpoint: "reviewed-workspace", reviewer: "science-reviewer", budget_cap: { amount: 0, currency: "USD" }, execution: "NOT_EXECUTED", run_receipt: null });
test("browser and data share exact state and allowed-job vocabularies", () => {
  assert.deepEqual(C.STATES, data.states);
  assert.deepEqual(C.JOBS, data.jobs);
});
test("valid draft and confirmation requests stay unexecuted", () => {
  for (const state of ["DRAFT", "REQUIRES_CONFIRMATION"]) {
    const request = { ...valid(), state };
    assert.deepEqual(C.validateRequest(request), []);
    assert.equal(C.parseImport(JSON.stringify(request)).execution, "NOT_EXECUTED");
  }
});
test("missing inputs, hashes, endpoint, reviewer, commit and budget reject", () => {
  for (const change of [{ input_hashes: [] }, { input_hashes: [{ name: "a", sha256: "" }] }, { requested_endpoint: "" }, { reviewer: "" }, { source_commit: "HEAD" }, { budget_cap: { amount: null, currency: "USD" } }]) assert.ok(C.validateRequest({ ...valid(), ...change }).length);
});
test("all seven allowed jobs accepted and any other job rejected", () => {
  for (const job of C.JOBS) assert.deepEqual(C.validateRequest({ ...valid(), job }), []);
  for (const job of ["run-pipeline", "shell", "publish", "marker-qc; echo test"]) assert.ok(C.validateRequest({ ...valid(), job }).length);
});
test("approval cannot claim execution, approval verification or a run receipt", () => {
  for (const change of [{ state: "APPROVED" }, { state: "EXECUTED" }, { execution: "EXECUTED" }, { run_receipt: {} }, { approval_verified: true }, { command: "echo test" }]) assert.ok(C.validateRequest({ ...valid(), ...change }).length);
});
test("bounded public aliases reject paths, URLs, credentials and markup", () => {
  for (const value of ["https://user:secret@example.org", "../private", "x/y", "C:\\Users\\someone", "<img src=x onerror=alert(1)>", "a".repeat(97)]) {
    assert.ok(C.validateRequest({ ...valid(), reviewer: value }).length);
    assert.ok(C.validateRequest({ ...valid(), requested_endpoint: value }).length);
  }
});
test("budget rejects non-finite, negative, excessive, string and fractional cents", () => {
  for (const amount of [NaN, Infinity, -1, 1000001, "1", 0.001]) assert.ok(C.validateRequest({ ...valid(), budget_cap: { amount, currency: "USD" } }).length);
  for (const amount of [0, 0.01, 12.34, 1000000]) assert.deepEqual(C.validateRequest({ ...valid(), budget_cap: { amount, currency: "USD" } }), []);
});
test("import caps bytes and input count; malformed and extra fields reject", () => {
  for (const content of ["{", "null", "[]", "true", " ".repeat(65537), '{"__proto__":{"polluted":true}}']) assert.throws(() => C.parseImport(content));
  const extra = valid(); extra.input_hashes[0].command = "do-something";
  assert.ok(C.validateRequest(extra).length);
  const duplicate = valid(); duplicate.input_hashes.push({ ...duplicate.input_hashes[0] });
  assert.ok(C.validateRequest(duplicate).length);
  const tooMany = valid(); tooMany.input_hashes = Array.from({ length: 33 }, (_, i) => ({ name: "input-" + i, sha256: "a".repeat(64) }));
  assert.ok(C.validateRequest(tooMany).length);
  assert.equal({}.polluted, undefined);
});
test("unknown, missing and failed jobs never become absence", () => {
  for (const record of [null, {}, { call: "ABSENT" }, { job_status: "NOT_TESTED", call: "ABSENT" }, { job_status: "PASSED", call: "UNKNOWN" }, { job_status: "PASSED", call: "ABSENT" }]) assert.equal(C.scientificState(record), "NA");
  assert.equal(C.scientificState({ job_status: "FAILED", call: "ABSENT", assessment_complete: true, exact_strain_evidence: true, evidence_reference: "test-fixture" }), "FAILED");
});
test("raw hit or complete cassette cannot become curated P", () => {
  assert.equal(C.scientificState({ job_status: "PASSED", call: "U", complete_cassette: true }), "U");
  assert.equal(C.scientificState({ job_status: "PASSED", call: "P", curated: true, complete_cassette: true }), "U");
  assert.equal(C.scientificState({ job_status: "PASSED", call: "P", curated: true, exact_strain_evidence: true, evidence_reference: "" }), "U");
});
test("curated presence and NOT_DETECTED require full evidence flags", () => {
  const evidence = { job_status: "PASSED", exact_strain_evidence: true, evidence_reference: "test-fixture-only" };
  assert.equal(C.scientificState({ ...evidence, call: "P", curated: true }), "P");
  assert.equal(C.scientificState({ ...evidence, call: "ABSENT", assessment_complete: true }), "0");
});
