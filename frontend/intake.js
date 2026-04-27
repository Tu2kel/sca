/* ═══════════════════════════════════════════════
   intake.js — Step 2
   Upload PDFs → copy extraction prompt → paste JSON → confirm fields
═══════════════════════════════════════════════ */

function handleSowFile(file){
  if(!file||!file.name.endsWith(".pdf")){ showToast("PDF required",true); return; }
  document.getElementById("sowStatus").innerHTML =
    `<div class="file-attached"><span>📄</span><span class="fa-name">${file.name}</span><span class="fa-meta">${(file.size/1024).toFixed(0)} KB · Ready</span></div>`;
  showToast(`✓ ${file.name} noted`);
}

function handleWdFile(file){
  if(!file||!file.name.endsWith(".pdf")){ showToast("PDF required",true); return; }
  document.getElementById("wdStatus").innerHTML =
    `<div class="file-attached"><span>💰</span><span class="fa-name">${file.name}</span><span class="fa-meta">${(file.size/1024).toFixed(0)} KB · Ready</span></div>`;
  showToast(`✓ ${file.name} noted`);
}

function copyExtractionPrompt(){
  const sel = bidData.discovery?.selectedItem;
  const solHint = sel?.sol || "[SOL_ID]";
  const titleHint = sel?.title || "";

  const prompt = `I need you to extract contract data from the attached PDFs (SOW/RFP and Wage Determination).
${titleHint ? "Contract: "+titleHint : ""}
Solicitation ID: ${solHint}

Return ONLY a valid JSON object — no markdown, no backticks, no explanation before or after:

{
  "solId": "solicitation number",
  "agency": "agency or buyer name",
  "dueDate": "due date and time, e.g. 2025-08-15 14:00 CT",
  "location": "place of performance, e.g. Fort Cavazos, Killeen TX",
  "naics": "NAICS code, e.g. 561720",
  "setAside": "set-aside type, e.g. SDVOSB",
  "period": "contract period, e.g. 1 Base Year + 4 Option Years",
  "wdNum": "wage determination number, e.g. 2015-5650 Rev 22",
  "scope": "1-2 sentence plain English summary of what work is required",
  "laborCats": "all labor categories, headcounts, and estimated hours per year in plain text",
  "jobTitle": "primary labor category job title from the WD",
  "baseWage": 0.00,
  "fringe": 0.00,
  "risks": ["SCA Covered", "Background Checks Required", "Davis-Bacon", etc — only real flags from the docs],
  "riskNotes": "short narrative of any compliance, licensing, or performance risks",
  "evalType": "LPTA or Best Value — from Section M or evaluation criteria"
}

Use empty string or 0 for any field not found. JSON only.`;

  navigator.clipboard.writeText(prompt)
    .then(()=>showToast("✓ Prompt copied — paste it + both PDFs into Claude"))
    .catch(()=>showToast("Copy failed — try again",true));
}

function parseExtraction(){
  const raw = document.getElementById("extractionResponse").value.trim();
  if(!raw){ showToast("Paste Claude's JSON response first",true); return; }

  let data;
  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/gi,"").trim();
    data = JSON.parse(clean);
  } catch(e){
    showToast("Invalid JSON — check Claude's response",true);
    return;
  }

  populateIntakeFields(data);
  document.getElementById("intakeFieldsPanel").style.display = "block";
  window.scrollTo({top: document.getElementById("intakeFieldsPanel").offsetTop - 20, behavior:"smooth"});
  showToast("✓ Fields populated — review and confirm");
}

function populateIntakeFields(d){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.value = v||""; };
  set("afSolId",    d.solId);
  set("afAgency",   d.agency);
  set("afDueDate",  d.dueDate);
  set("afLocation", d.location);
  set("afNaics",    d.naics);
  set("afSetAside", d.setAside);
  set("afPeriod",   d.period);
  set("afWdNum",    d.wdNum);
  set("afScope",    d.scope);
  set("afLaborCats",d.laborCats);
  set("afJobTitle", d.jobTitle);
  set("afBaseWage", d.baseWage||"");
  set("afFringe",   d.fringe||"");
  set("afRiskNotes",d.riskNotes);
  if(d.evalType){ const el=document.getElementById("afEvalType"); if(el) el.value=d.evalType; }

  const flagEl = document.getElementById("afRiskFlags");
  if(flagEl && d.risks?.length){
    flagEl.innerHTML = d.risks.map(r=>{
      const cls = /davis.bacon|clearance|bond|license/i.test(r) ? "red"
                : /sca|wage|inspect/i.test(r) ? "amber"
                : "green";
      return `<span class="risk-flag ${cls}">${r}</span>`;
    }).join("");
  }
}

// Re-populate fields if intake already confirmed (on tab re-visit)
function restoreIntakeFields(){
  const d = bidData.intake;
  if(!d?.solId) return;
  document.getElementById("intakeFieldsPanel").style.display = "block";
  populateIntakeFields(d);
}

function showManualIntake(){
  document.getElementById("intakeFieldsPanel").style.display = "block";
}

function confirmIntake(){
  const solId = document.getElementById("afSolId").value.trim();
  if(!solId){ showToast("SOL ID is required",true); return; }

  bidData.intake = {
    ...bidData.intake,
    solId,
    agency:    document.getElementById("afAgency").value.trim(),
    dueDate:   document.getElementById("afDueDate").value.trim(),
    location:  document.getElementById("afLocation").value.trim(),
    naics:     document.getElementById("afNaics").value.trim(),
    setAside:  document.getElementById("afSetAside").value.trim(),
    period:    document.getElementById("afPeriod").value.trim(),
    wdNum:     document.getElementById("afWdNum").value.trim(),
    scope:     document.getElementById("afScope").value.trim(),
    laborCats: document.getElementById("afLaborCats").value.trim(),
    jobTitle:  document.getElementById("afJobTitle").value.trim(),
    baseWage:  parseFloat(document.getElementById("afBaseWage").value)||0,
    fringe:    parseFloat(document.getElementById("afFringe").value)||0,
    riskNotes: document.getElementById("afRiskNotes").value.trim(),
    evalType:  document.getElementById("afEvalType")?.value || "LPTA",
    complete:  true
  };
  save();
  showToast("✓ Intake confirmed");
  if (typeof initCompliancePanel === "function") initCompliancePanel();
  setTimeout(()=>nextStep(), 500);
}
