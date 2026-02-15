const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');

exports.generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );

  await redis.set(
    `refresh:${user.id}`,
    refreshToken,
    'EX',
    7 * 24 * 60 * 60
  );

  return { accessToken, refreshToken };
};

exports.verifyRefreshToken = async (token) => {
  if (!token) {
    throw new ApiError(401, 'Refresh token required');
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const stored = await redis.get(`refresh:${payload.id}`);

  if (!stored || stored !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  return payload.id;
};
