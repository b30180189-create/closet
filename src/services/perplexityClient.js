import { clip, extractJsonObject } from "../utils/json.js";
import { HttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const ENDPOINT = "https://api.perplexity.ai/chat/completions";

const parseStandardResponse = (rawText) => {
  let pplxData;
  try {
    pplxData = JSON.parse(rawText);
  } catch {
    logger.warn({ rawSnippet: rawText.slice(0, 400) }, "Perplexity response not JSON");
    const fallback = extractJsonObject(rawText);
    if (!fallback || !Array.isArray(fallback.items)) {
      throw new HttpError(502, "Invalid Perplexity response payload", {
        debug_hint: "Unable to parse Perplexity output.",
        raw_excerpt: clip(rawText)
      });
    }
    return fallback;
  }

  let content = pplxData?.choices?.[0]?.message?.content;
  if (!content) {
    throw new HttpError(502, "Missing content from Perplexity", {
      debug_hint: "No 'choices[0].message.content' field.",
      raw_excerpt: clip(JSON.stringify(pplxData))
    });
  }

  if (Array.isArray(content)) {
    content = content.map((part) => part.text || "").join("\n");
  }

  if (typeof content !== "string") {
    content = String(content);
  }

  const parsed = extractJsonObject(content);
  if (!parsed) {
    throw new HttpError(502, "Invalid JSON from Perplexity", {
      debug_hint: "Model responded but no valid JSON block was detected.",
      raw_excerpt: clip(content)
    });
  }

  if (!Array.isArray(parsed.items)) {
    throw new HttpError(502, "Unexpected JSON shape from Perplexity", {
      debug_hint: "Missing items[] array.",
      raw_excerpt: clip(JSON.stringify(parsed))
    });
  }

  return parsed;
};

export const requestPerplexity = async ({ apiKey, body, timeoutMs = 20000 }) => {
  if (!apiKey) {
    throw new HttpError(500, "PERPLEXITY_API_KEY not configured on server");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const rawText = await response.text();

    if (!response.ok) {
      let detail = rawText;
      try {
        const parsedErr = JSON.parse(rawText);
        detail = parsedErr.error?.message || JSON.stringify(parsedErr);
      } catch {
        // noop
      }

      logger.error(
        { status: response.status, detail: clip(detail) },
        "Perplexity API error"
      );

      throw new HttpError(502, "Perplexity API error", {
        status: response.status,
        detail: clip(detail)
      });
    }

    return parseStandardResponse(rawText);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new HttpError(504, "Perplexity request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
