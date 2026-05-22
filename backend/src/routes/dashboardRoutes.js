const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);

router.get("/stats",           dashboardController.getStats);
router.get("/risk-over-time",  dashboardController.getRiskOverTime);
router.get("/logs",            dashboardController.getLogs);
router.get("/anomalies",       dashboardController.getAnomalies);
router.get("/recovery-events", dashboardController.getRecoveryEvents);

module.exports = router;
