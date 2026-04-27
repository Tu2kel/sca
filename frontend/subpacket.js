/* ═══════════════════════════════════════════════
   subpacket.js — Subcontractor Onboarding Packet
   Generates sub agreement + SCA flow-down + insurance req
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */

function generateSubPacket() {
  const sourcing = bidData.sourcing?.locked;
  const intake   = bidData.intake  || {};
  const pricing  = bidData.pricing || {};

  if(!sourcing?.name){ showToast("Lock a subcontractor first", true); return; }
  if(!intake.solId)  { showToast("Complete Intake first", true); return; }

  const today    = new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const wdFloor  = ((intake.baseWage||0)+(intake.fringe||0)).toFixed(2);
  const backup   = bidData.sourcing?.backup;

  const win = window.open("","_blank","width=900,height=1100");
  win.document.write(`<!doctype html><html><head>
  <meta charset="UTF-8"/><title>Sub Onboarding — ${sourcing.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+Garamond:wght@300;400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cormorant Garamond',serif;font-size:14px;color:#1a0a12;background:#faf7f2;padding:48px 56px}
    h1{font-family:'Cinzel',serif;font-size:18px;font-weight:600;color:#1a0a12;letter-spacing:.06em;margin-bottom:4px}
    h2{font-family:'Cinzel',serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7a5000;margin:28px 0 10px 0;padding-bottom:6px;border-bottom:1px solid rgba(122,80,0,.3)}
    p{line-height:1.75;margin-bottom:10px;color:rgba(26,10,18,.8)}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:18px;border-bottom:2px solid #b8860b}
    .co{font-family:'Cinzel',serif;font-size:16px;font-weight:600;letter-spacing:.05em}
    .sub{font-size:12px;color:rgba(26,10,18,.5);margin-top:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
    th{font-family:'Cinzel',serif;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#7a5000;padding:8px 10px;border-bottom:1px solid rgba(122,80,0,.25);text-align:left}
    td{padding:8px 10px;border-bottom:1px solid rgba(26,10,18,.07);vertical-align:top}
    td:first-child{color:rgba(26,10,18,.5);width:40%}
    .mono{font-family:'JetBrains Mono',monospace}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px 48px;margin-top:20px}
    .sig-field{display:flex;flex-direction:column;gap:4px}
    .sig-label{font-family:'Cinzel',serif;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#7a5000}
    .sig-line{border-bottom:1px solid rgba(26,10,18,.3);height:28px}
    .sig-pre{font-size:16px;padding-top:2px}
    .notice{background:rgba(122,80,0,.05);border:1px solid rgba(122,80,0,.2);border-radius:4px;padding:12px 16px;margin:12px 0;font-size:13px}
    .warn{background:rgba(180,30,30,.05);border:1px solid rgba(180,30,30,.2);border-radius:4px;padding:12px 16px;margin:12px 0;font-size:13px;color:#7a0012}
    ol,ul{margin-left:20px;line-height:1.8;font-size:13px;color:rgba(26,10,18,.8)}
    @media print{body{padding:32px 40px}@page{size:letter;margin:0.6in 0.7in}}
  </style></head><body>

  <div class="hdr">
    <div>
      <div class="co">The House of Kel LLC</div>
      <div class="sub">DBA Imperio Federal Logistics · CAGE 152U4 · SDVOSB · Killeen, TX</div>
      <div class="sub" style="margin-top:4px">(254) 226-5216 · anthony@ifedlog.com</div>
    </div>
    <div style="text-align:right">
      <div style="font-family:'Cinzel',serif;font-size:13px;color:#7a5000;letter-spacing:.08em">SUBCONTRACTOR ONBOARDING</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(26,10,18,.5);margin-top:4px">Date: ${today}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(26,10,18,.5)">SOL: ${intake.solId}</div>
    </div>
  </div>

  <!-- CONTRACT SUMMARY -->
  <h2>Contract Summary</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Solicitation No.</td><td class="mono">${intake.solId}</td></tr>
    <tr><td>Agency</td><td>${intake.agency||"—"}</td></tr>
    <tr><td>Place of Performance</td><td>${intake.location||"—"}</td></tr>
    <tr><td>Scope</td><td>${intake.scope||"—"}</td></tr>
    <tr><td>Contract Period</td><td>${intake.period||"—"}</td></tr>
    <tr><td>NAICS</td><td class="mono">${intake.naics||"—"}</td></tr>
    <tr><td>Wage Determination</td><td class="mono">${intake.wdNum||"—"}</td></tr>
    <tr><td>SCA Wage Floor</td><td class="mono">$${wdFloor}/hr (base $${intake.baseWage||0} + fringe $${intake.fringe||0})</td></tr>
  </table>

  <!-- SUBCONTRACTOR DETAILS -->
  <h2>Subcontractor Information</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Company Name</td><td><strong>${sourcing.name}</strong></td></tr>
    <tr><td>Contact</td><td>${sourcing.contact||"—"}</td></tr>
    <tr><td>Phone</td><td>${sourcing.phone||"—"}</td></tr>
    <tr><td>Email</td><td>${sourcing.email||"—"}</td></tr>
    <tr><td>Location</td><td>${sourcing.location||"—"}</td></tr>
    <tr><td>Agreed Bill Rate</td><td class="mono"><strong>$${(sourcing.billRate||0).toFixed(2)}/hr</strong></td></tr>
    <tr><td>Role</td><td>Labor Subcontractor under The House of Kel LLC (Prime)</td></tr>
  </table>

  <!-- PART A: SUBCONTRACT AGREEMENT -->
  <h2>Part A — Subcontract Agreement (Summary Terms)</h2>
  <div class="notice">This is a summary term sheet. A full subcontract agreement must be executed prior to performance start.</div>
  <ol>
    <li><strong>Parties.</strong> The House of Kel LLC ("Prime") engages ${sourcing.name} ("Subcontractor") to provide field labor services under federal contract solicitation ${intake.solId} at ${intake.location||"the place of performance"}.</li>
    <li><strong>Scope.</strong> Subcontractor shall provide labor as specified in the Prime's Statement of Work: ${intake.scope||"see attached SOW"}.</li>
    <li><strong>Bill Rate.</strong> Prime shall compensate Subcontractor at <strong>$${(sourcing.billRate||0).toFixed(2)} per hour</strong> for hours actually worked and accepted. No payment for idle time, travel, or unapproved overtime without prior written authorization.</li>
    <li><strong>Period.</strong> ${intake.period||"As specified in solicitation"}. This agreement is contingent on Prime receiving award.</li>
    <li><strong>Prime Oversight.</strong> All work is subject to daily oversight, quality inspection, and performance management by The House of Kel LLC. Deficiencies must be corrected within timeframes specified by the Government's QASP.</li>
    <li><strong>Reporting.</strong> Subcontractor shall submit weekly certified timesheets. Hours discrepancies must be reported within 24 hours of pay period close.</li>
    <li><strong>Substitution.</strong> Any worker substitution requires 48-hour advance notice to Prime and Government COR approval where required.</li>
    <li><strong>Non-Disclosure.</strong> Subcontractor shall not disclose contract terms, Government facility information, or Prime's pricing to any third party.</li>
    <li><strong>Invoicing.</strong> Subcontractor invoices due to Prime by the 5th of each month for prior month hours. Prime pays Net 15 from receipt of proper invoice.</li>
    <li><strong>Termination.</strong> Prime may terminate this agreement with 5 calendar days written notice for convenience, or immediately for cause.</li>
  </ol>

  <!-- PART B: SCA FLOW-DOWN -->
  <h2>Part B — Service Contract Act (SCA) Flow-Down Notice</h2>
  <div class="warn">⚠ MANDATORY — SCA obligations flow to all subcontractors on covered contracts. Violation exposes both Prime and Subcontractor to DOL investigation, back wages, and debarment.</div>
  <p>Pursuant to the McNamara-O'Hara Service Contract Act (41 U.S.C. §§ 6701–6707) and FAR 52.222-41, the following wage obligations apply to all workers performing under this subcontract:</p>
  <table>
    <tr><th>Requirement</th><th>Detail</th></tr>
    <tr><td>Wage Determination No.</td><td class="mono">${intake.wdNum||"See solicitation"}</td></tr>
    <tr><td>Minimum Base Wage</td><td class="mono">$${intake.baseWage||0}/hr</td></tr>
    <tr><td>Health &amp; Welfare Fringe</td><td class="mono">$${intake.fringe||0}/hr (cash equivalent or qualifying benefit)</td></tr>
    <tr><td>Total Minimum Compensation</td><td class="mono"><strong>$${wdFloor}/hr</strong></td></tr>
    <tr><td>Applies To</td><td>All service employees working under this contract</td></tr>
    <tr><td>Classification</td><td>Workers must be classified per WD occupation definitions. Misclassification is a violation.</td></tr>
    <tr><td>1099 / IC Status</td><td style="color:#7a0012"><strong>PROHIBITED on SCA-covered work.</strong> Workers must be W-2 employees.</td></tr>
    <tr><td>Posting Required</td><td>Post WD and SCA employee rights poster at the worksite.</td></tr>
    <tr><td>Records</td><td>Maintain certified payroll records for 3 years. DOL audit access required.</td></tr>
  </table>
  <p>By signing below, Subcontractor acknowledges full understanding and acceptance of SCA compliance obligations for all workers placed on this contract.</p>

  <!-- PART C: INSURANCE REQUIREMENTS -->
  <h2>Part C — Insurance Requirements</h2>
  <p>Subcontractor must maintain the following insurance and provide certificates of insurance (COI) naming The House of Kel LLC as additional insured prior to mobilization:</p>
  <table>
    <tr><th>Coverage Type</th><th>Minimum Limits</th><th>Status</th></tr>
    <tr><td>Commercial General Liability</td><td class="mono">$1,000,000 per occurrence / $2,000,000 aggregate</td><td>COI Required</td></tr>
    <tr><td>Workers Compensation</td><td class="mono">Statutory limits (Texas / state of performance)</td><td>COI Required</td></tr>
    <tr><td>Employers Liability</td><td class="mono">$100,000 / $500,000 / $100,000</td><td>COI Required</td></tr>
    <tr><td>Commercial Auto (if applicable)</td><td class="mono">$500,000 combined single limit</td><td>If vehicles used</td></tr>
  </table>
  <div class="notice">COIs must list: The House of Kel LLC, CAGE 152U4, Killeen TX as additional insured. Policies must remain active for the full contract period. Lapses must be reported to Prime within 24 hours.</div>

  <!-- PART D: CHECKLIST -->
  <h2>Part D — Onboarding Checklist (Prime to Verify)</h2>
  <table>
    <tr><th>Item</th><th>Required By</th><th>Status</th></tr>
    <tr><td>Signed subcontract agreement</td><td>Before performance</td><td>☐ Received</td></tr>
    <tr><td>CGL Certificate of Insurance</td><td>Before mobilization</td><td>☐ Received</td></tr>
    <tr><td>Workers Comp Certificate</td><td>Before mobilization</td><td>☐ Received</td></tr>
    <tr><td>SCA flow-down acknowledgment (signed)</td><td>Before performance</td><td>☐ Signed</td></tr>
    <tr><td>Payroll process confirmed (W-2 only)</td><td>Before performance</td><td>☐ Confirmed</td></tr>
    <tr><td>WD poster at worksite</td><td>Day 1 of performance</td><td>☐ Posted</td></tr>
    <tr><td>Key personnel names submitted</td><td>5 days before start</td><td>☐ Received</td></tr>
    <tr><td>Backup labor plan confirmed</td><td>Before performance</td><td>${backup?`☐ Backup: ${backup.name}`:"☐ REQUIRED — no backup set"}</td></tr>
  </table>

  <!-- SIGNATURES -->
  <h2>Signatures</h2>
  <p>By signing below, both parties agree to the terms set forth in this onboarding packet. Full subcontract agreement to follow.</p>
  <div class="sig-grid">
    <div class="sig-field">
      <div class="sig-label">Prime — Authorized Signature</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Subcontractor — Authorized Signature</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Printed Name</div>
      <div class="sig-pre">Anthony K. Kelley</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Printed Name</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Title</div>
      <div class="sig-pre">Owner / Program Manager</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Title</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Date</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-field">
      <div class="sig-label">Date</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
  win.document.close();
}
