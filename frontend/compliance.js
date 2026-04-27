/* ═══════════════════════════════════════════════
   compliance.js — Compliance Engine
   Injected into Step 2 (Intake) after confirmIntake()
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

/* ─── CHECKLIST DEFINITIONS ──────────────────── */

const COMPLIANCE_ITEMS = [
  // ── Submission Documents
  { id: "c_proposal",    cat: "Submission",   label: "Technical/Price Proposal complete",         required: true  },
  { id: "c_pricesch",   cat: "Submission",   label: "Price Schedule filled out per Section B",   required: true  },
  { id: "c_sf1449",     cat: "Forms",        label: "SF-1449 / Cover Sheet signed",              required: false },
  { id: "c_reps",       cat: "Forms",        label: "Reps & Certs (FAR 52.212-3) acknowledged",  required: true  },
  { id: "c_samactive",  cat: "Forms",        label: "SAM.gov registration active + current",     required: true  },
  // ── SCA Compliance
  { id: "c_wd",         cat: "SCA/Davis-Bacon", label: "Wage Determination pulled and applied",  required: true  },
  { id: "c_wdflow",     cat: "SCA/Davis-Bacon", label: "WD flow-down clause in sub agreement",  required: true  },
  { id: "c_fringe",     cat: "SCA/Davis-Bacon", label: "Fringe / H&W rate included in pricing", required: true  },
  // ── Insurance & Bonding
  { id: "c_gl",         cat: "Insurance",    label: "General Liability cert obtained ($1M min)",  required: true  },
  { id: "c_wc",         cat: "Insurance",    label: "Workers Comp cert obtained",                required: true  },
  { id: "c_bond",       cat: "Insurance",    label: "Performance / Payment bond (if required)",  required: false },
  // ── Past Performance
  { id: "c_pp",         cat: "Past Perf",    label: "Past Performance references listed (2–3)",  required: false },
  { id: "c_ppform",     cat: "Past Perf",    label: "Past Performance forms / CPARS attached",   required: false },
  // ── Subcontractor
  { id: "c_subins",     cat: "Subcontractor","label": "Sub insurance certs received",            required: true  },
  { id: "c_subagree",   cat: "Subcontractor","label": "Subcontract agreement signed",            required: true  },
  { id: "c_subwage",    cat: "Subcontractor","label": "Sub wage compliance confirmed in writing", required: true  },
  // ── Amendments
  { id: "c_amend",      cat: "Amendments",   label: "All amendments (A000X) acknowledged",      required: true  },
  // ── Packaging
  { id: "c_filenames",  cat: "Packaging",    label: "Files named per solicitation instructions", required: true  },
  { id: "c_pagelim",    cat: "Packaging",    label: "Page limits checked",                       required: false },
  { id: "c_zip",        cat: "Packaging",    label: "Submission package ZIP ready",              required: true  },
];

/* ─── LOAD / SAVE STATE ──────────────────────── */
function loadComplianceState() {
  const solId = bidData.intake?.solId || "general";
  return JSON.parse(localStorage.getItem(`ifl_compliance_${solId}`) || "{}");
}
function saveComplianceState(state) {
  const solId = bidData.intake?.solId || "general";
  localStorage.setItem(`ifl_compliance_${solId}`, JSON.stringify(state));
}

