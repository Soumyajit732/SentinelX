const { Pool } = require("pg");
const env = require("../config/env");

// Managed Postgres providers (Render, Heroku, etc.) require SSL for
// connections that leave their private network; local/dev Postgres doesn't
// speak SSL at all, so this only applies outside development.
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
