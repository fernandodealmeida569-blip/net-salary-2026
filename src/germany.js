// Lohnsteuer und Sozialversicherung Deutschland 2026, nach dem Programmablaufplan des BMF (Stand 12.11.2025).
// Vereinfachungen: gesetzlich versichert, keine Freibeträge aus ELStAM, kein Faktorverfahren, keine sonstigen Bezüge.
const cent = (v) => Math.round(Number((v * 100).toFixed(6))) / 100;
const abCent = (v) => Math.floor(Number((v * 100).toFixed(6))) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);

export const LST_2026 = {
  gfb: 12348, z2: 17799, z3: 69878, z4: 277825,
  anp: 1230, sap: 36, efa: 4260, kfb: 9756,
  w1: 14071, w2: 34939, w3: 222260,
  solzfrei: 20350, solz: 5.5, solzMilderung: 11.9,
  bbgRV: 101400, bbgKV: 69750,
  rv: 9.3, av: 1.3, kv: 7.3, kvVorsorge: 7.0, zusatz: 2.9, pv: 1.8, pvSachsen: 2.3, pvKinderlos: 0.6, pvAbschlag: 0.25, vspHoechst: 1900,
  kist: { by: 8, bw: 8 }, kistStandard: 9,
};
const P = LST_2026;

// Einkommensteuertarif § 32a EStG 2026 (Grundtarif), zvE und Steuer auf volle Euro abgerundet
export function tarif2026(zvE) {
  const x = Math.floor(zvE);
  if (x <= P.gfb) return 0;
  if (x <= P.z2) { const y = (x - P.gfb) / 10000; return Math.floor((914.51 * y + 1400) * y); }
  if (x <= P.z3) { const z = (x - P.z2) / 10000; return Math.floor((173.1 * z + 2397) * z + 1034.87); }
  if (x <= P.z4) return Math.floor(0.42 * x - 11135.63);
  return Math.floor(0.45 * x - 19470.38);
}
const splitting = (zvE) => 2 * tarif2026(Math.floor(zvE) / 2);
const up56 = (zx) => Math.max(Math.floor(zx * 0.14), (tarif2026(zx * 1.25) - tarif2026(zx * 0.75)) * 2);
function tarif56(x) {
  x = Math.floor(x);
  if (x <= 0) return 0;
  if (x > P.w2) {
    const st = up56(P.w2);
    return x > P.w3 ? Math.floor(st + (P.w3 - P.w2) * 0.42 + (x - P.w3) * 0.45) : Math.floor(st + (x - P.w2) * 0.42);
  }
  const st = up56(x);
  return x > P.w1 ? Math.min(st, Math.floor(up56(P.w1) + (x - P.w1) * 0.42)) : st;
}
const jahressteuer = (stkl, zvE) => (zvE <= 0 ? 0 : stkl === 3 ? splitting(zvE) : stkl >= 5 ? tarif56(zvE) : tarif2026(zvE));

function pvSatz({ kinderlos, pvKinder, land }) {
  const basis = land === 'sn' ? P.pvSachsen : P.pv;
  return basis + (kinderlos ? P.pvKinderlos : 0) - (kinderlos ? 0 : Math.min(4, Math.max(0, (pvKinder || 0) - 1)) * P.pvAbschlag);
}

