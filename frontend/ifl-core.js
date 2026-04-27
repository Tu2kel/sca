/* ═══════════════════════════════════════════════
   IFL SERVICE CONTRACT INTELLIGENCE ENGINE v3
   The House of Kel LLC | CAGE 152U4 | SDVOSB
   ifl-core.js — shared state, nav, toast, API
═══════════════════════════════════════════════ */
"use strict";

const STEPS = [
  "discovery",
  "intake",
  "sourcing",
  "pricing",
  "proposal",
  "submit",
  "invoice",
];
let currentStep = 0;
let bidData = JSON.parse(localStorage.getItem("ifl_v3") || "{}");

function save() {
  localStorage.setItem("ifl_v3", JSON.stringify(bidData));
}
function resetBid() {
  bidData = {};
  save();
}

/* ─── NAV ─── */
function initChevrons() {
  document.getElementById("chevronNav").innerHTML = STEPS.map((s, i) => {
    const labels = {
      discovery: "Discovery",
      intake: "Intake",
      sourcing: "Sourcing",
      pricing: "Pricing",
      proposal: "Proposal",
      submit: "Submit",
      invoice: "Invoice",
    };
    const active = i === currentStep ? "active" : "";
    const complete = bidData[s]?.complete ? "complete" : "";
    return `<button class="chevron-step ${active} ${complete}" onclick="goToStep(${i})">${labels[s]}</button>`;
  }).join("");
}

function goToStep(idx) {
  if (idx < 0 || idx >= STEPS.length) return;
  currentStep = idx;
  updateUI();
}

function nextStep() {
  if (!bidData[STEPS[currentStep]]) bidData[STEPS[currentStep]] = {};
  bidData[STEPS[currentStep]].complete = true;
  currentStep++;
  save();
  updateUI();
}

function updateUI() {
  document
    .querySelectorAll(".step-container")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById("step-" + STEPS[currentStep]).classList.add("active");
  initChevrons();
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Populate pricing fields when landing on pricing — no AI call, just field fill
  if (STEPS[currentStep] === "pricing") autoPopulatePricing();
  if (STEPS[currentStep] === "proposal") {
    if (typeof initProposalStep === "function") initProposalStep();
  }
  if (STEPS[currentStep] === "invoice") {
    if (typeof initInvoiceStep === "function") initInvoiceStep();
  }
  if (STEPS[currentStep] === "submit") {
    if (typeof initSubmitStep  === "function") initSubmitStep();
    if (typeof initWinScore    === "function") initWinScore();
  }
}

/* ─── TOAST ─── */
function showToast(msg, isError = false) {
  const wrap = document.getElementById("toastWrap");
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " error" : "");
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

/* ─── CLIPBOARD ─── */
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => showToast(`✓ Copied ${code}`));
}
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("✓ Copied"))
    .catch(() => showToast("Copy failed", true));
}

/* ─── AI CALL — routes through backend/server.js → OpenAI GPT-4o ─── */
async function callClaude(messages, systemPrompt, maxTokens = 1500) {
  const res = await fetch("http://localhost:3001/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const data = await res.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

/* ─── MONITORING LANES ─── */
function toggleTier(id) {
  const content = document.getElementById(id + "Content");
  const icon = document.getElementById(id + "Icon");
  const open = content.style.display !== "none";
  content.style.display = open ? "none" : "block";
  icon.textContent = open ? "▼" : "▲";
}

/* ─── HOW TO USE OVERLAY ─── */
function openHowToUse() {
  document.getElementById("howToUseOverlay").classList.add("active");
}
function closeHowToUse() {
  document.getElementById("howToUseOverlay").classList.remove("active");
}

/* ─── INIT ─── */
document.addEventListener("DOMContentLoaded", () => {
  // Drag zones for intake
  ["sowDrop", "wdDrop"].forEach((id) => {
    const z = document.getElementById(id);
    if (!z) return;
    z.addEventListener("dragover", (e) => {
      e.preventDefault();
      z.classList.add("drag-over");
    });
    z.addEventListener("dragleave", () => z.classList.remove("drag-over"));
    z.addEventListener("drop", (e) => {
      e.preventDefault();
      z.classList.remove("drag-over");
      const f = e.dataTransfer.files[0];
      if (id === "sowDrop") handleSowFile(f);
      else handleWdFile(f);
    });
  });

  // Instructions overlay — click outside to close
  const overlay = document.getElementById("howToUseOverlay");
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target.id === "howToUseOverlay") closeHowToUse();
    });

  initChevrons();
  updateUI();

  // Restore any persisted UI state
  if (typeof renderDiscoveryList === "function") renderDiscoveryList();
  if (bidData.sourcing?.locked && typeof showLockedSub === "function")
    showLockedSub();
  if (bidData.intake && typeof restoreIntakeFields === "function")
    restoreIntakeFields();
});

function toggleManualOverride() {
  const panels = document.getElementById("manualOverridePanels");
  const btn = document.getElementById("manualToggleBtn");
  const open = panels.style.display === "none";
  panels.style.display = open ? "block" : "none";
  btn.textContent = open ? "✕ Close Manual Override" : "✎ Manual Override";
}
