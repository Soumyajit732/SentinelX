const db = require("../db/pool");

async function createUser({ email, passwordHash }) {
  const result = await db.query(
    `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, token_version, blocked_until, created_at;
    `,
    [email, passwordHash]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await db.query(
    `
      SELECT id, email, password, token_version, blocked_until, created_at
      FROM users
      WHERE email = $1;
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await db.query(
    `
      SELECT id, email, token_version, blocked_until, created_at
      FROM users
      WHERE id = $1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
