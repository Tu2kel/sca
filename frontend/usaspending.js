/* ═══════════════════════════════════════════════
   usaspending.js — Past Award Price Lookup
   Queries USASpending API → feeds competitor range
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

const USA_API = "https://api.usaspending.gov/api/v2";

async function lookupPastAwards() {
  const intake  = bidData.intake  || {};
  const naics   = intake.naics;
  const state   = extractState(intake.location || "");

  if(!naics){ showToast("Complete Intake first — need NAICS", true); return; }

  const btn  = document.getElementById("usaLookupBtn");
  const spin = document.getElementById("usaThinking");
  if(btn)  btn.disabled = true;
  if(spin) spin.classList.remove("hidden");
  setText("usaResultPanel","");

  try {
    // ── STEP 1: Get award totals by NAICS ──────────────────────
    const body = {
      filters: {
        naics_codes:          [naics],
        award_type_codes:     ["A","B","C","D"], // contracts
        time_period:          [{ start_date: "2023-01-01", end_date: new Date().toISOString().slice(0,10) }],
        place_of_performance_states: state ? [{ state }] : undefined,
      },
      fields: ["Award Amount","Recipient Name","Period of Performance Start Date","Period of Performance End Date","Award ID","Awarding Agency Name"],
      sort:   "Award Amount",
      order:  "desc",
      limit:  20,
      page:   1,
    };
    // Remove undefined keys
    if(!body.filters.place_of_performance_states) delete body.filters.place_of_performance_states;

    const res  = await fetch(`${USA_API}/search/spending_by_award/`, {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify(body),
    });
    if(!res.ok) throw new Error(`USASpending ${res.status}`);
    const data = await res.json();
    const awards = (data.results || []).filter(a => (a["Award Amount"]||0) > 0);

    if(!awards.length){
      setText("usaResultPanel", `<div style="color:var(--dim);font-size:14px">No awards found for NAICS ${naics}${state?" in "+state:""}. Try a broader search.</div>`);
      return;
    }

    // ── STEP 2: Derive hourly rate estimates ───────────────────
    // Government services contracts = annual value ÷ ~2080 hrs for single FTE baseline
    // This is an ESTIMATE — not a direct hourly rate from USASpending
    const annualValues = awards.map(a => {
      const total = a["Award Amount"] || 0;
      const start = a["Period of Performance Start Date"];
      const end   = a["Period of Performance End Date"];
      const years = start && end ? Math.max(1, Math.round((new Date(end)-new Date(start))/(365.25*86400000))) : 1;
      return total / years; // annual value
    }).filter(v => v > 1000);

    const sorted = [...annualValues].sort((a,b)=>a-b);
    const low    = sorted[Math.floor(sorted.length * 0.25)]; // 25th pct
    const mid    = sorted[Math.floor(sorted.length * 0.50)]; // median
    const high   = sorted[Math.floor(sorted.length * 0.75)]; // 75th pct

    // Rough hourly: annual ÷ 2080 (1 FTE baseline)
    // Many contracts are multi-worker — show both annual and estimated single-FTE rate
    const toHr  = v => (v / 2080).toFixed(2);

    renderUsaResults(awards, { low, mid, high, toHr, naics, state });

  } catch(err) {
    setText("usaResultPanel", `<div style="color:var(--danger);font-size:13px">Lookup failed: ${err.message}</div>`);
  } finally {
    if(btn)  btn.disabled = false;
    if(spin) spin.classList.add("hidden");
  }
}

function renderUsaResults(awards, { low, mid, high, toHr, naics, state }) {
  const el = document.getElementById("usaResultPanel");
  if(!el) return;

  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:.12em;
        text-transform:uppercase;color:var(--gold);margin-bottom:10px">
        Past Award Analysis — NAICS ${naics}${state?" · "+state:""}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${[
          {label:"25th Pct Annual",  val:`$${(low/1000).toFixed(0)}K`, sub:`~$${toHr(low)}/hr (1 FTE est.)`},
          {label:"Median Annual",    val:`$${(mid/1000).toFixed(0)}K`, sub:`~$${toHr(mid)}/hr (1 FTE est.)`},
          {label:"75th Pct Annual",  val:`$${(high/1000).toFixed(0)}K`, sub:`~$${toHr(high)}/hr (1 FTE est.)`},
        ].map(b=>`
          <div style="background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:5px;padding:12px 14px">
            <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:.1em;
              text-transform:uppercase;color:var(--gold);margin-bottom:4px">${b.label}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--green)">${b.val}</div>
            <div style="font-size:12px;color:var(--dim);margin-top:2px">${b.sub}</div>
          </div>
        `).join("")}
      </div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:14px">
        ⚠ Hourly rates are estimates (annual award ÷ 2,080 hrs). Multi-worker contracts will show inflated rates. Use as directional benchmark only.
      </div>
      <div class="btn-row" style="margin-bottom:14px">
        <button onclick="applyCompRange('${toHr(low)}','${toHr(high)}')" style="font-size:13px;padding:7px 16px">
          → Apply to Pricing (Low: $${toHr(low)} · High: $${toHr(high)})
        </button>
      </div>
    </div>

    <div style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:.1em;
      text-transform:uppercase;color:var(--gold);margin-bottom:8px">
      Recent Awards (top ${awards.slice(0,10).length})
    </div>
    <div style="display:grid;gap:6px">
      ${awards.slice(0,10).map(a=>`
        <div style="
          display:grid;grid-template-columns:1fr auto;gap:8px;
          padding:9px 12px;background:rgba(0,0,0,.2);border:1px solid var(--border);
          border-radius:4px;font-size:13px
        ">
          <div>
            <div style="color:var(--light);margin-bottom:2px">${a["Recipient Name"]||"Unknown"}</div>
            <div style="color:var(--dim);font-size:12px">${a["Awarding Agency Name"]||""} · ${a["Period of Performance Start Date"]||""}</div>
          </div>
          <div style="text-align:right;font-family:'JetBrains Mono',monospace;
            color:var(--green);white-space:nowrap;font-size:13px">
            $${((a["Award Amount"]||0)/1000).toFixed(0)}K
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function applyCompRange(low, high) {
  const lowEl  = document.getElementById("pCompLow");
  const highEl = document.getElementById("pCompHigh");
  if(lowEl)  lowEl.value  = low;
  if(highEl) highEl.value = high;
  goToStep(3); // go to pricing step
  showToast(`✓ Competitor range applied: $${low} – $${high}/hr`);
}

function extractState(location) {
  // "Fort Cavazos, Killeen TX" → "TX"
  const m = location.match(/\b([A-Z]{2})\b/);
  return m ? m[1] : "";
}

function setText(id, html) {
  const el = document.getElementById(id);
  if(el) el.innerHTML = html;
}
