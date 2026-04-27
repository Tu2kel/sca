/* ═══════════════════════════════════════════════
   pricing.js — Step 4
   Auto-populate from intake/sourcing → calc → confirm
═══════════════════════════════════════════════ */

function autoPopulatePricing() {
  const intake = bidData.intake || {};
  const sourcing = bidData.sourcing?.locked || {};

  const billEl = document.getElementById("pBillRate");
  const floorEl = document.getElementById("pWageFloor");
  const hoursEl = document.getElementById("pHours");

  if (sourcing.billRate && billEl && !billEl.value)
    billEl.value = sourcing.billRate.toFixed(2);

  if (intake.baseWage && intake.fringe && floorEl && !floorEl.value)
    floorEl.value = (intake.baseWage + intake.fringe).toFixed(2);

  if (hoursEl && !hoursEl.value) hoursEl.value = "2080";

  // Auto-set eval type from intake if captured
  const evalEl = document.getElementById("pEvalType");
  if (evalEl && intake.evalType && !evalEl.value)
    evalEl.value = intake.evalType;

  // Restore confirmed pricing if already locked
  if (bidData.pricing?.complete) {
    document.getElementById("pricingConfirmedPanel").classList.remove("hidden");
    const p = bidData.pricing;
    document.getElementById("pricingConfirmedSummary").innerHTML =
      `Rate: <strong class="mono">$${p.yourRate.toFixed(2)}/hr</strong> · ` +
      `GP: <strong class="mono">$${p.gp.toFixed(2)}/hr</strong> · ` +
      `Total: <strong class="mono">$${p.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong> · ` +
      `Net: <strong class="mono">$${p.netOwner.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>`;
  }
}

