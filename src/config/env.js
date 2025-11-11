import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (raw) =>
  raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isDev: nodeEnv === "development",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  pplxApiKey: process.env.PERPLEXITY_API_KEY ?? "",
  corsOrigins: process.env.CORS_ORIGINS ? parseOrigins(process.env.CORS_ORIGINS) : [],
  jsonLimit: process.env.JSON_BODY_LIMIT ?? "15mb",
  rateLimitWindowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  rateLimitMax: Number.parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10),
  requestTimeoutMs: Number.parseInt(process.env.PERPLEXITY_TIMEOUT_MS ?? "60000", 10),
  scanCacheTtlMs: Number.parseInt(process.env.SCAN_CACHE_TTL_MS ?? "3600000", 10),
  databasePath: process.env.DATABASE_PATH ?? "data/wardrobe.sqlite",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d"
};
