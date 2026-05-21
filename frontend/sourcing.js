/* ═══════════════════════════════════════════════
   sourcing.js — Step 3
   Manual-trigger AI sourcing → cards → lock sub
═══════════════════════════════════════════════ */

/* ─── SAM.GOV ENTITY VERIFICATION ─── */

async function verifyCandidatesOnSAM(candidates) {
  // Fire all lookups in parallel — gracefully degrade if API key not set
  const results = await Promise.allSettled(
    candidates.map((c) => verifySingleOnSAM(c)),
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    // Lookup failed — keep original candidate, mark as unverified
    return {
      ...candidates[i],
      samVerified: false,
      samError: true,
      far219_14_note:
        candidates[i].far219_14_note ||
        "SAM verification failed — verify manually",
    };
  });
}

async function verifySingleOnSAM(candidate) {
  try {
    const name = encodeURIComponent(candidate.name);
    const res = await fetch(
      `http://localhost:3001/api/sam-entity?name=${name}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.found) {
      return {
        ...candidate,
        samVerified: false,
        samNotFound: true,
        far219_14_note: "Not found in SAM.gov — verify manually",
        far219_14_status: "unknown",
      };
    }

    // Merge SAM data into candidate — SAM data wins over AI-guessed data
    return {
      ...candidate,
      samVerified: true,
      samNotFound: false,
      // Override cert fields with live SAM data
      certifications: data.certifications || candidate.certifications || [],
      isSmallBusiness: data.isSmallBusiness,
      far219_14_status: data.far219_14_status,
      far219_14_note: data.far219_14_note,
      samProfileUrl: data.samProfileUrl,
      // Pull confirmed identity fields
      samLegalName: data.entity.legalBusinessName,
      samUEI: data.entity.uei,
      samCAGE: data.entity.cage,
      samRegExpires: data.entity.registrationExpirationDate,
    };
  } catch (err) {
    return {
      ...candidate,
      samVerified: false,
      samError: true,
      far219_14_note:
        candidate.far219_14_note || "SAM lookup error — verify manually",
    };
  }
}

/* ─── PM SELF-PERFORMANCE ─── */

function savePMRole() {
  const pmRate =
    parseFloat(document.getElementById("pmHourlyRate")?.value) || 0;
  const pmHours =
    parseFloat(document.getElementById("pmWeeklyHours")?.value) || 0;
  const pmTitle =
    document.getElementById("pmTitle")?.value.trim() || "Project Manager";
  if (!pmRate) {
    showToast("Enter a PM hourly rate", true);
    return;
  }
  bidData.sourcing = { ...(bidData.sourcing || {}) };
  bidData.sourcing.pmRole = {
    title: pmTitle,
    hourlyRate: pmRate,
    weeklyHours: pmHours,
  };
  save();
  showToast(`✓ PM role saved — $${pmRate}/hr · ${pmHours} hrs/wk`);
  renderPMBadge();
}

function renderPMBadge() {
  const pm = bidData.sourcing?.pmRole;
  const badge = document.getElementById("pmRoleBadge");
  if (!badge) return;
  if (!pm) {
    badge.style.display = "none";
    return;
  }
  badge.style.display = "block";
  badge.innerHTML = `<span style="color:var(--gold);font-family:'Cinzel',serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">Prime PM — </span><span style="font-size:13px;color:var(--light)">${pm.title} · $${pm.hourlyRate}/hr · ${pm.weeklyHours} hrs/wk</span> <button class="secondary" style="padding:2px 8px;font-size:10px;margin-left:8px" onclick="clearPMRole()">✕</button>`;
}

function clearPMRole() {
  delete bidData.sourcing.pmRole;
  save();
  renderPMBadge();
  showToast("PM role cleared");
}

function initSourcingTab() {
  renderPMBadge();
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

CRITICAL RULES:
1. Prioritize SMALL and LOCAL companies — no Manpower, Adecco, or Kelly as first choices
2. Government/military experience strongly preferred but not required if the sub can perform the scope
3. Must be SCA wage-compliant capable
4. DO NOT filter by NAICS code — source based on whether the sub CAN PERFORM THE WORK, not whether their primary NAICS matches
5. FAR 52.219-14 AWARENESS: If the prime holds an SDVOSB set-aside, the prime must perform ≥50% of labor cost. Exception: if the sub is a certified Small Business, the 50% cap does not apply. Flag sub's small business certification status accurately
6. Return ONLY a JSON array of 4–6 candidates, no other text

Each object:
{
  "name": "Company Name",
  "type": "Staffing Agency|Licensed Sub|Labor Broker",
  "location": "city, state",
  "description": "1-2 sentences on what they do and why they fit this specific scope",
  "estimatedBillRate": 0.00,
  "billRateBasis": "e.g. WD base $22 × 1.55 markup",
  "sizeNote": "Small|Micro|Mid-size|Large",
  "govExperience": true|false,
  "yearsInBusiness": 0,
  "govContractsCompleted": 0,
  "similarContracts": "brief description of most relevant past work or empty string",
  "phone": "if known",
  "website": "if known",
  "certifications": ["SB","SDVOSB","WOSB","HUBZone","8(a)"],
  "sbsSearchName": "exact name to search on SBA SBS system",
  "far219_14_note": "Small Biz certified — 50% cap waived|Not SB certified — 50% labor cap applies|Unknown — verify on SBA SBS",
  "tags": ["tag1","tag2"]
}

Bill rate = WD base wage × 1.45–1.65 for small agencies on SCA government work.
certifications array should only include certifications you have reasonable confidence in — leave empty if unknown.`;

  const userMsg = `Contract details:
Location: ${intake.location}
Scope: ${intake.scope}
NAICS (context only, not a filter): ${intake.naics}
Labor categories: ${intake.laborCats}
WD floor: $${intake.baseWage}/hr base + $${intake.fringe}/hr fringe = $${((intake.baseWage || 0) + (intake.fringe || 0)).toFixed(2)}/hr total comp

Find local staffing agencies and subcontractors near ${intake.location} who can perform this scope. Small/local first. Source based on capability, not NAICS match.`;

  try {
    const response = await callClaude(
      [{ role: "user", content: userMsg }],
      SYSTEM,
      1200,
    );
    const clean = response.replace(/```json|```/g, "").trim();
    const candidates = JSON.parse(clean);

    // ── Auto-verify each candidate against SAM.gov Entity API ──
    const verified = await verifyCandidatesOnSAM(candidates);

    bidData.sourcing = { ...(bidData.sourcing || {}), _candidates: verified };
    save();
    renderSourcingCards(verified);
    showToast(
      `✓ Found ${verified.length} candidates — SAM verification complete`,
    );
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
      // SAM verification badge
      let samBadge = "";
      if (c.samVerified === true) {
        const nameMatch = c.samLegalName ? ` · ${c.samLegalName}` : "";
        const uei = c.samUEI ? ` · UEI: ${c.samUEI}` : "";
        samBadge = `<div style="margin-top:6px;padding:5px 8px;background:rgba(125,255,154,0.07);border:1px solid rgba(125,255,154,0.25);border-radius:3px;font-size:12px;color:var(--green)">✓ SAM Verified${nameMatch}${uei}</div>`;
      } else if (c.samNotFound) {
        samBadge = `<div style="margin-top:6px;padding:5px 8px;background:rgba(255,180,0,0.07);border:1px solid rgba(255,180,0,0.2);border-radius:3px;font-size:12px;color:var(--gold)">⚠ Not found in SAM.gov — verify manually</div>`;
      } else if (c.samError) {
        samBadge = `<div style="margin-top:6px;padding:5px 8px;background:rgba(255,80,80,0.07);border:1px solid rgba(255,80,80,0.2);border-radius:3px;font-size:12px;color:var(--dim)">SAM lookup unavailable — add SAM_API_KEY to .env</div>`;
      }

      // FAR 52.219-14 compliance color
      const farNote = c.far219_14_note || "";
      const farColor = /waived/i.test(farNote)
        ? "var(--green)"
        : /applies/i.test(farNote)
          ? "var(--danger)"
          : "var(--gold)";

      // SBA SBS search URL
      const sbsName = encodeURIComponent(c.sbsSearchName || c.name);
      const sbsUrl = `https://search.certifications.sba.gov/search/all?term=${sbsName}`;

      // Certifications badges
      const certs = c.certifications || [];
      const certBadges = certs.length
        ? certs
            .map(
              (cert) =>
                `<span class="sc-tag" style="color:var(--green);border-color:rgba(125,255,154,0.35)">${cert}</span>`,
            )
            .join("")
        : `<span style="font-size:11px;color:var(--dim)">Certs unknown — verify SBA SBS</span>`;

      return `
    <div class="sourcing-card ${isSel ? "selected" : ""}" onclick="toggleCardSelect(${i})" id="scard-${i}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="sc-name">${c.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${credColor};font-weight:600">${credScore}%</div>
      </div>
      <div class="sc-type">${c.type}${c.sizeNote ? " · " + c.sizeNote : ""}${c.govExperience ? " · <span style='color:var(--green)'>Gov Exp ✓</span>" : " · <span style='color:var(--dim)'>No Gov Exp</span>"}</div>
      <div class="sc-detail">${c.description}</div>
      ${samBadge}
      <div class="sc-rate">~$${(c.estimatedBillRate || 0).toFixed(2)}/hr</div>
      <div style="font-size:12px;color:var(--dim);margin-top:2px">${c.billRateBasis || ""}</div>
      <div style="font-size:13px;color:var(--dim);margin-top:6px">${c.location || ""}${c.phone ? " · " + c.phone : ""}</div>

      <!-- FAR 52.219-14 Notice -->
      <div style="margin-top:8px;padding:6px 8px;background:rgba(0,0,0,0.25);border-radius:3px;border-left:2px solid ${farColor}">
        <span style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.08em;color:${farColor};text-transform:uppercase">FAR 52.219-14 — </span>
        <span style="font-size:12px;color:var(--dim)">${farNote || "Verify small business status on SBA SBS"}</span>
      </div>

      <!-- Certifications -->
      <div style="margin-top:8px">
        <div style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.08em;color:rgba(201,168,76,0.6);text-transform:uppercase;margin-bottom:4px">Certifications</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${certBadges}</div>
      </div>

      <!-- SBA SBS Verify Button -->
      <div style="margin-top:8px">
        <a href="${sbsUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
          style="display:inline-block;font-family:'Cinzel',serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border:1px solid rgba(201,168,76,0.35);border-radius:2px;color:var(--gold);text-decoration:none;background:rgba(201,168,76,0.06)">
          Verify on SBA SBS ↗
        </a>
      </div>

      <div class="sc-tags" style="margin-top:8px">
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
    certifications: c.certifications || [],
    far219_14_note: c.far219_14_note || "",
    sbsSearchName: c.sbsSearchName || c.name,
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

  const sbsName = encodeURIComponent(s.sbsSearchName || s.name || "");
  const sbsUrl = `https://search.certifications.sba.gov/search/all?term=${sbsName}`;

  const farNote = s.far219_14_note || "";
  const farColor = /waived/i.test(farNote)
    ? "var(--green)"
    : /applies/i.test(farNote)
      ? "var(--danger)"
      : "var(--gold)";

  const rows = [
    ["Subcontractor", s.name],
    [
      "SAM Legal Name",
      s.samLegalName && s.samLegalName !== s.name ? s.samLegalName : "",
    ],
    ["UEI", s.samUEI || ""],
    ["CAGE", s.samCAGE || ""],
    [
      "SAM Registration",
      s.samVerified
        ? `✓ Active${s.samRegExpires ? " · Expires " + s.samRegExpires : ""}`
        : s.samNotFound
          ? "⚠ Not found in SAM"
          : "Not verified",
    ],
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
    [
      "Certifications",
      (s.certifications || []).join(", ") || "Unknown — verify SBA SBS",
    ],
    ["FAR 52.219-14", farNote || "Verify small biz status"],
    [
      "SBA SBS",
      s.name
        ? `<a href="${sbsUrl}" target="_blank" style="color:var(--gold);text-decoration:none">Verify ${s.name} on SBA SBS ↗</a>`
        : "",
    ],
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
        `<tr><td>${r[0]}</td><td style="${r[0] === "Credibility Score" ? `color:${credColor};font-weight:600` : r[0] === "FAR 52.219-14" ? `color:${farColor};font-weight:600` : ""}">${r[1]}</td></tr>`,
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
