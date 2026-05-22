const activityLogService = require("../services/activityLogService");
const explanationService = require("../services/explanationService");
const mitigationService = require("../services/mitigationService");
const riskService = require("../services/riskService");

const ANOMALY_RISK_THRESHOLD = 70;

function activityLogger(req, res, next) {
  res.on("finish", async () => {
    if (!req.user?.id) {
      return;
    }

    try {
      const riskResult =
        req.riskResult ||
        (await riskService.calculateRisk({
          userId: req.user.id,
          endpoint: req.originalUrl,
        }));

      const isAnomaly = riskResult.riskScore >= ANOMALY_RISK_THRESHOLD;
      let log;

      try {
        log = await activityLogService.createActivityLog({
          userId: req.user.id,
          endpoint: req.originalUrl,
          method: req.method,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] || null,
          statusCode: res.statusCode,
          riskScore: riskResult.riskScore,
          isAnomaly,
        });
      } catch (error) {
        console.error("Failed to write activity log:", error.message);
      }

      if (isAnomaly && log) {
        // Fire-and-forget: fetch historical normal logs, generate explanation,
        // then persist it. Does not block the response.
        (async () => {
          try {
            const historicalLogs =
              await activityLogService.getRecentNormalLogsForUser(req.user.id);

            const explanation = await explanationService.explain({
              userId: req.user.id,
              currentEvent: log,
              historicalLogs,
            });

            await activityLogService.updateActivityLogExplanation(
              log.id,
              explanation
            );
          } catch (error) {
            console.error("Failed to generate AI explanation:", error.message);
          }
        })();
      }

      if (!req.mitigationApplied) {
        try {
          await mitigationService.applyMitigation({
            userId: req.user.id,
            riskLevel: riskResult.riskLevel,
          });
        } catch (error) {
          console.error("Failed to apply mitigation:", error.message);
        }
      }
    } catch (error) {
      console.error("Failed to analyze request risk:", error.message);
    }
  });

  return next();
}

module.exports = activityLogger;
