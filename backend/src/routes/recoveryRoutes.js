const express = require("express");
const recoveryController = require("../controllers/recoveryController");

const router = express.Router();

router.post("/request", recoveryController.requestRecovery);
router.post("/verify", recoveryController.verifyRecovery);

module.exports = router;
