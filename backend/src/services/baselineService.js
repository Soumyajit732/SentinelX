const db = require("../db/pool");

const MIN_REQUESTS_FOR_BASELINE = 5;
const ACTIVE_HOUR_PERCENT_THRESHOLD = 10;
const COMMON_ENDPOINT_PERCENT_THRESHOLD = 10;

function buildEmptyHourDistribution() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    requestCount: 0,
    percentage: 0,
  }));
}

function normalizeHourDistribution(rows, totalRequests) {
  const distribution = buildEmptyHourDistribution();

  rows.forEach((row) => {
    const hour = Number(row.hour);
    const requestCount = Number(row.request_count);

    distribution[hour] = {
      hour,
      requestCount,
      percentage:
        totalRequests > 0 ? Number(((requestCount / totalRequests) * 100).toFixed(2)) : 0,
    };
  });

  return distribution;
}

function findActiveHours(hourDistribution, totalRequests) {
  if (totalRequests < MIN_REQUESTS_FOR_BASELINE) {
    return [];
  }

  return hourDistribution
    .filter((item) => item.percentage >= ACTIVE_HOUR_PERCENT_THRESHOLD)
    .map((item) => item.hour);
}

function normalizeEndpointDistribution(rows, totalRequests) {
  return rows.map((row) => {
    const requestCount = Number(row.request_count);

    return {
      endpoint: row.endpoint,
      requestCount,
      percentage:
        totalRequests > 0 ? Number(((requestCount / totalRequests) * 100).toFixed(2)) : 0,
    };
  });
}

function findCommonEndpoints(endpointDistribution, totalRequests) {
  if (totalRequests < MIN_REQUESTS_FOR_BASELINE) {
    return [];
  }

  return endpointDistribution
    .filter((item) => item.percentage >= COMMON_ENDPOINT_PERCENT_THRESHOLD)
    .map((item) => item.endpoint);
}

function normalizeHourlyRequestBuckets(rows) {
  return rows.map((row) => ({
    hourBucket: row.hour_bucket,
    requestCount: Number(row.request_count),
  }));
}

function calculateAverageRequestsPerHour(hourlyRequestBuckets) {
  if (hourlyRequestBuckets.length === 0) {
    return 0;
  }

  const totalRequests = hourlyRequestBuckets.reduce(
    (total, bucket) => total + bucket.requestCount,
    0
  );

  return Number((totalRequests / hourlyRequestBuckets.length).toFixed(2));
}

async function getActiveHoursBaseline(userId) {
  const result = await db.query(
    `
      SELECT
        EXTRACT(HOUR FROM created_at)::INT AS hour,
        COUNT(*)::INT AS request_count
      FROM activity_logs
      WHERE user_id = $1
      GROUP BY hour
      ORDER BY hour;
    `,
    [userId]
  );

  const totalRequests = result.rows.reduce(
    (total, row) => total + Number(row.request_count),
    0
  );
  const hourDistribution = normalizeHourDistribution(result.rows, totalRequests);
  const activeHours = findActiveHours(hourDistribution, totalRequests);

  return {
    userId,
    activeHours,
    hourDistribution,
    totalRequests,
    hasEnoughData: totalRequests >= MIN_REQUESTS_FOR_BASELINE,
    minimumRequestsRequired: MIN_REQUESTS_FOR_BASELINE,
  };
}

async function getCommonEndpointsBaseline(userId) {
  const result = await db.query(
    `
      SELECT
        endpoint,
        COUNT(*)::INT AS request_count
      FROM activity_logs
      WHERE user_id = $1
      GROUP BY endpoint
      ORDER BY request_count DESC, endpoint ASC;
    `,
    [userId]
  );

  const totalRequests = result.rows.reduce(
    (total, row) => total + Number(row.request_count),
    0
  );
  const endpointDistribution = normalizeEndpointDistribution(
    result.rows,
    totalRequests
  );
  const commonEndpoints = findCommonEndpoints(
    endpointDistribution,
    totalRequests
  );

  return {
    userId,
    commonEndpoints,
    endpointDistribution,
    totalRequests,
    hasEnoughData: totalRequests >= MIN_REQUESTS_FOR_BASELINE,
    minimumRequestsRequired: MIN_REQUESTS_FOR_BASELINE,
  };
}

async function getRequestRateBaseline(userId) {
  const result = await db.query(
    `
      SELECT
        DATE_TRUNC('hour', created_at) AS hour_bucket,
        COUNT(*)::INT AS request_count
      FROM activity_logs
      WHERE user_id = $1
      GROUP BY hour_bucket
      ORDER BY hour_bucket;
    `,
    [userId]
  );

  const hourlyRequestBuckets = normalizeHourlyRequestBuckets(result.rows);
  const totalRequests = hourlyRequestBuckets.reduce(
    (total, bucket) => total + bucket.requestCount,
    0
  );
  const avgRequestsPerHour =
    calculateAverageRequestsPerHour(hourlyRequestBuckets);

  return {
    userId,
    avgRequestsPerHour,
    hourlyRequestBuckets,
    totalRequests,
    observedHourCount: hourlyRequestBuckets.length,
    hasEnoughData: totalRequests >= MIN_REQUESTS_FOR_BASELINE,
    minimumRequestsRequired: MIN_REQUESTS_FOR_BASELINE,
  };
}

module.exports = {
  getActiveHoursBaseline,
  getCommonEndpointsBaseline,
  getRequestRateBaseline,
};
