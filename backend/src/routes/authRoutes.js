const express = require("express");
const authController = require("../controllers/authController");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();

const demoLoginLimiter = rateLimit({ windowMs: 60_000, max: 6 });
const demoReactivateLimiter = rateLimit({ windowMs: 60_000, max: 15 });

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/demo-login", demoLoginLimiter, authController.demoLogin);
router.post("/demo-reactivate", demoReactivateLimiter, authController.demoReactivate);

module.exports = router;
