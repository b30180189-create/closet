import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export const applySecurity = (app, { corsOrigins, rateLimitWindowMs, rateLimitMax }) => {
  const allowAll = !corsOrigins || corsOrigins.length === 0;
  app.use(
    cors({
      origin: allowAll ? true : corsOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      credentials: allowAll ? false : true
    })
  );

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
};
