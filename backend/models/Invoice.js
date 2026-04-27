/* ═══════════════════════════════════════════════
   models/Invoice.js
   Linked to a Bid by solId + bidId
═══════════════════════════════════════════════ */
const { Schema, model } = require("mongoose");

const InvoiceSchema = new Schema({
  // ── Link to contract ─────────────────────────
  bidId:   { type: Schema.Types.ObjectId, ref: "Bid", required: true, index: true },
  solId:   { type: String, required: true, index: true },
  agency:  { type: String, default: "" },

  // ── Invoice identity ─────────────────────────
  invoiceNumber: { type: String, required: true },  // e.g. IFL-2026-001
  periodStart:   { type: Date, required: true },
  periodEnd:     { type: Date, required: true },

  // ── Labor ─────────────────────────────────────
  hoursWorked:   { type: Number, required: true },
  billRate:      { type: Number, required: true },   // your rate to gov
  laborAmount:   { type: Number, required: true },   // hoursWorked * billRate

  // ── ODCs (other direct costs) ─────────────────
  odcs: [{
    description: String,
    amount:      Number,
  }],
  odcTotal: { type: Number, default: 0 },

  // ── Totals ────────────────────────────────────
  subtotal:    { type: Number, required: true },
  taxAmount:   { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  // ── FE Factoring ─────────────────────────────
  feFactoring:     { type: Boolean, default: false },
  feAdvancePct:    { type: Number, default: 90 },
  feAdvanceAmount: { type: Number, default: null },

  // ── Status ────────────────────────────────────
  // Draft → Submitted → Approved → Paid
  status: {
    type: String,
    enum: ["Draft","Submitted","Approved","Paid","Disputed"],
    default: "Draft",
    index: true,
  },

  submittedAt: { type: Date, default: null },
  approvedAt:  { type: Date, default: null },
  paidAt:      { type: Date, default: null },

  notes: { type: String, default: "" },

}, { timestamps: true });

module.exports = model("Invoice", InvoiceSchema);
