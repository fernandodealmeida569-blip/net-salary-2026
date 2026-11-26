# net-salary-2026

Net salary after tax for **Germany** (Brutto → Netto, Lohnsteuer 2026) and the **United Kingdom** (take-home pay 2026/27 and Stamp Duty Land Tax), in plain JavaScript with zero dependencies.

- Germany: implements the official 2026 wage tax flowchart (Programmablaufplan) of the Federal Ministry of Finance: all six tax classes, solidarity surcharge, church tax by state, pension, health, long-term care and unemployment insurance with the 2026 contribution ceilings.
- UK: income tax for England, Wales and Northern Ireland, National Insurance, student loans (Plans 1, 2, 4, 5 and Postgraduate), pension under a net pay arrangement, and Stamp Duty Land Tax including first-time buyer relief.
- Tested against published examples (for instance €3,500 gross in class I gives €405.50 wage tax and €2,333.25 net).

Live calculators built on this code:

| Calculator | Language |
| --- | --- |
| [German salary calculator](https://calkoro.com/en/german-salary-calculator/) | English |
| [Brutto-Netto-Rechner](https://calkoro.com/de/brutto-netto-rechner/) | German |
| [UK salary calculator](https://calkoro.com/uk/salary-calculator/) | English (UK) |
| [Stamp Duty calculator](https://calkoro.com/uk/stamp-duty-calculator/) | English (UK) |

## Usage

Requires Node.js 18 or later, or any modern browser (ES modules).

```js
import { germanNetSalary, ukTakeHome, sdlt } from './index.js';

germanNetSalary({ gross: 5000 });
// { net: 3130.09, wageTax: 782.41, socialSecurity: 1087.5, ... } per month

ukTakeHome({ salary: 30000 });
// { tax: 3486, ni: 1394.4, net: 25119.6, monthly: 2093.3, ... } per year

sdlt({ price: 295000 });
// { tax: 4750, bands: [...], ... }
```

Run `node examples/demo.js` for more examples and `npm test` for the tests.

### `germanNetSalary(options)` – monthly figures in euros

| Option | Default | Meaning |
| --- | --- | --- |
| `gross` | required | Monthly gross salary (Monatsbrutto) |
| `taxClass` | `1` | Tax class 1–6 (Steuerklasse) |
| `childAllowances` | `0` | Child allowances on the tax card (Kinderfreibeträge: 0.5, 1, 1.5 …) |
| `childless` | `true` | Childless surcharge on long-term care insurance (from age 23) |
| `childrenUnder25` | `0` | Children under 25, for the care insurance discount from the second child |
| `churchTax` | `false` | Registered member of a church that levies church tax |
| `state` | `''` | Federal state code: `bw`, `by`, `be`, `bb`, `hb`, `hh`, `he`, `mv`, `ni`, `nw`, `rp`, `sl`, `sn`, `st`, `sh`, `th` |
| `extraContribution` | `2.9` | Health insurer's extra contribution (Zusatzbeitrag) in % |

The German-named function `bruttoNetto()` returns the same result with the field names used on a German payslip, plus the intermediate values (Vorsorgepauschale, zvE). The module also exports `teilzeit()` (part-time comparison), `firmenwagen()` (company car benefit), `arbeitslosengeld()` (unemployment benefit) and `elterngeld()` (parental allowance).

### `ukTakeHome(options)` – yearly figures in pounds

| Option | Default | Meaning |
| --- | --- | --- |
| `salary` | required | Annual gross salary |
| `pensionPct` | `0` | Employee pension contribution in % (net pay arrangement) |
| `plan` | `''` | Student loan: `plan1`, `plan2`, `plan4` or `plan5` |
| `postgrad` | `false` | Postgraduate Loan |

### `sdlt(options)`

`price`, `buyer` (`mover`, `first` or `additional`) and `nonResident` (`true` adds the 2% surcharge).

## Limitations

Statutory health insurance only, no individual allowances from ELStAM, no factor method for married couples, no one-off payments (13th salary, bonuses). Scottish income tax bands and Welsh Land Transaction Tax are not included. Results can differ from a payslip by a few cents to a few euros; this is not tax advice.

## Deutsch

Brutto-Netto-Berechnung 2026 nach dem Programmablaufplan des BMF, ohne Abhängigkeiten. Die Funktion `bruttoNetto({ brutto, stkl, kfb, kinderlos, pvKinder, kirche, land, zusatz })` liefert Lohnsteuer, Solidaritätszuschlag, Kirchensteuer und die Arbeitnehmeranteile zur Sozialversicherung pro Monat. Zum Ausprobieren: [Brutto-Netto-Rechner 2026](https://calkoro.com/de/brutto-netto-rechner/).

## Updates

Rates change every year: German figures in January, UK figures on 6 April. Each update keeps the tests against official examples. Issues and corrections are welcome.

## License

MIT © 2026 Fernando ([Calkoro](https://calkoro.com))
