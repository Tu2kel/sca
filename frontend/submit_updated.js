/* ═══════════════════════════════════════════════
   submit.js — Step 6
   Log bid submission, confirm, reset for next bid
═══════════════════════════════════════════════ */

function initSubmitStep() {
  const name  = document.getElementById("submitName");
  const email = document.getElementById("submitEmail");
  if (name  && !name.value)  name.value  = "Anthony K. Kelley";
  if (email && !email.value) email.value = "anthony@ifedlog.com";
}

function submitBid() {
  const name  = document.getElementById("submitName").value.trim();
  const email = document.getElementById("submitEmail").value.trim();
  if (!name || !email) { showToast("Name and email required", true); return; }

  bidData.submit = {
    name,
    email,
    method:      document.getElementById("submitMethod").value,
    notes:       document.getElementById("submitNotes").value.trim(),
    submittedAt: new Date().toISOString(),
    complete:    true,
  };
  save();

  // Push full snapshot to Sol CRM panel
  logBidToSolPanel(bidData);

  showToast("✓ Bid logged — Sol added to tracker");

  // Show confirmation card instead of ugly alert
  const intake  = bidData.intake  || {};
  const pricing = bidData.pricing || {};
  const sourcing = bidData.sourcing?.locked || {};

  const card = document.getElementById("submitConfirmCard");
  if (card) {
    document.getElementById("scSolId").textContent   = intake.solId   || "—";
    document.getElementById("scAgency").textContent  = intake.agency  || "—";
    document.getElementById("scSub").textContent     = sourcing.name  || "—";
    document.getElementById("scRate").textContent    = pricing.yourRate ? `$${pricing.yourRate.toFixed(2)}/hr` : "—";
    document.getElementById("scTotal").textContent   = pricing.totalValue
      ? `$${pricing.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "—";
    document.getElementById("scMethod").textContent  = bidData.submit.method;
    document.getElementById("scDate").textContent    = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
    card.style.display = "block";
  }
}

function resetAll() {
  if (!confirm("Reset everything and start a new bid?")) return;
  resetBid();
  currentStep = 0;

  // Clear submit confirm card
  const card = document.getElementById("submitConfirmCard");
  if (card) card.style.display = "none";

  // Clear intake UI
  const iPanel = document.getElementById("intakeFieldsPanel");
  if (iPanel) iPanel.style.display = "none";
  const extResp = document.getElementById("extractionResponse");
  if (extResp) extResp.value = "";

  // Clear sourcing UI
  const noSrc  = document.getElementById("noSourcingYet");
  if (noSrc) noSrc.style.display = "block";
  const srcGrid = document.getElementById("sourcingGrid");
  if (srcGrid) srcGrid.innerHTML = "";
  const lockedPnl = document.getElementById("lockedSubPanel");
  if (lockedPnl) lockedPnl.classList.add("hidden");

  // Clear pricing UI
  const priceRes = document.getElementById("priceResult");
  if (priceRes) priceRes.classList.remove("visible");
  const confPnl = document.getElementById("pricingConfirmedPanel");
  if (confPnl) confPnl.classList.add("hidden");
  const confBtn = document.getElementById("confirmPricingBtn");
  if (confBtn) confBtn.style.display = "none";

  // Clear proposal UI
  const propPnl = document.getElementById("proposalPanel");
  if (propPnl) propPnl.style.display = "none";
  const sumPnl  = document.getElementById("bidSummaryPanel");
  if (sumPnl) sumPnl.style.display = "none";

  // Clear file status
  ["sowStatus","wdStatus"].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = "";
  });

  // Reset submit fields to defaults
  const name  = document.getElementById("submitName");
  const email = document.getElementById("submitEmail");
  if (name)  name.value  = "Anthony K. Kelley";
  if (email) email.value = "anthony@ifedlog.com";

  updateUI();
  renderDiscoveryList();
  showToast("✓ Reset — ready for next bid");
}
