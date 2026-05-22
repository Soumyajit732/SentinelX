const env = require("../config/env");

const EXPLAIN_URL = `${env.analysisServiceUrl}/explain`;

/**
 * Calls the Python analysis service to generate a plain-English explanation
 * for a suspicious security event.
 *
 * @param {object} params
 * @param {number}   params.userId
 * @param {object}   params.currentEvent  - the anomalous activity_log row
 * @param {object[]} params.historicalLogs - recent normal logs for this user
 * @returns {Promise<string>} human-readable explanation
 */
async function explain({ userId, currentEvent, historicalLogs }) {
  const body = JSON.stringify({
    userId,
    currentEvent: {
      endpoint:   currentEvent.endpoint,
      timestamp:  currentEvent.created_at,
      riskScore:  currentEvent.risk_score,
      method:     currentEvent.method,
      ipAddress:  currentEvent.ip_address,
      statusCode: currentEvent.status_code,
      userAgent:  currentEvent.user_agent,
    },
    historicalLogs,
  });

  const response = await fetch(EXPLAIN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Analysis service responded ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.explanation;
}

module.exports = { explain };
