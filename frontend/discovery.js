/* ═══════════════════════════════════════════════
   discovery.js — Step 1
   Paste contracts → AI triage → select one
═══════════════════════════════════════════════ */

async function triageAll() {
  const raw = document.getElementById("discoveryPaste").value.trim();
  if (!raw) {
    showToast("Paste contract listings first", true);
    return;
  }

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    showToast("No listings found", true);
    return;
  }

  if (
    !confirm(
      `Triage ${lines.length} contract${lines.length > 1 ? "s" : ""}? This will use API tokens.`,
    )
  )
    return;

  bidData.discovery = bidData.discovery || { items: [] };

  const items = lines.map((line) => {
    const parts = line.split("|").map((x) => x?.trim());
    return {
      title: parts[0] || line,
      sol: parts[1] || "",
      due: parts[2] || "",
      agency: parts[3] || "",
      location: parts[4] || "",
      verdict: null,
      reason: "",
    };
  });

  const think = document.getElementById("triageThinking");
  think.classList.remove("hidden");
  document.getElementById("triageBtn").disabled = true;

  const SYSTEM = `You are a bid triage analyst for The House of Kel LLC — SDVOSB prime contractor, Killeen TX.

CORE RULE: Triage is based on SCOPE, not NAICS codes. The only question is: can this work be performed with general (non-licensed) labor?

GO — general labor, no license required:
Janitorial, custodial, cleaning, sanitization, grounds maintenance, landscaping, mowing, snow removal, painting (interior/exterior), general facilities maintenance, building support services, moving/hauling, warehouse labor, material handling, administrative staffing, temp labor, food service support, laundry, pest control (sub-able), security guard services (sub-able), data entry, mail room, supply/logistics labor, trash removal, floor care, window cleaning, pressure washing.

PASS — requires licensed personnel we do not have:
HVAC installation/repair/maintenance, electrical work, plumbing, fire suppression systems, elevator maintenance, telecom/IT infrastructure, network cabling, engineering services, medical/clinical services, construction (structural), roofing, security systems installation, boiler operation.

MARGINAL — mixed scope, unclear, or requires one licensed trade among mostly general labor. Flag it for manual review.

ALSO assess estimated contract value from any clues in the title or description:
- Building count, square footage, number of personnel, facility type, shift requirements all indicate scale
- A single small office = low value ($20K–$60K/yr)
- A clinic or mid-size facility = medium ($60K–$200K/yr)
- A base, campus, or multi-building = high ($200K+/yr)
- Staffing contracts: headcount × hours × rate estimate

Return ONLY a JSON array — one object per contract — no other text:
[{
  "verdict": "GO" | "MARGINAL" | "PASS",
  "reason": "one sentence — what the work is and why GO/MARGINAL/PASS",
  "valueEst": "$X–$Y/yr" | "unknown",
  "licenseRisk": true | false
}]`;

  const contractList = items
    .map(
      (it, i) =>
        `${i + 1}. ${it.title}${it.sol ? " | SOL:" + it.sol : ""}${it.agency ? " | " + it.agency : ""}${it.location ? " | " + it.location : ""}`,
    )
    .join("\n");

  try {
    const response = await callClaude(
      [
        {
          role: "user",
          content: `Triage these ${items.length} contracts:\n\n${contractList}`,
        },
      ],
      SYSTEM,
      800,
    );
    const clean = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    parsed.forEach((r, i) => {
      if (items[i]) {
        items[i].verdict = r.verdict;
        items[i].reason = r.reason;
        items[i].valueEst = r.valueEst || "";
        items[i].licenseRisk = r.licenseRisk || false;
      }
    });
  } catch (e) {
    showToast("Triage failed — marking PENDING", true);
    items.forEach((it) => {
      it.verdict = "PENDING";
      it.reason = "Manual review required";
    });
  }

  bidData.discovery.items = [...(bidData.discovery.items || []), ...items];
  save();
  think.classList.add("hidden");
  document.getElementById("triageBtn").disabled = false;
  document.getElementById("discoveryPaste").value = "";
  renderDiscoveryList();
  showToast(`✓ Triaged ${items.length} contract${items.length > 1 ? "s" : ""}`);
}