// brutto: Monatsbrutto (laufender Arbeitslohn). stkl 1–6. kfb: Zahl der Kinderfreibeträge (z. B. 0,5 · 1 · 2).
export function bruttoNetto({ brutto, stkl = 1, kfb = 0, kinderlos = true, pvKinder = 0, kirche = false, land = '', zusatz = P.zusatz }) {
  brutto = num(brutto); stkl = Math.round(num(stkl)); kfb = num(kfb) || 0; zusatz = Number.isFinite(num(zusatz)) ? num(zusatz) : P.zusatz;
  if (!(brutto > 0) || !(stkl >= 1 && stkl <= 6) || !(zusatz >= 0 && zusatz <= 6)) throw new RangeError('invalid input');
  const jahr = brutto * 12;
  const pvs = pvSatz({ kinderlos, pvKinder, land });
  const kvs = P.kv + zusatz / 2;
  // Sozialversicherung (Arbeitnehmeranteil, pro Monat)
  const bRV = Math.min(brutto, P.bbgRV / 12), bKV = Math.min(brutto, P.bbgKV / 12);
  const rv = cent((bRV * P.rv) / 100), av = cent((bRV * P.av) / 100), kv = cent((bKV * kvs) / 100), pv = cent((bKV * pvs) / 100);
  // Vorsorgepauschale (Jahr)
  const vRV = (Math.min(jahr, P.bbgRV) * P.rv) / 100;
  const vKVPV = (Math.min(jahr, P.bbgKV) * (P.kvVorsorge + zusatz / 2 + pvs)) / 100; // ermäßigter Satz: ohne Krankengeldanteil
  const vALV = (Math.min(jahr, P.bbgRV) * P.av) / 100;
  const vsp = Math.ceil(Number((vRV + Math.max(vKVPV, Math.min(P.vspHoechst, vKVPV + vALV))).toFixed(6)));
  const frei = (stkl === 6 ? 0 : P.anp + P.sap) + (stkl === 2 ? P.efa : 0);
  const zvE = Math.max(0, Math.floor(jahr - frei - vsp));
  const lstJahr = jahressteuer(stkl, zvE);
  // Bemessungsgrundlage für Soli und Kirchensteuer: mit Kinderfreibeträgen
  const kfbBetrag = stkl >= 5 ? 0 : kfb * (stkl === 4 ? P.kfb / 2 : P.kfb);
  const jbmg = kfbBetrag ? jahressteuer(stkl, Math.max(0, zvE - kfbBetrag)) : lstJahr;
  const frg = P.solzfrei * (stkl === 3 ? 2 : 1);
  const soliJahr = jbmg > frg ? Math.min((jbmg * P.solz) / 100, ((jbmg - frg) * P.solzMilderung) / 100) : 0;
  const kistSatz = P.kist[land] || P.kistStandard;
  const lohnsteuer = abCent(lstJahr / 12), soli = abCent(soliJahr / 12), kist = kirche ? abCent((jbmg * kistSatz) / 100 / 12) : 0;
  const sv = cent(rv + av + kv + pv), steuern = cent(lohnsteuer + soli + kist);
  const netto = cent(brutto - sv - steuern);
  return {
    brutto: cent(brutto), netto, nettoJahr: cent(netto * 12), lohnsteuer, soli, kist, kistSatz, steuern, rv, av, kv, pv, sv,
    vorsorgepauschale: vsp, zvE, lstJahr, soliJahr, kistJahr: kirche ? (jbmg * kistSatz) / 100 : 0, abzuegePct: Math.round(((brutto - netto) / brutto) * 1000) / 10,
    arbeitgeber: cent(brutto + cent((bRV * (P.rv + P.av)) / 100) + cent((bKV * (kvs + (land === 'sn' ? 1.3 : P.pv))) / 100)),
  };
}

// Teilzeit: Vergleich Vollzeit ↔ Teilzeit (gleiche persönliche Daten), mit Urlaubsanspruch nach Arbeitstagen
export function teilzeit({ brutto, stundenVoll = 40, stundenTeil, tageVoll = 5, tageTeil, urlaubVoll = 30, ...person }) {
  brutto = num(brutto); stundenVoll = num(stundenVoll); stundenTeil = num(stundenTeil); tageVoll = num(tageVoll) || 5; tageTeil = num(tageTeil) || tageVoll; urlaubVoll = num(urlaubVoll) || 30;
  if (!(brutto > 0) || !(stundenVoll > 0) || !(stundenTeil > 0) || stundenTeil > stundenVoll || !(tageTeil >= 1 && tageTeil <= 7)) throw new RangeError('invalid input');
  const quote = stundenTeil / stundenVoll;
  const voll = bruttoNetto({ brutto, ...person });
  const teil = bruttoNetto({ brutto: cent(brutto * quote), ...person });
  return {
    quote: Math.round(quote * 1000) / 10, voll, teil, bruttoDiff: cent(voll.brutto - teil.brutto), nettoDiff: cent(voll.netto - teil.netto),
    nettoQuote: Math.round((teil.netto / voll.netto) * 1000) / 10, urlaub: Math.round(((urlaubVoll * tageTeil) / tageVoll) * 100) / 100,
    stundenlohnNetto: [cent(voll.netto / ((stundenVoll * 13) / 3)), cent(teil.netto / ((stundenTeil * 13) / 3))],
  };
}

