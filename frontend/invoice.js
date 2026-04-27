/* ═══════════════════════════════════════════════
   invoice.js — Step 7
   Monthly invoicing for active service contracts
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

function nextInvoiceNumber() {
  const seq = parseInt(localStorage.getItem("ifl_inv_seq") || "0") + 1;
  localStorage.setItem("ifl_inv_seq", seq);
  const year = new Date().getFullYear();
  return `IFL-${year}-${String(seq).padStart(3, "0")}`;
}

function initInvoiceStep() {
  const intake = bidData.intake || {};
  const pricing = bidData.pricing || {};
  const sourcing = bidData.sourcing?.locked || {};

  setText("invBannerSol", intake.solId || "—");
  setText("invBannerAgency", intake.agency || "—");
  setText(
    "invBannerRate",
    pricing.yourRate ? `$${Number(pricing.yourRate).toFixed(2)}/hr` : "—",
  );
  setText("invBannerSub", sourcing.name || "—");

  const numEl = document.getElementById("invNumber");
  if (numEl && !numEl.value) numEl.value = nextInvoiceNumber();

  const dateEl = document.getElementById("invDate");
  if (dateEl && !dateEl.value) dateEl.value = today();

  const startEl = document.getElementById("invPeriodStart");
  const endEl = document.getElementById("invPeriodEnd");
  if (startEl && !startEl.value) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    startEl.value = `${y}-${m}-01`;
    endEl.value = `${y}-${m}-${last}`;
  }

  const rateEl = document.getElementById("invRate");
  if (rateEl)
    rateEl.value = pricing.yourRate ? Number(pricing.yourRate).toFixed(2) : "";

  renderInvoiceHistory();
  calcPreview();
}

function suggestPeriodEnd() {
  const startVal = document.getElementById("invPeriodStart")?.value;
  if (!startVal) return;
  const d = new Date(startVal + "T12:00:00");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const last = new Date(y, d.getMonth() + 1, 0).getDate();
  const endEl = document.getElementById("invPeriodEnd");
  if (endEl) endEl.value = `${y}-${m}-${last}`;
  calcPreview();
}

let odcCount = 0;
function addODCRow() {
  odcCount++;
  const id = `odc_${odcCount}`;
  const div = document.createElement("div");
  div.id = id;
  div.style.cssText =
    "display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:8px;align-items:center";
  div.innerHTML = `
    <input placeholder="Description (e.g. Cleaning Supplies)" style="font-size:15px" oninput="calcPreview()" data-odc-desc="${id}" />
    <input type="number" step="0.01" min="0" placeholder="$0.00" style="width:110px;font-size:15px;font-family:'JetBrains Mono',monospace" oninput="calcPreview()" data-odc-amt="${id}" />
    <button class="secondary" style="padding:4px 10px;font-size:13px" onclick="removeODC('${id}')">✕</button>
  `;
  document.getElementById("odcRows").appendChild(div);
}

function removeODC(id) {
  document.getElementById(id)?.remove();
  calcPreview();
}

function getODCs() {
  const rows = document.querySelectorAll("#odcRows > div");
  const odcs = [];
  rows.forEach((row) => {
    const desc = row.querySelector("[data-odc-desc]")?.value?.trim();
    const amt = parseFloat(row.querySelector("[data-odc-amt]")?.value) || 0;
    if (desc || amt) odcs.push({ description: desc || "ODC", amount: amt });
  });
  return odcs;
}

function calcPreview() {
  const hours = parseFloat(document.getElementById("invHours")?.value) || 0;
  const rate = parseFloat(document.getElementById("invRate")?.value) || 0;
  const odcs = getODCs();
  const pricing = bidData.pricing || {};
  const sourcing = bidData.sourcing?.locked || {};

  if (!hours && !odcs.length) {
    document.getElementById("invPreview").style.display = "none";
    return;
  }

  const laborAmt = +(hours * rate).toFixed(2);
  const odcTotal = +odcs.reduce((s, o) => s + o.amount, 0).toFixed(2);
  const total = +(laborAmt + odcTotal).toFixed(2);

  const billRate =
    parseFloat(sourcing.billRate) || parseFloat(pricing.agencyRate) || 0;
  const subCost = billRate ? +(hours * billRate).toFixed(2) : null;
  const grossProfit =
    subCost !== null ? +(total - subCost - odcTotal).toFixed(2) : null;

  setText("prevHours", hours.toLocaleString());
  setText("prevRate", `$${rate.toFixed(2)}`);
  setText("prevLabor", fmt(laborAmt));
  setText("prevSubtotal", fmt(laborAmt + odcTotal));
  setText("prevTotal", fmt(total));

  const odcLabel = document.getElementById("prevOdcLabel");
  const odcAmt = document.getElementById("prevOdcAmt");
  if (odcTotal > 0) {
    setText("prevOdcAmt", fmt(odcTotal));
    if (odcLabel) odcLabel.style.display = "";
    if (odcAmt) odcAmt.style.display = "";
  } else {
    if (odcLabel) odcLabel.style.display = "none";
    if (odcAmt) odcAmt.style.display = "none";
  }

  setText("prevSubCost", subCost !== null ? fmt(subCost) : "—");
  setText("prevGross", grossProfit !== null ? fmt(grossProfit) : "—");

  document.getElementById("invPreview").style.display = "block";
}

function generateInvoice() {
  const hours = parseFloat(document.getElementById("invHours")?.value);
  const rate = parseFloat(document.getElementById("invRate")?.value);
  const start = document.getElementById("invPeriodStart")?.value;
  const end = document.getElementById("invPeriodEnd")?.value;
  const num = document.getElementById("invNumber")?.value;
  const date = document.getElementById("invDate")?.value;
  const notes = document.getElementById("invNotes")?.value?.trim();

  if (!hours || !rate) {
    showToast("Enter hours worked", true);
    return;
  }
  if (!start || !end) {
    showToast("Enter billing period", true);
    return;
  }

  const odcs = getODCs();
  const laborAmt = +(hours * rate).toFixed(2);
  const odcTotal = +odcs.reduce((s, o) => s + o.amount, 0).toFixed(2);
  const total = +(laborAmt + odcTotal).toFixed(2);
  const intake = bidData.intake || {};
  const sourcing = bidData.sourcing?.locked || {};

  const inv = {
    invoiceNumber: num,
    invoiceDate: date,
    periodStart: start,
    periodEnd: end,
    solId: intake.solId || "",
    agency: intake.agency || "",
    subName: sourcing.name || "",
    billRate: rate,
    hoursWorked: hours,
    laborAmount: laborAmt,
    odcs,
    odcTotal,
    totalAmount: total,
    notes,
    createdAt: new Date().toISOString(),
  };

  const key = `ifl_invoices_${intake.solId || "general"}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.unshift(inv);
  localStorage.setItem(key, JSON.stringify(existing));

  showToast(`✓ Invoice ${num} — ${fmt(total)}`);
  renderInvoiceHistory();
  printInvoice(inv);

  setTimeout(() => {
    const numEl = document.getElementById("invNumber");
    if (numEl) numEl.value = nextInvoiceNumber();
    document.getElementById("invHours").value = "";
    document.getElementById("invNotes").value = "";
    document.getElementById("odcRows").innerHTML = "";
    odcCount = 0;
    bumpPeriod();
    calcPreview();
  }, 600);
}

function bumpPeriod() {
  const endVal = document.getElementById("invPeriodEnd")?.value;
  if (!endVal) return;
  const d = new Date(endVal + "T12:00:00");
  const nm = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const y = nm.getFullYear();
  const m = String(nm.getMonth() + 1).padStart(2, "0");
  const last = new Date(y, nm.getMonth() + 1, 0).getDate();
  document.getElementById("invPeriodStart").value = `${y}-${m}-01`;
  document.getElementById("invPeriodEnd").value = `${y}-${m}-${last}`;
  document.getElementById("invDate").value = `${y}-${m}-01`;
}

function printInvoice(inv) {
  const win = window.open("", "_blank", "width=860,height=1000");
  win.document.write(`<!doctype html><html><head>
  <meta charset="UTF-8"/>
  <title>Invoice ${inv.invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cormorant Garamond',serif;font-size:15px;color:#1a0a12;background:#faf7f2;padding:48px 56px}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #b8860b}
    .co-name{font-family:'Cinzel',serif;font-size:20px;font-weight:600;color:#1a0a12;letter-spacing:.06em}
    .co-sub{font-size:13px;color:rgba(26,10,18,.55);margin-top:3px}
    .inv-meta{text-align:right}
    .inv-label{font-family:'Cinzel',serif;font-size:22px;font-weight:600;color:#7a5000;letter-spacing:.12em;text-transform:uppercase}
    .inv-num{font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(26,10,18,.6);margin-top:4px}
    .inv-date{font-size:13px;color:rgba(26,10,18,.55);margin-top:2px}
    .bill-section{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
    .bill-block h4{font-family:'Cinzel',serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7a5000;margin-bottom:8px}
    .bill-block p{font-size:14px;color:rgba(26,10,18,.75);line-height:1.6}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{font-family:'Cinzel',serif;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#7a5000;padding:10px 12px;border-bottom:1px solid rgba(122,80,0,.3);text-align:left}
    thead th:last-child{text-align:right}
    tbody td{padding:11px 12px;font-size:14px;border-bottom:1px solid rgba(26,10,18,.08);vertical-align:top}
    tbody td:last-child{text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px}
    .totals{margin-left:auto;width:280px}
    .tot-row{display:flex;justify-content:space-between;padding:7px 0;font-size:14px;border-bottom:1px solid rgba(26,10,18,.08)}
    .tot-row.final{border-top:2px solid #b8860b;border-bottom:none;padding-top:12px;margin-top:4px}
    .tot-row.final span:first-child{font-family:'Cinzel',serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#7a5000}
    .tot-row.final span:last-child{font-family:'JetBrains Mono',monospace;font-size:20px;color:#1a0a12;font-weight:600}
    .mono{font-family:'JetBrains Mono',monospace}
    .period{font-size:12px;color:rgba(26,10,18,.45);margin-top:3px;display:block}
    .notes{margin-top:32px;padding-top:16px;border-top:1px solid rgba(26,10,18,.12);font-size:13px;color:rgba(26,10,18,.55)}
    .remit{margin-top:40px;padding:16px;background:rgba(122,80,0,.05);border:1px solid rgba(122,80,0,.2);border-radius:4px}
    .remit h4{font-family:'Cinzel',serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7a5000;margin-bottom:8px}
    .remit p{font-size:13px;color:rgba(26,10,18,.7);line-height:1.7}
    @media print{body{padding:32px 40px}}
  </style>
  </head><body>
  <div class="hdr">
    <div>
      <div class="co-name">The House of Kel LLC</div>
      <div class="co-sub">DBA Imperio Federal Logistics &nbsp;·&nbsp; CAGE 152U4 &nbsp;·&nbsp; SDVOSB</div>
      <div class="co-sub" style="margin-top:6px">Killeen, TX 76541 &nbsp;·&nbsp; (254) 226-5216 &nbsp;·&nbsp; anthony@ifedlog.com</div>
    </div>
    <div class="inv-meta">
      <div class="inv-label">Invoice</div>
      <div class="inv-num">${inv.invoiceNumber}</div>
      <div class="inv-date">Date: ${fmtDate(inv.invoiceDate)}</div>
    </div>
  </div>

  <div class="bill-section">
    <div class="bill-block">
      <h4>Bill To</h4>
      <p>${inv.agency || "—"}<br/>Solicitation / Contract No: ${inv.solId || "—"}</p>
    </div>
    <div class="bill-block">
      <h4>Billing Period</h4>
      <p>${fmtDate(inv.periodStart)} &mdash; ${fmtDate(inv.periodEnd)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center">Hours</th>
        <th style="text-align:right">Unit Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Labor Services &mdash; CLIN 0001
          <span class="period">Period of Performance: ${fmtDate(inv.periodStart)} through ${fmtDate(inv.periodEnd)}</span>
        </td>
        <td style="text-align:center" class="mono">${inv.hoursWorked}</td>
        <td style="text-align:right" class="mono">$${Number(inv.billRate).toFixed(2)}</td>
        <td>$${fmt2(inv.laborAmount)}</td>
      </tr>
      ${inv.odcs
        .map(
          (o) => `
      <tr>
        <td>${o.description}</td>
        <td style="text-align:center">—</td>
        <td style="text-align:right">—</td>
        <td>$${fmt2(o.amount)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    ${
      inv.odcTotal > 0
        ? `
    <div class="tot-row"><span>Labor</span><span class="mono">$${fmt2(inv.laborAmount)}</span></div>
    <div class="tot-row"><span>ODCs</span><span class="mono">$${fmt2(inv.odcTotal)}</span></div>`
        : ""
    }
    <div class="tot-row final"><span>Total Due</span><span>$${fmt2(inv.totalAmount)}</span></div>
  </div>

  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ""}

  <div class="remit">
    <h4>Remittance Instructions</h4>
    <p>Payment due Net 30 from receipt of proper invoice.<br/>
    Make payment payable to: The House of Kel LLC<br/>
    Reference Invoice Number: ${inv.invoiceNumber}</p>
  </div>

  <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
  win.document.close();
}

function renderInvoiceHistory() {
  const intake = bidData.intake || {};
  const key = `ifl_invoices_${intake.solId || "general"}`;
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  const el = document.getElementById("invHistory");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div style="color:var(--dim);font-size:14px;padding:10px 0">No invoices generated yet for this contract.</div>`;
    return;
  }

  const totalBilled = list.reduce((s, i) => s + i.totalAmount, 0);

  el.innerHTML = `
    <div style="margin-bottom:12px;font-size:13px;color:var(--dim)">
      ${list.length} invoice${list.length > 1 ? "s" : ""} &nbsp;·&nbsp; Total billed: <span style="color:var(--green);font-family:'JetBrains Mono',monospace">${fmt(totalBilled)}</span>
    </div>
    <div style="display:grid;gap:8px">
      ${list
        .map(
          (inv, idx) => `
        <div style="
          background:rgba(0,0,0,.2);
          border:1px solid var(--border);
          border-radius:5px;
          padding:12px 16px;
          display:grid;
          grid-template-columns:auto 1fr auto auto;
          gap:8px 16px;
          align-items:center;
          font-size:14px;
        ">
          <span style="font-family:'JetBrains Mono',monospace;color:var(--gold);font-size:13px">${inv.invoiceNumber}</span>
          <span style="color:var(--dim)">${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)} &nbsp;·&nbsp; ${inv.hoursWorked} hrs</span>
          <span style="font-family:'JetBrains Mono',monospace;color:var(--green)">${fmt(inv.totalAmount)}</span>
          <button class="secondary" style="padding:3px 10px;font-size:12px" onclick="reprintInvoice(${idx})">Print</button>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function reprintInvoice(idx) {
  const intake = bidData.intake || {};
  const key = `ifl_invoices_${intake.solId || "general"}`;
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  if (list[idx]) printInvoice(list[idx]);
}

function clearInvoiceForm() {
  document.getElementById("invHours").value = "";
  document.getElementById("invNotes").value = "";
  document.getElementById("odcRows").innerHTML = "";
  odcCount = 0;
  document.getElementById("invPreview").style.display = "none";
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function fmt(n) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmt2(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}
