require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT) || 5001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  analysisServiceUrl: process.env.ANALYSIS_SERVICE_URL || "http://127.0.0.1:8000",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
};

module.exports = env;
