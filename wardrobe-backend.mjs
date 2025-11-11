// wardrobe-backend.mjs
//
// Serves the Virtual Closet PWA from ./public
// Exposes POST /api/scan-outfit for AI clothing analysis via Perplexity Sonar
//
// Setup (in this folder):
//   npm install express cors
//
// Run (PowerShell):
//   cd "C:\\Users\\csony\\Desktop\\Api\\wardrobe-backend"
//   $env:PERPLEXITY_API_KEY = "YOUR_REAL_KEY_HERE"
//   node wardrobe-backend.mjs
//
// Then (new terminal):
//   ngrok http 3000
//
// Open the ngrok HTTPS URL on your iPad / phone / anywhere.

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { jsonrepair } from "jsonrepair";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const PPLX_API_KEY = process.env.PERPLEXITY_API_KEY;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: "15mb" })); // handle base64 images

// ---------- Helpers ----------
function safeLog(...args) {
  try { console.log(...args); } catch {}
}

function clip(str, max = 800) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "...(truncated)";
}

/**
 * Extract the FIRST valid JSON object from arbitrary text.
 * Handles:
 * - Plain JSON object
 * - JSON wrapped in markdown fences
 * - Extra text before/after
 * - Multiple JSON objects concatenated → returns the first one
 */
function tryParseObject(candidate) {
  if (!candidate) return null;
  try {
    const obj = JSON.parse(candidate);
    if (obj && typeof obj === "object") return obj;
  } catch {
    // ignore and try repair
  }
  try {
    const repaired = jsonrepair(candidate);
    const obj = JSON.parse(repaired);
    if (obj && typeof obj === "object") return obj;
  } catch {
    // still invalid
  }
  return null;
}

function extractJsonObject(text) {
  if (!text) return null;

  // Remove common markdown fences
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // 1) Try direct parse (with repair fallback)
  const direct = tryParseObject(cleaned);
  if (direct) return direct;

  // 2) Brace-scan: find the first balanced {...} and try that
  let depth = 0;
  let start = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          const candidate = cleaned.slice(start, i + 1);
          const parsed = tryParseObject(candidate);
          if (parsed) {
            return parsed; // return FIRST successfully parsed object
          }
          start = -1;
        }
      }
    }
  }

  // Nothing valid found
  return null;
}

// ---------- Health ----------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    hasPerplexityKey: !!PPLX_API_KEY,
    message: "Virtual Closet backend online"
  });
});

// ---------- AI Scan Endpoint ----------
//
// Frontend sends:
// POST /api/scan-outfit
// {
//   "imageBase64": "<base64 string without 'data:' prefix>",
//   "mime": "image/jpeg" // optional
// }
app.post("/api/scan-outfit", async (req, res) => {
  try {
    if (!PPLX_API_KEY) {
      return res.status(500).json({
        error: "PERPLEXITY_API_KEY not configured on server",
        debug_hint: "Set PERPLEXITY_API_KEY in your server environment."
      });
    }

    const { imageBase64, mime } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        error: "Missing 'imageBase64' in request body",
        debug_hint: "Frontend must send { imageBase64: '...', mime?: 'image/jpeg' }."
      });
    }

    const mimeType =
      typeof mime === "string" && mime.trim() ? mime.trim() : "image/jpeg";

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const systemPrompt = `
You are an AI fashion vision assistant for a wardrobe app.

Return ONLY a single JSON object with exactly this shape:

{
  "items": [
    {
      "name": string,
      "category": "Tops" | "Bottoms" | "Dresses" | "Outerwear" | "Shoes" | "Accessories",
      "color": string,
      "patterns": string[],
      "formality": "Casual" | "Smart Casual" | "Formal" | "Sport",
      "position": "upper" | "lower" | "full_body" | "foot" | "accessory",
      "layer": "base" | "mid" | "outer",
      "icon_hint": string,
      "confidence": number,
      "notes": string
    }
  ],
  "outfit_summary": {
    "primary_occasion": string,
    "style_tags": string[],
    "comment": string
  }
}

Rules:
- Only describe clothing & accessories worn by the person.
- No mention of face, body shape, identity, gender, or race.
- No extra keys.
- No markdown fences.
- No explanations or prose outside the JSON.
`.trim();

    const userPrompt = `
Analyze this outfit photo and fill the JSON schema with what the person is wearing.
`.trim();

    const body = {
      model: "sonar-pro",        // adjust if your account uses a different model name
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 800
    };

    const pplxRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PPLX_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    const rawText = await pplxRes.text();

    // --- Non-2xx from Perplexity ---
    if (!pplxRes.ok) {
      let detail = rawText;
      try {
        const parsedErr = JSON.parse(rawText);
        detail = parsedErr.error?.message || JSON.stringify(parsedErr);
      } catch {}
      safeLog("Perplexity error:", pplxRes.status, detail);
      return res.status(502).json({
        error: "Perplexity API error",
        status: pplxRes.status,
        debug_message: detail,
        debug_raw_excerpt: clip(rawText)
      });
    }

    // --- Try parse top-level JSON (Perplexity standard schema) ---
    let pplxData;
    try {
      pplxData = JSON.parse(rawText);
    } catch {
      // If this fails, rawText wasn't the usual wrapper.
      safeLog("Perplexity top-level non-JSON:", rawText.slice(0, 400));
      // Fallback: try to extract JSON directly from rawText
      const fallback = extractJsonObject(rawText);
      if (!fallback) {
        return res.status(502).json({
          error: "Invalid Perplexity response (non-JSON top-level)",
          debug_hint: "Could not parse Perplexity wrapper or extract JSON.",
          debug_raw_excerpt: clip(rawText)
        });
      }
      if (!Array.isArray(fallback.items)) {
        return res.status(502).json({
          error: "Unexpected JSON shape from Perplexity (missing items[])",
          debug_raw_excerpt: clip(JSON.stringify(fallback))
        });
      }
      return res.json(fallback);
    }

    // --- Standard path: extract content from choices[0].message.content ---
    let content = pplxData?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "Missing content from Perplexity",
        debug_hint: "No 'choices[0].message.content' field.",
        debug_raw_excerpt: clip(JSON.stringify(pplxData))
      });
    }

    // Perplexity may return array of segments or a string
    if (Array.isArray(content)) {
      content = content.map(p => p.text || "").join("\n");
    }
    if (typeof content !== "string") {
      content = String(content);
    }

    const parsed = extractJsonObject(content);

    if (!parsed) {
      safeLog("Could not extract JSON from content:", clip(content));
      return res.status(502).json({
        error: "Invalid JSON from Perplexity",
        debug_hint: "Model responded but no valid JSON block was detected. It may have output multiple JSON objects or extra text.",
        debug_raw_excerpt: clip(content)
      });
    }

    if (!Array.isArray(parsed.items)) {
      return res.status(502).json({
        error: "Unexpected JSON shape from Perplexity (missing items[])",
        debug_hint: "The extracted object does not contain 'items' array.",
        debug_raw_excerpt: clip(JSON.stringify(parsed))
      });
    }

    // ✅ Success
    return res.json(parsed);

  } catch (err) {
    safeLog("Backend /api/scan-outfit error:", err);
    return res.status(500).json({
      error: "Server error during scan",
      debug_hint: "See backend logs.",
      debug_raw_excerpt: clip(err.message || String(err))
    });
  }
});

// ---------- Static frontend (PWA) ----------

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`✅ Virtual Closet server running at http://localhost:${PORT}`);
  if (!PPLX_API_KEY) {
    console.log("⚠️ PERPLEXITY_API_KEY is NOT set. AI scan will fail until you set it.");
  }
});
