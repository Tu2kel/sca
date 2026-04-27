/* ═══════════════════════════════════════════════
   solpanel.js — Sol CRM Sidebar
   The House of Kel LLC | CAGE 152U4 | SDVOSB
   Persistent sol log — survives resets
   localStorage key: ifl_sollog
═══════════════════════════════════════════════ */

/* ─── SOL LOG STORAGE ─── */
function getSolLog() {
  return JSON.parse(localStorage.getItem("ifl_sollog") || "[]");
}
function saveSolLog(log) {
  localStorage.setItem("ifl_sollog", JSON.stringify(log));
}

/* ─── UPSERT — called on submit OR manually ─── */
function upsertSolEntry(data) {
  const log = getSolLog();
  const idx = log.findIndex(e => e.solId === data.solId);
  const entry = {
    solId:      data.solId      || "—",
    title:      data.title      || data.scope || "—",
    agency:     data.agency     || "—",
    location:   data.location   || "—",
    naics:      data.naics      || "—",
    setAside:   data.setAside   || "—",
    dueDate:    data.dueDate    || "—",
    period:     data.period     || "—",
    website:    data.website    || "",
    pocName:    data.pocName    || "",
    pocPhone:   data.pocPhone   || "",
    pocEmail:   data.pocEmail   || "",
    yourRate:   data.yourRate   || null,
    totalValue: data.totalValue || null,
    subName:    data.subName    || "",
    verdict:    data.verdict    || "Tracking",
    status:     data.status     || "Active",
    notes:      data.notes      || "",
    files:      data.files      || [],
    history:    data.history    || [],
    addedAt:    data.addedAt    || new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  };
  if (idx >= 0) {
    // Preserve history and files from existing entry
    entry.history = log[idx].history || [];
    entry.files   = log[idx].files   || [];
    entry.addedAt = log[idx].addedAt;
    log[idx] = entry;
  } else {
    log.unshift(entry);
  }
  saveSolLog(log);
  renderSolPanel();
}

/* ─── PUSH FROM SUBMIT ─── */
function logBidToSolPanel(bidData) {
  const intake   = bidData.intake   || {};
  const pricing  = bidData.pricing  || {};
  const sourcing = bidData.sourcing?.locked || {};
  const disc     = bidData.discovery?.selectedItem || {};

  upsertSolEntry({
    solId:      intake.solId,
    title:      disc.title || intake.scope,
    agency:     intake.agency,
    location:   intake.location,
    naics:      intake.naics,
    setAside:   intake.setAside,
    dueDate:    intake.dueDate,
    period:     intake.period,
    yourRate:   pricing.yourRate,
    totalValue: pricing.totalValue,
    subName:    sourcing.name,
    verdict:    disc.verdict || "GO",
    status:     "Submitted",
    notes:      bidData.submit?.notes || "",
  });
}

/* ─── STATUS CYCLE ─── */
const STATUS_CYCLE = ["Active", "Submitted", "Awarded", "No Award", "Cancelled"];
function cycleStatus(solId) {
  const log = getSolLog();
  const e = log.find(x => x.solId === solId);
  if (!e) return;
  const i = STATUS_CYCLE.indexOf(e.status);
  e.status = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
  e.updatedAt = new Date().toISOString();
  saveSolLog(log);
  renderSolPanel();
}

/* ─── ADD NOTE ─── */
function addSolNote(solId) {
  const log = getSolLog();
  const e = log.find(x => x.solId === solId);
  if (!e) return;
  const note = prompt(`Note for ${solId}:`);
  if (!note?.trim()) return;
  e.history = e.history || [];
  e.history.unshift({ ts: new Date().toISOString(), text: note.trim() });
  e.updatedAt = new Date().toISOString();
  saveSolLog(log);
  renderSolPanel();
  showToast("✓ Note saved");
}

/* ─── DELETE ENTRY ─── */
function deleteSolEntry(solId) {
  if (!confirm(`Remove ${solId} from Sol log?`)) return;
  const log = getSolLog().filter(e => e.solId !== solId);
  saveSolLog(log);
  renderSolPanel();
}

/* ─── LOAD SOL INTO ACTIVE WORKFLOW ─── */
function loadSolIntoWorkflow(solId) {
  const log = getSolLog();
  const e = log.find(x => x.solId === solId);
  if (!e) return;
  if (!confirm(`Load ${solId} into the active workflow? Current bid data will be replaced.`)) return;
  bidData = {
    intake: {
      solId:    e.solId,
      agency:   e.agency,
      location: e.location,
      naics:    e.naics,
      setAside: e.setAside,
      dueDate:  e.dueDate,
      period:   e.period,
      scope:    e.title,
      complete: true,
    }
  };
  save();
  currentStep = 1;
  updateUI();
  showToast(`✓ Loaded ${solId} into Intake`);
}

/* ─── FILTER STATE ─── */
let solPanelFilter = "All";

