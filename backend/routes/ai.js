/* routes/ai.js — AI proxy route */
const express = require("express");
const fetch   = require("node-fetch");
const router  = express.Router();

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

router.post("/", async (req, res) => {
  try {
    const { system, messages, max_tokens = 2000 } = req.body;

    const payload = {
      model: "gpt-4o",
      max_tokens,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages,
      ],
    };

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const oai  = await response.json();
    const text = oai.choices?.[0]?.message?.content || "";

    // Return Anthropic-shaped so frontend callClaude() needs no changes
    res.json({ content: [{ type: "text", text }] });

  } catch (err) {
    console.error("AI route error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
