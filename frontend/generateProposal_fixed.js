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

  // ── LOADING STATE ON ─────────────────────────────────────────
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

Example of correct format:

════════════════════════════════════════
SECTION B — PRICING SCHEDULE
════════════════════════════════════════

CLIN 0001 — Base Year Labor Rate: $42.50/hr
Estimated Hours: 2,080
Base Year Total: $88,400

Remember: in government contracting there is no "proposal" — there is a response document that addresses each section of the solicitation exactly as asked.`;

  const userMsg = `Build a complete government solicitation response document using the data below.

═══ CONTRACT DATA (from intake) ═══
Solicitation: ${intake.solId}
Agency: ${intake.agency}
Due Date: ${intake.dueDate}
Place of Performance: ${intake.location}
NAICS: ${intake.naics}
Set-Aside: ${intake.setAside}
Contract Period: ${intake.period}
Wage Determination: ${intake.wdNum}
Scope: ${intake.scope}
Labor Categories: ${intake.laborCats}
WD Base Wage: $${intake.baseWage}/hr | Fringe: $${intake.fringe}/hr | Floor: $${((intake.baseWage || 0) + (intake.fringe || 0)).toFixed(2)}/hr

═══ SUBCONTRACTOR ═══
${sourcing.name} | ${sourcing.location || ""} | Bill rate: $${(sourcing.billRate || 0).toFixed(2)}/hr
${sourcing.notes || ""}

═══ SECTION B — PRICING SCHEDULE ═══
CLIN 0001 Base Year Rate: ${secB.baseRate}
Estimated Hours: ${secB.hours}
Base Year Total: ${secB.total}
Option Years:
${secB.options || "(escalate 3% per year)"}
Total All Periods: ${secB.grandTotal}

═══ SECTION C — TECHNICAL APPROACH ═══
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
