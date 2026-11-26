import { germanNetSalary, ukTakeHome, sdlt } from '../index.js';

console.log('Germany, €3,500 a month, tax class I:', germanNetSalary({ gross: 3500 }));
console.log('Germany, €5,000 a month, class III, one child, church tax in Bavaria:',
  germanNetSalary({ gross: 5000, taxClass: 3, childAllowances: 1, childless: false, childrenUnder25: 1, churchTax: true, state: 'by' }));
console.log('UK, £35,000 a year, 5% pension, Plan 2 loan:', ukTakeHome({ salary: 35000, pensionPct: 5, plan: 'plan2' }));
console.log('UK Stamp Duty, £400,000, first-time buyer:', sdlt({ price: 400000, buyer: 'first' }));
