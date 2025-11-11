import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { applySecurity } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

export const createApp = () => {
  const app = express();

  app.use(morgan(env.isDev ? "dev" : "combined"));
  app.use(express.json({ limit: env.jsonLimit }));

  applySecurity(app, env);

  app.use((req, res, next) => {
    const host = req.headers.host || "";
    const isNgrokHost = host.includes("ngrok");
    const hasSkipParam = Object.prototype.hasOwnProperty.call(
      req.query || {},
      "ngrok-skip-browser-warning"
    );

    if (
      isNgrokHost &&
      !hasSkipParam &&
      req.method === "GET" &&
      req.accepts("html")
    ) {
      const originalUrl = new URL(req.originalUrl, `http://${host}`);
      originalUrl.searchParams.set("ngrok-skip-browser-warning", "true");
      return res.redirect(302, originalUrl.pathname + originalUrl.search);
    }

    res.setHeader("ngrok-skip-browser-warning", "true");
    return next();
  });

  app.use(routes);

  app.use(express.static(publicDir));
  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
