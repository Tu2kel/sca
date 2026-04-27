/* ═══════════════════════════════════════════════
   routes/sam.js — SAM.gov Opportunity Ingestion
   GET /api/sam/opportunities
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

/* ─── OPPORTUNITY SEARCH ──────────────────────── */
router.get("/opportunities", async (req, res) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: "SAM_API_KEY not configured in .env" });
  }

  const {
    keyword = "",
    naics = "",
    state = "TX",
    setAside = "",
    agency = "",
    postedFrom = "",
    postedTo = "",
    limit = "25",
    offset = "0",
  } = req.query;

  // Default date range: last 60 days → next 90 days
  const now = new Date();
  const from = postedFrom || fmtDate(new Date(now - 60 * 86400000));
  const to = postedTo || fmtDate(new Date(now.getTime() + 90 * 86400000));

  const params = new URLSearchParams({
    api_key: apiKey,
    ptype: "o", // presolicitation + solicitation
    postedFrom: from,
    postedTo: to,
    limit: String(Math.min(parseInt(limit) || 25, 100)),
    offset: String(parseInt(offset) || 0),
    active: "Yes",
  });

  if (keyword) params.set("title", keyword);
  if (state) params.set("state", state);
  if (naics) params.set("ncode", naics);
  if (setAside) params.set("typeOfSetAside", mapSetAside(setAside));
  if (agency) params.set("organizationId", agency); // org code, not name

  const url = `https://api.sam.gov/prod/opportunities/v2/search?${params}`;

  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text();

    if (!r.ok) {
      console.error("SAM API error:", r.status, text.slice(0, 300));
      return res
        .status(r.status)
        .json({ error: `SAM API ${r.status}`, detail: text.slice(0, 200) });
    }

    const data = JSON.parse(text);
    const opps = (data.opportunitiesData || []).map(normalizeOpp);
    const total = data.totalRecords || opps.length;

    res.json({ ok: true, total, count: opps.length, opportunities: opps });
  } catch (err) {
    console.error("SAM fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── OPPORTUNITY DETAIL ──────────────────────── */
router.get("/opportunities/:noticeId", async (req, res) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey)
    return res.status(503).json({ error: "SAM_API_KEY not configured" });

  const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&noticeid=${req.params.noticeId}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    const opp = (data.opportunitiesData || [])[0];
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });
    res.json({ ok: true, opportunity: normalizeOpp(opp) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── NORMALIZER — maps SAM fields to IFL schema ─── */
function normalizeOpp(o) {
  return {
    noticeId: o.noticeId || "",
    title: o.title || "",
    solId: o.solicitationNumber || "",
    agency: o.fullParentPathName || o.organizationName || "",
    naics: o.naicsCode || "",
    setAside: o.typeOfSetAsidesDescription || "",
    location: o.placeOfPerformance?.city?.name
      ? `${o.placeOfPerformance.city.name}, ${o.placeOfPerformance.state?.code || ""}`
      : o.placeOfPerformance?.state?.code || "",
    postedDate: o.postedDate || "",
    dueDate: o.responseDeadLine || "",
    type: o.type || "",
    description: o.description || "",
    url: o.uiLink || `https://sam.gov/opp/${o.noticeId}/view`,
    // IFL triage fields — populated by AI later
    verdict: null,
    reason: "",
    source: "SAM.gov",
  };
}

/* ─── HELPERS ─────────────────────────────────── */
function fmtDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${d.getFullYear()}`;
}

function mapSetAside(s) {
  const map = {
    SDVOSB: "SDVOSBC",
    VOSB: "VOSBC",
    "8a": "SBA",
    WOSB: "WOSB",
    HUBZone: "HZC",
    SB: "SBP",
    "Total SB": "SBP",
  };
  return map[s] || s;
}

module.exports = router;
