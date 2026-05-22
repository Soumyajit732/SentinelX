const db = require("../db/pool");

const RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
};

const HIGH_RISK_BLOCK_MINUTES = 15;

async function terminateSessionsAndBlockUser(userId) {
  const result = await db.query(
    `
      UPDATE users
      SET
        token_version = token_version + 1,
        blocked_until = NOW() + ($2::INT * INTERVAL '1 minute')
      WHERE id = $1
      RETURNING id, token_version, blocked_until;
    `,
    [userId, HIGH_RISK_BLOCK_MINUTES]
  );

  return result.rows[0] || null;
}

async function applyMitigation({ userId, riskLevel }) {
  if (!userId) {
    throw new Error("userId is required to apply mitigation");
  }

  if (riskLevel === RISK_LEVELS.HIGH) {
    const mitigatedUser = await terminateSessionsAndBlockUser(userId);

    return {
      action: "SESSION_TERMINATED",
      riskLevel,
      userId,
      tokenVersion: mitigatedUser?.token_version,
      blockedUntil: mitigatedUser?.blocked_until,
    };
  }

  if (riskLevel === RISK_LEVELS.MEDIUM) {
    return {
      action: "REAUTH_REQUIRED",
      riskLevel,
      userId,
    };
  }

  return {
    action: "ALLOW",
    riskLevel: RISK_LEVELS.LOW,
    userId,
  };
}

module.exports = {
  RISK_LEVELS,
  HIGH_RISK_BLOCK_MINUTES,
  applyMitigation,
  terminateSessionsAndBlockUser,
};
