/* ═══════════════════════════════════════════════
   routes/sam-entity.js
   SAM.gov Entity Management API proxy
   Verifies small business certifications for sourcing candidates
═══════════════════════════════════════════════ */
"use strict";

const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const SAM_BASE = "https://api.sam.gov/entity-information/v3/entities";

// SBA business type codes that indicate small business certifications
const CERT_MAP = {
  "2X": "For Profit Organization",
  "8A": "8(a) Program Participant",
  "8W": "Woman Owned Small Business",
  "8C": "Joint Venture Women Owned Small Business",
  A8: "Economically Disadvantaged WOSB",
  MF: "Manufacturer of Goods",
  OY: "Black American Owned",
  A2: "Woman Owned Business",
  23: "Minority Owned Business",
  HK: "Community Development Corporation Owned Firm",
  VW: "Veteran Owned Business",
  VO: "Service Disabled Veteran Owned Business",
  QF: "HUBZone Firm",
  27: "Self-Certified Small Disadvantaged Business",
  "2U": "Small Business",
};

// SBA-specific codes that indicate verified small business status
const SB_CODES = new Set([
  "2U",
  "A2",
  "8A",
  "8W",
  "8C",
  "A8",
  "QF",
  "27",
  "VW",
  "VO",
]);

/*
  GET /api/sam-entity?name=Company+Name
  GET /api/sam-entity?uei=ABC123
  GET /api/sam-entity?cage=XXXXX

  Returns:
  {
    found: true|false,
    entity: { legalBusinessName, uei, cage, registrationStatus, ... },
    certifications: ["Small Business", "SDVOSB", ...],
    sbaBusinessTypes: [...],
    isSmallBusiness: true|false,
    far219_14_status: "waived"|"applies"|"unknown",
    samProfileUrl: "https://sam.gov/..."
  }
*/
router.get("/", async (req, res) => {
  const apiKey = process.env.SAM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "SAM_API_KEY not configured",
      hint: "Add SAM_API_KEY=your_key to your .env file. Get it from sam.gov/profile/details",
    });
  }

  const { name, uei, cage } = req.query;
  if (!name && !uei && !cage) {
    return res
      .status(400)
      .json({ error: "Provide name, uei, or cage query param" });
  }

  // Build SAM API query
  const params = new URLSearchParams({
    api_key: apiKey,
    includeSections: "entityRegistration,coreData",
    registrationStatus: "A", // Active only
  });

  if (uei) params.set("ueiSAM", uei);
  else if (cage) params.set("cageCode", cage);
  else {
    // Name search — SAM uses legalBusinessName with wildcard support
    params.set("legalBusinessName", name);
  }

  try {
    const url = `${SAM_BASE}?${params.toString()}`;
    const samRes = await fetch(url, {
      headers: { Accept: "application/json" },
      timeout: 10000,
    });

    if (!samRes.ok) {
      const errText = await samRes.text();
      console.error("SAM API error:", samRes.status, errText);
      return res.status(samRes.status).json({
        error: `SAM.gov returned ${samRes.status}`,
        detail: errText.slice(0, 500),
      });
    }

    const data = await samRes.json();
    const entities = data.entityData || [];

    if (!entities.length) {
      return res.json({
        found: false,
        query: { name, uei, cage },
        message: "No active SAM registration found",
        far219_14_status: "unknown",
        isSmallBusiness: false,
        certifications: [],
      });
    }

    // Use first result (best match)
    const e = entities[0];
    const reg = e.entityRegistration || {};
    const core = e.coreData || {};
    const biz = core.businessTypes || {};

    // Pull all business type codes
    const bizTypeList = biz.businessTypeList || [];
    const sbaTypeList = biz.sbaBusinessTypeList || [];

    // Combine and decode certs
    const allCodes = [
      ...bizTypeList.map((t) => t.businessTypeCode),
      ...sbaTypeList.map((t) => t.sbaBusinessTypeCode).filter(Boolean),
    ];

    const certifications = [...new Set(allCodes)]
      .filter((c) => CERT_MAP[c])
      .map((c) => CERT_MAP[c]);

    // Small business determination
    // Check sbaBusinessTypeList for non-null entries = SBA-verified
    const sbaVerifiedCodes = sbaTypeList
      .map((t) => t.sbaBusinessTypeCode)
      .filter(Boolean);

    const isSmallBusiness =
      sbaVerifiedCodes.some((c) => SB_CODES.has(c)) ||
      allCodes.includes("2U") || // self-certified small business
      certifications.some(
        (c) =>
          /small business/i.test(c) ||
          /hubzone/i.test(c) ||
          /8\(a\)/i.test(c) ||
          /wosb/i.test(c) ||
          /sdvosb/i.test(c) ||
          /veteran/i.test(c),
      );

    const far219_14_status = isSmallBusiness ? "waived" : "applies";

    const far219_14_note = isSmallBusiness
      ? "Small Biz certified — 50% labor cap waived"
      : "Not SB certified in SAM.gov — 50% labor cap applies";

    const ueiSAM = reg.ueiSAM || "";
    const samProfileUrl = ueiSAM
      ? `https://sam.gov/entity/${ueiSAM}/overview`
      : `https://sam.gov/search/?index=entity&page=1&pageSize=10&sort=-relevance&sfm%5Bkeyword%5D=${encodeURIComponent(name || "")}`;

    return res.json({
      found: true,
      query: { name, uei, cage },
      entity: {
        legalBusinessName: reg.legalBusinessName || "",
        uei: ueiSAM,
        cage: reg.cageCode || "",
        registrationStatus: reg.registrationStatus || "",
        registrationExpirationDate: reg.registrationExpirationDate || "",
        stateOfIncorporation:
          core.generalInformation?.stateOfIncorporationDesc || "",
      },
      certifications,
      sbaBusinessTypes: sbaTypeList,
      isSmallBusiness,
      far219_14_status,
      far219_14_note,
      samProfileUrl,
    });
  } catch (err) {
    console.error("SAM entity lookup error:", err.message);
    return res.status(500).json({
      error: "SAM entity lookup failed",
      detail: err.message,
    });
  }
});

module.exports = router;
