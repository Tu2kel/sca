/* routes/files.js — Sol packet file upload/retrieve + ZIP packaging */
const express   = require("express");
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");
const archiver  = require("archiver");
const router    = express.Router();
const SolPacket = require("../models/SolPacket");

// ── Storage config ───────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const solDir = path.join(UPLOAD_DIR, req.params.solId || "misc");
    if (!fs.existsSync(solDir)) fs.mkdirSync(solDir, { recursive: true });
    cb(null, solDir);
  },
  filename: (req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },  // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf",".docx",".doc",".xlsx",".xls",".txt",".csv",".msg",".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── POST /api/files/:solId — upload one or more files ───────────
router.post("/:solId", upload.array("files", 20), async (req, res) => {
  try {
    const { solId } = req.params;
    const { category = "Other", bidId } = req.body;

    let packet = await SolPacket.findOne({ solId });
    if (!packet) {
      packet = await SolPacket.create({
        solId,
        bidId:  bidId || null,
        agency: req.body.agency || "",
        title:  req.body.title  || "",
      });
    }

    const newAttachments = req.files.map(f => ({
      filename:     f.filename,
      originalName: f.originalname,
      mimetype:     f.mimetype,
      size:         f.size,
      category,
      path:         f.path,
    }));

    packet.attachments.push(...newAttachments);
    packet.updatedAt = new Date();
    await packet.save();

    res.json({ ok: true, packet, uploaded: newAttachments.length });
  } catch (err) {
    console.error("POST /files error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/files/:solId — list attachments for a sol ──────────
router.get("/:solId", async (req, res) => {
  try {
    const packet = await SolPacket.findOne({ solId: req.params.solId });
    if (!packet) return res.json({ solId: req.params.solId, attachments: [] });
    res.json(packet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/files/:solId/download/:filename ─────────────────────
router.get("/:solId/download/:filename", async (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.solId, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/files/:solId/:filename ──────────────────────────
router.delete("/:solId/:filename", async (req, res) => {
  try {
    const { solId, filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, solId, filename);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await SolPacket.findOneAndUpdate(
      { solId },
      { $pull: { attachments: { filename } } }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/files/:solId/zip — download all files as ZIP ───────
router.get("/:solId/zip", async (req, res) => {
  try {
    const { solId } = req.params;
    const solDir    = path.join(UPLOAD_DIR, solId);

    if (!fs.existsSync(solDir)) {
      return res.status(404).json({ error: "No files found for this SOL" });
    }

    const safeSol = solId.replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeSol}_SubmissionPackage.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", err => { throw err; });
    archive.pipe(res);
    archive.directory(solDir, false);
    await archive.finalize();
  } catch (err) {
    console.error("ZIP error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
