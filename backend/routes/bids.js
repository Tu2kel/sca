/* routes/bids.js — Bid CRUD + archive + search */
const express = require("express");
const router  = express.Router();
const Bid     = require("../models/Bid");

// ── POST /api/bids — create or upsert on submit ──────────────────
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    if (!data.solId) return res.status(400).json({ error: "solId required" });

    const existing = await Bid.findOne({ solId: data.solId });

    if (existing) {
      // Upsert — preserve history
      const updated = await Bid.findOneAndUpdate(
        { solId: data.solId },
        {
          ...data,
          history: existing.history,  // never overwrite history
          updatedAt: new Date(),
        },
        { new: true }
      );
      return res.json({ ok: true, bid: updated, action: "updated" });
    }

    const bid = await Bid.create(data);
    res.json({ ok: true, bid, action: "created" });

  } catch (err) {
    console.error("POST /bids error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bids — active pipeline (not archived) ───────────────
router.get("/", async (req, res) => {
  try {
    const bids = await Bid.find({ archived: false })
      .sort({ updatedAt: -1 })
      .select("-snapshot");  // don't send full snapshot in list
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bids/search?q= ──────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const bids = await Bid.find({
      $or: [
        { solId:  { $regex: q, $options: "i" } },
        { title:  { $regex: q, $options: "i" } },
        { agency: { $regex: q, $options: "i" } },
        { notes:  { $regex: q, $options: "i" } },
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select("-snapshot");

    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bids/:id — single bid with full snapshot ────────────
router.get("/:id", async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) return res.status(404).json({ error: "Not found" });
    res.json(bid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/bids/:id/status — update status, auto-archive ─────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const ARCHIVE_ON = ["Awarded", "No Award", "Cancelled"];

    const update = {
      status,
      archived: ARCHIVE_ON.includes(status),
      updatedAt: new Date(),
    };

    const bid = await Bid.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!bid) return res.status(404).json({ error: "Not found" });

    res.json({
      ok: true,
      bid,
      archived: update.archived,
      message: update.archived
        ? `${status} — bid archived to database`
        : `Status updated to ${status}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/bids/:id/note — append a history note ─────────────
router.patch("/:id/note", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Note text required" });

    const bid = await Bid.findByIdAndUpdate(
      req.params.id,
      {
        $push: { history: { $each: [{ ts: new Date(), text: text.trim() }], $position: 0 } },
        $set:  { updatedAt: new Date() },
      },
      { new: true }
    );
    if (!bid) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, bid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bids/archived — archived bids (awarded/lost) ────────
router.get("/archive/all", async (req, res) => {
  try {
    const bids = await Bid.find({ archived: true })
      .sort({ updatedAt: -1 })
      .select("-snapshot");
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
