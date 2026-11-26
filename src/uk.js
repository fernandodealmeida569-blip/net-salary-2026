// United Kingdom payroll and property tax, tax year 6 April 2026 to 5 April 2027
// (England, Wales and Northern Ireland; Scottish income tax bands are not included).
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
const r2 = (v) => Math.round(Number((v * 100).toFixed(6))) / 100;

export const UK_2026 = {
  pa: 12570, paLimit: 100000, basicBand: 37700, higherLimit: 125140, rates: [20, 40, 45],
  niPT: 12570, niUEL: 50270, niMain: 8, niUpper: 2,
  loan: { plan1: 26900, plan2: 29385, plan4: 33795, plan5: 25000 }, loanRate: 9, pg: 21000, pgRate: 6,
};

export function ukTakeHome({ salary, pensionPct = 0, plan = '', postgrad = false }) {
  salary = num(salary); pensionPct = num(pensionPct) || 0;
  if (!(salary > 0) || !(pensionPct >= 0 && pensionPct <= 100)) throw new RangeError('invalid input');
  const U = UK_2026;
  const pension = (salary * pensionPct) / 100;
  const adjusted = salary - pension; // pension under a net pay arrangement: relieved before tax
  const pa = Math.max(0, U.pa - Math.max(0, Math.floor((adjusted - U.paLimit) / 2)));
  const taxable = Math.max(0, adjusted - pa);
  const basic = Math.min(taxable, U.basicBand);
  const higher = Math.min(Math.max(0, taxable - U.basicBand), Math.max(0, U.higherLimit - pa - U.basicBand));
  const additional = Math.max(0, taxable - basic - higher);
  const tax = (basic * U.rates[0] + higher * U.rates[1] + additional * U.rates[2]) / 100;
  const ni = (Math.max(0, Math.min(salary, U.niUEL) - U.niPT) * U.niMain + Math.max(0, salary - U.niUEL) * U.niUpper) / 100;
  const studentLoan = plan && U.loan[plan] ? Math.floor((Math.max(0, salary - U.loan[plan]) * U.loanRate) / 100) : 0;
  const pgLoan = postgrad ? Math.floor((Math.max(0, salary - U.pg) * U.pgRate) / 100) : 0;
  const net = salary - pension - tax - ni - studentLoan - pgLoan;
  return {
    gross: r2(salary), pension: r2(pension), personalAllowance: pa, taxable: r2(taxable), tax: r2(tax), ni: r2(ni), studentLoan, pgLoan,
    net: r2(net), monthly: r2(net / 12), weekly: r2(net / 52), daily: r2(net / 260),
    bands: [r2(basic), r2(higher), r2(additional)], effective: Math.round(((tax + ni) / salary) * 1000) / 10,
  };
}

// Stamp Duty Land Tax (England and Northern Ireland), rates in force since 1 April 2025
export const SDLT = {
  bands: [[125000, 0], [250000, 2], [925000, 5], [1500000, 10], [Infinity, 12]],
  first: [[300000, 0], [500000, 5]], firstMax: 500000, additional: 5, nonResident: 2,
};
export function sdlt({ price, buyer = 'mover', nonResident = false }) {
  price = num(price);
  if (!(price > 0)) throw new RangeError('invalid input');
  const first = buyer === 'first' && price <= SDLT.firstMax;
  const extra = (buyer === 'additional' && price >= 40000 ? SDLT.additional : 0) + (nonResident ? SDLT.nonResident : 0);
  const table = first ? SDLT.first : SDLT.bands;
  let start = 0, total = 0;
  const bands = [];
  for (const [upTo, rate] of table) {
    if (price <= start) break;
    const slice = Math.min(price, upTo) - start;
    const bandTax = (slice * (rate + extra)) / 100;
    bands.push({ from: start, to: Math.min(price, upTo), rate: rate + extra, tax: r2(bandTax) });
    total += bandTax; start = upTo;
  }
  return { tax: Math.floor(total), effective: Math.round((total / price) * 10000) / 100, bands, firstRelief: first, lostRelief: buyer === 'first' && !first };
}
