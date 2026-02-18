
const prisma = require('../config/db'); // points to ../config/db.js
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateTokens, verifyRefreshToken } = require('../services/token.service');
const ApiError = require('../utils/ApiError');
const axios = require('axios');
exports.register = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required'));
    }

    const validRoles = ['ADMIN', 'TEACHER', 'STUDENT'];
    const userRole = role?.toUpperCase() || 'STUDENT';

    if (!validRoles.includes(userRole)) {
      return next(new ApiError(400, 'Invalid role'));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(400, 'User already exists'));
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: userRole,
        name: name ? String(name).trim() || null : null,
      },
    });

    if (user.role === 'TEACHER') {
      try {
        await axios.post('http://attendance-service:3001/internal/teachers', {
          id: user.id,
          name: user.name || email.split('@')[0],
          email: user.email,
        });
      } catch (err) {
        console.error('Attendance sync failed:', err.message);
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });

  } catch (e) {
    next(new ApiError(500, 'Something went wrong during registration'));
  }
};



exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await comparePassword(password, user.password)))
      throw new ApiError(401, 'Invalid credentials');

    const tokens = await generateTokens(user);
    res.json({ ...tokens, role: user.role });
  } catch (e) {
    next(e);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ApiError(400, 'Refresh token is required'));
    }

    const userId = await verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    const tokens = await generateTokens(user);
    res.json({ ...tokens, role: user.role });
  } catch (e) {
    next(e);
  }
};


exports.logout = async (req, res) => {
  const redis = require('../config/redis');
  await redis.del(`refresh:${req.user.id}`);
  res.json({ message: 'Logged out successfully' });
};
