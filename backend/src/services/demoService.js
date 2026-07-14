const crypto = require("crypto");
const db = require("../db/pool");
const { hashPassword } = require("../utils/password");

const DEMO_EMAIL = "demo@sentinelx.io";
const CURRENT_HOUR_ROW_COUNT = 5; // matches MIN_REQUESTS_FOR_BASELINE in baselineService
// avgRequestsPerHour = totalRequests / distinctHourBuckets, so with activity
// confined to one hour the average scales with the burst itself and
// REQUEST_SPIKE can never cross it. Spreading 1 row across many distinct
// past hours dilutes the average toward the MIN_SPIKE_REQUEST_COUNT floor
// (10) instead, so a live burst can actually cross it. Each hour also stays
// outside the 60-minute request-rate lookback window, so it doesn't inflate
// recentRequestCount.
const HISTORICAL_HOUR_COUNT = 12;

async function findDemoUser() {
  const result = await db.query(
    `SELECT id, email, token_version, blocked_until, created_at FROM users WHERE email = $1;`,
    [DEMO_EMAIL]
  );
  return result.rows[0] || null;
}

async function createDemoUser() {
  const passwordHash = await hashPassword(crypto.randomUUID());
  const result = await db.query(
    `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, token_version, blocked_until, created_at;
    `,
    [DEMO_EMAIL, passwordHash]
  );
  return result.rows[0];
}

/**
 * Wipes the demo user's activity history and reseeds a clean, predictable
 * baseline: a handful of /profile requests in the current hour (so it reads
 * as the common endpoint and the current hour reads as active — a live
 * "normal" request stays LOW), plus one /profile request per distinct past
 * hour (so avgRequestsPerHour stays near its floor instead of scaling with
 * the current hour's own traffic). Together this lets a live burst reliably
 * cross REQUEST_SPIKE without ever touching OUTSIDE_ACTIVE_HOURS.
 */
async function seedBaseline(userId) {
  await db.query(`DELETE FROM activity_logs WHERE user_id = $1;`, [userId]);

  await db.query(
    `
      INSERT INTO activity_logs (
        user_id, endpoint, method, ip_address, user_agent, status_code, risk_score, is_anomaly, created_at
      )
      SELECT
        $1, '/api/protected/profile', 'GET', '127.0.0.1', 'demo-seed', 200, 0, false,
        NOW() - (n || ' seconds')::interval
      FROM generate_series(1, $2) AS n;
    `,
    [userId, CURRENT_HOUR_ROW_COUNT]
  );

  await db.query(
    `
      INSERT INTO activity_logs (
        user_id, endpoint, method, ip_address, user_agent, status_code, risk_score, is_anomaly, created_at
      )
      SELECT
        $1, '/api/protected/profile', 'GET', '127.0.0.1', 'demo-seed', 200, 0, false,
        NOW() - ((h + 1) || ' hours')::interval
      FROM generate_series(1, $2) AS h;
    `,
    [userId, HISTORICAL_HOUR_COUNT]
  );
}

/**
 * Resets the demo account to a known-good state and bumps token_version,
 * invalidating any JWT issued to a previous visitor. Returns the fresh
 * user row so the caller can sign a new access token.
 */
async function resetDemoSession() {
  let user = await findDemoUser();
  if (!user) {
    user = await createDemoUser();
  }

  await seedBaseline(user.id);

  const result = await db.query(
    `
      UPDATE users
      SET token_version = token_version + 1, blocked_until = NULL
      WHERE id = $1
      RETURNING id, email, token_version, blocked_until, created_at;
    `,
    [user.id]
  );

  return result.rows[0];
}

module.exports = { DEMO_EMAIL, resetDemoSession };
