const db = require("../db/pool");

async function createActivityLog({
  userId,
  endpoint,
  method,
  ipAddress,
  userAgent,
  statusCode,
  riskScore = 0,
  isAnomaly = false,
}) {
  const result = await db.query(
    `
      INSERT INTO activity_logs (
        user_id,
        endpoint,
        method,
        ip_address,
        user_agent,
        status_code,
        risk_score,
        is_anomaly
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        user_id,
        endpoint,
        method,
        ip_address,
        user_agent,
        status_code,
        risk_score,
        is_anomaly,
        created_at;
    `,
    [userId, endpoint, method, ipAddress, userAgent, statusCode, riskScore, isAnomaly]
  );

  return result.rows[0];
}

async function updateActivityLogExplanation(logId, explanation) {
  await db.query(
    `UPDATE activity_logs SET ai_explanation = $1 WHERE id = $2`,
    [explanation, logId]
  );
}

async function getRecentNormalLogsForUser(userId, limit = 50) {
  const result = await db.query(
    `
      SELECT
        id, user_id, endpoint, method, ip_address,
        user_agent, status_code, risk_score, is_anomaly, created_at
      FROM activity_logs
      WHERE user_id = $1
        AND is_anomaly = FALSE
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows;
}

module.exports = {
  createActivityLog,
  updateActivityLogExplanation,
  getRecentNormalLogsForUser,
};
