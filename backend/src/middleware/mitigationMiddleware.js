const mitigationService = require("../services/mitigationService");
const riskService = require("../services/riskService");

async function enforceMitigation(req, res, next) {
  if (!req.user?.id) {
    return next();
  }

  try {
    const riskResult = await riskService.calculateRisk({
      userId: req.user.id,
      endpoint: req.originalUrl,
    });

    const mitigationResult = await mitigationService.applyMitigation({
      userId: req.user.id,
      riskLevel: riskResult.riskLevel,
    });

    req.riskResult = riskResult;
    req.mitigationResult = mitigationResult;
    req.mitigationApplied = true;

    if (mitigationResult.action === "REAUTH_REQUIRED") {
      return res.status(401).json({
        code: "REAUTH_REQUIRED",
        message: "Please verify your identity",
      });
    }

    if (mitigationResult.action === "SESSION_TERMINATED") {
      return res.status(403).json({
        code: "SESSION_TERMINATED",
        message: "Session terminated due to suspicious activity",
      });
    }

    return next();
  } catch (error) {
    console.error("Failed to enforce mitigation:", error.message);

    return res.status(500).json({
      message: "Unable to evaluate request security",
    });
  }
}

module.exports = enforceMitigation;
