"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const result = await pool_1.pool.query(`
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
exports.default = router;
