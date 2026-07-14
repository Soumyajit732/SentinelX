const app = require("./app");
const env = require("./config/env");
const initDb = require("./db/initDb");

async function startServer() {
  try {
    await initDb();
    console.log("Database initialized");

    const server = app.listen(env.port, env.host, () => {
      console.log(`SentinelX backend running at http://${env.host}:${env.port}`);
    });

    server.on("error", (error) => {
      console.error("Failed to start SentinelX backend:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to initialize backend:", error.message);
    process.exit(1);
  }
}

startServer();
