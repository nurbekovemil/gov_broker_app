"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const auth_1 = require("../middleware/auth");
const pricing_1 = require("../services/pricing");
const socket_1 = require("../socket");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    if (includeInactive && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const statusWhere = includeInactive ? '' : `WHERE b.status = 'active'`;
    const orderBy = includeInactive
        ? `ORDER BY CASE b.status WHEN 'active' THEN 0 WHEN 'inactive' THEN 1 WHEN 'matured' THEN 2 ELSE 3 END, b.created_at`
        : 'ORDER BY b.created_at';
    const result = await pool_1.pool.query(`
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
router.get('/:id', auth_1.authenticate, async (req, res) => {
    const result = await pool_1.pool.query(`
    SELECT b.*, bp.ytm, bp.clean_price, bp.dirty_price, bp.ask_price, bp.bid_price, bp.date AS price_date
    FROM bonds b
    LEFT JOIN LATERAL (
      SELECT * FROM bond_prices WHERE bond_id = b.id ORDER BY date DESC LIMIT 1
    ) bp ON true
    WHERE b.id=$1
  `, [req.params.id]);
    if (!result.rows[0])
        return res.status(404).json({ error: 'Not found' });
    return res.json(result.rows[0]);
});
const bondSchema = zod_1.z.object({
    isin: zod_1.z.string().min(12).max(12),
    name: zod_1.z.string().min(1),
    nominal: zod_1.z.number().positive(),
    couponRate: zod_1.z.number().positive().max(1),
    issueDate: zod_1.z.string(),
    maturityDate: zod_1.z.string(),
    couponFrequency: zod_1.z.number().int().min(1).max(12),
    availableQuantity: zod_1.z.coerce.number().int().min(0).optional().default(0),
});
const bondUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    couponRate: zod_1.z.number().positive().max(1).optional(),
    maturityDate: zod_1.z.string().optional(),
    couponFrequency: zod_1.z.number().int().min(1).max(12).optional(),
    availableQuantity: zod_1.z.coerce.number().int().min(0).optional(),
});
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const parsed = bondSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const d = parsed.data;
    const result = await pool_1.pool.query(`
    INSERT INTO bonds (isin, name, nominal, coupon_rate, issue_date, maturity_date, coupon_frequency, available_quantity)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
  `, [d.isin, d.name, d.nominal, d.couponRate, d.issueDate, d.maturityDate, d.couponFrequency, d.availableQuantity]);
    return res.status(201).json(result.rows[0]);
});
router.put('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const parsed = bondUpdateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const d = parsed.data;
    const sets = [];
    const vals = [];
    let idx = 1;
    if (d.name !== undefined) {
        sets.push(`name=$${idx++}`);
        vals.push(d.name);
    }
    if (d.couponRate !== undefined) {
        sets.push(`coupon_rate=$${idx++}`);
        vals.push(d.couponRate);
    }
    if (d.maturityDate !== undefined) {
        sets.push(`maturity_date=$${idx++}`);
        vals.push(d.maturityDate);
    }
    if (d.couponFrequency !== undefined) {
        sets.push(`coupon_frequency=$${idx++}`);
        vals.push(d.couponFrequency);
    }
    if (d.availableQuantity !== undefined) {
        sets.push(`available_quantity=$${idx++}`);
        vals.push(d.availableQuantity);
    }
    if (sets.length === 0)
        return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    const result = await pool_1.pool.query(`UPDATE bonds SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, vals);
    return res.json(result.rows[0]);
});
const ytmSchema = zod_1.z.object({ ytm: zod_1.z.number().positive().max(1) });
router.put('/:id/ytm', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const parsed = ytmSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'ytm must be a number 0-1' });
    const { ytm } = parsed.data;
    const bondRes = await pool_1.pool.query('SELECT * FROM bonds WHERE id=$1', [req.params.id]);
    const bond = bondRes.rows[0];
    if (!bond)
        return res.status(404).json({ error: 'Bond not found' });
    const today = new Date().toISOString().slice(0, 10);
    const prices = (0, pricing_1.calcBondPrice)({
        nominal: parseFloat(bond.nominal),
        couponRate: parseFloat(bond.coupon_rate),
        issueDate: new Date(bond.issue_date),
        maturityDate: new Date(bond.maturity_date),
        couponFrequency: bond.coupon_frequency,
        ytm,
        valuationDate: new Date(today),
    });
    await pool_1.pool.query(`
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
    (0, socket_1.getIO)().emit('prices_updated', updatedBond);
    return res.json(updatedBond);
});
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    await pool_1.pool.query("UPDATE bonds SET status='inactive' WHERE id=$1", [req.params.id]);
    return res.json({ success: true });
});
exports.default = router;
