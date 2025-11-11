import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.port, () => {
  logger.info(`✅ Virtual Closet server running at http://localhost:${env.port}`);
  logger.info("🔐 Expecting client-supplied Perplexity API keys for each AI scan.");
});
