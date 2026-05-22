const db = require("../db/pool");

async function getStats() {
  const [activityRes, blockedRes] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int                                       AS total_requests,
        COUNT(*) FILTER (WHERE is_anomaly = TRUE)::int     AS anomaly_count,
        COALESCE(ROUND(AVG(risk_score))::int, 0)          AS avg_risk_score
      FROM activity_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `),
    db.query(`
      SELECT COUNT(*)::int AS blocked_users
      FROM users
      WHERE blocked_until > NOW()
    `),
  ]);

  return {
    ...activityRes.rows[0],
    blocked_users: blockedRes.rows[0].blocked_users,
  };
}

async function getRiskOverTime() {
  const result = await db.query(`
    SELECT
      DATE_TRUNC('hour', created_at)                      AS hour,
      ROUND(AVG(risk_score))::int                        AS avg_risk,
      COUNT(*)::int                                       AS request_count,
      COUNT(*) FILTER (WHERE is_anomaly = TRUE)::int     AS anomaly_count
    FROM activity_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', created_at)
    ORDER BY hour
  `);

  return result.rows.map((row) => ({
    ...row,
    hour: row.hour.toISOString(),
  }));
}

async function getRecentLogs(limit = 50) {
  const result = await db.query(
    `
    SELECT
      al.id, al.user_id, al.endpoint, al.method, al.ip_address,
      al.user_agent, al.status_code, al.risk_score, al.is_anomaly,
      al.ai_explanation, al.created_at,
      u.email AS user_email
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

async function getAnomalies(limit = 30) {
  const result = await db.query(
    `
    SELECT
      al.id, al.user_id, al.endpoint, al.method, al.ip_address,
      al.status_code, al.risk_score, al.ai_explanation, al.created_at,
      u.email AS user_email
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.is_anomaly = TRUE
    ORDER BY al.created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

async function getRecoveryEvents(limit = 20) {
  const result = await db.query(
    `
    SELECT
      rt.id, rt.user_id, rt.expires_at, rt.is_used, rt.created_at,
      u.email AS user_email
    FROM recovery_tokens rt
    JOIN users u ON rt.user_id = u.id
    ORDER BY rt.created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

module.exports = {
  getStats,
  getRiskOverTime,
  getRecentLogs,
  getAnomalies,
  getRecoveryEvents,
};
