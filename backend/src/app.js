const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const initDb = require("./db/initDb");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const recoveryRoutes = require("./routes/recoveryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: env.allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ztam-rag-plus-backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(errorMiddleware);

async function startServer() {
  try {
    await initDb();
    console.log("Database initialized");

    const server = app.listen(env.port, env.host, () => {
      console.log(`ZTAM-RAG+ backend running at http://${env.host}:${env.port}`);
    });

    server.on("error", (error) => {
      console.error("Failed to start ZTAM-RAG+ backend:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to initialize backend:", error.message);
    process.exit(1);
  }
}

startServer();
