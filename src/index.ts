import { createApp } from "./server";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const { app, shutdown } = createApp();

app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }

  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await shutdown();
  console.log("Server shutdown complete");
  process.exit(0);
});
