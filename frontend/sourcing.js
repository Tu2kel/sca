/* ═══════════════════════════════════════════════
   sourcing.js — Step 3
   Manual-trigger AI sourcing → cards → lock sub
═══════════════════════════════════════════════ */

function initSourcingTab() {
  // Show existing candidates if already loaded — no API call
  if (bidData.sourcing?._candidates?.length) {
    document.getElementById("noSourcingYet").style.display = "none";
    renderSourcingCards(bidData.sourcing._candidates);
  }
  if (bidData.sourcing?.locked) {
    showLockedSub();
  }
}

async function runSourcing() {
  const intake = bidData.intake;
  if (!intake?.location || !intake?.scope) {
    showToast("Complete Intake first", true);
    return;
  }

  const think = document.getElementById("sourcingThinking");
  const btn = document.getElementById("sourcingRunBtn");
  think.classList.remove("hidden");
  btn.disabled = true;
  document.getElementById("noSourcingYet").style.display = "none";

  const SYSTEM = `You are a subcontractor sourcing specialist for a government prime contractor.

The House of Kel LLC (SDVOSB, Killeen TX) needs staffing agencies and subcontractors for a federal service contract.

Rules:
1. Prioritize SMALL and LOCAL companies — no Manpower, Adecco, or Kelly as first choices
2. Government/military staffing experience strongly preferred
3. Must be SCA wage-compliant capable
4. Return ONLY a JSON array of 4–6 candidates, no other text

Each object:
{
  "name": "Company Name",
  "type": "Staffing Agency|Licensed Sub|Labor Broker",
  "location": "city, state",
  "description": "1-2 sentences on what they do and why they fit",
  "estimatedBillRate": 0.00,
  "billRateBasis": "e.g. WD base $22 × 1.55 markup",
  "sizeNote": "Small|Micro|Mid-size",
  "govExperience": true|false,
  "yearsInBusiness": 0,
  "govContractsCompleted": 0,
  "similarContracts": "brief description of most relevant past work or empty string",
  "phone": "if known",
  "website": "if known",
  "tags": ["tag1","tag2"]
}

Bill rate = WD base wage × 1.45–1.65 for small agencies on SCA government work.`;

  const userMsg = `Contract details:
Location: ${intake.location}
Scope: ${intake.scope}
NAICS: ${intake.naics}
Labor: ${intake.laborCats}
WD floor: $${intake.baseWage}/hr base + $${intake.fringe}/hr fringe = $${((intake.baseWage || 0) + (intake.fringe || 0)).toFixed(2)}/hr total comp

Find local staffing agencies and subs near ${intake.location}. Small/local first.`;

  try {
    const response = await callClaude(
      [{ role: "user", content: userMsg }],
      SYSTEM,
      1200,
    );
    const clean = response.replace(/```json|```/g, "").trim();
    const candidates = JSON.parse(clean);
    bidData.sourcing = { ...(bidData.sourcing || {}), _candidates: candidates };
    save();
    renderSourcingCards(candidates);
    showToast(`✓ Found ${candidates.length} sourcing candidates`);
  } catch (e) {
    showToast("Sourcing lookup failed — use manual entry below", true);
    document.getElementById("sourcingGrid").innerHTML =
      `<div style="color:var(--dim);font-size:14px;padding:12px">AI sourcing unavailable — use manual entry below.</div>`;
  }

  think.classList.add("hidden");
  btn.disabled = false;
}

function refreshSourcing() {
  // Force re-run even if candidates exist
  if (bidData.sourcing) delete bidData.sourcing._candidates;
  save();
  runSourcing();
}

