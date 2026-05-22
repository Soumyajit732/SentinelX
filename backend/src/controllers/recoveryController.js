const env = require("../config/env");
const recoveryService = require("../services/recoveryService");
const userService = require("../services/userService");
const { signAccessToken } = require("../utils/jwt");

function isValidEmail(email) {
  return typeof email === "string" && email.includes("@");
}

function isValidRecoveryToken(token) {
  return typeof token === "string" && /^\d{6}$/.test(token);
}

async function requestRecovery(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    const user = await userService.findUserByEmail(normalizedEmail);

    if (user) {
      const recoveryResult = await recoveryService.createRecoveryToken(user.id);

      if (env.nodeEnv !== "production") {
        console.log(
          `Recovery token for ${normalizedEmail}: ${recoveryResult.token}`
        );
      }
    }

    return res.status(200).json({
      message: "Recovery token generated",
    });
  } catch (error) {
    console.error("Failed to request recovery:", error.message);

    return res.status(500).json({
      message: "Unable to generate recovery token",
    });
  }
}

async function verifyRecovery(req, res) {
  try {
    const { email, token } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedToken = typeof token === "string" ? token.trim() : token;

    if (
      !isValidEmail(normalizedEmail) ||
      !isValidRecoveryToken(normalizedToken)
    ) {
      return res.status(400).json({
        message: "Valid email and recovery token are required",
      });
    }

    const user = await userService.findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        message: "Invalid or expired recovery token",
      });
    }

    const recoveryToken = await recoveryService.findMatchingRecoveryToken({
      userId: user.id,
      token: normalizedToken,
    });

    if (!recoveryToken) {
      return res.status(401).json({
        message: "Invalid or expired recovery token",
      });
    }

    const recoveryResult = await recoveryService.restoreUserAccess({
      userId: user.id,
      recoveryTokenId: recoveryToken.id,
    });

    if (!recoveryResult) {
      return res.status(401).json({
        message: "Invalid or expired recovery token",
      });
    }

    const accessToken = signAccessToken(recoveryResult.user);

    return res.status(200).json({
      message: "Recovery successful",
      token: accessToken,
    });
  } catch (error) {
    console.error("Failed to verify recovery:", error.message);

    return res.status(500).json({
      message: "Unable to verify recovery token",
    });
  }
}

module.exports = {
  requestRecovery,
  verifyRecovery,
};
