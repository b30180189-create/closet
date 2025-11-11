import { Router } from "express";
import { z } from "zod";
import { loginUser, signupUser } from "../services/authService.js";
import { HttpError } from "../utils/errors.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body ?? {});
    const result = await signupUser(email.trim().toLowerCase(), password);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Email and password are required.", { issues: error.issues }));
    }
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body ?? {});
    const result = await loginUser(email.trim().toLowerCase(), password);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Email and password are required.", { issues: error.issues }));
    }
    return next(error);
  }
});

export default authRouter;
