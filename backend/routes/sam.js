/* ═══════════════════════════════════════════════
   routes/sam.js — SAM.gov Opportunity Ingestion
   GET /api/sam/opportunities
   The House of Kel LLC | CAGE 152U4 | SDVOSB
═══════════════════════════════════════════════ */
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.get("/opportunities", async (req, res) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey)
    return res
      .status(503)
      .json({ error: "SAM_API_KEY not configured in .env" });

  const {
    keyword = "",
    naics = "",
    state = "TX",
    setAside = "",
    postedFrom = "",
    postedTo = "",
    limit = "25",
    offset = "0",
  } = req.query;

  // Split OR keywords into separate searches
  const keywords = keyword
    ? keyword
        .split(/\s+OR\s+/i)
        .map((k) => k.trim())
        .filter(Boolean)
    : [""];

  const now = new Date();
  const from = postedFrom || fmtDate(new Date(now - 90 * 86400000));
  const to = postedTo || fmtDate(new Date(now.getTime() + 120 * 86400000));

  const lim = String(Math.min(parseInt(limit) || 25, 1000)); // SAM v2 supports up to 1000

  console.log(
    `[SAM] keywords=${JSON.stringify(keywords)} state=${state} setAside=${setAside} from=${from} to=${to} limit=${lim} offset=${offset}`,
  );

  try {
    const allOpps = [];
    const seen = new Set();

    for (const kw of keywords) {
      const p = new URLSearchParams({
        api_key: apiKey,
        postedFrom: from,
        postedTo: to,
        limit: lim,
        offset: String(parseInt(offset) || 0),
        ptype: "o,p,r", // solicitations, presolicitations, sources sought
      });

      // SAM v2 correct param names
      if (kw) p.set("keyword", kw);
      if (state) p.set("state", state);
      if (naics) p.set("ncode", naics);
      if (setAside) p.set("typeOfSetAside", mapSetAside(setAside));

      const url = `https://api.sam.gov/prod/opportunities/v2/search?${p}`;
      console.log(`[SAM] → ${url.replace(apiKey, "***")}`);

      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const text = await r.text();

      console.log(`[SAM] ← ${r.status} | preview: ${text.slice(0, 300)}`);

      if (!r.ok) {
        console.error(`[SAM] Non-OK for "${kw}"`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[SAM] Parse error:", e.message);
        continue;
      }

      const opps =
        data.opportunitiesData || data._embedded?.opportunities || [];
      console.log(
        `[SAM] "${kw}" → totalRecords=${data.totalRecords} | returned=${opps.length}`,
      );
      if (!opps.length)
        console.log("[SAM] Keys in response:", Object.keys(data));

      for (const opp of opps) {
        const id = opp.noticeId || opp.solicitationNumber || opp.title;
        if (id && !seen.has(id)) {
          seen.add(id);
          allOpps.push(normalizeOpp(opp));
        }
      }
    }

    console.log(`[SAM] Total unique: ${allOpps.length}`);
    res.json({
      ok: true,
      total: allOpps.length,
      count: allOpps.length,
      opportunities: allOpps,
    });
  } catch (err) {
    console.error("[SAM] Fatal:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/opportunities/:noticeId", async (req, res) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey)
    return res.status(503).json({ error: "SAM_API_KEY not configured" });
  const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&noticeid=${req.params.noticeId}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    const opp = (d.opportunitiesData || [])[0];
    if (!opp) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, opportunity: normalizeOpp(opp) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    verdict: null,
    reason: "",
    source: "SAM.gov",
  };
}

function fmtDate(d) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
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
