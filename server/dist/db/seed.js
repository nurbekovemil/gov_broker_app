"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pool_1 = require("./pool");
const pricing_1 = require("../services/pricing");
async function seed() {
    const adminHash = await bcryptjs_1.default.hash('admin123', 10);
    const investorHash = await bcryptjs_1.default.hash('investor123', 10);
    await pool_1.pool.query(`
    INSERT INTO users (email, password_hash, role, full_name) VALUES
      ('admin@govbroker.kg', $1, 'admin', 'Госброкер Администратор'),
      ('investor1@example.com', $2, 'investor', 'Иванов Иван Иванович'),
      ('investor2@example.com', $2, 'investor', 'Петрова Мария Сергеевна')
    ON CONFLICT (email) DO NOTHING
  `, [adminHash, investorHash]);
    const bonds = [
        {
            isin: 'KG0001001001',
            name: 'ГЦБ Кыргызстан 2025-2028',
            nominal: 1000,
            coupon_rate: 0.085,
            issue_date: '2025-01-15',
            maturity_date: '2028-01-15',
            coupon_frequency: 2,
        },
        {
            isin: 'KG0001001002',
            name: 'ГЦБ Кыргызстан 2024-2027',
            nominal: 1000,
            coupon_rate: 0.09,
            issue_date: '2024-06-01',
            maturity_date: '2027-06-01',
            coupon_frequency: 2,
        },
        {
            isin: 'KG0001001003',
            name: 'ГЦБ Кыргызстан 2023-2028',
            nominal: 1000,
            coupon_rate: 0.095,
            issue_date: '2023-03-10',
            maturity_date: '2028-03-10',
            coupon_frequency: 4,
        },
    ];
    const ytmByBond = [0.088, 0.092, 0.097];
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < bonds.length; i++) {
        const b = bonds[i];
        const res = await pool_1.pool.query(`
      INSERT INTO bonds (isin, name, nominal, coupon_rate, issue_date, maturity_date, coupon_frequency, available_quantity)
      VALUES ($1,$2,$3,$4,$5,$6,$7,500000)
      ON CONFLICT (isin) DO UPDATE SET name=EXCLUDED.name
      RETURNING id
    `, [b.isin, b.name, b.nominal, b.coupon_rate, b.issue_date, b.maturity_date, b.coupon_frequency]);
        const bondId = res.rows[0].id;
        const ytm = ytmByBond[i];
        const prices = (0, pricing_1.calcBondPrice)({
            nominal: b.nominal,
            couponRate: b.coupon_rate,
            issueDate: new Date(b.issue_date),
            maturityDate: new Date(b.maturity_date),
            couponFrequency: b.coupon_frequency,
            ytm,
            valuationDate: new Date(today),
        });
        await pool_1.pool.query(`
      INSERT INTO bond_prices (bond_id, date, ytm, clean_price, dirty_price, ask_price, bid_price)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (bond_id, date) DO UPDATE SET
        ytm=EXCLUDED.ytm, clean_price=EXCLUDED.clean_price,
        dirty_price=EXCLUDED.dirty_price, ask_price=EXCLUDED.ask_price, bid_price=EXCLUDED.bid_price
    `, [bondId, today, ytm, prices.cleanPrice, prices.dirtyPrice, prices.askPrice, prices.bidPrice]);
    }
    console.log('Seed completed');
    await pool_1.pool.end();
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