function renderDiscoveryList() {
  const items = bidData.discovery?.items || [];
  const el = document.getElementById("discoveryList");
  if (!items.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = items
    .map((item, i) => {
      const vc = (item.verdict || "pending").toLowerCase();
      const laneClass =
        vc === "go" ? "in-lane" : vc === "pass" ? "out-lane" : "unknown-lane";
      const sel = bidData.discovery?.selected === i ? "selected" : "";
      return `
    <div class="discovery-item ${laneClass} ${sel}" onclick="selectContract(${i})" id="ditem-${i}">
      <div class="disc-header">
        <input type="radio" class="disc-radio" name="contractSel" ${bidData.discovery?.selected === i ? "checked" : ""}/>
        <div class="disc-body">
          <div class="disc-title">${item.title}
            <span class="disc-verdict ${vc}">${item.verdict || "PENDING"}</span>
            ${item.licenseRisk ? `<span style="font-size:11px;color:var(--danger);margin-left:6px">⚠ License Risk</span>` : ""}
          </div>
          <div class="disc-meta">${[item.sol, item.agency, item.location, item.due ? "Due: " + item.due : ""].filter(Boolean).join(" · ")}</div>
          ${item.valueEst ? `<div style="font-size:12px;color:var(--green);margin-top:2px;font-family:'JetBrains Mono',monospace">Est: ${item.valueEst}</div>` : ""}
          ${item.reason ? `<div class="disc-ai-reason">${item.reason}</div>` : ""}
        </div>
        <button class="sm danger" onclick="event.stopPropagation();removeDiscItem(${i})" style="flex-shrink:0">✕</button>
      </div>
    </div>`;
    })
    .join("");
}

function selectContract(i) {
  bidData.discovery = bidData.discovery || {};
  bidData.discovery.selected = i;
  bidData.discovery.selectedItem = bidData.discovery.items[i];
  save();
  renderDiscoveryList();
  showToast(`✓ Selected: ${bidData.discovery.items[i].title}`);
}

function removeDiscItem(i) {
  bidData.discovery.items.splice(i, 1);
  if (bidData.discovery.selected === i) delete bidData.discovery.selected;
  save();
  renderDiscoveryList();
}

function clearDiscovery() {
  if (!confirm("Clear all discovery results?")) return;
  bidData.discovery = { items: [] };
  save();
  renderDiscoveryList();
}

function goToIntake() {
  const sel = bidData.discovery?.selected;
  if (sel == null) {
    showToast("Select a contract first", true);
    return;
  }
  const item = bidData.discovery.items[sel];
  if (item?.verdict === "PASS") {
    if (!confirm("AI flagged this PASS. Proceed anyway?")) return;
  }
  goToStep(1);
}

/* ═══════════════════════════════════════════════
   SAM.gov PULL — backend-proxied opportunity fetch
═══════════════════════════════════════════════ */

let samOffset = 0;
let samTotal = 0;
let samPageSize = 100;
let samLastParams = {};

async function pullSamOpportunities(offset = 0) {
  const keyword = document.getElementById("samKeyword")?.value.trim() || "";
  const naics = document.getElementById("samNaics")?.value.trim() || "";
  const state = document.getElementById("samState")?.value.trim() || "";
  const setAside = document.getElementById("samSetAside")?.value || "";
  const limit = document.getElementById("samLimit")?.value || "100";

  samLastParams = { keyword, naics, state, setAside, limit };
  samOffset = offset;
  samPageSize = parseInt(limit) || 100;

  const btn = document.getElementById("samPullBtn");
  const spin = document.getElementById("samThinking");
  if (btn) btn.disabled = true;
  if (spin) spin.classList.remove("hidden");

  const params = new URLSearchParams({ limit, offset: String(offset) });
  if (keyword) params.set("keyword", keyword);
  if (state) params.set("state", state);
  if (naics) params.set("naics", naics);
  if (setAside) params.set("setAside", setAside);

  try {
    console.log(
      `[SAM Pull] Fetching: http://localhost:3001/api/sam/opportunities?${params}`,
    );

    const res = await fetch(
      `http://localhost:3001/api/sam/opportunities?${params}`,
    );
    console.log(`[SAM Pull] Response status: ${res.status} ${res.statusText}`);

    let data;
    try {
      data = await res.json();
      console.log("[SAM Pull] Response data:", data);
    } catch (parseErr) {
      console.error("[SAM Pull] Failed to parse JSON:", parseErr);
      showToast("SAM returned invalid response — check console", true);
      return;
    }

    if (!res.ok) {
      console.error("[SAM Pull] Non-OK response:", res.status, data);
      showToast(
        `SAM error ${res.status}: ${data?.error || data?.detail || "unknown"}`,
        true,
      );
      return;
    }

    if (!data.ok || !data.opportunities?.length) {
      console.warn("[SAM Pull] No opportunities:", data);
      showToast(data.error || "No opportunities returned from SAM", true);
      return;
    }

    samTotal = data.total || data.opportunities.length;

    const newItems = data.opportunities.map((o) => ({
      title: o.title,
      sol: o.solId,
      due: cleanDate(o.dueDate),
      agency: o.agency,
      location: o.location,
      naics: o.naics,
      setAside: o.setAside,
      url: o.url,
      description: o.description || "",
      source: "SAM.gov",
      verdict: null,
      reason: "",
      valueEst: "",
      licenseRisk: false,
    }));

    bidData.discovery = bidData.discovery || { items: [] };
    const existing = new Set(
      bidData.discovery.items.map((i) => i.sol).filter(Boolean),
    );
    const added = newItems.filter((i) => !i.sol || !existing.has(i.sol));
    bidData.discovery.items.push(...added);
    save();
    renderDiscoveryList();

    const page = Math.floor(offset / samPageSize) + 1;
    const maxPage = Math.ceil(samTotal / samPageSize);
    showToast(
      `✓ ${added.length} new opportunities added (page ${page} of ${maxPage})`,
    );

    document.getElementById("samResultCount").textContent =
      `${samTotal} total on SAM · ${added.length} added this page · ${bidData.discovery.items.length} in your list`;

    updateSamPagination();
  } catch (err) {
    console.error("[SAM Pull] Fetch error:", err);
    console.error("[SAM Pull] Error name:", err.name);
    console.error("[SAM Pull] Error message:", err.message);
    const isOffline =
      err.message.includes("fetch") ||
      err.message.includes("Failed") ||
      err.name === "TypeError";
    showToast(
      isOffline
        ? "Backend offline — is server.js running on port 3001?"
        : `SAM pull failed: ${err.message}`,
      true,
    );
  } finally {
    if (btn) btn.disabled = false;
    if (spin) spin.classList.add("hidden");
  }
}

function samPageNext() {
  if (samOffset + samPageSize < samTotal)
    pullSamOpportunities(samOffset + samPageSize);
}

function samPagePrev() {
  if (samOffset > 0) pullSamOpportunities(Math.max(0, samOffset - samPageSize));
}

function updateSamPagination() {
  const pg = document.getElementById("samPagination");
  const info = document.getElementById("samPageInfo");
  const prev = document.getElementById("samPrevBtn");
  const next = document.getElementById("samNextBtn");
  if (!pg) return;

  pg.style.display = "flex";
  const page = Math.floor(samOffset / samPageSize) + 1;
  const maxPage = Math.ceil(samTotal / samPageSize) || 1;
  if (info)
    info.textContent = `Page ${page} of ${maxPage} (${samTotal} total on SAM)`;
  if (prev) prev.disabled = samOffset === 0;
  if (next)
    next.disabled =
      samTotal <= samPageSize || samOffset + samPageSize >= samTotal;
}

function cleanDate(raw) {
  if (!raw) return "";
  // Strip ISO timestamp → readable date
  // "2026-05-20T15:00:00-05:00" → "2026-05-20"
  return raw.split("T")[0] || raw;
}

async function triageAllSam() {
  const untriaged = (bidData.discovery?.items || []).filter(
    (i) => i.source === "SAM.gov" && !i.verdict,
  );
  if (!untriaged.length) {
    showToast("No untriaged SAM items", true);
    return;
  }
  if (
    !confirm(
      `Triage ${untriaged.length} SAM opportunities in batches? Uses API tokens.`,
    )
  )
    return;

  const think = document.getElementById("triageThinking");
  const btn = document.getElementById("triageBtn");
  think.classList.remove("hidden");
  btn.disabled = true;

  const SYSTEM = `You are a bid triage analyst for The House of Kel LLC — SDVOSB prime contractor, Killeen TX.

CORE RULE: Triage is based on SCOPE, not NAICS codes. The only question is: can this work be performed with general (non-licensed) labor?

GO — general labor, no license required:
Janitorial, custodial, cleaning, sanitization, grounds maintenance, landscaping, mowing, snow removal, painting (interior/exterior), general facilities maintenance, building support services, moving/hauling, warehouse labor, material handling, administrative staffing, temp labor, food service support, laundry, pest control (sub-able), security guard services (sub-able), data entry, mail room, supply/logistics labor, trash removal, floor care, window cleaning, pressure washing.

PASS — requires licensed personnel we do not have:
HVAC installation/repair/maintenance, electrical work, plumbing, fire suppression systems, elevator maintenance, telecom/IT infrastructure, network cabling, engineering services, medical/clinical services, construction (structural), roofing, security systems installation, boiler operation.

MARGINAL — mixed scope, unclear, or requires one licensed trade among mostly general labor.

ALSO assess estimated contract value from any clues in the title or description:
- Single small office = low ($20K–$60K/yr), clinic/mid facility = medium ($60K–$200K/yr), base/campus/multi-building = high ($200K+/yr)

Return ONLY a JSON array — one object per contract — no other text:
[{"verdict":"GO"|"MARGINAL"|"PASS","reason":"one sentence","valueEst":"$X–$Y/yr"|"unknown","licenseRisk":true|false}]`;

  const BATCH = 15;
  let triaged = 0;
  let failed = 0;

  for (let i = 0; i < untriaged.length; i += BATCH) {
    const batch = untriaged.slice(i, i + BATCH);
    const contractList = batch
      .map(
        (it, j) =>
          `${j + 1}. ${it.title}${it.sol ? " | SOL:" + it.sol : ""}${it.naics ? " | NAICS:" + it.naics : ""}${it.agency ? " | " + it.agency : ""}${it.location ? " | " + it.location : ""}${it.description ? " | " + it.description.slice(0, 200) : ""}`,
      )
      .join("\n");

    try {
      const response = await callClaude(
        [
          {
            role: "user",
            content: `Triage these ${batch.length} opportunities:\n\n${contractList}`,
          },
        ],
        SYSTEM,
        4000,
      );
      const clean = response.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      parsed.forEach((r, j) => {
        if (batch[j]) {
          batch[j].verdict = r.verdict;
          batch[j].reason = r.reason;
          batch[j].valueEst = r.valueEst || "";
          batch[j].licenseRisk = r.licenseRisk || false;
          triaged++;
        }
      });
      save();
      renderDiscoveryList();
      showToast(
        `✓ Triaged ${Math.min(i + BATCH, untriaged.length)} of ${untriaged.length}...`,
      );
    } catch (e) {
      console.error(`[Triage] Batch ${i}–${i + BATCH} failed:`, e.message);
      failed += batch.length;
    }
  }

  think.classList.add("hidden");
  btn.disabled = false;
  showToast(
    `✓ Triage complete — ${triaged} scored${failed ? `, ${failed} failed` : ""}`,
  );
}
