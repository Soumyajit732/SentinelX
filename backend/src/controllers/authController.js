const userService = require("../services/userService");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");

function isValidEmail(email) {
  return typeof email === "string" && email.includes("@");
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

async function register(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail) || !isValidPassword(password)) {
    return res.status(400).json({
      message: "Valid email and password of at least 8 characters are required",
    });
  }

  const existingUser = await userService.findUserByEmail(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({
      message: "Email is already registered",
    });
  }

  const passwordHash = await hashPassword(password);
  const user = await userService.createUser({
    email: normalizedEmail,
    passwordHash,
  });

  return res.status(201).json({
    message: "User registered successfully",
    user,
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail) || typeof password !== "string") {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const user = await userService.findUserByEmail(normalizedEmail);

  if (!user) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const passwordMatches = await comparePassword(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const token = signAccessToken(user);

  return res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      tokenVersion: user.token_version,
      blockedUntil: user.blocked_until,
      createdAt: user.created_at,
    },
  });
}

module.exports = {
  register,
  login,
};
