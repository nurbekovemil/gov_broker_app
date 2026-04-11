import dayjs from 'dayjs';

export interface BondPriceInput {
  nominal: number;
  couponRate: number;
  issueDate: Date;
  maturityDate: Date;
  couponFrequency: number; // payments per year
  ytm: number;
  valuationDate: Date;
}

export interface BondPriceResult {
  cleanPrice: number;
  nkd: number;
  dirtyPrice: number;
  askPrice: number;
  bidPrice: number;
}

/**
 * Build sorted list of all future coupon dates from valuation date.
 */
function futureCouponDates(
  issueDate: dayjs.Dayjs,
  maturityDate: dayjs.Dayjs,
  couponFrequency: number,
  valuationDate: dayjs.Dayjs,
): dayjs.Dayjs[] {
  const monthsPerPeriod = 12 / couponFrequency;
  const dates: dayjs.Dayjs[] = [];

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
function lastCouponDate(
  maturityDate: dayjs.Dayjs,
  couponFrequency: number,
  valuationDate: dayjs.Dayjs,
): dayjs.Dayjs {
  const monthsPerPeriod = 12 / couponFrequency;
  let d = maturityDate;
  while (d.isAfter(valuationDate)) {
    d = d.subtract(monthsPerPeriod, 'month');
  }
  return d;
}

export function calcBondPrice(input: BondPriceInput): BondPriceResult {
  const { nominal, couponRate, issueDate, maturityDate, couponFrequency, ytm, valuationDate } = input;

  const vd = dayjs(valuationDate);
  const md = dayjs(maturityDate);
  const id = dayjs(issueDate);

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

function round(n: number, decimals = 6): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

export function calcBrokerMargin(quantity: number, dirtyPrice: number): number {
  return round(quantity * dirtyPrice * 0.05, 2);
}
