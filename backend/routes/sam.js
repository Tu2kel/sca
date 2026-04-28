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

  // SAM API doesn't support OR syntax in title — run multiple keyword searches
  // and merge results if keyword contains OR
  const keywords = keyword
    ? keyword
        .split(/\s+OR\s+/i)
        .map((k) => k.trim())
        .filter(Boolean)
    : [""];

  // Default date range: last 90 days → next 120 days
  const now = new Date();
  const from = postedFrom || fmtDate(new Date(now - 90 * 86400000));
  const to = postedTo || fmtDate(new Date(now.getTime() + 120 * 86400000));

  const baseParams = {
    api_key: apiKey,
    ptype: "o,p", // solicitations + presolicitations
    postedFrom: from,
    postedTo: to,
    limit: String(Math.min(parseInt(limit) || 25, 100)),
    offset: String(parseInt(offset) || 0),
    active: "Yes",
  };

  if (state) baseParams.state = state;
  if (naics) baseParams.ncode = naics;
  if (setAside) baseParams.typeOfSetAside = mapSetAside(setAside);

  console.log("[SAM] Base params:", baseParams);
  console.log("[SAM] Keywords to search:", keywords);

  try {
    // Run a search per keyword, merge + dedupe results
    const allOpps = [];
    const seen = new Set();

    for (const kw of keywords) {
      const params = new URLSearchParams(baseParams);
      if (kw) params.set("title", kw);

      const url = `https://api.sam.gov/prod/opportunities/v2/search?${params}`;
      console.log("[SAM] Fetching:", url.replace(apiKey, "***"));

      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await r.text();

      if (!r.ok) {
        console.error(
          `[SAM] API error for keyword "${kw}":`,
          r.status,
          text.slice(0, 300),
        );
        continue; // try next keyword instead of failing entirely
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[SAM] JSON parse error:", e.message, text.slice(0, 200));
        continue;
      }

      console.log(
        `[SAM] Keyword "${kw}" → ${data.totalRecords || 0} total, ${(data.opportunitiesData || []).length} returned`,
      );

      for (const opp of data.opportunitiesData || []) {
        const id = opp.noticeId || opp.solicitationNumber || opp.title;
        if (id && !seen.has(id)) {
          seen.add(id);
          allOpps.push(normalizeOpp(opp));
        }
      }
    }

    console.log(`[SAM] Total unique opportunities: ${allOpps.length}`);
    res.json({
      ok: true,
      total: allOpps.length,
      count: allOpps.length,
      opportunities: allOpps,
    });
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
