/* ═══════════════════════════════════════════════
   db/mongo.js — MongoDB connection singleton
   The House of Kel LLC | CAGE 152U4
═══════════════════════════════════════════════ */
const mongoose = require("mongoose");

let connected = false;

async function connect() {
  if (connected) return;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set in .env");

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB || "ifl_contracts",
  });

  connected = true;
  console.log(`✓ MongoDB connected → ${process.env.MONGO_DB || "ifl_contracts"}`);

  mongoose.connection.on("disconnected", () => {
    connected = false;
    console.warn("⚠ MongoDB disconnected");
  });
}

module.exports = { connect };
