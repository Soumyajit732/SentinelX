const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../db/pool");

const RECOVERY_TOKEN_DIGITS = 6;
const RECOVERY_TOKEN_TTL_MINUTES = 10;
const SALT_ROUNDS = 12;

function generateRecoveryToken() {
  const min = 10 ** (RECOVERY_TOKEN_DIGITS - 1);
  const max = 10 ** RECOVERY_TOKEN_DIGITS;

  return String(crypto.randomInt(min, max));
}

async function createRecoveryToken(userId) {
  const token = generateRecoveryToken();
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);

  await db.query(
    `
      UPDATE recovery_tokens
      SET is_used = TRUE
      WHERE user_id = $1
        AND is_used = FALSE;
    `,
    [userId]
  );

  const result = await db.query(
    `
      INSERT INTO recovery_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + ($3::INT * INTERVAL '1 minute'))
      RETURNING id, user_id, expires_at, is_used, created_at;
    `,
    [userId, tokenHash, RECOVERY_TOKEN_TTL_MINUTES]
  );

  return {
    token,
    recoveryToken: result.rows[0],
  };
}

async function getActiveRecoveryTokens(userId) {
  const result = await db.query(
    `
      SELECT id, user_id, token_hash, expires_at, is_used, created_at
      FROM recovery_tokens
      WHERE user_id = $1
        AND is_used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC;
    `,
    [userId]
  );

  return result.rows;
}

async function markRecoveryTokenUsed(tokenId) {
  const result = await db.query(
    `
      UPDATE recovery_tokens
      SET is_used = TRUE
      WHERE id = $1
      RETURNING id, user_id, expires_at, is_used, created_at;
    `,
    [tokenId]
  );

  return result.rows[0] || null;
}

async function restoreUserAccess({ userId, recoveryTokenId }) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        UPDATE recovery_tokens
        SET is_used = TRUE
        WHERE id = $1
          AND user_id = $2
          AND is_used = FALSE
          AND expires_at > NOW()
        RETURNING id, user_id, expires_at, is_used, created_at;
      `,
      [recoveryTokenId, userId]
    );

    if (!tokenResult.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const userResult = await client.query(
      `
        UPDATE users
        SET blocked_until = NULL
        WHERE id = $1
        RETURNING id, email, token_version, blocked_until, created_at;
      `,
      [userId]
    );

    await client.query("COMMIT");

    return {
      recoveryToken: tokenResult.rows[0],
      user: userResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findMatchingRecoveryToken({ userId, token }) {
  const activeTokens = await getActiveRecoveryTokens(userId);

  for (const recoveryToken of activeTokens) {
    const isMatch = await bcrypt.compare(token, recoveryToken.token_hash);

    if (isMatch) {
      return recoveryToken;
    }
  }

  return null;
}

module.exports = {
  RECOVERY_TOKEN_TTL_MINUTES,
  createRecoveryToken,
  findMatchingRecoveryToken,
  generateRecoveryToken,
  markRecoveryTokenUsed,
  restoreUserAccess,
};