function renderSourcingCards(candidates) {
  const grid = document.getElementById("sourcingGrid");
  const locked = bidData.sourcing?.locked;
  grid.innerHTML = candidates
    .map((c, i) => {
      const isSel = locked && locked.name === c.name;
      const credScore = calcCredScore(c);
      const credColor =
        credScore >= 70
          ? "var(--green)"
          : credScore >= 40
            ? "var(--gold)"
            : "var(--danger)";
      return `
    <div class="sourcing-card ${isSel ? "selected" : ""}" onclick="toggleCardSelect(${i})" id="scard-${i}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="sc-name">${c.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${credColor};font-weight:600">${credScore}%</div>
      </div>
      <div class="sc-type">${c.type}${c.sizeNote ? " · " + c.sizeNote : ""}${c.govExperience ? " · <span style='color:var(--green)'>Gov Exp ✓</span>" : " · <span style='color:var(--dim)'>No Gov Exp</span>"}</div>
      <div class="sc-detail">${c.description}</div>
      <div class="sc-rate">~$${(c.estimatedBillRate || 0).toFixed(2)}/hr</div>
      <div style="font-size:12px;color:var(--dim);margin-top:2px">${c.billRateBasis || ""}</div>
      <div style="font-size:13px;color:var(--dim);margin-top:6px">${c.location || ""}${c.phone ? " · " + c.phone : ""}</div>
      <div class="sc-tags">
        ${(c.tags || []).map((t) => `<span class="sc-tag">${t}</span>`).join("")}
        ${/small|micro/i.test(c.sizeNote || "") ? '<span class="sc-tag small">Small First</span>' : ""}
      </div>
      <div class="sc-select" id="scSelect-${i}" style="display:none">
        <div class="form-grid" style="margin-top:10px">
          <div class="form-group">
            <label>Confirm Bill Rate / hr ($)</label>
            <input type="number" step="0.01" id="cardRate-${i}" value="${(c.estimatedBillRate || 0).toFixed(2)}" onclick="event.stopPropagation()"/>
          </div>
          <div class="form-group">
            <label>Years in Business</label>
            <input type="number" min="0" id="cardYears-${i}" value="${c.yearsInBusiness || ""}" placeholder="e.g. 5" onclick="event.stopPropagation()"/>
          </div>
          <div class="form-group">
            <label>Gov Contracts Completed</label>
            <input type="number" min="0" id="cardGovCt-${i}" value="${c.govContractsCompleted || ""}" placeholder="e.g. 3" onclick="event.stopPropagation()"/>
          </div>
        </div>
        <div class="form-group" style="margin-top:6px">
          <label>Similar Contracts (brief description)</label>
          <input id="cardSimilar-${i}" value="${c.similarContracts || ""}" placeholder="e.g. Janitorial at VA clinic, 2023" onclick="event.stopPropagation()"/>
        </div>
        <button onclick="event.stopPropagation();lockCard(${i})" style="width:100%;margin-top:8px;font-size:12px">✓ Lock as Primary Sub</button>
        <button class="secondary" onclick="event.stopPropagation();lockBackupCard(${i})" style="width:100%;margin-top:4px;font-size:12px">+ Set as Backup Sub</button>
      </div>
    </div>`;
    })
    .join("");
}

function calcCredScore(c) {
  let score = 30; // baseline
  if (c.govExperience) score += 30;
  if (c.yearsInBusiness >= 5) score += 15;
  else if (c.yearsInBusiness >= 2) score += 8;
  if (c.govContractsCompleted >= 3) score += 15;
  else if (c.govContractsCompleted >= 1) score += 8;
  if (c.similarContracts) score += 10;
  if (/small|micro/i.test(c.sizeNote || "")) score += 5; // small first bonus
  return Math.min(score, 100);
}

function toggleCardSelect(i) {
  document
    .querySelectorAll(".sourcing-card")
    .forEach((c) => c.classList.remove("selected"));
  document
    .querySelectorAll("[id^=scSelect-]")
    .forEach((s) => (s.style.display = "none"));
  const card = document.getElementById("scard-" + i);
  card.classList.add("selected");
  document.getElementById("scSelect-" + i).style.display = "block";
}

function lockCard(i) {
  const c = bidData.sourcing._candidates[i];
  const billRate =
    parseFloat(document.getElementById("cardRate-" + i).value) ||
    c.estimatedBillRate;
  const years =
    parseInt(document.getElementById("cardYears-" + i)?.value) ||
    c.yearsInBusiness ||
    0;
  const govCt =
    parseInt(document.getElementById("cardGovCt-" + i)?.value) ||
    c.govContractsCompleted ||
    0;
  const similar =
    document.getElementById("cardSimilar-" + i)?.value ||
    c.similarContracts ||
    "";

  bidData.sourcing.locked = {
    name: c.name,
    type: c.type,
    location: c.location,
    phone: c.phone || "",
    website: c.website || "",
    billRate,
    notes: c.description,
    govExperience: c.govExperience || false,
    yearsInBusiness: years,
    govContractsCompleted: govCt,
    similarContracts: similar,
    credScore: calcCredScore({
      ...c,
      yearsInBusiness: years,
      govContractsCompleted: govCt,
      similarContracts: similar,
    }),
  };
  bidData.sourcing.complete = true;
  save();
  showLockedSub();
  showToast(`✓ Locked: ${c.name} @ $${billRate.toFixed(2)}/hr`);
}

function lockBackupCard(i) {
  const c = bidData.sourcing._candidates[i];
  const billRate =
    parseFloat(document.getElementById("cardRate-" + i).value) ||
    c.estimatedBillRate;
  bidData.sourcing.backup = {
    name: c.name,
    type: c.type,
    location: c.location,
    phone: c.phone || "",
    billRate,
    govExperience: c.govExperience || false,
    notes: c.description,
  };
  save();
  showLockedSub();
  showToast(`✓ Backup set: ${c.name}`);
}

