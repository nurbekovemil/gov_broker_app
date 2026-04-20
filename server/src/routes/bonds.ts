import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requireAdmin } from '../middleware/auth';
import { calcBondPrice } from '../services/pricing';
import { getIO } from '../socket';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  if (includeInactive && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const statusWhere = includeInactive ? '' : `WHERE b.status = 'active'`;
  const orderBy = includeInactive
    ? `ORDER BY CASE b.status WHEN 'active' THEN 0 WHEN 'inactive' THEN 1 WHEN 'matured' THEN 2 ELSE 3 END, b.created_at`
    : 'ORDER BY b.created_at';

  const result = await pool.query(`
    SELECT b.*, bp.ytm, bp.clean_price, bp.dirty_price, bp.ask_price, bp.bid_price, bp.date AS price_date
    FROM bonds b
    LEFT JOIN LATERAL (
      SELECT * FROM bond_prices WHERE bond_id = b.id ORDER BY date DESC LIMIT 1
    ) bp ON true
    ${statusWhere}
    ${orderBy}
  `);
  return res.json(result.rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT b.*, bp.ytm, bp.clean_price, bp.dirty_price, bp.ask_price, bp.bid_price, bp.date AS price_date
    FROM bonds b
    LEFT JOIN LATERAL (
      SELECT * FROM bond_prices WHERE bond_id = b.id ORDER BY date DESC LIMIT 1
    ) bp ON true
    WHERE b.id=$1
  `, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
  return res.json(result.rows[0]);
});

const bondSchema = z.object({
  isin: z.string().min(12).max(12),
  name: z.string().min(1),
  nominal: z.number().positive(),
  couponRate: z.number().positive().max(1),
  issueDate: z.string(),
  maturityDate: z.string(),
  couponFrequency: z.number().int().min(1).max(12),
  availableQuantity: z.coerce.number().int().min(0).optional().default(0),
});

const bondUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  couponRate: z.number().positive().max(1).optional(),
  maturityDate: z.string().optional(),
  couponFrequency: z.number().int().min(1).max(12).optional(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const parsed = bondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(`
    INSERT INTO bonds (isin, name, nominal, coupon_rate, issue_date, maturity_date, coupon_frequency, available_quantity)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
  `, [d.isin, d.name, d.nominal, d.couponRate, d.issueDate, d.maturityDate, d.couponFrequency, d.availableQuantity]);

  return res.status(201).json(result.rows[0]);
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const parsed = bondUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (d.name !== undefined) { sets.push(`name=$${idx++}`); vals.push(d.name); }
  if (d.couponRate !== undefined) { sets.push(`coupon_rate=$${idx++}`); vals.push(d.couponRate); }
  if (d.maturityDate !== undefined) { sets.push(`maturity_date=$${idx++}`); vals.push(d.maturityDate); }
  if (d.couponFrequency !== undefined) { sets.push(`coupon_frequency=$${idx++}`); vals.push(d.couponFrequency); }
  if (d.availableQuantity !== undefined) { sets.push(`available_quantity=$${idx++}`); vals.push(d.availableQuantity); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);

  const result = await pool.query(
    `UPDATE bonds SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
    vals,
  );
  return res.json(result.rows[0]);
});

const ytmSchema = z.object({ ytm: z.number().positive().max(1) });

router.put('/:id/ytm', authenticate, requireAdmin, async (req, res) => {
  const parsed = ytmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'ytm must be a number 0-1' });

  const { ytm } = parsed.data;
  const bondRes = await pool.query('SELECT * FROM bonds WHERE id=$1', [req.params.id]);
  const bond = bondRes.rows[0];
  if (!bond) return res.status(404).json({ error: 'Bond not found' });

  const today = new Date().toISOString().slice(0, 10);
  const prices = calcBondPrice({
    nominal: parseFloat(bond.nominal),
    couponRate: parseFloat(bond.coupon_rate),
    issueDate: new Date(bond.issue_date),
    maturityDate: new Date(bond.maturity_date),
    couponFrequency: bond.coupon_frequency,
    ytm,
    valuationDate: new Date(today),
  });

  await pool.query(`
    INSERT INTO bond_prices (bond_id, date, ytm, clean_price, dirty_price, ask_price, bid_price)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (bond_id, date) DO UPDATE SET
      ytm=EXCLUDED.ytm, clean_price=EXCLUDED.clean_price,
      dirty_price=EXCLUDED.dirty_price, ask_price=EXCLUDED.ask_price, bid_price=EXCLUDED.bid_price
  `, [bond.id, today, ytm, prices.cleanPrice, prices.dirtyPrice, prices.askPrice, prices.bidPrice]);

  const updatedBond = {
    ...bond,
    ytm,
    clean_price: prices.cleanPrice,
    dirty_price: prices.dirtyPrice,
    ask_price: prices.askPrice,
    bid_price: prices.bidPrice,
    price_date: today,
  };

  getIO().emit('prices_updated', updatedBond);

  return res.json(updatedBond);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await pool.query("UPDATE bonds SET status='inactive' WHERE id=$1", [req.params.id]);
  return res.json({ success: true });
});

export default router;
