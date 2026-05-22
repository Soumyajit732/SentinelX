const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const activityLogger = require("../middleware/activityLogger");
const enforceMitigation = require("../middleware/mitigationMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(activityLogger);
router.use(enforceMitigation);

router.get("/profile", (req, res) => {
  return res.status(200).json({
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

module.exports = router;