function parseSubPaste() {
  const raw = document.getElementById("subPasteInput").value.trim();
  if (!raw) {
    showToast("Paste sub info first", true);
    return;
  }

  const get = (label) => {
    const rx = new RegExp(`^\\s*${label}\\s*:?\\s*(.+)$`, "im");
    const m = raw.match(rx);
    return m ? m[1].trim() : "";
  };

  // Try labeled format first (Name: / Type: / etc.)
  let name = get("name");
  let type = get("type");
  let location = get("location");
  let phone = get("phone");
  let email = get("email");
  let billRate = get("bill\\s*rate").replace(/[^0-9.]/g, "");
  let notes = get("notes");
  let contact = get("contact");

  // Fallback: pipe-delimited single line
  if (!name && raw.includes("|")) {
    const parts = raw.split("|").map((p) => p.trim());
    [name, contact, phone, email, billRate, notes] = parts;
    billRate = (billRate || "").replace(/[^0-9.]/g, "");
  }

  if (!name) {
    showToast("Could not find a Name — check format", true);
    return;
  }

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && v) el.value = v;
  };
  set("manualSubName", name);
  set("manualSubContact", contact);
  set("manualSubPhone", phone);
  set("manualSubEmail", email);
  set("manualBillRate", billRate);
  set("manualSubNotes", notes || type);

  document.getElementById("subPasteInput").value = "";
  showToast(`✓ Parsed: ${name}`);
}

function lockManualSub() {
  const name = document.getElementById("manualSubName").value.trim();
  const billRate =
    parseFloat(document.getElementById("manualBillRate").value) || 0;
  if (!name || !billRate) {
    showToast("Name and bill rate required", true);
    return;
  }

  const years = parseInt(document.getElementById("manualSubYears")?.value) || 0;
  const govCt = parseInt(document.getElementById("manualSubGovCt")?.value) || 0;
  const similar =
    document.getElementById("manualSubSimilar")?.value.trim() || "";
  const govExp = document.getElementById("manualSubGovExp")?.checked || false;

  const subData = {
    name,
    billRate,
    contact: document.getElementById("manualSubContact").value.trim(),
    phone: document.getElementById("manualSubPhone").value.trim(),
    email: document.getElementById("manualSubEmail").value.trim(),
    notes: document.getElementById("manualSubNotes").value.trim(),
    govExperience: govExp,
    yearsInBusiness: years,
    govContractsCompleted: govCt,
    similarContracts: similar,
    credScore: calcCredScore({
      govExperience: govExp,
      yearsInBusiness: years,
      govContractsCompleted: govCt,
      similarContracts: similar,
    }),
  };

  const isBackup = document.getElementById("manualSubIsBackup")?.checked;
  bidData.sourcing = { ...(bidData.sourcing || {}) };

  if (isBackup) {
    bidData.sourcing.backup = subData;
    save();
    showLockedSub();
    showToast(`✓ Backup set: ${name} @ $${billRate.toFixed(2)}/hr`);
  } else {
    bidData.sourcing.locked = subData;
    bidData.sourcing.complete = true;
    save();
    showLockedSub();
    showToast(`✓ Locked: ${name} @ $${billRate.toFixed(2)}/hr`);
  }
}

function showLockedSub() {
  const s = bidData.sourcing?.locked || {};
  const b = bidData.sourcing?.backup;
  document.getElementById("lockedSubPanel").classList.remove("hidden");

  const credColor =
    (s.credScore || 0) >= 70
      ? "var(--green)"
      : (s.credScore || 0) >= 40
        ? "var(--gold)"
        : "var(--danger)";

  const rows = [
    ["Subcontractor", s.name],
    ["Type / Contact", s.contact || s.type || ""],
    ["Phone", s.phone || ""],
    ["Email", s.email || ""],
    [
      "Bill Rate (COGS)",
      s.billRate ? `$${(s.billRate || 0).toFixed(2)}/hr` : "",
    ],
    ["Gov Experience", s.govExperience ? "✓ Yes" : "No"],
    ["Years in Business", s.yearsInBusiness ? `${s.yearsInBusiness} yrs` : ""],
    [
      "Gov Contracts",
      s.govContractsCompleted ? `${s.govContractsCompleted} completed` : "",
    ],
    ["Similar Work", s.similarContracts || ""],
    ["Credibility Score", s.credScore ? `${s.credScore}%` : ""],
    ["Notes", s.notes || ""],
  ].filter((r) => r[1]);

  if (b) {
    rows.push(["── Backup Sub ──", ""]);
    rows.push(["Backup Name", b.name]);
    rows.push([
      "Backup Rate",
      b.billRate ? `$${(b.billRate || 0).toFixed(2)}/hr` : "",
    ]);
    rows.push(["Backup Gov Exp", b.govExperience ? "✓ Yes" : "No"]);
  }

  document.getElementById("lockedSubTable").innerHTML = rows
    .filter((r) => r[1])
    .map(
      (r) =>
        `<tr><td>${r[0]}</td><td style="${r[0] === "Credibility Score" ? `color:${credColor};font-weight:600` : ""}">${r[1]}</td></tr>`,
    )
    .join("");

  // Warn if no backup
  const warnEl = document.getElementById("backupSubWarning");
  if (warnEl) warnEl.style.display = b ? "none" : "block";
}

function clearLockedSub() {
  delete bidData.sourcing.locked;
  delete bidData.sourcing.backup;
  bidData.sourcing.complete = false;
  save();
  document.getElementById("lockedSubPanel").classList.add("hidden");
}
