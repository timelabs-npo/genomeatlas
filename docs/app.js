/* GenomeAtlas — original static client, MIT. No network or execution interfaces. */
(function () {
  "use strict";
  const data = window.ATLAS_DATA;
  const contracts = window.AtlasContracts;
  const $ = id => document.getElementById(id);
  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  function badge(state) {
    const element = text("span", state, "badge");
    element.dataset.state = state;
    return element;
  }
  function link(label, href) {
    const element = text("a", label);
    // The registry is authored static data, but links still have a narrow boundary.
    if (/^https:\/\//.test(href)) {
      const url = new URL(href);
      if (url.username || url.password) return text("span", label);
      element.href = url.href;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    } else if (/^evidence\/[a-z0-9-]+\.json$/.test(href)) element.href = href;
    else return text("span", label);
    return element;
  }
  function download(value, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let selectedStage = data.flow[0];
  for (const stage of data.flow) {
    const button = text("button", "");
    button.type = "button";
    button.dataset.stage = stage.id;
    button.append(text("span", stage.number), document.createTextNode(stage.name));
    button.setAttribute("aria-controls", "stage-title stage-description stage-input stage-output stage-acceptance stage-status");
    button.addEventListener("click", () => selectStage(stage));
    $("flow-controls").append(button);
  }
  function selectStage(stage) {
    selectedStage = stage;
    $("stage-lane").textContent = stage.number + " / " + stage.lane;
    $("stage-title").textContent = stage.name;
    $("stage-description").textContent = stage.explanation;
    $("stage-input").textContent = stage.input;
    $("stage-output").textContent = stage.output;
    $("stage-acceptance").textContent = stage.acceptance;
    $("stage-status").textContent = stage.status_detail;
    $("stage-state").textContent = stage.state;
    $("stage-state").dataset.state = stage.state;
    document.querySelectorAll("[data-stage]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.stage === stage.id)));
    document.querySelectorAll("[data-diagram]").forEach(node => node.classList.toggle("is-selected", node.dataset.diagram === stage.id));
    $("stage-announcement").textContent = stage.name + " selected. " + stage.state + ". " + stage.status_detail;
  }
  selectStage(selectedStage);
  $("stage-request").addEventListener("click", () => {
    $("job").value = selectedStage.job;
    invalidateRequest();
    document.location.hash = "request";
    $("job").focus({ preventScroll: true });
  });
  $("panel-hash").textContent = data.panel.sha256;
  function renderAccessions() {
    const query = $("accession-search").value.trim().toLowerCase();
    const matches = data.panel.accessions.filter(id => id.toLowerCase().includes(query));
    $("accession-list").replaceChildren(...matches.map(id => text("li", id)));
    $("accession-count").textContent = matches.length + " of " + data.panel.accessions.length + " supplied accessions";
  }
  $("accession-search").addEventListener("input", renderAccessions);
  renderAccessions();
  for (const [id, values] of [["layer-filter", [...new Set(data.tools.map(tool => tool.layer))]], ["status-filter", [...new Set(data.tools.map(tool => tool.status))]]]) {
    for (const value of values.sort()) {
      const option = text("option", value);
      option.value = value;
      $(id).append(option);
    }
  }
  function detailRow(list, title, value) {
    list.append(text("dt", title));
    const description = document.createElement("dd");
    if (value instanceof Node) description.append(value);
    else description.textContent = value;
    list.append(description);
  }
  function renderTools() {
    const query = $("tool-search").value.trim().toLowerCase();
    const layer = $("layer-filter").value;
    const status = $("status-filter").value;
    const tools = data.tools.filter(tool => (!layer || tool.layer === layer) && (!status || tool.status === status) && [tool.id, tool.name, tool.stage, tool.advertised_capability, tool.actual_probe_outcome].some(value => value.toLowerCase().includes(query)));
    const rows = tools.map(tool => {
      const row = document.createElement("details");
      row.className = "tool-item";
      row.dataset.toolId = tool.id;
      const summary = document.createElement("summary");
      const name = document.createElement("span");
      name.append(text("span", tool.name, "tool-name"), text("span", tool.layer + " / " + tool.stage, "tool-layer"));
      const toggle = text("span", "+", "tool-toggle");
      toggle.setAttribute("aria-hidden", "true");
      summary.append(name, text("span", tool.advertised_capability, "tool-capability"), badge(tool.status), toggle);
      const detail = document.createElement("div");
      detail.className = "tool-detail";
      const list = document.createElement("dl");
      detailRow(list, "Actual probe outcome", tool.actual_probe_outcome);
      detailRow(list, "Checked at", tool.checked_at || "Not supplied / no dated local tool probe");
      detailRow(list, "Evidence", link(tool.evidence_origin + " · " + tool.evidence_reference, tool.evidence_reference));
      detailRow(list, "Input contract", tool.input_contract);
      detailRow(list, "Output contract", tool.output_contract);
      detailRow(list, "Auth / cost boundary", tool.auth_cost_boundary);
      detailRow(list, "Next action", tool.next_action);
      if (tool.reference_url) detailRow(list, "Public reference", link(tool.reference_url, tool.reference_url));
      detailRow(list, "Record ID", tool.id);
      detail.append(list);
      row.append(summary, detail);
      return row;
    });
    $("tool-list").replaceChildren(...rows);
    $("tool-count").textContent = tools.length + " of " + data.tools.length + " tools · availability is not execution";
    $("tool-empty").hidden = tools.length !== 0;
  }
  $("tool-search").addEventListener("input", renderTools);
  $("layer-filter").addEventListener("change", renderTools);
  $("status-filter").addEventListener("change", renderTools);
  $("clear-filters").addEventListener("click", () => {
    $("tool-search").value = $("layer-filter").value = $("status-filter").value = "";
    renderTools();
  });
  $("download-registry").addEventListener("click", () => download({ kind: "TOOL_REGISTRY", schema_version: 1, snapshot_date: data.snapshot_date, tools: data.tools }, "genomeatlas-tool-registry.json"));
  renderTools();
  for (const [index, probe] of data.probes.entries()) {
    const item = document.createElement("li");
    item.className = "probe-item";
    const heading = document.createElement("div");
    heading.append(text("h3", probe.name), text("small", probe.origin.replaceAll("_", " ") + " · " + (probe.checked_at || "check time not supplied")));
    const description = text("p", probe.detail + " ");
    description.append(link("Evidence ↗", probe.evidence_reference));
    item.append(text("span", String(index + 1).padStart(2, "0"), "probe-number"), heading, description, badge(probe.state));
    $("probe-list").append(item);
  }
  for (const job of contracts.JOBS) $("job").append(text("option", job));
  let prepared = null;
  let importGeneration = 0;
  function panelInput() { $("input-hashes").value = data.panel.original_file + "=" + data.panel.sha256; }
  function readForm(state = "DRAFT") {
    const inputHashes = $("input-hashes").value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split("=");
      return { name: parts[0].trim(), sha256: parts.length === 2 ? parts[1].trim() : "" };
    });
    return { schema_version: 1, kind: "REVIEW_REQUEST", state, job: $("job").value, source_commit: $("source-commit").value.trim(), input_hashes: inputHashes, requested_endpoint: $("endpoint").value.trim(), reviewer: $("reviewer").value.trim(), budget_cap: { amount: $("budget").value === "" ? null : Number($("budget").value), currency: $("currency").value }, execution: "NOT_EXECUTED", run_receipt: null };
  }
  function preview(value) {
    $("request-state").textContent = value.state;
    $("request-state").dataset.state = value.state;
    $("request-json").textContent = JSON.stringify(value, null, 2);
  }
  function invalidateRequest() {
    prepared = null;
    $("export-request").disabled = true;
    $("form-errors").hidden = true;
    $("preview-message").textContent = "DRAFT — complete and prepare these fields for external review. No approval has been verified.";
    preview(readForm());
  }
  function resetRequest() {
    importGeneration++;
    $("request-form").reset();
    $("source-commit").value = data.source_commit;
    panelInput();
    $("import-request").value = "";
    $("import-message").textContent = "";
    invalidateRequest();
  }
  $("request-form").addEventListener("input", invalidateRequest);
  $("request-form").addEventListener("change", invalidateRequest);
  $("reset-request").addEventListener("click", resetRequest);
  $("use-panel-input").addEventListener("click", () => { panelInput(); invalidateRequest(); });
  $("request-form").addEventListener("submit", event => {
    event.preventDefault();
    const value = readForm("REQUIRES_CONFIRMATION");
    const errors = contracts.validateRequest(value);
    if (errors.length) {
      invalidateRequest();
      $("form-errors").textContent = errors.join("\n");
      $("form-errors").hidden = false;
      $("form-errors").focus();
      return;
    }
    prepared = value;
    $("form-errors").hidden = true;
    $("preview-message").textContent = "Ready to download for human review. REQUIRES_CONFIRMATION does not mean approved, scheduled or executed.";
    $("export-request").disabled = false;
    preview(value);
  });
  $("export-request").addEventListener("click", () => {
    // Revalidate both the stored request and current inputs at the export boundary.
    if (!prepared || contracts.validateRequest(prepared).length || JSON.stringify(readForm("REQUIRES_CONFIRMATION")) !== JSON.stringify(prepared)) {
      invalidateRequest();
      return;
    }
    download(prepared, "genomeatlas-" + prepared.job + "-review-request.json");
  });
  $("import-request").addEventListener("change", async event => {
    const generation = ++importGeneration;
    const file = event.target.files[0];
    if (!file) return;
    invalidateRequest();
    $("import-message").textContent = "Validating JSON…";
    try {
      if (file.size > contracts.MAX_BYTES) throw new Error("JSON must be at most 64 KiB.");
      const request = contracts.parseImport(await file.text());
      if (generation !== importGeneration) return;
      $("job").value = request.job;
      $("source-commit").value = request.source_commit;
      $("input-hashes").value = request.input_hashes.map(input => input.name + "=" + input.sha256).join("\n");
      $("endpoint").value = request.requested_endpoint;
      $("reviewer").value = request.reviewer;
      $("budget").value = String(request.budget_cap.amount);
      $("currency").value = request.budget_cap.currency;
      invalidateRequest();
      $("import-message").textContent = "Imported as DRAFT. Check the fields and prepare a fresh review request.";
    } catch (error) {
      if (generation === importGeneration) $("import-message").textContent = "Import rejected. " + error.message;
    }
  });
  let receiptGeneration = 0;
  $("import-receipt").addEventListener("change", async event => {
    const generation = ++receiptGeneration;
    $("receipt-preview").textContent = "";
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > contracts.MAX_BYTES) throw new Error("Receipt must be at most 64 KiB.");
      const receipt = contracts.parseReceipt(await file.text());
      if (generation !== receiptGeneration) return;
      $("receipt-preview").textContent = JSON.stringify(receipt, null, 2);
      $("receipt-message").textContent = "UNTRUSTED_IMPORT — claimed status only. No ledger, request or scientific state changed.";
    } catch (error) {
      if (generation === receiptGeneration) $("receipt-message").textContent = "Receipt rejected. " + error.message;
    }
  });
  resetRequest();
  document.documentElement.dataset.atlasReady = "true";
})();
