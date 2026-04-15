import { connectDatabase } from "./config/db.js";
import { getEnv } from "./config/env.js";
import { app } from "./app.js";

async function start() {
  await connectDatabase();
  const { port } = getEnv();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on ${port}`);
  });
}

void start();
