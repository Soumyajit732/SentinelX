const dashboardService = require("../services/dashboardService");

async function getStats(req, res, next) {
  try {
    res.json(await dashboardService.getStats());
  } catch (err) {
    next(err);
  }
}

async function getRiskOverTime(req, res, next) {
  try {
    res.json(await dashboardService.getRiskOverTime());
  } catch (err) {
    next(err);
  }
}

async function getLogs(req, res, next) {
  try {
    res.json(await dashboardService.getRecentLogs());
  } catch (err) {
    next(err);
  }
}

async function getAnomalies(req, res, next) {
  try {
    res.json(await dashboardService.getAnomalies());
  } catch (err) {
    next(err);
  }
}

async function getRecoveryEvents(req, res, next) {
  try {
    res.json(await dashboardService.getRecoveryEvents());
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, getRiskOverTime, getLogs, getAnomalies, getRecoveryEvents };
