/* ═══════════════════════════════════════════════
   models/SolPacket.js
   Solicitation packet — attachments + metadata
   Files stored on disk (uploads/) referenced here
   Future: migrate to GridFS or S3
═══════════════════════════════════════════════ */
const { Schema, model } = require("mongoose");

const AttachmentSchema = new Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, default: "" },
  size:         { type: Number, default: 0 },
  category: {
    type: String,
    enum: ["SOW","PWS","WD","RFP","RFQ","Amendment","QASP","PriceSchedule","Other"],
    default: "Other",
  },
  uploadedAt: { type: Date, default: Date.now },
  path:       { type: String, required: true },  // server-side path
}, { _id: true });

const SolPacketSchema = new Schema({
  solId:    { type: String, required: true, unique: true, index: true },
  bidId:    { type: Schema.Types.ObjectId, ref: "Bid", default: null },
  agency:   { type: String, default: "" },
  title:    { type: String, default: "" },

  attachments: { type: [AttachmentSchema], default: [] },

  // Metadata extracted from docs
  wdNum:      { type: String, default: "" },
  amendments: { type: [String], default: [] },  // ["A0001","A0002"]
  dueDate:    { type: String, default: "" },

  notes: { type: String, default: "" },

}, { timestamps: true });

module.exports = model("SolPacket", SolPacketSchema);
