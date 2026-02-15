const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default; // <-- important for v4
const redis = require('../config/redis');

module.exports = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});
