const router = require('express').Router();
const prisma = require('../config/db');

// List users with role TEACHER (for use by other services, e.g. attendance admin API)
// Query: ?search= — filter by name or email (case-insensitive contains)
router.get('/teachers', async (req, res) => {
  try {
    const search = req.query.search && String(req.query.search).trim();
    const where = { role: 'TEACHER' };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const teachers = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(teachers);
  } catch (err) {
    console.error('Internal list teachers error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// For use by other services (e.g. attendance) to resolve user by id and role
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Internal get user error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
