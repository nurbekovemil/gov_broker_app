"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const auth_1 = require("../middleware/auth");
const pricing_1 = require("../services/pricing");
const router = (0, express_1.Router)();
const tradeSchema = zod_1.z.object({
    bondId: zod_1.z.string().uuid(),
    tradeType: zod_1.z.enum(['buy', 'sell']),
    quantity: zod_1.z.number().int().positive(),
});
router.post('/', auth_1.authenticate, async (req, res) => {
    const parsed = tradeSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { bondId, tradeType, quantity } = parsed.data;
    const userId = req.user.userId;
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        const lockRes = await client.query('SELECT id, available_quantity FROM bonds WHERE id=$1 FOR UPDATE', [bondId]);
        if (!lockRes.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bond not found' });
        }
        const brokerQty = lockRes.rows[0].available_quantity ?? 0;
        const priceRes = await client.query(`
      SELECT bp.*, b.nominal, b.coupon_rate, b.coupon_frequency
      FROM bond_prices bp
      JOIN bonds b ON b.id = bp.bond_id
      WHERE bp.bond_id=$1 ORDER BY bp.date DESC LIMIT 1
    `, [bondId]);
        const p = priceRes.rows[0];
        if (!p) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bond price not found' });
        }
        if (tradeType === 'buy' && brokerQty < quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient bonds available from broker' });
        }
        const pricePerBond = tradeType === 'buy' ? parseFloat(p.ask_price) : parseFloat(p.bid_price);
        const nkdPerBond = parseFloat(p.dirty_price) - parseFloat(p.clean_price);
        const totalAmount = pricePerBond * quantity;
        const brokerMargin = (0, pricing_1.calcBrokerMargin)(quantity, parseFloat(p.dirty_price));
        // For sell: check portfolio
        if (tradeType === 'sell') {
            const portRes = await client.query('SELECT quantity FROM portfolio WHERE user_id=$1 AND bond_id=$2', [userId, bondId]);
            const held = portRes.rows[0]?.quantity ?? 0;
            if (held < quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient bonds in portfolio' });
            }
        }
        // Insert trade
        const tradeRes = await client.query(`
      INSERT INTO trades (user_id, bond_id, trade_type, quantity, price_per_bond, nkd_per_bond, total_amount, broker_margin)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [userId, bondId, tradeType, quantity, pricePerBond, nkdPerBond, totalAmount, brokerMargin]);
        if (tradeType === 'buy') {
            await client.query('UPDATE bonds SET available_quantity = available_quantity - $1 WHERE id=$2', [quantity, bondId]);
        }
        else {
            await client.query('UPDATE bonds SET available_quantity = available_quantity + $1 WHERE id=$2', [quantity, bondId]);
        }
        // Update portfolio
        if (tradeType === 'buy') {
            await client.query(`
        INSERT INTO portfolio (user_id, bond_id, quantity, avg_price)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, bond_id) DO UPDATE SET
          avg_price = (portfolio.avg_price * portfolio.quantity + $4 * $3) / (portfolio.quantity + $3),
          quantity = portfolio.quantity + $3,
          updated_at = NOW()
      `, [userId, bondId, quantity, pricePerBond]);
        }
        else {
            await client.query(`
        UPDATE portfolio SET quantity = quantity - $3, updated_at=NOW()
        WHERE user_id=$1 AND bond_id=$2
      `, [userId, bondId, quantity]);
            // Remove zero-quantity rows
            await client.query('DELETE FROM portfolio WHERE user_id=$1 AND bond_id=$2 AND quantity<=0', [userId, bondId]);
        }
        await client.query('COMMIT');
        return res.status(201).json(tradeRes.rows[0]);
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        return res.status(500).json({ error: 'Trade failed' });
    }
    finally {
        client.release();
    }
});
router.get('/', auth_1.authenticate, async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;
    const result = await pool_1.pool.query(`
    SELECT t.*, b.isin, b.name AS bond_name, u.full_name AS investor_name, u.email AS investor_email
    FROM trades t
    JOIN bonds b ON b.id = t.bond_id
    JOIN users u ON u.id = t.user_id
    ${isAdmin ? '' : 'WHERE t.user_id=$1'}
    ORDER BY t.created_at DESC
    LIMIT 500
  `, isAdmin ? [] : [userId]);
    return res.json(result.rows);
});
exports.default = router;
