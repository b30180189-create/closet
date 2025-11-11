import { jsonrepair } from "jsonrepair";

export const clip = (str, max = 800) => {
  if (!str) return "";
  return str.length <= max ? str : `${str.slice(0, max)}...(truncated)`;
};

const tryParseObject = (candidate) => {
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
};

export const extractJsonObject = (text) => {
  if (!text) return null;

  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const direct = tryParseObject(cleaned);
  if (direct) return direct;

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
            return parsed;
          }
          start = -1;
        }
      }
    }
  }

  return null;
};
