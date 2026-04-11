import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    'SELECT id, email, password_hash, role, full_name FROM users WHERE email=$1',
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}${'d' | 'h' | 'm' | 's'}`;
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn },
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
  });
});

export default router;
