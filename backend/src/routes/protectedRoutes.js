const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const activityLogger = require("../middleware/activityLogger");
const enforceMitigation = require("../middleware/mitigationMiddleware");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();

// Caps request volume per IP — protected routes can trigger OpenAI-backed
// explanation generation on HIGH-risk events, so this bounds worst-case cost
// on a publicly reachable demo deployment.
router.use(rateLimit({ windowMs: 60_000, max: 60 }));
router.use(authenticate);
router.use(activityLogger);
router.use(enforceMitigation);

router.get("/profile", (req, res) => {
  return res.status(200).json({
    message: "Profile fetched successfully",
    user: req.user,
  });
});

router.get("/dashboard", (req, res) => {
  return res.status(200).json({
    message: "Dashboard data fetched",
    user: req.user,
  });
});

router.get("/settings", (req, res) => {
  return res.status(200).json({
    message: "Settings fetched",
    user: req.user,
  });
});

router.get("/admin/export-all", (req, res) => {
  return res.status(200).json({
    message: "Export triggered",
    user: req.user,
  });
});

router.get("/admin/users", (req, res) => {
  return res.status(200).json({
    message: "User list fetched",
    user: req.user,
  });
});

router.delete("/admin/delete-logs", (req, res) => {
  return res.status(200).json({
    message: "Logs cleared",
    user: req.user,
  });
});

module.exports = router;
