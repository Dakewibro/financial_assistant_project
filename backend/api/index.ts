import { connectDatabase } from "../src/config/db.js";
import { app } from "../src/app.js";

await connectDatabase().catch((err) => {
  console.error("[bootstrap] connectDatabase:", err);
});

export default app;