// Firmenwagen: geldwerter Vorteil (Listenpreis auf volle 100 € abgerundet) und Wirkung auf das Netto
export function firmenwagen({ brutto, listenpreis, satz = 1, km = 0, zuzahlung = 0, ...person }) {
  brutto = num(brutto); listenpreis = num(listenpreis); satz = num(satz); km = num(km) || 0; zuzahlung = num(zuzahlung) || 0;
  if (!(brutto > 0) || !(listenpreis > 0) || ![1, 0.5, 0.25].includes(satz) || !(km >= 0)) throw new RangeError('invalid input');
  const basis = Math.floor(listenpreis / 100) * 100;
  const privat = cent((basis * satz) / 100);
  const arbeitsweg = cent((basis * satz * 0.03 * km) / 100);
  const vorteil = Math.max(0, cent(privat + arbeitsweg - zuzahlung));
  const ohne = bruttoNetto({ brutto, ...person });
  const mit = bruttoNetto({ brutto: brutto + vorteil, ...person });
  const auszahlung = cent(mit.netto - vorteil - zuzahlung);
  return { basis, privat, arbeitsweg, vorteil, ohne, mit, auszahlung, kosten: cent(ohne.netto - auszahlung) };
}

// ---------------------------------------------------------------------------
// Arbeitslosengeld I (§§ 147, 149–153 SGB III), Werte 2026
// Lohnsteuer nach der Lohnsteuertabelle des Jahres (PAP), mit durchschnittlichem Zusatzbeitrag; ohne Kind mit Pflege-Zuschlag.
// Abgeglichen mit veröffentlichten Beispielen 2026 (3.000 € brutto, Klasse I: 9,64 € Lohnsteuer pro Tag, 1.246,80 € im Monat).
// Ergebnis ist eine Schätzung; maßgeblich ist der Bescheid der Agentur für Arbeit.
// ---------------------------------------------------------------------------
export const ALG_2026 = { svPauschale: 20, satz: 60, satzKind: 67, tage: 30 };
export function algDauer(alter, monate) {
  alter = num(alter) || 0; monate = num(monate) || 0;
  if (monate < 12) return 0;
  if (alter >= 58 && monate >= 48) return 24;
  if (alter >= 55 && monate >= 36) return 18;
  if (alter >= 50 && monate >= 30) return 15;
  return monate >= 24 ? 12 : monate >= 20 ? 10 : monate >= 16 ? 8 : 6;
}
export function arbeitslosengeld({ brutto, stkl = 1, kind = false, alter = 40, monate = 24 }) {
  brutto = num(brutto);
  if (!(brutto > 0)) throw new RangeError('invalid input');
  const be = Math.min((brutto * 12) / 365, P.bbgRV / 365); // Bemessungsentgelt pro Tag
  const st = bruttoNetto({ brutto: (be * 365) / 12, stkl, kinderlos: !kind, pvKinder: 0, zusatz: P.zusatz });
  const sv = cent((be * ALG_2026.svPauschale) / 100), lst = cent(st.lstJahr / 365), soli = cent(st.soliJahr / 365);
  const le = cent(cent(be) - sv - lst - soli);
  const satz = kind ? ALG_2026.satzKind : ALG_2026.satz;
  const tag = cent((le * satz) / 100);
  const dauer = algDauer(alter, monate);
  return { bemessungsentgelt: cent(be), sv, lohnsteuer: lst, soli, leistungsentgelt: le, satz, tag, monat: cent(tag * ALG_2026.tage), dauer, gesamt: cent(tag * ALG_2026.tage * dauer), gekappt: (brutto * 12) / 365 > P.bbgRV / 365, nettoVorher: bruttoNetto({ brutto, stkl, kinderlos: !kind }).netto };
}

