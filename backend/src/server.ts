import { connectDatabase } from "./config/db.js";
import { getEnv } from "./config/env.js";
import { app } from "./app.js";

async function start() {
  const { port, storageMode } = getEnv();
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on ${port} using ${storageMode} storage`);
  });

  try {
    await connectDatabase();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend", error);
    server.close(() => process.exit(1));
  }
}

void start();
