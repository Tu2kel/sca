/* routes/invoices.js — Invoice CRUD */
const express = require("express");
const router  = express.Router();
const Invoice = require("../models/Invoice");

// ── POST /api/invoices — create draft invoice ────────────────────
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    // Auto-calc labor amount and totals if not provided
    if (data.hoursWorked && data.billRate) {
      data.laborAmount = +(data.hoursWorked * data.billRate).toFixed(2);
    }
    data.odcTotal    = (data.odcs || []).reduce((s, o) => s + (o.amount || 0), 0);
    data.subtotal    = (data.laborAmount || 0) + data.odcTotal;
    data.totalAmount = data.subtotal + (data.taxAmount || 0);

    if (data.feFactoring) {
      data.feAdvanceAmount = +(data.totalAmount * ((data.feAdvancePct || 90) / 100)).toFixed(2);
    }

    const inv = await Invoice.create(data);
    res.json({ ok: true, invoice: inv });
  } catch (err) {
    console.error("POST /invoices error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invoices?bidId= ─────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.bidId) filter.bidId = req.query.bidId;
    if (req.query.solId) filter.solId = req.query.solId;
    if (req.query.status) filter.status = req.query.status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invoices/:id ─────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate("bidId", "solId agency title");
    if (!inv) return res.status(404).json({ error: "Not found" });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/invoices/:id/status ───────────────────────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };

    if (status === "Submitted") update.submittedAt = new Date();
    if (status === "Approved")  update.approvedAt  = new Date();
    if (status === "Paid")      update.paidAt       = new Date();

    const inv = await Invoice.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!inv) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, invoice: inv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
