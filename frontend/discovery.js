/* ═══════════════════════════════════════════════
   discovery.js — Step 1
   Paste contracts → AI triage → select one
═══════════════════════════════════════════════ */

async function triageAll(){
  const raw = document.getElementById("discoveryPaste").value.trim();
  if(!raw){ showToast("Paste contract listings first",true); return; }

  const lines = raw.split("\n").map(l=>l.trim()).filter(Boolean);
  if(!lines.length){ showToast("No listings found",true); return; }

  if(!confirm(`Triage ${lines.length} contract${lines.length>1?"s":""}? This will use API tokens.`)) return;

  bidData.discovery = bidData.discovery || { items:[] };

  const items = lines.map(line=>{
    const parts = line.split("|").map(x=>x?.trim());
    return { title:parts[0]||line, sol:parts[1]||"", due:parts[2]||"", agency:parts[3]||"", location:parts[4]||"", verdict:null, reason:"" };
  });

  const think = document.getElementById("triageThinking");
  think.classList.remove("hidden");
  document.getElementById("triageBtn").disabled = true;

  const SYSTEM = `You are a government contracting analyst for The House of Kel LLC — SDVOSB, Killeen TX near Fort Cavazos.

Core service lines (CAN DO): Janitorial/Custodial (561720), Painting (238320), Temporary Staffing (561320), Landscaping (561730), Facilities Maintenance (561210). Can sub labor via staffing agencies.

Cannot do (no licensed subs yet): HVAC, electrical, plumbing, fire suppression, telecom/IT infrastructure.

Prefer: SDVOSB set-asides, VA, Army/DoD contracts, Texas / Central TX. Will consider national if value is high.

Return ONLY a JSON array, one element per contract: [{"verdict":"GO"|"MARGINAL"|"PASS","reason":"one sentence"}]. No other text.`;

  const contractList = items.map((it,i)=>`${i+1}. ${it.title}${it.sol?" | SOL:"+it.sol:""}${it.agency?" | "+it.agency:""}${it.location?" | "+it.location:""}`).join("\n");

  try {
    const response = await callClaude(
      [{role:"user",content:`Triage these ${items.length} contracts:\n\n${contractList}`}],
      SYSTEM, 800
    );
    const clean = response.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);
    parsed.forEach((r,i)=>{ if(items[i]){ items[i].verdict=r.verdict; items[i].reason=r.reason; }});
  } catch(e){
    showToast("Triage failed — marking PENDING",true);
    items.forEach(it=>{ it.verdict="PENDING"; it.reason="Manual review required"; });
  }

  bidData.discovery.items = [...(bidData.discovery.items||[]), ...items];
  save();
  think.classList.add("hidden");
  document.getElementById("triageBtn").disabled = false;
  document.getElementById("discoveryPaste").value = "";
  renderDiscoveryList();
  showToast(`✓ Triaged ${items.length} contract${items.length>1?"s":""}`);
}

function renderDiscoveryList(){
  const items = bidData.discovery?.items || [];
  const el = document.getElementById("discoveryList");
  if(!items.length){ el.innerHTML=""; return; }

  el.innerHTML = items.map((item,i)=>{
    const vc = (item.verdict||"pending").toLowerCase();
    const laneClass = vc==="go"?"in-lane":vc==="pass"?"out-lane":"unknown-lane";
    const sel = bidData.discovery?.selected===i ? "selected" : "";
    return `
    <div class="discovery-item ${laneClass} ${sel}" onclick="selectContract(${i})" id="ditem-${i}">
      <div class="disc-header">
        <input type="radio" class="disc-radio" name="contractSel" ${bidData.discovery?.selected===i?"checked":""}/>
        <div class="disc-body">
          <div class="disc-title">${item.title}
            <span class="disc-verdict ${vc}">${item.verdict||"PENDING"}</span>
          </div>
          <div class="disc-meta">${[item.sol,item.agency,item.location,item.due?"Due: "+item.due:""].filter(Boolean).join(" · ")}</div>
          ${item.reason?`<div class="disc-ai-reason">${item.reason}</div>`:""}
        </div>
        <button class="sm danger" onclick="event.stopPropagation();removeDiscItem(${i})" style="flex-shrink:0">✕</button>
      </div>
    </div>`;
  }).join("");
}

function selectContract(i){
  bidData.discovery = bidData.discovery || {};
  bidData.discovery.selected = i;
  bidData.discovery.selectedItem = bidData.discovery.items[i];
  save();
  renderDiscoveryList();
  showToast(`✓ Selected: ${bidData.discovery.items[i].title}`);
}

function removeDiscItem(i){
  bidData.discovery.items.splice(i,1);
  if(bidData.discovery.selected===i) delete bidData.discovery.selected;
  save();
  renderDiscoveryList();
}

function clearDiscovery(){
  if(!confirm("Clear all discovery results?")) return;
  bidData.discovery = { items:[] };
  save();
  renderDiscoveryList();
}

