/* ═══════════════════════════════════════════════
   backend/server.js
   IFL Service Contract Intelligence Engine
   The House of Kel LLC | CAGE 152U4 | SDVOSB

   Replaces proxy.js.
   Serves: AI proxy, bids, invoices, file uploads

   SETUP:
   1. cp .env.example .env  → fill OPENAI_API_KEY + MONGO_URI
   2. npm install
   3. node server.js  (or: npm run dev)

   Frontend: keep pointing to http://localhost:3001
   URL change: callClaude() → http://localhost:3001/api/claude
═══════════════════════════════════════════════ */
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { connect } = require("./db/mongo");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving (frontend) ───────────────────────────────
// Point this at your frontend folder if you want the backend to serve it
// app.use(express.static(path.join(__dirname, "../frontend")));

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/claude",   require("./routes/ai"));
app.use("/api/bids",     require("./routes/bids"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/files",    require("./routes/files"));
app.use("/api/sam",      require("./routes/sam"));

// ── Legacy root POST — keeps old proxy.js behavior working ───────
// Frontend callClaude() currently hits POST http://localhost:3001
// Once you update ifl-core.js to use /api/claude, remove this.
app.post("/", require("./routes/ai"));

// ── Health check ─────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    ok:      true,
    service: "IFL Backend",
    cage:    "152U4",
    time:    new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────
async function start() {
  try {
    await connect();
  } catch (err) {
    console.warn(`⚠ MongoDB not connected: ${err.message}`);
    console.warn("  Running without DB — bid logging to DB disabled.");
    console.warn("  Set MONGO_URI in .env to enable.\n");
  }

  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  IFL Backend — http://localhost:${PORT}  ║`);
    console.log(`╠══════════════════════════════════════╣`);
    console.log(`║  POST /api/claude   → OpenAI GPT-4o  ║`);
    console.log(`║  CRUD /api/bids     → Bid pipeline   ║`);
    console.log(`║  CRUD /api/invoices → Invoices        ║`);
    console.log(`║  CRUD /api/files    → Sol packets     ║`);
    console.log(`╚══════════════════════════════════════╝\n`);
  });
}

start();
