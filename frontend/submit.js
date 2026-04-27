/* ═══════════════════════════════════════════════
   submit.js — Step 6
   Submission logging + Packaging + Compliance check
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

const API = "http://localhost:3001/api";

/* ─── FILE NAMING CONVENTION ─────────────────── */
// Pattern: {SOLID}_{Category}_{Description}.{ext}
// e.g. W91247-25-R-0088_Technical_Approach.pdf
function enforceFileName(originalName, category, solId) {
  const ext    = originalName.split(".").pop().toLowerCase();
  const safe   = (str) => str.replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_");
  const sol    = safe(solId || "SOL");
  const cat    = safe(category || "Other");
  const base   = safe(originalName.replace(/\.[^.]+$/, "")).slice(0, 40);
  return `${sol}_${cat}_${base}.${ext}`;
}

/* ─── INIT SUBMIT STEP ───────────────────────── */
function initSubmitStep() {
  loadPackageFiles();
  if (typeof updateComplianceScore === "function") updateComplianceScore();
}

/* ─── PACKAGE FILE UPLOAD ────────────────────── */
async function uploadPackageFile(input) {
  const file   = input.files[0];
  if (!file) return;
  const solId  = bidData.intake?.solId;
  if (!solId)  { showToast("Complete Intake first — need SOL ID", true); return; }
  const cat    = document.getElementById("pkgFileCategory")?.value || "Other";
  const newName = enforceFileName(file.name, cat, solId);

  showToast(`Uploading ${newName}…`);

  const form = new FormData();
  const renamed = new File([file], newName, { type: file.type });
  form.append("files", renamed);
  form.append("category", cat);
  form.append("agency",   bidData.intake?.agency || "");
  form.append("title",    bidData.intake?.scope  || "");

  try {
    const res  = await fetch(`${API}/files/${encodeURIComponent(solId)}`, { method:"POST", body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Upload failed");
    showToast(`✓ ${newName} uploaded`);
    input.value = "";
    loadPackageFiles();
  } catch (err) {
    showToast(`Upload error: ${err.message}`, true);
  }
}

/* ─── LOAD FILE LIST ─────────────────────────── */
async function loadPackageFiles() {
  const solId = bidData.intake?.solId;
  const el    = document.getElementById("pkgFileList");
  if (!el) return;

  if (!solId) {
    el.innerHTML = `<div style="color:var(--dim);font-size:14px">Complete Intake first.</div>`;
    return;
  }

  try {
    const res  = await fetch(`${API}/files/${encodeURIComponent(solId)}`);
    const data = await res.json();
    const files = data.attachments || [];

    if (!files.length) {
      el.innerHTML = `<div style="color:var(--dim);font-size:14px">No files uploaded yet for ${solId}.</div>`;
      return;
    }

    const catColors = {
      SOW:"rgba(100,160,255,.15)", PWS:"rgba(100,160,255,.15)", WD:"rgba(201,168,76,.12)",
      RFP:"rgba(201,168,76,.12)", RFQ:"rgba(201,168,76,.12)", Amendment:"rgba(255,154,154,.12)",
      QASP:"rgba(125,255,154,.1)", PriceSchedule:"rgba(125,255,154,.1)", Other:"rgba(255,255,255,.05)"
    };

    el.innerHTML = `
      <div style="margin-bottom:10px;font-size:13px;color:var(--dim)">
        ${files.length} file${files.length>1?"s":""} in package for <span style="color:var(--gold);font-family:'JetBrains Mono',monospace">${solId}</span>
      </div>
      ${files.map(f => `
        <div style="
          display:grid;grid-template-columns:auto 1fr auto auto;gap:8px 12px;
          align-items:center;padding:9px 12px;margin-bottom:6px;
          background:${catColors[f.category]||catColors.Other};
          border:1px solid var(--border);border-radius:4px;font-size:13px
        ">
          <span style="
            font-family:'Cinzel',serif;font-size:9px;letter-spacing:.1em;
            text-transform:uppercase;color:var(--gold);
            background:rgba(201,168,76,.1);padding:2px 7px;border-radius:3px
          ">${f.category}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;
            color:var(--light);word-break:break-all">${f.originalName}</span>
          <span style="color:var(--dim);font-size:12px;white-space:nowrap">
            ${(f.size/1024).toFixed(0)} KB
          </span>
          <button class="secondary" style="padding:2px 9px;font-size:12px"
            onclick="deletePackageFile('${f.filename}')">✕</button>
        </div>
      `).join("")}
    `;
  } catch (err) {
    el.innerHTML = `<div style="color:var(--danger);font-size:13px">Backend offline — files not loaded</div>`;
  }
}

/* ─── DELETE FILE ────────────────────────────── */
async function deletePackageFile(filename) {
  const solId = bidData.intake?.solId;
  if (!solId || !confirm(`Delete ${filename}?`)) return;
  try {
    await fetch(`${API}/files/${encodeURIComponent(solId)}/${filename}`, { method:"DELETE" });
    showToast("✓ File removed");
    loadPackageFiles();
  } catch (err) {
    showToast("Delete failed", true);
  }
}

/* ─── DOWNLOAD ZIP ───────────────────────────── */
async function downloadPackageZip() {
  const solId = bidData.intake?.solId;
  if (!solId) { showToast("No SOL ID — complete Intake first", true); return; }
  showToast("Building ZIP…");
  try {
    const res = await fetch(`${API}/files/${encodeURIComponent(solId)}/zip`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${solId}_SubmissionPackage.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ ${solId}_SubmissionPackage.zip downloaded`);
  } catch (err) {
    showToast(`ZIP error: ${err.message}`, true);
  }
}

/* ─── SUBMIT BID ─────────────────────────────── */
function submitBid() {
  const name  = document.getElementById("submitName").value.trim();
  const email = document.getElementById("submitEmail").value.trim();
  if (!name || !email) { showToast("Name and email required", true); return; }

  // Win-score gate — hard blocks and low-score warnings
  if (typeof winScoreGate === "function") {
    if (!winScoreGate()) return;
  }

  // Compliance warning
  if (typeof loadComplianceState === "function") {
    const state    = loadComplianceState();
    const required = (typeof COMPLIANCE_ITEMS !== "undefined" ? COMPLIANCE_ITEMS : []).filter(i => i.required);
    const missing  = required.filter(i => !state[i.id]);
    if (missing.length) {
      const proceed = confirm(
        `⚠ ${missing.length} required compliance item${missing.length>1?"s":""} unchecked:\n\n` +
        missing.map(i => `• ${i.label}`).join("\n") +
        `\n\nLog submission anyway?`
      );
      if (!proceed) return;
    }
  }

  bidData.submit = {
    name,
    email,
    method:      document.getElementById("submitMethod").value,
    notes:       document.getElementById("submitNotes").value.trim(),
    submittedAt: new Date().toISOString(),
    complete:    true
  };
  save();
  showToast("✓ Bid logged");

  // Show confirmation card
  const i = bidData.intake  || {};
  const p = bidData.pricing || {};
  const s = bidData.sourcing?.locked || {};
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setV("scSolId",  i.solId   || "—");
  setV("scAgency", i.agency  || "—");
  setV("scSub",    s.name    || "—");
  setV("scRate",   p.yourRate ? `$${Number(p.yourRate).toFixed(2)}/hr` : "—");
  setV("scTotal",  p.totalValue ? `$${Number(p.totalValue).toLocaleString("en-US",{maximumFractionDigits:0})}` : "—");
  setV("scMethod", bidData.submit.method);
  setV("scDate",   new Date(bidData.submit.submittedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}));
  document.getElementById("submitConfirmCard")?.classList.add("visible");
}

/* ─── RESET ──────────────────────────────────── */
function resetAll() {
  if (!confirm("Reset everything and start a new bid?")) return;
  resetBid();
  currentStep = 0;
  const clr = (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ""; };
  const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = "none"; };
  const rm   = (id, cls) => { const el = document.getElementById(id); if (el) el.classList.remove(cls); };
  const add  = (id, cls) => { const el = document.getElementById(id); if (el) el.classList.add(cls); };

  hide("intakeFieldsPanel");
  clr("extractionResponse");
  add("noSourcingYet", "");
  document.getElementById("noSourcingYet") && (document.getElementById("noSourcingYet").style.display = "block");
  clr("sourcingGrid");
  add("lockedSubPanel", "hidden");
  rm("priceResult", "visible");
  add("pricingConfirmedPanel", "hidden");
  const confBtn = document.getElementById("confirmPricingBtn");
  if (confBtn) confBtn.style.display = "none";
  hide("proposalPanel");
  hide("bidSummaryPanel");
  ["sowStatus","wdStatus"].forEach(id => clr(id));
  clr("pkgFileList");
  rm("submitConfirmCard", "visible");
  document.getElementById("submitName") && (document.getElementById("submitName").value = "");
  document.getElementById("submitEmail") && (document.getElementById("submitEmail").value = "");
  document.getElementById("submitNotes") && (document.getElementById("submitNotes").value = "");

  updateUI();
  if (typeof renderDiscoveryList === "function") renderDiscoveryList();
  showToast("✓ Reset — ready for next bid");
}
