const userService = require("../services/userService");
const { verifyAccessToken } = require("../utils/jwt");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    const user = await userService.findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    if (user.token_version !== payload.tokenVersion) {
      return res.status(401).json({
        code: "SESSION_INVALIDATED",
        message: "Session has been invalidated",
      });
    }

    if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
      return res.status(403).json({
        code: "TEMP_BLOCKED",
        message: "User temporarily blocked",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      tokenVersion: user.token_version,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticate;
