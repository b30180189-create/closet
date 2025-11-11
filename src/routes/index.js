import { Router } from "express";
import healthRouter from "./health.js";
import scanRouter from "./scan.js";
import authRouter from "./auth.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/api/scan-outfit", scanRouter);
router.use("/api/auth", authRouter);

export default router;
