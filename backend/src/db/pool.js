const { Pool } = require("pg");
const env = require("../config/env");

const pool = new Pool({
  connectionString: env.databaseUrl,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
