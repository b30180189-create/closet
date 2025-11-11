import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { scanOutfit } from "../services/scanService.js";
import { HttpError } from "../utils/errors.js";

const scanRequestSchema = z.object({
  imageBase64: z.string().min(20, "imageBase64 must be provided"),
  mime: z.string().optional(),
  apiKey: z.string().min(10, "Perplexity API key is required")
});

const scanRouter = Router();

scanRouter.post("/", async (req, res, next) => {
  try {
    const payload = scanRequestSchema.parse(req.body ?? {});
    const apiKey = payload.apiKey.trim();
    if (!apiKey) {
      throw new HttpError(400, "Perplexity API key is required");
    }

    const result = await scanOutfit({
      imageBase64: payload.imageBase64,
      mime: payload.mime,
      apiKey,
      timeoutMs: env.requestTimeoutMs
    });

    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request body", { issues: error.issues }));
    }
    return next(error);
  }
});

export default scanRouter;