/* ─── RENDER CHECKLIST ───────────────────────── */
function renderComplianceChecklist() {
  const container = document.getElementById("complianceChecklist");
  if (!container) return;

  const state = loadComplianceState();

  // Group by category
  const cats = {};
  COMPLIANCE_ITEMS.forEach(item => {
    if (!cats[item.cat]) cats[item.cat] = [];
    cats[item.cat].push(item);
  });

  let html = "";
  for (const [cat, items] of Object.entries(cats)) {
    const done  = items.filter(i => state[i.id]).length;
    const total = items.length;
    html += `
      <div style="margin-bottom:16px">
        <div style="
          font-family:'Cinzel',serif;font-size:10px;letter-spacing:.12em;
          text-transform:uppercase;color:var(--gold);margin-bottom:8px;
          display:flex;justify-content:space-between;align-items:center
        ">
          <span>${cat}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;
            color:${done===total?'var(--green)':'var(--dim)'}">
            ${done}/${total}
          </span>
        </div>
        <div style="display:grid;gap:6px">
          ${items.map(item => `
            <label style="
              display:flex;align-items:center;gap:10px;
              background:rgba(0,0,0,.2);
              border:1px solid ${state[item.id] ? 'rgba(125,255,154,.3)' : 'var(--border)'};
              border-radius:4px;padding:9px 12px;cursor:pointer;
              transition:border-color .15s
            ">
              <input type="checkbox" id="${item.id}"
                ${state[item.id] ? "checked" : ""}
                onchange="toggleCompliance('${item.id}')"
                style="accent-color:var(--green);width:16px;height:16px;cursor:pointer"
              />
              <span style="font-size:14px;flex:1;color:${state[item.id]?'var(--light)':'var(--dim)'}">
                ${item.label}
              </span>
              ${item.required ? `<span style="
                font-family:'Cinzel',serif;font-size:9px;letter-spacing:.1em;
                color:var(--gold);text-transform:uppercase;opacity:.7
              ">REQ</span>` : ""}
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  updateComplianceScore();
}

function toggleCompliance(id) {
  const state = loadComplianceState();
  state[id] = document.getElementById(id)?.checked || false;
  saveComplianceState(state);
  updateComplianceScore();
  // Re-render border without full re-render to avoid losing checkbox state
  const label = document.getElementById(id)?.closest("label");
  if (label) {
    label.style.borderColor = state[id] ? "rgba(125,255,154,.3)" : "var(--border)";
    const txt = label.querySelector("span");
    if (txt) txt.style.color = state[id] ? "var(--light)" : "var(--dim)";
  }
}

/* ─── SCORE BAR ──────────────────────────────── */
function updateComplianceScore() {
  const state    = loadComplianceState();
  const total    = COMPLIANCE_ITEMS.length;
  const done     = COMPLIANCE_ITEMS.filter(i => state[i.id]).length;
  const required = COMPLIANCE_ITEMS.filter(i => i.required);
  const reqDone  = required.filter(i => state[i.id]).length;
  const pct      = Math.round((done / total) * 100);

  const scoreEl = document.getElementById("complianceScore");
  const barEl   = document.getElementById("complianceBar");
  const reqEl   = document.getElementById("complianceReq");

  if (scoreEl) scoreEl.textContent = `${pct}%`;
  if (barEl)   barEl.style.width   = `${pct}%`;
  if (barEl)   barEl.style.background = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--gold)" : "var(--danger)";
  if (reqEl)   reqEl.textContent   = `${reqDone}/${required.length} required`;

  // Also update submit step badge if visible
  const submitBadge = document.getElementById("submitComplianceBadge");
  if (submitBadge) {
    submitBadge.textContent = `${pct}% compliant`;
    submitBadge.style.color = pct >= 80 ? "var(--green)" : "var(--danger)";
  }
}

/* ─── AMENDMENTS TRACKER ─────────────────────── */
function addAmendment() {
  const input = document.getElementById("amendInput");
  const val   = input?.value.trim().toUpperCase();
  if (!val) return;

  const amendments = bidData.intake?.amendments || [];
  if (!amendments.includes(val)) {
    amendments.push(val);
    if (bidData.intake) bidData.intake.amendments = amendments;
    save();
  }
  input.value = "";
  renderAmendments();
}

function removeAmendment(val) {
  if (!bidData.intake) return;
  bidData.intake.amendments = (bidData.intake.amendments || []).filter(a => a !== val);
  save();
  renderAmendments();
}

function renderAmendments() {
  const el   = document.getElementById("amendList");
  const list = bidData.intake?.amendments || [];
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<span style="color:var(--dim);font-size:13px">None logged</span>`;
    return;
  }
  el.innerHTML = list.map(a => `
    <span style="
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(201,168,76,.1);border:1px solid var(--border);
      border-radius:3px;padding:3px 10px;font-family:'JetBrains Mono',monospace;
      font-size:13px;color:var(--gold)
    ">
      ${a}
      <button onclick="removeAmendment('${a}')" style="
        background:none;border:none;color:var(--dim);cursor:pointer;
        font-size:13px;padding:0;line-height:1
      ">✕</button>
    </span>
  `).join(" ");

  // Auto-check amendment checkbox if any logged
  const state = loadComplianceState();
  if (list.length && !state["c_amend"]) {
    // don't auto-check — user must confirm
  }
}

/* ─── INIT ───────────────────────────────────── */
function initCompliancePanel() {
  renderComplianceChecklist();
  renderAmendments();
}