// ---------------------------------------------------------------------------
// Elterngeld (BEEG §§ 2–2f): Schätzung für Arbeitnehmer ohne Einkommen während des Bezugs
// ---------------------------------------------------------------------------
export const ELTERNGELD = { min: 300, max: 1800, nettoMax: 2770, sv: 21, kist: 8, geschwisterMin: 75, mehrling: 300, grenze: 175000 };
export function ersatzrate(netto) {
  if (netto >= 1240) return 65;
  if (netto > 1200) return Math.round((67 - ((netto - 1200) / 2) * 0.1) * 100) / 100;
  if (netto >= 1000) return 67;
  return Math.min(100, Math.round((67 + ((1000 - netto) / 2) * 0.1) * 100) / 100);
}
export function elterngeld({ brutto, stkl = 1, kirche = false, geschwister = false, mehrlinge = 1, zvE = 0 }) {
  brutto = num(brutto); mehrlinge = Math.max(1, Math.round(num(mehrlinge) || 1));
  if (!(brutto >= 0)) throw new RangeError('invalid input');
  const E = ELTERNGELD;
  const wk = Math.min(brutto, P.anp / 12);
  const st = brutto > 0 ? bruttoNetto({ brutto, stkl, kinderlos: false, pvKinder: 0, kirche, land: 'by', zusatz: P.zusatz }) : { lohnsteuer: 0, soli: 0, kist: 0 };
  const steuern = cent(st.lohnsteuer + st.soli + st.kist);
  const sv = cent((Math.min(brutto, P.bbgRV / 12) * E.sv) / 100);
  const netto = Math.max(0, cent(brutto - wk - steuern - sv));
  const basisNetto = Math.min(netto, E.nettoMax);
  const rate = ersatzrate(basisNetto);
  const kein = num(zvE) > E.grenze;
  const basis0 = kein ? 0 : Math.min(E.max, Math.max(E.min, cent((basisNetto * rate) / 100)));
  const bonus = !kein && geschwister ? Math.max(E.geschwisterMin, cent(basis0 * 0.1)) : 0;
  const zuschlag = kein ? 0 : (mehrlinge - 1) * E.mehrling;
  const basis = cent(basis0 + bonus + zuschlag);
  const plus = kein ? 0 : cent(Math.max(E.min / 2, basis0 / 2) + bonus / 2 + zuschlag / 2);
  return { netto, steuern, sv, werbungskosten: cent(wk), rate, basisOhne: basis0, bonus, zuschlag, basis, plus, summe12: cent(basis * 12), summe14: cent(basis * 14), keinAnspruch: kein };
}

// English interface for the monthly payroll calculation.
// taxClass 1–6 (Steuerklasse), childAllowances (Kinderfreibeträge, e.g. 0.5, 1, 2),
// state: two-letter code of the federal state ('by', 'be', 'nw', 'sn' …), extraContribution: health insurer Zusatzbeitrag in %.
export function germanNetSalary({ gross, taxClass = 1, childAllowances = 0, childless = true, childrenUnder25 = 0, churchTax = false, state = '', extraContribution = P.zusatz }) {
  const r = bruttoNetto({ brutto: gross, stkl: taxClass, kfb: childAllowances, kinderlos: childless, pvKinder: childrenUnder25, kirche: churchTax, land: state, zusatz: extraContribution });
  return {
    gross: r.brutto, net: r.netto, netYear: r.nettoJahr,
    wageTax: r.lohnsteuer, solidaritySurcharge: r.soli, churchTax: r.kist, taxes: r.steuern,
    pensionInsurance: r.rv, unemploymentInsurance: r.av, healthInsurance: r.kv, careInsurance: r.pv, socialSecurity: r.sv,
    deductionsPct: r.abzuegePct, employerCost: r.arbeitgeber, taxableIncomeYear: r.zvE,
  };
}
