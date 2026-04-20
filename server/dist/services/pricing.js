"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcBondPrice = calcBondPrice;
exports.calcBrokerMargin = calcBrokerMargin;
const dayjs_1 = __importDefault(require("dayjs"));
/**
 * Build sorted list of all future coupon dates from valuation date.
 */
function futureCouponDates(issueDate, maturityDate, couponFrequency, valuationDate) {
    const monthsPerPeriod = 12 / couponFrequency;
    const dates = [];
    let d = maturityDate;
    while (d.isAfter(valuationDate)) {
        dates.unshift(d);
        d = d.subtract(monthsPerPeriod, 'month');
    }
    // If the loop moved before issue date, trim
    return dates.filter((dt) => dt.isAfter(issueDate) || dt.isSame(issueDate, 'day'));
}
/**
 * Last coupon date before or on valuation date.
 */
function lastCouponDate(maturityDate, couponFrequency, valuationDate) {
    const monthsPerPeriod = 12 / couponFrequency;
    let d = maturityDate;
    while (d.isAfter(valuationDate)) {
        d = d.subtract(monthsPerPeriod, 'month');
    }
    return d;
}
function calcBondPrice(input) {
    const { nominal, couponRate, issueDate, maturityDate, couponFrequency, ytm, valuationDate } = input;
    const vd = (0, dayjs_1.default)(valuationDate);
    const md = (0, dayjs_1.default)(maturityDate);
    const id = (0, dayjs_1.default)(issueDate);
    const couponPerPeriod = nominal * couponRate / couponFrequency;
    const rPerPeriod = ytm / couponFrequency;
    const futureDates = futureCouponDates(id, md, couponFrequency, vd);
    let cleanPrice = 0;
    for (let i = 0; i < futureDates.length; i++) {
        const dt = futureDates[i];
        // fractional periods from valuation date
        const daysToPayment = dt.diff(vd, 'day');
        const daysInPeriod = 365 / couponFrequency;
        const t = daysToPayment / daysInPeriod;
        const cashflow = i === futureDates.length - 1 ? couponPerPeriod + nominal : couponPerPeriod;
        cleanPrice += cashflow / Math.pow(1 + rPerPeriod, t);
    }
    // NKD (accrued interest)
    const prevCoupon = lastCouponDate(md, couponFrequency, vd);
    const nextCoupon = prevCoupon.add(12 / couponFrequency, 'month');
    const daysSinceCoupon = vd.diff(prevCoupon, 'day');
    const daysInCouponPeriod = nextCoupon.diff(prevCoupon, 'day');
    const nkd = couponPerPeriod * (daysSinceCoupon / daysInCouponPeriod);
    const dirtyPrice = cleanPrice + nkd;
    const askPrice = dirtyPrice * 1.025;
    const bidPrice = dirtyPrice * 0.975;
    return {
        cleanPrice: round(cleanPrice),
        nkd: round(nkd),
        dirtyPrice: round(dirtyPrice),
        askPrice: round(askPrice),
        bidPrice: round(bidPrice),
    };
}
function round(n, decimals = 6) {
    return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
function calcBrokerMargin(quantity, dirtyPrice) {
    return round(quantity * dirtyPrice * 0.05, 2);
}
