const db = require("./pool");

async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 0,
      blocked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      method VARCHAR(10) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      status_code INTEGER NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS recovery_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      is_used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Phase 6: add explanation column if not present (safe for existing DBs)
  await db.query(`
    ALTER TABLE activity_logs
    ADD COLUMN IF NOT EXISTS ai_explanation TEXT;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created_at
    ON activity_logs (user_id, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_recovery_tokens_user_created_at
    ON recovery_tokens (user_id, created_at DESC);
  `);
}

module.exports = initDb;
