const db = require("../db/pool");
const baselineService = require("./baselineService");

const RISK_SIGNALS = {
  OUTSIDE_ACTIVE_HOURS: {
    name: "OUTSIDE_ACTIVE_HOURS",
    score: 40,
  },
  RARE_ENDPOINT: {
    name: "RARE_ENDPOINT",
    score: 30,
  },
  REQUEST_SPIKE: {
    name: "REQUEST_SPIKE",
    score: 30,
  },
};

const REQUEST_SPIKE_LOOKBACK_MINUTES = 60;
const REQUEST_SPIKE_MULTIPLIER = 3;
const MIN_SPIKE_REQUEST_COUNT = 10;

function getRiskLevel(riskScore) {
  if (riskScore >= 70) {
    return "HIGH";
  }

  if (riskScore >= 30) {
    return "MEDIUM";
  }

  return "LOW";
}

function addSignal(triggeredSignals, signal, reason) {
  triggeredSignals.push({
    signal: signal.name,
    score: signal.score,
    reason,
  });
}

function getRequestHour(timestamp = new Date()) {
  return new Date(timestamp).getHours();
}

async function getRecentRequestCount(userId, lookbackMinutes) {
  const result = await db.query(
    `
      SELECT COUNT(*)::INT AS request_count
      FROM activity_logs
      WHERE user_id = $1
        AND created_at >= NOW() - ($2::INT * INTERVAL '1 minute');
    `,
    [userId, lookbackMinutes]
  );

  return Number(result.rows[0].request_count);
}

function isOutsideActiveHours(activeHoursBaseline, requestHour) {
  return (
    activeHoursBaseline.hasEnoughData &&
    !activeHoursBaseline.activeHours.includes(requestHour)
  );
}

function isRareEndpoint(commonEndpointsBaseline, endpoint) {
  return (
    commonEndpointsBaseline.hasEnoughData &&
    !commonEndpointsBaseline.commonEndpoints.includes(endpoint)
  );
}

function isRequestSpike(requestRateBaseline, recentRequestCount) {
  if (!requestRateBaseline.hasEnoughData || requestRateBaseline.avgRequestsPerHour === 0) {
    return false;
  }

  const spikeThreshold = Math.max(
    requestRateBaseline.avgRequestsPerHour * REQUEST_SPIKE_MULTIPLIER,
    MIN_SPIKE_REQUEST_COUNT
  );

  return recentRequestCount > spikeThreshold;
}

async function calculateRisk({ userId, endpoint, timestamp = new Date() }) {
  const [
    activeHoursBaseline,
    commonEndpointsBaseline,
    requestRateBaseline,
    recentRequestCount,
  ] = await Promise.all([
    baselineService.getActiveHoursBaseline(userId),
    baselineService.getCommonEndpointsBaseline(userId),
    baselineService.getRequestRateBaseline(userId),
    getRecentRequestCount(userId, REQUEST_SPIKE_LOOKBACK_MINUTES),
  ]);

  const requestHour = getRequestHour(timestamp);
  const triggeredSignals = [];

  if (isOutsideActiveHours(activeHoursBaseline, requestHour)) {
    addSignal(
      triggeredSignals,
      RISK_SIGNALS.OUTSIDE_ACTIVE_HOURS,
      `Request hour ${requestHour} is outside the user's active hours`
    );
  }

  if (isRareEndpoint(commonEndpointsBaseline, endpoint)) {
    addSignal(
      triggeredSignals,
      RISK_SIGNALS.RARE_ENDPOINT,
      `${endpoint} is not part of the user's common endpoint baseline`
    );
  }

  if (isRequestSpike(requestRateBaseline, recentRequestCount)) {
    addSignal(
      triggeredSignals,
      RISK_SIGNALS.REQUEST_SPIKE,
      `${recentRequestCount} requests in the last ${REQUEST_SPIKE_LOOKBACK_MINUTES} minutes exceeds the user's normal request rate`
    );
  }

  const riskScore = triggeredSignals.reduce(
    (total, signal) => total + signal.score,
    0
  );

  return {
    userId,
    endpoint,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    triggeredSignals,
    context: {
      requestHour,
      recentRequestCount,
      activeHours: activeHoursBaseline.activeHours,
      commonEndpoints: commonEndpointsBaseline.commonEndpoints,
      avgRequestsPerHour: requestRateBaseline.avgRequestsPerHour,
      hasEnoughBaselineData:
        activeHoursBaseline.hasEnoughData &&
        commonEndpointsBaseline.hasEnoughData &&
        requestRateBaseline.hasEnoughData,
    },
  };
}

module.exports = {
  calculateRisk,
  getRiskLevel,
};
