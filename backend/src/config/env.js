require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT) || 5001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  ragTopK: Number(process.env.RAG_TOP_K) || 5,
};

module.exports = env;
