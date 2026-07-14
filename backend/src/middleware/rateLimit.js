/**
 * Minimal in-memory fixed-window rate limiter, keyed by IP. Not distributed
 * (fine for a single-instance demo deployment) — just enough to stop a
 * public link from being hammered against the DB / OpenAI-backed routes.
 */
function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return function (req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      hits.set(key, { windowStart: now, count: 1 });
      return next();
    }

    if (entry.count >= max) {
      return res.status(429).json({
        message: "Too many requests, please try again shortly",
      });
    }

    entry.count += 1;
    return next();
  };
}

module.exports = rateLimit;
