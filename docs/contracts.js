/* Original GenomeAtlas code, MIT. Pure contracts shared by UI and Node tests. */
(function (root) {
  "use strict";
  const JOBS = Object.freeze(["panel-audit", "download-audit", "marker-qc", "tree-qc", "rm-schema-check", "figure-qc", "site-smoke"]);
  const STATES = Object.freeze({
    probe: ["PASSED", "FAILED", "NOT_TESTED", "AUTH_REQUIRED", "DECLARED", "BLOCKED"],
    deployment: ["NOT_DEPLOYED", "BLOCKED", "DEPLOYED"],
    request: ["DRAFT", "REQUIRES_CONFIRMATION"],
    scientific: ["NA", "FAILED", "U", "C", "P", "0"]
  });
  const MAX_BYTES = 65536;
  const MAX_INPUTS = 32;
  const SHA256 = /^[a-f0-9]{64}$/i;
  const COMMIT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
  const NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
  const FIELDS = ["schema_version", "kind", "state", "job", "source_commit", "input_hashes", "requested_endpoint", "reviewer", "budget_cap", "execution", "run_receipt"];
  function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function exactKeys(value, keys) { return object(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)); }
  function validateRequest(value) {
    const errors = [];
    if (!exactKeys(value, FIELDS)) return ["Request fields do not match the REVIEW_REQUEST contract."];
    if (value.schema_version !== 1 || value.kind !== "REVIEW_REQUEST") errors.push("Expected REVIEW_REQUEST schema version 1.");
    if (!STATES.request.includes(value.state)) errors.push("State must be DRAFT or REQUIRES_CONFIRMATION.");
    if (!JOBS.includes(value.job)) errors.push("Choose an allowed audit or QC job.");
    if (typeof value.source_commit !== "string" || !COMMIT.test(value.source_commit)) errors.push("Source commit must be a full 40- or 64-character hexadecimal commit ID.");
    if (!Array.isArray(value.input_hashes) || value.input_hashes.length < 1 || value.input_hashes.length > MAX_INPUTS) {
      errors.push("Provide 1 to 32 named input SHA-256 hashes.");
    } else {
      const names = new Set();
      for (const input of value.input_hashes) {
        if (!exactKeys(input, ["name", "sha256"]) || typeof input.name !== "string" || !NAME.test(input.name) || typeof input.sha256 !== "string" || !SHA256.test(input.sha256)) {
          errors.push("Each input needs a public file label and a 64-character SHA-256 hash.");
        } else if (names.has(input.name)) {
          errors.push("Input names must be unique.");
        } else names.add(input.name);
      }
    }
    for (const key of ["requested_endpoint", "reviewer"]) {
      if (typeof value[key] !== "string" || !NAME.test(value[key])) errors.push(key + " must be a public alias (letters, numbers, dots, underscores, hyphens; max 96). Do not enter credentials or device paths.");
    }
    if (!exactKeys(value.budget_cap, ["amount", "currency"]) || typeof value.budget_cap.amount !== "number" || !Number.isFinite(value.budget_cap.amount) || value.budget_cap.amount < 0 || value.budget_cap.amount > 1000000 || !Number.isInteger(Math.round(value.budget_cap.amount * 100) * 1) || Math.abs(value.budget_cap.amount * 100 - Math.round(value.budget_cap.amount * 100)) > 1e-7 || !["USD", "EUR", "GBP"].includes(value.budget_cap.currency)) errors.push("Budget must be 0 to 1,000,000 with at most two decimals, in USD, EUR, or GBP.");
    if (value.execution !== "NOT_EXECUTED" || value.run_receipt !== null) errors.push("A review request cannot claim execution or contain a run receipt.");
    return errors;
  }
  function parseImport(text) {
    if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("JSON must be at most 64 KiB.");
    let value;
    try { value = JSON.parse(text); } catch { throw new Error("Could not read valid JSON."); }
    const errors = validateRequest(value);
    if (errors.length) throw new Error(errors.join(" "));
    return value;
  }
  function scientificState(record) {
    // This validates a supplied evidence label; it never infers a new biological call.
    if (!object(record)) return "NA";
    if (record.job_status === "FAILED") return "FAILED";
    if (record.job_status !== "PASSED") return "NA";
    // 0 means NOT_DETECTED within a completed documented assessment, never absence.
    if (record.call === "ABSENT" || record.call === "0") return record.assessment_complete === true && record.exact_strain_evidence === true && typeof record.evidence_reference === "string" && record.evidence_reference.trim() ? "0" : "NA";
    // C is a supplied computational call for this exact genome, not functional proof.
    if (record.call === "C") return record.complete_cassette === true && record.exact_genome_evidence === true && typeof record.model_call_reference === "string" && record.model_call_reference.trim() ? "C" : "U";
    if (record.call === "P") return record.curated === true && record.exact_strain_evidence === true && typeof record.evidence_reference === "string" && record.evidence_reference.trim() ? "P" : "U";
    return record.call === "U" ? "U" : "NA";
  }
  function parseReceipt(raw) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error("Receipt must be at most 64 KiB.");
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error("Invalid receipt JSON."); }
    const fields = ["schema_version", "kind", "job", "claimed_status", "summary", "evidence_reference"];
    if (!exactKeys(value, fields) || value.schema_version !== 1 || value.kind !== "RUN_RECEIPT" || !JOBS.includes(value.job) || !STATES.probe.includes(value.claimed_status)) throw new Error("Receipt fields or status do not match the contract.");
    for (const key of ["summary", "evidence_reference"]) {
      if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[key])) throw new Error("Receipt text must contain 1 to 2000 printable characters.");
    }
    return Object.freeze({ ...value, trust: "UNTRUSTED_IMPORT", verified: false });
  }
  const api = Object.freeze({ JOBS, STATES, MAX_BYTES, MAX_INPUTS, validateRequest, parseImport, parseReceipt, scientificState });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AtlasContracts = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
