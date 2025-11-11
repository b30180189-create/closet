import { Router } from "express";
import { env } from "../config/env.js";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    expectsClientPerplexityKey: true,
    hasFallbackServerKey: Boolean(env.pplxApiKey),
    message: "Virtual Closet backend online"
  });
});

export default healthRouter;
