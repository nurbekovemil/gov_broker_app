import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const userId = req.user!.userId;
  const result = await pool.query(`
    SELECT p.*, b.isin, b.name AS bond_name, b.nominal, b.coupon_rate, b.maturity_date,
           bp.dirty_price AS current_price, bp.ytm
    FROM portfolio p
    JOIN bonds b ON b.id = p.bond_id
    LEFT JOIN LATERAL (
      SELECT dirty_price, ytm FROM bond_prices WHERE bond_id = b.id ORDER BY date DESC LIMIT 1
    ) bp ON true
    WHERE p.user_id=$1 AND p.quantity > 0
    ORDER BY b.name
  `, [userId]);
  return res.json(result.rows);
});

export default router;
