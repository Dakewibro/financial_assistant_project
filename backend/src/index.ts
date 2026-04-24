import { connectDatabase } from "./config/db.js";
import { app } from "./app.js";

await connectDatabase().catch((err) => {
  console.error("[bootstrap] connectDatabase:", err);
});

export default app;
