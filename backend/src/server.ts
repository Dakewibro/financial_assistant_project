import { app } from "./app.js";
import { loadStore } from "./repository.js";

const port = Number(process.env.PORT ?? 4000);

async function start(): Promise<void> {
  await loadStore();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on ${port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to initialize backend storage", error);
  process.exit(1);
});
