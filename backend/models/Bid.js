/* ═══════════════════════════════════════════════
   models/Bid.js
   Full bid snapshot — written on submit
   Archived when status = Awarded | No Award
═══════════════════════════════════════════════ */
const { Schema, model } = require("mongoose");

const NoteSchema = new Schema({
  ts:   { type: Date, default: Date.now },
  text: { type: String, required: true },
}, { _id: false });

const BidSchema = new Schema({
  // ── Identifiers ─────────────────────────────
  solId:      { type: String, required: true, index: true },
  title:      { type: String, default: "" },
  agency:     { type: String, default: "" },
  location:   { type: String, default: "" },
  naics:      { type: String, default: "" },
  setAside:   { type: String, default: "" },
  dueDate:    { type: String, default: "" },
  period:     { type: String, default: "" },

  // ── POC / Contact ────────────────────────────
  website:    { type: String, default: "" },
  pocName:    { type: String, default: "" },
  pocPhone:   { type: String, default: "" },
  pocEmail:   { type: String, default: "" },

  // ── Pricing ──────────────────────────────────
  yourRate:   { type: Number, default: null },
  totalValue: { type: Number, default: null },
  gpPct:      { type: Number, default: null },
  netOwner:   { type: Number, default: null },
  hours:      { type: Number, default: null },
  wdNum:      { type: String, default: "" },
  baseWage:   { type: Number, default: null },
  fringe:     { type: Number, default: null },

  // ── Subcontractor ────────────────────────────
  subName:    { type: String, default: "" },
  subLocation:{ type: String, default: "" },
  subBillRate:{ type: Number, default: null },

  // ── Submission ───────────────────────────────
  submitterName:  { type: String, default: "" },
  submitterEmail: { type: String, default: "" },
  submitMethod:   { type: String, default: "" },
  submitNotes:    { type: String, default: "" },
  submittedAt:    { type: Date, default: null },

  // ── AI Verdict ───────────────────────────────
  verdict:    { type: String, enum: ["GO","MARGINAL","PASS","Tracking"], default: "Tracking" },

  // ── Lifecycle ────────────────────────────────
  // Active      = in workflow, not yet submitted
  // Submitted   = bid logged, awaiting decision
  // Awarded     = WON — archive to DB, remove from sidebar
  // No Award    = LOST — archive to DB, remove from sidebar
  // Cancelled   = sol cancelled or we withdrew
  status: {
    type: String,
    enum: ["Active","Submitted","Awarded","No Award","Cancelled"],
    default: "Active",
    index: true,
  },
  archived: { type: Boolean, default: false, index: true },

  // ── Notes / History ──────────────────────────
  notes:   { type: String, default: "" },
  history: { type: [NoteSchema], default: [] },

  // ── Full snapshot (raw bidData from localStorage) ──
  snapshot: { type: Schema.Types.Mixed, default: {} },

}, { timestamps: true });

// Text index for search
BidSchema.index({ solId: "text", title: "text", agency: "text", notes: "text" });

module.exports = model("Bid", BidSchema);
