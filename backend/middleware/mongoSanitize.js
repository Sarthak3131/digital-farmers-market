/**
 * NoSQL Injection Sanitizer Middleware
 * Strips keys prefixed with '$' or containing '.' from request body, query, and params.
 * Prevents MongoDB operator injection (e.g. $ne, $gt, $where).
 */
const sanitizeObject = (obj) => {
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
};

export const mongoSanitize = () => {
  return (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
  };
};

export default mongoSanitize;
