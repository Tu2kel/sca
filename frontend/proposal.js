/* ═══════════════════════════════════════════════
   proposal.js — Step 5
   Automated SAM.gov response document → summary → export
═══════════════════════════════════════════════ */

async function generateProposal() {
  const intake = bidData.intake || {};
  const sourcing = bidData.sourcing?.locked || {};
  const pricing = bidData.pricing || {};

  if (!intake.solId) {
    showToast("Complete Intake first", true);
    return;
  }
  if (!sourcing.name) {
    showToast("Lock a subcontractor first", true);
    return;
  }
  if (!pricing.yourRate) {
    showToast("Lock pricing first", true);
    return;
  }

  const g = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  const gc = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const secB = {
    baseRate: g("pSecBBaseRate") || `$${pricing.yourRate.toFixed(2)}/hr`,
    hours: g("pSecBHours") || (pricing.hours || 2080).toLocaleString(),
    total:
      g("pSecBTotal") ||
      `$${pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    options: g("pSecBOptions"),
    grandTotal:
      g("pSecBGrandTotal") ||
      `$${pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
  };
  const secC = { approach: g("pSecCApproach"), staffing: g("pSecCStaffing") };
  const secH = {
    pm: g("pSecHPM"),
    sup: g("pSecHSup"),
    qc: g("pSecHQC"),
    sub: g("pSecHSub"),
  };
  const secK = {
    sam: gc("certSam"),
    sdvo: gc("certSdvosb"),
    sca: gc("certSca"),
    small: gc("certSmall"),
    eeo: gc("certEeo"),
    debt: gc("certDebt"),
    extra: g("pSecKExtra"),
  };
  const secL = { past: g("pSecLPast"), qual: g("pSecLQual") };
  const special = g("pSecSpecial");

  // ── LOADING STATE ON ────────────────────────────────────────
  const think = document.getElementById("proposalThinking");
  const btn = document.getElementById("proposalGenBtn");
  if (think) think.classList.remove("hidden");
  if (btn) btn.disabled = true;
  // ────────────────────────────────────────────────────────────

  const SYSTEM = `You are a government contracting response document specialist for The House of Kel LLC — SDVOSB, Killeen TX, CAGE 152U4.

You produce government solicitation response documents. Structure your output using PLAIN TEXT ONLY.

CRITICAL FORMATTING RULES — FOLLOW EXACTLY:
1. NO markdown. No #, ##, **, *, --, ___, or any markdown syntax whatsoever.
2. Separate each section with a line of exactly: ════════════════════════════════════════
3. Then write the section header in ALL CAPS, e.g.: SECTION B — PRICING SCHEDULE
4. Then another line of: ════════════════════════════════════════
5. Body text is plain prose. No bullet dashes. Use numbered lists only when needed.
6. Bold is written in CAPS, not with asterisks.

NARRATIVE STYLE RULES:
- Write as if you have physically been to this site and understand the specific challenges.
- Use the agency name, location, and contract type naturally throughout — never generic.
- Risk mitigation statements must reference specific risks from the solicitation, not generic boilerplate.
- "Why Us" section must be specific to this contract — never copy-paste language.

Example of correct format:

════════════════════════════════════════
SECTION B — PRICING SCHEDULE
════════════════════════════════════════

CLIN 0001 — Base Year Labor Rate: $42.50/hr
Estimated Hours: 2,080
Base Year Total: $88,400

Remember: in government contracting there is no "proposal" — there is a response document that addresses each section of the solicitation exactly as asked.`;

  const backup = bidData.sourcing?.backup;
  const pricing_strategy = bidData.pricing?.strategyNote || "";
  const evalType = bidData.pricing?.evalType || "LPTA";
  const targetRate = bidData.pricing?.targetWinPrice;

  const userMsg = `Build a complete government solicitation response document using the data below.

═══ CONTRACT DATA (from intake) ═══
Solicitation: ${intake.solId}
Agency: ${intake.agency}
Due Date: ${intake.dueDate}
Place of Performance: ${intake.location}
NAICS: ${intake.naics}
Set-Aside: ${intake.setAside}
Contract Period: ${intake.period}
Evaluation Type: ${evalType}
Wage Determination: ${intake.wdNum}
Scope: ${intake.scope}
Labor Categories: ${intake.laborCats}
WD Base Wage: $${intake.baseWage}/hr | Fringe: $${intake.fringe}/hr | Floor: $${((intake.baseWage || 0) + (intake.fringe || 0)).toFixed(2)}/hr
Risk Notes: ${intake.riskNotes || "None noted"}

═══ SUBCONTRACTOR ═══
PRIMARY: ${sourcing.name} | ${sourcing.location || ""} | Bill rate: $${(sourcing.billRate || 0).toFixed(2)}/hr
Gov Experience: ${sourcing.govExperience ? "Yes" : "No"} | Years in Business: ${sourcing.yearsInBusiness || "Unknown"} | Gov Contracts: ${sourcing.govContractsCompleted || 0}
Similar Work: ${sourcing.similarContracts || "Not specified"}
${backup ? `BACKUP: ${backup.name} | ${backup.location || ""} | Gov Exp: ${backup.govExperience ? "Yes" : "No"}` : "BACKUP: To be identified — Prime will maintain contingency staffing capability"}
${sourcing.notes || ""}

═══ SECTION B — PRICING SCHEDULE ═══
CLIN 0001 Base Year Rate: ${secB.baseRate}
Estimated Hours: ${secB.hours}
Base Year Total: ${secB.total}
Option Years:
${secB.options || "(escalate 3% per year)"}
Total All Periods: ${secB.grandTotal}
${targetRate ? `Pricing Strategy: ${pricing_strategy} — Target win price $${targetRate.toFixed(2)}/hr` : ""}

═══ SECTION C — TECHNICAL APPROACH ═══
IMPORTANT: Write this section with LOCATION-SPECIFIC and AGENCY-SPECIFIC language. Reference "${intake.agency}" and "${intake.location}" naturally. Do NOT write generic boilerplate. Show you understand this specific site, this specific agency, and this specific scope.
${secC.approach || "[Describe how you will perform the SOW tasks]"}

Staffing Plan:
${secC.staffing || "Labor sourced via vetted subcontractor, SCA-compliant, backup staffing in place"}

═══ SECTION H/I — MANAGEMENT & KEY PERSONNEL ═══
Program Manager: ${secH.pm || "Anthony K. Kelley, Owner/PM — (254) 226-5216 — anthony@ifedlog.com"}
On-Site Supervisor: ${secH.sup || "Assigned from subcontractor prior to award"}
Quality Control:
${secH.qc || "Daily site inspection, incident reporting within 2 hours, monthly QASP self-assessment"}
Subcontractor Management:
${secH.sub || "Prime oversight of all sub performance, SCA flow-down in subcontract agreement"}

═══ SECTION K — REPRESENTATIONS & CERTIFICATIONS ═══
SAM.gov Active: ${secK.sam ? "✓ Confirmed" : "⚠ VERIFY"}
SDVOSB Verified: ${secK.sdvo ? "✓ Confirmed" : "⚠ VERIFY"}
SCA Compliance: ${secK.sca ? "✓ Acknowledged" : "⚠ VERIFY"}
Small Business: ${secK.small ? "✓ Confirmed" : "⚠ VERIFY"}
EEO (FAR 52.222-26): ${secK.eeo ? "✓ Confirmed" : "⚠ VERIFY"}
No Federal Debt: ${secK.debt ? "✓ Confirmed" : "⚠ VERIFY"}
Additional: ${secK.extra || "None"}

═══ SECTION L — PAST PERFORMANCE ═══
${secL.past || "Emerging SDVOSB — no prior federal contracts. See qualifications below."}

Qualifications & Differentiators:
${secL.qual || "SDVOSB status, Fort Cavazos proximity, veteran leadership, SCA compliance infrastructure"}

═══ RISK MITIGATION ═══
Write a dedicated RISK MITIGATION section that identifies the TOP 3 RISKS specific to this contract and explains exactly how The House of Kel LLC mitigates each. Base risks on: scope type (${intake.naics}), location (${intake.location}), agency (${intake.agency}), and risk notes (${intake.riskNotes || "none"}). Be specific — not generic.

═══ WHY US ═══
Write a sharp, specific "WHY THE HOUSE OF KEL LLC" section — 3-5 sentences max. This must be tailored to THIS contract at THIS agency at THIS location. Mention SDVOSB advantage for this specific set-aside type (${intake.setAside}), proximity/local knowledge, and the specific sub execution model. NO generic veteran-owned boilerplate.

═══ SOLICITATION-SPECIFIC REQUIREMENTS ═══
${special || "None noted beyond standard SOW requirements"}

Format the response document with clear section headers matching the solicitation format (SECTION B, SECTION C, etc.). Include a cover page block at top with company info. End with signature block.`;

  try {
    const doc = await callClaude(
      [{ role: "user", content: userMsg }],
      SYSTEM,
      2000,
    );
    document.getElementById("proposalBox").textContent = doc;
    document.getElementById("proposalPanel").style.display = "block";
    buildBidSummary();
    showToast("✓ Response document generated");
  } catch (e) {
    showToast("Generation failed — check proxy connection", true);
    console.error("generateProposal error:", e);
  } finally {
    // ── LOADING STATE OFF — always runs, even on error ──────────
    if (think) think.classList.add("hidden");
    if (btn) btn.disabled = false;
    // ────────────────────────────────────────────────────────────
  }
}

/* ─────────────────────────────────────────────────────────────────
   initProposalStep — pre-fills all section fields from locked data
───────────────────────────────────────────────────────────────── */
function initProposalStep() {
  const intake = bidData.intake || {};
  const sourcing = bidData.sourcing?.locked || {};
  const pricing = bidData.pricing || {};

  if (!intake.solId) return;

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && v && !el.value) el.value = v;
  };

  /* ── SECTION B — PRICING ── */
  if (pricing.yourRate)
    set("pSecBBaseRate", `$${pricing.yourRate.toFixed(2)}/hr`);
  if (pricing.hours) set("pSecBHours", Number(pricing.hours).toLocaleString());
  if (pricing.totalValue)
    set(
      "pSecBTotal",
      `$${pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );

  if (pricing.yourRate && pricing.hours) {
    const r = pricing.yourRate;
    const h = pricing.hours;
    const optLines = [1, 2, 3, 4].map((y) => {
      const rate = r * Math.pow(1.03, y);
      return `Option Year ${y}: $${rate.toFixed(2)}/hr × ${Number(h).toLocaleString()} hrs = $${(rate * h).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    });
    set("pSecBOptions", optLines.join("\n"));
    const grandTotal =
      pricing.totalValue +
      optLines.reduce((sum, _, y) => {
        return sum + pricing.yourRate * Math.pow(1.03, y + 1) * pricing.hours;
      }, 0);
    set(
      "pSecBGrandTotal",
      `$${grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );
  }

  /* ── SECTION C — TECHNICAL APPROACH ── */
  const techApproach = [
    intake.scope ? `SCOPE ACKNOWLEDGMENT: ${intake.scope}` : "",
    intake.laborCats
      ? `WORKFORCE / LABOR CATEGORIES:\n${intake.laborCats}`
      : "",
    sourcing.name
      ? `SUBCONTRACTOR EXECUTION MODEL: The House of Kel LLC will serve as prime contractor and will execute field labor through ${sourcing.name}${sourcing.location ? " located in " + sourcing.location : ""}. Prime contractor retains full responsibility for contract performance, quality control, communication with the Government, and compliance oversight.`
      : "",
    sourcing.billRate
      ? `SUBCONTRACTOR BILL RATE: $${sourcing.billRate.toFixed(2)}/hr`
      : "",
    intake.riskNotes ? `COMPLIANCE / RISK NOTES:\n${intake.riskNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  set("pSecCApproach", techApproach);

  const staffingPlan = [
    `Prime contractor: The House of Kel LLC — SDVOSB — CAGE 152U4 — Killeen, Texas`,
    sourcing.name
      ? `Primary labor subcontractor: ${sourcing.name}${sourcing.location ? " — " + sourcing.location : ""}${sourcing.govExperience ? " — Gov experience confirmed" : ""}`
      : "",
    bidData.sourcing?.backup?.name
      ? `Backup subcontractor: ${bidData.sourcing.backup.name}${bidData.sourcing.backup.location ? " — " + bidData.sourcing.backup.location : ""} — activated for call-outs, absences, or surge needs`
      : `Backup staffing protocol: Prime maintains a secondary labor source — to be activated for call-outs, absences, surge demands, or replacement personnel.`,
    `SCA wage floor: $${((intake.baseWage || 0) + (intake.fringe || 0)).toFixed(2)}/hr`,
    intake.baseWage || intake.fringe
      ? `WD breakdown: base $${intake.baseWage || 0}/hr + fringe $${intake.fringe || 0}/hr`
      : "",
    `Prime oversight: performance monitoring, subcontractor coordination, issue escalation, and Government communication remain with The House of Kel LLC at all times.`,
  ]
    .filter(Boolean)
    .join("\n");
  set("pSecCStaffing", staffingPlan);

  /* ── SECTION H/I — MANAGEMENT ── */
  set(
    "pSecHPM",
    `Anthony K. Kelley — Owner / Program Manager — The House of Kel LLC — Killeen, Texas — (254) 226-5216 — anthony@ifedlog.com`,
  );
  set(
    "pSecHSup",
    sourcing.name
      ? `On-site supervisor assigned by ${sourcing.name} prior to performance start. Supervisor will coordinate daily field activity and report issues to the prime contractor.`
      : "On-site supervisor to be assigned prior to performance start.",
  );
  set(
    "pSecHQC",
    `Quality control will be managed by the prime contractor through documented inspection, performance tracking, deficiency correction, and communication with the Contracting Officer or COR as required. Daily field status will be reviewed by the on-site supervisor. Deficiencies will be documented, corrected, and escalated within the required solicitation timelines.`,
  );
  set(
    "pSecHSub",
    `${sourcing.name || "Subcontractor"} will operate under a written subcontract agreement. Applicable FAR clauses, SCA wage requirements, insurance requirements, safety requirements, confidentiality requirements, and performance obligations will be flowed down. The House of Kel LLC remains fully accountable for contract performance.`,
  );

  /* ── SECTION K — REPS & CERTS (pre-check all) ── */
  [
    "certSam",
    "certSdvosb",
    "certSca",
    "certSmall",
    "certEeo",
    "certDebt",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = true;
  });
  set(
    "pSecKExtra",
    [
      `SAM.gov registration active and current.`,
      `CAGE Code 152U4.`,
      `Service-Disabled Veteran-Owned Small Business status represented for this response.`,
      `General Liability: $1M per occurrence / $2M aggregate.`,
      `Workers Compensation: statutory limits as required.`,
      `No known SAM.gov exclusions.`,
      intake.wdNum ? `Wage Determination ${intake.wdNum} acknowledged.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  /* ── SECTION L — PAST PERFORMANCE ── */
  set(
    "pSecLPast",
    `The House of Kel LLC is an emerging federal contractor. Where the solicitation permits, absence of CPARS-rated federal past performance should be treated as neutral rather than unfavorable. The response relies on the prime contractor's management control and the locked subcontractor's field labor capability.`,
  );
  set(
    "pSecLQual",
    [
      `SDVOSB prime contractor with veteran ownership and direct accountability for performance.`,
      `Subcontractor execution model allows local labor deployment near the place of performance.`,
      `Pricing model includes SCA wage floor awareness and subcontractor bill rate inputs.`,
      `Prime contractor controls quality assurance, subcontractor management, reporting, and Government communication.`,
      sourcing.name
        ? `Locked subcontractor path: ${sourcing.name}${sourcing.location ? " — " + sourcing.location : ""}.`
        : "",
      intake.naics ? `NAICS identified: ${intake.naics}.` : "",
      intake.location ? `Place of performance: ${intake.location}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  /* ── SOLICITATION-SPECIFIC ── */
  const specials = [];
  if (intake.riskNotes) specials.push(intake.riskNotes);
  if (intake.setAside)
    specials.push(
      `Set-aside: ${intake.setAside}. Eligibility must be confirmed against the solicitation.`,
    );
  if (intake.period)
    specials.push(
      `Contract period: ${intake.period}. Pricing includes base and option-year structure where applicable.`,
    );
  if (intake.wdNum)
    specials.push(
      `Wage Determination: ${intake.wdNum}. Labor pricing must remain compliant through performance.`,
    );
  if (specials.length) set("pSecSpecial", specials.join("\n"));
}

/* ─────────────────────────────────────────────────────────────────
   buildBidSummary — renders the locked bid summary table
───────────────────────────────────────────────────────────────── */
function buildBidSummary() {
  const intake = bidData.intake || {};
  const sourcing = bidData.sourcing?.locked || {};
  const pricing = bidData.pricing || {};

  const rows = [
    ["Solicitation", intake.solId || "—"],
    ["Agency", intake.agency || "—"],
    ["Due Date", intake.dueDate || "—"],
    ["Location", intake.location || "—"],
    ["Set-Aside", intake.setAside || "—"],
    ["Subcontractor", sourcing.name || "—"],
    [
      "Bill Rate (COGS)",
      sourcing.billRate ? `$${sourcing.billRate.toFixed(2)}/hr` : "—",
    ],
    [
      "Your Rate to Gov",
      pricing.yourRate ? `$${pricing.yourRate.toFixed(2)}/hr` : "—",
    ],
    ["Gross Margin", pricing.gpPct ? `${pricing.gpPct.toFixed(1)}%` : "—"],
    [
      "Total Contract",
      pricing.totalValue
        ? `$${pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : "—",
    ],
    [
      "Net to Owner",
      pricing.netOwner
        ? `$${pricing.netOwner.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : "—",
    ],
  ];

  document.getElementById("bidSummaryTable").innerHTML = rows
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  document.getElementById("bidSummaryPanel").style.display = "block";
  bidData.proposal = { complete: true };
  save();
}

/* ─────────────────────────────────────────────────────────────────
   Copy / Download helpers
───────────────────────────────────────────────────────────────── */
function copyProposal() {
  copyToClipboard(document.getElementById("proposalBox").textContent);
}

function downloadProposal() {
  const text = document.getElementById("proposalBox").textContent;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  a.download = `response_document_${bidData.intake?.solId || "bid"}_${Date.now()}.txt`;
  a.click();
  showToast("✓ Downloaded");
}

/* ─────────────────────────────────────────────────────────────────
   printProposal — opens a formatted print window
───────────────────────────────────────────────────────────────── */
function printProposal() {
  const text = document.getElementById("proposalBox").textContent;
  const intake = bidData.intake || {};
  const pricing = bidData.pricing || {};
  const sourcing = bidData.sourcing?.locked || {};
  const logoSrc = "ifl_goldLogo.png";

  // SAM section patterns → red divider + red header
  const SAM_SECTIONS = [
    /^SECTION\s+[A-Z]/i,
    /^ATTACHMENTS\s*[\/\-–]\s*EXHIBITS/i,
  ];
  const isSamSection = (line) => SAM_SECTIONS.some((r) => r.test(line));

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Response Document — ${intake.solId || "IFL"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #faf7f2;
    color: #1a0a12;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 12pt;
    line-height: 1.6;
    padding: 0.6in 0.7in;
  }

  /* ── LETTERHEAD ── */
  .letterhead {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    padding: 20px 0 16px 0;
    margin-bottom: 24px;
    border-bottom: 1.5px solid rgba(138,92,0,0.38);
    background: linear-gradient(135deg, #faf7f2 0%, #f5f0e8 50%, #faf7f2 100%);
  }
  .logo-box { flex-shrink: 0; }
  .letterhead img { height: 88px; width: auto; display: block; }
  .lh-text { flex: 1; }
  .lh-name {
    font-family: 'Cinzel', serif;
    font-size: 25px;
    font-weight: 900;
    white-space: nowrap;
    background: linear-gradient(to bottom, #8a5c00 22%, #c9930a 45%, #a07010 50%, #7a5000 55%, #b8860b 78%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .lh-sub-label {
    font-family: 'Cinzel', serif;
    font-size: 8px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(0, 0, 0, 0.8);
    margin-top: 4px;
    font-style: italic;
  }
  .lh-sub {
    font-family: 'Cinzel', serif;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgb(0, 0, 0);
    margin-top: 2px;
  }
  .lh-right {
    text-align: right;
    font-size: 8.5pt;
    color: rgb(0, 0, 0);
    font-family: 'Cinzel', serif;
    letter-spacing: 0.06em;
    line-height: 1.6;
  }

  /* ── META STRIP ── */
  .meta-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid rgba(138,92,0,0.3);
    border-radius: 3px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .meta-cell {
    padding: 8px 12px;
    border-right: 1px solid rgba(138,92,0,0.2);
    border-bottom: 1px solid rgba(138,92,0,0.14);
    background: rgba(138,92,0,0.03);
  }
  .meta-cell:nth-child(3n) { border-right: none; }
  .meta-cell:nth-last-child(-n+3) { border-bottom: none; }
  .mc-label {
    font-family: 'Cinzel', serif;
    font-size: 7pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #7a5000;
    margin-bottom: 2px;
  }
  .mc-val { font-size: 10pt; color: #1a0a12; font-weight: 600; }

  /* ── DIVIDERS ── */
  .gold-divider {
    position: relative;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(160,110,0,0.7) 20%, rgba(160,110,0,0.7) 80%, transparent);
    margin: 20px 0;
  }
  .gold-divider::after {
    content: "◆";
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    font-size: 7px;
    color: #8a5c00;
    background: #faf7f2;
    padding: 0 10px;
    line-height: 1;
  }
  .red-divider {
    position: relative;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(122,0,18,0.75) 15%, rgba(122,0,18,0.75) 85%, transparent);
    margin: 22px 0 14px 0;
  }
  .red-divider::after {
    content: "◆";
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    font-size: 7px;
    color: #7a0012;
    background: #faf7f2;
    padding: 0 10px;
    line-height: 1;
  }

  /* ── BODY ── */
  .proposal-body {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 11pt;
    line-height: 1.72;
    color: #1a0a12;
    word-break: break-word;
  }
  .proposal-body p { margin: 0 0 9px 0; }

  .section-head-gold {
    font-family: 'Cinzel', serif;
    font-size: 10pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7a5000;
    margin: 6px 0 4px 0;
    font-weight: 700;
  }
  .section-head-red {
    font-family: 'Cinzel', serif;
    font-size: 10pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7a0012;
    margin: 6px 0 4px 0;
    font-weight: 700;
  }

  /* ── SIGNATURE BLOCK ── */
  .sig-block { margin-top: 36px; padding: 20px 0 0 0; }
  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px 48px;
    margin-top: 16px;
  }
  .sig-field { display: flex; flex-direction: column; gap: 4px; }
  .sig-label {
    font-family: 'Cinzel', serif;
    font-size: 7pt;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #7a5000;
  }
  .sig-line { border-bottom: 1px solid rgba(26,10,18,0.35);  }
  .sig-prefill { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: #1a0a12; padding-top: 4px; }
  .sig-full-width { grid-column: 1 / -1; }

  /* ── COLOPHON ── */
  .colophon { margin-top: 32px; display: flex; justify-content: center; opacity: 0.18; }
  .colophon img { height: 200px; width: auto; display: block; }

  /* ── FOOTER ── */
  .print-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid rgba(138,92,0,0.3);
    display: flex;
    justify-content: space-between;
    font-family: 'Cinzel', serif;
    font-size: 7.5pt;
    letter-spacing: 0.1em;
    color: rgba(26,10,18,0.4);
    text-transform: uppercase;
  }

  @media print {
    body { padding: 0; background: #faf7f2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: letter; margin: 0.6in 0.7in; }
  }
</style>
</head>
<body>

<div class="letterhead">
  <div class="logo-box"><img src="${logoSrc}" alt="Imperio Federal Logistics"/></div>
  <div class="lh-text">
    <div class="lh-name">Imperio Federal Logistics</div>
    <div class="lh-sub-label">A Division of</div>
    <div class="lh-sub">The House of Kel LLC &nbsp;·&nbsp; CAGE 152U4 &nbsp;·&nbsp; SDVOSB &nbsp;·&nbsp; Killeen, Texas</div>
  </div>
  <div class="lh-right">
    Prepared: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}<br/>
    Solicitation: ${intake.solId || "—"}
  </div>
</div>

<div class="meta-strip">
  <div class="meta-cell"><div class="mc-label">Agency</div><div class="mc-val">${intake.agency || "—"}</div></div>
  <div class="meta-cell"><div class="mc-label">Due Date</div><div class="mc-val">${intake.dueDate || "—"}</div></div>
  <div class="meta-cell"><div class="mc-label">Set-Aside</div><div class="mc-val">${intake.setAside || "SDVOSB"}</div></div>
  <div class="meta-cell"><div class="mc-label">Location</div><div class="mc-val">${intake.location || "—"}</div></div>
  <div class="meta-cell"><div class="mc-label">Your Rate</div><div class="mc-val">${pricing.yourRate ? "$" + pricing.yourRate.toFixed(2) + "/hr" : "—"}</div></div>
  <div class="meta-cell"><div class="mc-label">Contract Value</div><div class="mc-val">${pricing.totalValue ? "$" + pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</div></div>
</div>

<div class="proposal-body">${(() => {
    const escHtml = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = text.split("\n");
    let out = "";
    let lastWasDivider = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const isDivider = line.length >= 3 && /^([═─—\-_=*]{3,})$/.test(line);
      if (isDivider) {
        if (!lastWasDivider) out += '<div class="gold-divider"></div>';
        lastWasDivider = true;
        continue;
      }
      lastWasDivider = false;

      if (!line) {
        out += '<div style="height:8px"></div>';
        continue;
      }

      const mdMatch =
        line.match(/^#{1,3}\s+(.+)/) ||
        line.match(/^\*{2}(SECTION [^*]+)\*{2}/);
      const plainSec =
        /^SECTION\s+[A-Z]/i.test(line) ||
        /^ATTACHMENTS\s*[\/\-–]\s*EXHIBITS/i.test(line);
      // SIGNATURE BLOCK intentionally excluded — rendered as static sig-block below

      if (mdMatch || plainSec) {
        const label = mdMatch ? mdMatch[1] : line;
        const esc = escHtml(label);
        const isSam = isSamSection(label);
        out = out.replace(/(<div class="gold-divider"><\/div>\s*)+$/, "");
        if (isSam) {
          out += '<div class="red-divider"></div>';
          out += '<div class="section-head-red">' + esc + "</div>";
        } else {
          out += '<div class="gold-divider"></div>';
          out += '<div class="section-head-gold">' + esc + "</div>";
        }
        lastWasDivider = true;
        continue;
      }

      let clean = escHtml(line)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\`(.+?)\`/g, "<code>$1</code>");
      out += "<p>" + clean + "</p>";
    }
    return out;
  })()}</div>

<div class="sig-block">
  <div class="red-divider"></div>
  <div class="section-head-red">Signature Block</div>
  <div class="sig-grid">
    <div class="sig-field">
      <div class="sig-label">Authorized Signature</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Date</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Printed Name</div>
      <div class="sig-prefill">Anthony K. Kelley</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Title</div>
      <div class="sig-prefill">Owner / Program Manager</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field sig-full-width">
      <div class="sig-label">Company</div>
      <div class="sig-prefill">The House of Kel LLC &nbsp;·&nbsp; CAGE 152U4 &nbsp;·&nbsp; SDVOSB &nbsp;·&nbsp; Killeen, Texas</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Phone</div>
      <div class="sig-prefill">(254) 226-5216</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Email</div>
      <div class="sig-prefill">anthony@ifedlog.com</div>
      <div class="sig-line"></div>
    </div>
  </div>
</div>

<div class="colophon">
  <img src="thokDagger_ifl.png" alt=""/>
</div>

<div class="print-footer">
  <span>The House of Kel LLC &nbsp;|&nbsp; CAGE 152U4 &nbsp;|&nbsp; SDVOSB</span>
  <span>Confidential &nbsp;|&nbsp; ${new Date().getFullYear()}</span>
</div>

</body>
</html>`;

  const w = window.open("", "", "height=900,width=800");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 800);
}
