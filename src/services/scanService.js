import crypto from "crypto";
import { buildSystemPrompt, buildUserPrompt } from "./promptBuilder.js";
import { requestPerplexity } from "./perplexityClient.js";
import { env } from "../config/env.js";

const MIME_FALLBACK = "image/jpeg";
const responseCache = new Map();

const getCacheKey = (imageBase64) =>
  crypto.createHash("sha256").update(imageBase64).digest("hex");

const isCacheValid = (entry) => {
  if (!entry) return false;
  if (!env.scanCacheTtlMs || env.scanCacheTtlMs <= 0) return true;
  return Date.now() - entry.timestamp <= env.scanCacheTtlMs;
};

export const scanOutfit = async ({ imageBase64, mime, apiKey, timeoutMs }) => {
  const mimeType =
    typeof mime === "string" && mime.trim().length > 0 ? mime.trim() : MIME_FALLBACK;

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const cacheKey = getCacheKey(imageBase64);
  const cached = responseCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }

  const body = {
    model: "sonar-pro",
    stream: false,
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt() },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ]
  };

  const result = await requestPerplexity({ apiKey, body, timeoutMs });
  responseCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
};