/* ─── RENDER ─── */
function renderSolPanel() {
  const log = getSolLog();
  const panel = document.getElementById("solPanelList");
  const count = document.getElementById("solPanelCount");
  if (!panel) return;

  const filtered = solPanelFilter === "All"
    ? log
    : log.filter(e => e.status === solPanelFilter);

  count.textContent = `${filtered.length} sol${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    panel.innerHTML = `<div class="sol-empty">No solicitations yet.<br/>They appear here after triage or submit.</div>`;
    return;
  }

  panel.innerHTML = filtered.map(e => {
    const statusClass = {
      "Active":    "sp-active",
      "Submitted": "sp-submitted",
      "Awarded":   "sp-awarded",
      "No Award":  "sp-noaward",
      "Cancelled": "sp-cancelled",
    }[e.status] || "sp-active";

    const verdictClass = {
      "GO":      "sp-go",
      "MARGINAL":"sp-marginal",
      "PASS":    "sp-pass",
    }[e.verdict] || "";

    const val = e.totalValue
      ? "$" + e.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "—";

    const rate = e.yourRate ? `$${e.yourRate.toFixed(2)}/hr` : "—";

    const lastNote = e.history?.[0]
      ? `<div class="sp-last-note">↳ ${e.history[0].text.substring(0, 60)}${e.history[0].text.length > 60 ? "…" : ""}</div>`
      : "";

    const hasPhone   = e.pocPhone?.trim();
    const hasWebsite = e.website?.trim();
    const hasEmail   = e.pocEmail?.trim();

    return `
<div class="sol-card" id="spcard-${e.solId}">
  <div class="sp-row-top">
    <div class="sp-sol-id">${e.solId}</div>
    <span class="sp-status ${statusClass}" onclick="cycleStatus('${e.solId}')" title="Click to cycle status">${e.status}</span>
  </div>

  <div class="sp-title">${e.title}</div>
  <div class="sp-meta">${[e.agency, e.location].filter(x=>x&&x!=="—").join(" · ")}</div>
  <div class="sp-meta">${e.dueDate && e.dueDate !== "—" ? "Due " + e.dueDate : ""} ${e.naics && e.naics !== "—" ? "· NAICS " + e.naics : ""}</div>

  <div class="sp-price-row">
    <span class="sp-rate">${rate}</span>
    <span class="sp-val">${val}</span>
    ${e.verdict ? `<span class="sp-verdict ${verdictClass}">${e.verdict}</span>` : ""}
  </div>

  ${e.subName ? `<div class="sp-sub">Sub: ${e.subName}</div>` : ""}
  ${lastNote}

  <div class="sp-actions">
    ${hasWebsite ? `<a class="sp-btn sp-btn-web" href="${e.website}" target="_blank" title="Open website">🌐</a>` : ""}
    ${hasPhone   ? `<a class="sp-btn sp-btn-call" href="tel:${e.pocPhone}" title="Call ${e.pocName || 'POC'}: ${e.pocPhone}">📞</a>` : ""}
    ${hasEmail   ? `<a class="sp-btn sp-btn-mail" href="mailto:${e.pocEmail}" title="Email ${e.pocName || 'POC'}">✉</a>` : ""}
    <button class="sp-btn sp-btn-note" onclick="addSolNote('${e.solId}')" title="Add note">✎</button>
    <button class="sp-btn sp-btn-load" onclick="loadSolIntoWorkflow('${e.solId}')" title="Load into workflow">↺</button>
    <button class="sp-btn sp-btn-del"  onclick="deleteSolEntry('${e.solId}')"        title="Remove">✕</button>
  </div>
</div>`;
  }).join("");
}

/* ─── FILTER BUTTONS ─── */
function setSolFilter(f) {
  solPanelFilter = f;
  document.querySelectorAll(".sp-filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === f);
  });
  renderSolPanel();
}

/* ─── TOGGLE SIDEBAR COLLAPSE ─── */
function toggleSolPanel() {
  const sidebar = document.getElementById("solSidebar");
  const main    = document.getElementById("mainContent");
  const btn     = document.getElementById("solPanelToggleBtn");
  const collapsed = sidebar.classList.toggle("sp-collapsed");
  main.classList.toggle("sp-expanded", collapsed);
  btn.textContent = collapsed ? "▶" : "◀";
  localStorage.setItem("ifl_panel_collapsed", collapsed ? "1" : "0");
}

/* ─── INIT ─── */
document.addEventListener("DOMContentLoaded", () => {
  // Restore collapse state
  if (localStorage.getItem("ifl_panel_collapsed") === "1") {
    const sidebar = document.getElementById("solSidebar");
    const main    = document.getElementById("mainContent");
    const btn     = document.getElementById("solPanelToggleBtn");
    if (sidebar) { sidebar.classList.add("sp-collapsed"); }
    if (main)    { main.classList.add("sp-expanded"); }
    if (btn)     { btn.textContent = "▶"; }
  }
  renderSolPanel();
});
