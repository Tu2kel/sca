/* ═══════════════════════════════════════════════
   winscore.js — Win-Score Gate
   Evaluates bid readiness before submission.
   Blocks / warns based on hard rules.
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

const WIN_CHECKS = [
  // id, label, weight, eval fn → true = pass
  { id:"ws_intake",    label:"Intake complete",               weight:10, fn: ()=> !!bidData.intake?.complete },
  { id:"ws_evaltype",  label:"Evaluation type set (LPTA/BV)", weight:5,  fn: ()=> !!bidData.intake?.evalType },
  { id:"ws_sourcing",  label:"Primary sub locked",            weight:15, fn: ()=> !!bidData.sourcing?.locked?.name },
  { id:"ws_backup",    label:"Backup sub set",                weight:10, fn: ()=> !!bidData.sourcing?.backup?.name },
  { id:"ws_pricing",   label:"Pricing locked",                weight:15, fn: ()=> !!bidData.pricing?.complete },
  { id:"ws_floor",     label:"Price above WD floor",          weight:15, fn: ()=> {
      const p = bidData.pricing;
      if(!p) return false;
      return !p.wageFloor || p.billRate >= p.wageFloor;
  }},
  { id:"ws_margin",    label:"Margin ≥ 15%",                  weight:10, fn: ()=> (bidData.pricing?.gpPct||0) >= 15 },
  { id:"ws_target",    label:"Rate within target win range",  weight:10, fn: ()=> {
      const p = bidData.pricing;
      if(!p?.yourRate || !p?.targetWinPrice) return true; // no target set = skip
      return Math.abs(p.yourRate - p.targetWinPrice) <= 4;
  }},
  { id:"ws_proposal",  label:"Proposal generated",            weight:5,  fn: ()=> !!bidData.proposal?.complete },
  { id:"ws_compliance",label:"Compliance ≥ 70%",              weight:5,  fn: ()=> {
      if(typeof COMPLIANCE_ITEMS === "undefined") return true;
      const state = JSON.parse(localStorage.getItem(`ifl_compliance_${bidData.intake?.solId||"general"}`) || "{}");
      const done  = COMPLIANCE_ITEMS.filter(i => state[i.id]).length;
      return (done / COMPLIANCE_ITEMS.length) * 100 >= 70;
  }},
];

const HARD_BLOCKS = ["ws_intake","ws_sourcing","ws_pricing","ws_floor"];

function calcWinScore() {
  const totalWeight = WIN_CHECKS.reduce((s,c) => s + c.weight, 0);
  let earned = 0;
  const results = WIN_CHECKS.map(c => {
    const pass = c.fn();
    if(pass) earned += c.weight;
    return { ...c, pass };
  });
  return { score: Math.round((earned / totalWeight) * 100), results };
}

function renderWinScore(targetEl) {
  const { score, results } = calcWinScore();
  const blocked = results.filter(r => HARD_BLOCKS.includes(r.id) && !r.pass);
  const warnings = results.filter(r => !HARD_BLOCKS.includes(r.id) && !r.pass);

  const color = score >= 80 ? "var(--green)" : score >= 60 ? "var(--gold)" : "var(--danger)";

  const el = document.getElementById(targetEl);
  if(!el) return { score, blocked };

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-family:'Cinzel',serif;font-size:11px;letter-spacing:.12em;
          text-transform:uppercase;color:var(--gold);margin-bottom:4px">Win Readiness Score</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:36px;font-weight:600;
          color:${color};line-height:1">${score}%</div>
      </div>
      <div style="text-align:right;font-size:13px;color:var(--dim)">
        ${blocked.length ? `<div style="color:var(--danger)">⛔ ${blocked.length} hard block${blocked.length>1?"s":""}</div>` : '<div style="color:var(--green)">✓ No hard blocks</div>'}
        ${warnings.length ? `<div style="color:var(--gold)">⚠ ${warnings.length} warning${warnings.length>1?"s":""}</div>` : ""}
      </div>
    </div>

    <div style="height:8px;background:rgba(255,255,255,.08);border-radius:4px;margin-bottom:18px;overflow:hidden">
      <div style="height:100%;width:${score}%;background:${color};border-radius:4px;transition:width .5s"></div>
    </div>

    <div style="display:grid;gap:6px">
      ${results.map(r => `
        <div style="
          display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;
          padding:8px 12px;border-radius:4px;font-size:14px;
          background:${r.pass ? "rgba(125,255,154,.06)" : HARD_BLOCKS.includes(r.id) ? "rgba(255,154,154,.08)" : "rgba(201,168,76,.06)"};
          border:1px solid ${r.pass ? "rgba(125,255,154,.2)" : HARD_BLOCKS.includes(r.id) ? "rgba(255,154,154,.25)" : "rgba(201,168,76,.2)"}
        ">
          <span style="font-size:16px">${r.pass ? "✓" : HARD_BLOCKS.includes(r.id) ? "⛔" : "⚠"}</span>
          <span style="color:${r.pass ? "var(--light)" : "var(--dim)"}">${r.label}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;
            color:var(--dim)">${r.weight}pt</span>
        </div>
      `).join("")}
    </div>

    ${blocked.length ? `
      <div style="margin-top:14px;padding:12px 16px;background:rgba(255,154,154,.08);
        border:1px solid rgba(255,154,154,.3);border-radius:5px;font-size:13px;color:var(--danger)">
        ⛔ Submission blocked. Fix: ${blocked.map(b=>b.label).join(" · ")}
      </div>` : score >= 75 ? `
      <div style="margin-top:14px;padding:12px 16px;background:rgba(125,255,154,.07);
        border:1px solid rgba(125,255,154,.25);border-radius:5px;font-size:13px;color:var(--green)">
        ✓ Bid is ready to submit. Score: ${score}%
      </div>` : `
      <div style="margin-top:14px;padding:12px 16px;background:rgba(201,168,76,.08);
        border:1px solid rgba(201,168,76,.25);border-radius:5px;font-size:13px;color:var(--gold)">
        ⚠ Submittable but not fully optimized. Address warnings to improve win probability.
      </div>`
    }
  `;
  return { score, blocked };
}

/* ─── GATE CHECK — called by submit.js before logging ─── */
function winScoreGate() {
  const { score, blocked } = calcWinScore();
  if(blocked.length) {
    showToast(`⛔ Blocked: ${blocked.map(b=>b.label).join(", ")}`, true);
    return false;
  }
  if(score < 60) {
    return confirm(`Win score is ${score}% — below 60. Submit anyway?`);
  }
  if(score < 75) {
    return confirm(`Win score is ${score}% — some items incomplete. Submit anyway?`);
  }
  return true;
}

function initWinScore() {
  renderWinScore("winScorePanel");
}
