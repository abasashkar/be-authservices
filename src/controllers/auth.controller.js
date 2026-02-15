
const prisma = require('../config/db'); // points to ../config/db.js
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateTokens, verifyRefreshToken } = require('../services/token.service');
const ApiError = require('../utils/ApiError');
exports.register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Basic validation
    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required'));
    }

    // Validate role, default to STUDENT
    const validRoles = ['ADMIN', 'TEACHER', 'STUDENT'];
    const userRole = role?.toUpperCase() || 'STUDENT';
    if (!validRoles.includes(userRole)) {
      return next(new ApiError(400, 'Invalid role'));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ApiError(400, 'User with this email already exists'));
    }

    // Hash password
    const hashed = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: userRole,
      },
    });

    // Respond with user info (excluding password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error('Register error:', e); // <-- debug full error
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
    res.json(tokens);
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
    res.json(tokens);
  } catch (e) {
    next(e);
  }
};


exports.logout = async (req, res) => {
  const redis = require('../config/redis');
  await redis.del(`refresh:${req.user.id}`);
  res.json({ message: 'Logged out successfully' });
};
