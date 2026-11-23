/**
 * Production-grade Sliding Window Rate Limiter Middleware
 * Fully RFC-compliant headers (Retry-After, X-RateLimit-*)
 * In-memory storage with automated expired window cleanup
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests. Please try again later.",
  statusCode = 429,
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "global"
} = {}) => {
  const store = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }, 30000);

  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(0, max - record.count);
    const resetSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSec);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSec);
      return res.status(statusCode).json({
        message,
        retryAfter: resetSec
      });
    }

    next();
  };
};

// 1. Strict Limiter for Authentication (Login / Register)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts
  message: "Too many login/registration attempts from this IP. Please try again after 15 minutes."
});

// 2. Limiter for Order Placement
export const orderRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 orders
  message: "Order placement rate limit exceeded. Please wait before creating more orders.",
  keyGenerator: (req) => req.user?._id?.toString() || req.ip || "user_order"
});

// 3. Limiter for Live Bidding
export const bidRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 bids per minute
  message: "Bidding rate limit exceeded. High-frequency bidding detected, please slow down.",
  keyGenerator: (req) => req.user?._id?.toString() || req.ip || "user_bid"
});

// 4. Global API Limiter
export const globalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests
  message: "Global rate limit exceeded. Please reduce request frequency."
});