function calcPricing() {
  const billRate = parseFloat(document.getElementById("pBillRate").value) || 0;
  const wageFloor =
    parseFloat(document.getElementById("pWageFloor").value) || 0;
  const hours = parseFloat(document.getElementById("pHours").value) || 2080;
  const overheadPct =
    parseFloat(document.getElementById("pOverhead").value) || 12;
  const marginPct = parseFloat(document.getElementById("pMargin").value) || 20;
  const evalType = document.getElementById("pEvalType")?.value || "LPTA";
  const strategy = document.getElementById("pStrategy")?.value || "Balanced";
  const compLow = parseFloat(document.getElementById("pCompLow")?.value) || 0;
  const compHigh = parseFloat(document.getElementById("pCompHigh")?.value) || 0;

  if (!billRate) {
    showToast("Enter bill rate (COGS)", true);
    return;
  }

  const ohAmt = billRate * (overheadPct / 100);
  const loaded = billRate + ohAmt;
  const yourRate = loaded / (1 - marginPct / 100);
  const gp = yourRate - billRate;
  const gpPct = (gp / yourRate) * 100;
  const totalValue = yourRate * hours;
  const netOwner = gp * hours;
  const floorOk = !wageFloor || billRate >= wageFloor;

  // ── STRATEGY PRICING BANDS ──────────────────────────────────
  const floorPrice = +(billRate * 1.05).toFixed(2); // absolute min — 5% above COGS
  const aggrPrice = +(loaded / (1 - 0.1)).toFixed(2); // 10% margin — aggressive
  const balPrice = +(loaded / (1 - 0.18)).toFixed(2); // 18% margin — balanced
  const safePrice = +(loaded / (1 - 0.25)).toFixed(2); // 25% margin — safe

  // Win price recommendation based on eval type + strategy
  let targetWinPrice;
  let strategyNote;
  if (evalType === "LPTA") {
    if (strategy === "Aggressive") {
      targetWinPrice = aggrPrice;
      strategyNote =
        "LPTA · Aggressive — price near floor, sacrifice margin to win";
    } else if (strategy === "Safe") {
      targetWinPrice = balPrice;
      strategyNote =
        "LPTA · Safe — margin protected, may lose to aggressive bidders";
    } else {
      targetWinPrice = +(aggrPrice * 1.03).toFixed(2);
      strategyNote = "LPTA · Balanced — stay within 3% of aggressive floor";
    }
  } else {
    if (strategy === "Aggressive") {
      targetWinPrice = balPrice;
      strategyNote =
        "Best Value · Aggressive — competitive mid-range with strong narrative";
    } else if (strategy === "Safe") {
      targetWinPrice = safePrice;
      strategyNote =
        "Best Value · Safe — premium positioning, needs exceptional narrative";
    } else {
      targetWinPrice = +(balPrice * 1.04).toFixed(2);
      strategyNote = "Best Value · Balanced — narrative + moderate price";
    }
  }

  // Competitor range check
  let compNote = "";
  if (compLow && compHigh) {
    if (yourRate < compLow)
      compNote = `✓ Below comp floor ($${compLow.toFixed(2)}) — very aggressive`;
    else if (yourRate <= compHigh)
      compNote = `✓ Within comp range ($${compLow.toFixed(2)}–$${compHigh.toFixed(2)})`;
    else
      compNote = `⚠ Above comp ceiling ($${compHigh.toFixed(2)}) — risk of loss on price`;
  }

  const pr = document.getElementById("priceResult");
  pr.classList.add("visible");

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("prCogs", `$${billRate.toFixed(2)}/hr`);
  set("prOh", `$${ohAmt.toFixed(2)}/hr (${overheadPct}%)`);
  set("prLoaded", `$${loaded.toFixed(2)}/hr`);
  set("prYourRate", `$${yourRate.toFixed(2)}/hr`);
  set("prGP", `$${gp.toFixed(2)}/hr`);
  set("prMarginPct", `${gpPct.toFixed(1)}%`);
  set(
    "prTotal",
    `$${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
  );
  set(
    "prNet",
    `$${netOwner.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
  );

  // Strategy band display
  set("prFloor", `$${floorPrice.toFixed(2)}/hr`);
  set("prAggr", `$${aggrPrice.toFixed(2)}/hr`);
  set("prBal", `$${balPrice.toFixed(2)}/hr`);
  set("prSafe", `$${safePrice.toFixed(2)}/hr`);
  set("prTarget", `$${targetWinPrice.toFixed(2)}/hr`);
  set("prStratNote", strategyNote);
  set("prCompNote", compNote);

  // Highlight your rate vs target
  const rateEl = document.getElementById("prYourRate");
  if (rateEl) {
    const diff = yourRate - targetWinPrice;
    rateEl.style.color =
      Math.abs(diff) <= 1.5
        ? "var(--green)"
        : diff > 3
          ? "var(--danger)"
          : "var(--gold)";
  }

  const floorEl = document.getElementById("prFloorCheck");
  if (floorEl) {
    floorEl.textContent = floorOk
      ? wageFloor
        ? `✓ Above WD floor ($${wageFloor.toFixed(2)}/hr)`
        : "No WD floor set"
      : `⚠ BELOW WD FLOOR ($${wageFloor.toFixed(2)}/hr) — ILLEGAL`;
    floorEl.style.color = floorOk ? "var(--green)" : "var(--danger)";
  }

  const vEl = document.getElementById("prVerdict");
  if (vEl) {
    vEl.style.display = "block";
    if (!floorOk) {
      vEl.className = "go-nogo nogo";
      vEl.textContent =
        "✗ DO NOT BID — Bill rate below SCA wage floor. Fix sourcing.";
    } else if (gpPct >= 20) {
      vEl.className = "go-nogo go";
      vEl.textContent = `✓ GO — ${gpPct.toFixed(1)}% gross margin · $${netOwner.toLocaleString("en-US", { maximumFractionDigits: 0 })} net to owner`;
    } else if (gpPct >= 15) {
      vEl.className = "go-nogo marginal";
      vEl.textContent = `⚠ MARGINAL — ${gpPct.toFixed(1)}% margin · Review before committing`;
    } else {
      vEl.className = "go-nogo nogo";
      vEl.textContent = `✗ PASS — ${gpPct.toFixed(1)}% margin is below minimum`;
    }
  }

  bidData.pricing = {
    billRate,
    wageFloor,
    hours,
    overheadPct,
    marginPct,
    yourRate,
    gp,
    gpPct,
    totalValue,
    netOwner,
    evalType,
    strategy,
    targetWinPrice,
    floorPrice,
    aggrPrice,
    balPrice,
    safePrice,
    compLow,
    compHigh,
    strategyNote,
  };
  save();

  document.getElementById("confirmPricingBtn").style.display = "flex";
}

function confirmPricing() {
  if (!bidData.pricing) {
    showToast("Run the calculation first", true);
    return;
  }
  bidData.pricing.complete = true;
  save();

  const p = bidData.pricing;
  document.getElementById("pricingConfirmedPanel").classList.remove("hidden");
  document.getElementById("pricingConfirmedSummary").innerHTML =
    `Rate: <strong class="mono">$${p.yourRate.toFixed(2)}/hr</strong> · ` +
    `GP: <strong class="mono">$${p.gp.toFixed(2)}/hr</strong> · ` +
    `Total: <strong class="mono">$${p.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong> · ` +
    `Net: <strong class="mono">$${p.netOwner.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>`;
  document.getElementById("confirmPricingBtn").style.display = "none";
  showToast("✓ Pricing locked");
}
