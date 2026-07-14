const UNKNOWN_VALUE = "unknown";

function firstPresent(log, ...keys) {
  for (const key of keys) {
    const value = log[key];
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return null;
}

function formatTimestamp(value) {
  if (value === null || value === undefined) {
    return "an unknown time";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const hours24 = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${hours12}:${minutes} ${period} on ${year}-${month}-${day}`;
}

function formatBool(value) {
  return value ? "yes" : "no";
}

function formatActivityLog(log) {
  const userId = firstPresent(log, "user_id", "userId") ?? UNKNOWN_VALUE;
  const endpoint = firstPresent(log, "endpoint", "path") ?? UNKNOWN_VALUE;
  const method = firstPresent(log, "method", "httpMethod") ?? UNKNOWN_VALUE;
  const ipAddress = firstPresent(log, "ip_address", "ipAddress") ?? UNKNOWN_VALUE;
  const userAgent = firstPresent(log, "user_agent", "userAgent") ?? UNKNOWN_VALUE;
  const statusCode = firstPresent(log, "status_code", "statusCode") ?? UNKNOWN_VALUE;
  const riskScore = firstPresent(log, "risk_score", "riskScore");
  const isAnomaly = firstPresent(log, "is_anomaly", "isAnomaly");
  const createdAt = firstPresent(log, "created_at", "createdAt", "timestamp");

  let text =
    `User ${userId} accessed ${endpoint} using ${String(method).toUpperCase()} ` +
    `at ${formatTimestamp(createdAt)} from IP ${ipAddress}. ` +
    `The request returned status ${statusCode} and used user agent ${userAgent}.`;

  if (riskScore !== null && riskScore !== undefined) {
    text += ` Deterministic risk score was ${riskScore}.`;
  }

  if (isAnomaly !== null && isAnomaly !== undefined) {
    text += ` Marked as anomaly: ${formatBool(isAnomaly)}.`;
  }

  return text;
}

function formatActivityLogs(logs) {
  return logs.map(formatActivityLog);
}

module.exports = { formatActivityLog, formatActivityLogs };
