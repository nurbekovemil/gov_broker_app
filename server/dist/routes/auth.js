"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    const { email, password } = parsed.data;
    const result = await pool_1.pool.query('SELECT id, email, password_hash, role, full_name FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcryptjs_1.default.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d');
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn });
    return res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    });
});
exports.default = router;