function goToIntake(){
  const sel = bidData.discovery?.selected;
  if(sel==null){ showToast("Select a contract first",true); return; }
  const item = bidData.discovery.items[sel];
  if(item?.verdict==="PASS"){
    if(!confirm("AI flagged this PASS. Proceed anyway?")) return;
  }
  goToStep(1);
}

/* ═══════════════════════════════════════════════
   SAM.gov PULL — backend-proxied opportunity fetch
═══════════════════════════════════════════════ */

async function pullSamOpportunities() {
  const keyword  = document.getElementById("samKeyword")?.value.trim()  || "janitorial OR landscaping OR painting";
  const naics    = document.getElementById("samNaics")?.value.trim()    || "";
  const state    = document.getElementById("samState")?.value.trim()    || "TX";
  const setAside = document.getElementById("samSetAside")?.value        || "SDVOSB";
  const limit    = document.getElementById("samLimit")?.value           || "25";

  const btn  = document.getElementById("samPullBtn");
  const spin = document.getElementById("samThinking");
  if(btn)  btn.disabled = true;
  if(spin) spin.classList.remove("hidden");

  const params = new URLSearchParams({ keyword, state, setAside, limit });
  if(naics) params.set("naics", naics);

  try {
    const res  = await fetch(`http://localhost:3001/api/sam/opportunities?${params}`);
    const data = await res.json();

    if(!data.ok || !data.opportunities?.length){
      showToast(data.error || "No opportunities returned from SAM", true);
      return;
    }

    // Normalize to discovery item format and append
    const newItems = data.opportunities.map(o => ({
      title:    o.title,
      sol:      o.solId,
      due:      o.dueDate,
      agency:   o.agency,
      location: o.location,
      naics:    o.naics,
      setAside: o.setAside,
      url:      o.url,
      source:   "SAM.gov",
      verdict:  null,
      reason:   "",
    }));

    bidData.discovery = bidData.discovery || { items:[] };
    const before = bidData.discovery.items.length;

    // Dedupe by solId
    const existing = new Set(bidData.discovery.items.map(i=>i.sol).filter(Boolean));
    const added    = newItems.filter(i => !i.sol || !existing.has(i.sol));
    bidData.discovery.items.push(...added);
    save();
    renderDiscoveryList();
    showToast(`✓ ${added.length} new opportunities from SAM.gov (${data.total} total found)`);

    document.getElementById("samResultCount").textContent =
      `${data.total} total · ${added.length} added · ${data.count} returned`;

  } catch(err) {
    const isOffline = err.message.includes("fetch") || err.message.includes("Failed");
    showToast(isOffline ? "Backend offline — start server.js" : `SAM pull failed: ${err.message}`, true);
  } finally {
    if(btn)  btn.disabled = false;
    if(spin) spin.classList.add("hidden");
  }
}

async function triageAllSam() {
  // Triage only items from SAM.gov that haven't been triaged yet
  const untriaged = (bidData.discovery?.items||[]).filter(i=>i.source==="SAM.gov" && !i.verdict);
  if(!untriaged.length){ showToast("No untriaged SAM items", true); return; }
  if(!confirm(`Triage ${untriaged.length} SAM opportunities? Uses API tokens.`)) return;

  const think = document.getElementById("triageThinking");
  const btn   = document.getElementById("triageBtn");
  think.classList.remove("hidden");
  btn.disabled = true;

  const SYSTEM = `You are a government contracting analyst for The House of Kel LLC — SDVOSB, Killeen TX near Fort Cavazos.
Core service lines (CAN DO): Janitorial/Custodial (561720), Painting (238320), Temporary Staffing (561320), Landscaping (561730), Facilities Maintenance (561210).
Cannot do: HVAC, electrical, plumbing, fire suppression, telecom/IT infrastructure.
Prefer: SDVOSB set-asides, VA, Army/DoD contracts, Texas / Central TX.
Return ONLY a JSON array, one element per contract: [{"verdict":"GO"|"MARGINAL"|"PASS","reason":"one sentence"}]. No other text.`;

  const contractList = untriaged.map((it,i)=>
    `${i+1}. ${it.title}${it.sol?" | SOL:"+it.sol:""}${it.naics?" | NAICS:"+it.naics:""}${it.agency?" | "+it.agency:""}${it.location?" | "+it.location:""}`
  ).join("\n");

  try {
    const response = await callClaude(
      [{role:"user",content:`Triage these ${untriaged.length} SAM opportunities:\n\n${contractList}`}],
      SYSTEM, 800
    );
    const clean  = response.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);
    parsed.forEach((r,i)=>{
      if(untriaged[i]){
        untriaged[i].verdict = r.verdict;
        untriaged[i].reason  = r.reason;
      }
    });
    save();
    renderDiscoveryList();
    showToast(`✓ Triaged ${untriaged.length} SAM opportunities`);
  } catch(e) {
    showToast("Triage failed", true);
  } finally {
    think.classList.add("hidden");
    btn.disabled = false;
  }
}
