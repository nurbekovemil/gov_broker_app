import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Margin income report
router.get('/margin', authenticate, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const result = await pool.query(`
    SELECT
      DATE_TRUNC('day', t.created_at)::DATE AS trade_date,
      b.isin, b.name AS bond_name,
      COUNT(*) AS trade_count,
      SUM(t.quantity) AS total_quantity,
      SUM(t.total_amount) AS total_volume,
      SUM(t.broker_margin) AS total_margin
    FROM trades t
    JOIN bonds b ON b.id = t.bond_id
    WHERE ($1::date IS NULL OR t.created_at::date >= $1::date)
      AND ($2::date IS NULL OR t.created_at::date <= $2::date)
    GROUP BY 1, b.isin, b.name
    ORDER BY 1 DESC, b.name
  `, [from ?? null, to ?? null]);
  return res.json(result.rows);
});

// Client balances registry
router.get('/balances', authenticate, requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT
      u.full_name, u.email,
      b.isin, b.name AS bond_name,
      p.quantity, p.avg_price,
      p.quantity * COALESCE(bp.dirty_price, p.avg_price) AS current_value
    FROM portfolio p
    JOIN users u ON u.id = p.user_id
    JOIN bonds b ON b.id = p.bond_id
    LEFT JOIN LATERAL (
      SELECT dirty_price FROM bond_prices WHERE bond_id = b.id ORDER BY date DESC LIMIT 1
    ) bp ON true
    WHERE p.quantity > 0
    ORDER BY u.full_name, b.name
  `);
  return res.json(result.rows);
});

// Summary stats for admin dashboard
router.get('/summary', authenticate, requireAdmin, async (req, res) => {
  const [trades, margin, clients, bonds] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS count, SUM(total_amount) AS volume FROM trades WHERE created_at::date = CURRENT_DATE`),
    pool.query(`SELECT COALESCE(SUM(broker_margin),0) AS total FROM trades`),
    pool.query(`SELECT COUNT(DISTINCT user_id) AS count FROM portfolio WHERE quantity>0`),
    pool.query(`SELECT COUNT(*) AS count FROM bonds WHERE status='active'`),
  ]);
  return res.json({
    todayTrades: trades.rows[0],
    totalMargin: margin.rows[0].total,
    activeClients: clients.rows[0].count,
    activeBonds: bonds.rows[0].count,
  });
});

export default router;
