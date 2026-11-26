import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/germany.js';

test('Tarif 2026: Zonengrenzen stetig', () => {
  assert.equal(d.tarif2026(12348), 0);
  assert.equal(d.tarif2026(17799), 1034);
  assert.equal(d.tarif2026(32271), 4866);
  assert.equal(d.tarif2026(69878), 18213);
  assert.equal(d.tarif2026(69879), 18213);
  assert.equal(d.tarif2026(277825), 105550);
  assert.equal(d.tarif2026(300000), 115529);
});
test('Brutto-Netto 3.500 € Steuerklasse I, kinderlos (veröffentlichtes Beispiel: 405,50 € Lohnsteuer)', () => {
  const r = d.bruttoNetto({ brutto: 3500 });
  assert.equal(r.vorsorgepauschale, 8463);
  assert.equal(r.zvE, 32271);
  assert.equal(r.lohnsteuer, 405.5);
  assert.deepEqual([r.rv, r.av, r.kv, r.pv, r.sv], [325.5, 45.5, 306.25, 84, 761.25]);
  assert.equal(r.soli, 0);
  assert.equal(r.netto, 2333.25);
});
test('Steuerklassen: III niedriger, V höher, VI am höchsten; II mit Entlastungsbetrag', () => {
  const k = (s, extra = {}) => d.bruttoNetto({ brutto: 3500, stkl: s, ...extra }).lohnsteuer;
  assert.ok(k(3) < k(2) && k(2) < k(1) && k(1) === k(4) && k(4) < k(5) && k(5) < k(6));
  assert.equal(d.bruttoNetto({ brutto: 1400 }).lohnsteuer, 0);
});
test('Beitragsbemessungsgrenzen, Soli und Kirchensteuer', () => {
  const r = d.bruttoNetto({ brutto: 10000, kirche: true, land: 'by' });
  assert.equal(r.rv, 785.85);
  assert.equal(r.kv, 508.59);
  assert.ok(r.soli > 0);
  assert.equal(r.kist, Math.floor((r.lstJahr * 8) / 12) / 100);
  assert.equal(d.bruttoNetto({ brutto: 5000 }).soli, 0);
  const mitKind = d.bruttoNetto({ brutto: 4000, kinderlos: false, pvKinder: 2, kfb: 2, kirche: true });
  const ohneKind = d.bruttoNetto({ brutto: 4000, kirche: true });
  assert.equal(mitKind.pv, 62);
  assert.ok(mitKind.kist < ohneKind.kist && mitKind.netto > ohneKind.netto);
  assert.equal(d.bruttoNetto({ brutto: 3000, land: 'sn', kinderlos: false }).pv, 69);
});
test('Teilzeit und Firmenwagen', () => {
  const t = d.teilzeit({ brutto: 4000, stundenVoll: 40, stundenTeil: 30, tageTeil: 4 });
  assert.deepEqual([t.quote, t.teil.brutto, t.urlaub], [75, 3000, 24]);
  assert.ok(t.nettoQuote > 75);
  const f = d.firmenwagen({ brutto: 4000, listenpreis: 45990, km: 20 });
  assert.deepEqual([f.basis, f.privat, f.arbeitsweg, f.vorteil], [45900, 459, 275.4, 734.4]);
  assert.ok(f.kosten > 0 && f.kosten < f.vorteil);
  assert.equal(d.firmenwagen({ brutto: 4000, listenpreis: 60000, satz: 0.25 }).privat, 150);
});

test('Arbeitslosengeld: 3.000 € brutto, Steuerklasse I', () => {
  const a = d.arbeitslosengeld({ brutto: 3000 });
  assert.deepEqual([a.bemessungsentgelt, a.sv, a.soli, a.satz, a.dauer], [98.63, 19.73, 0, 60, 12]);
  assert.deepEqual([a.lohnsteuer, a.leistungsentgelt, a.tag, a.monat], [9.64, 69.26, 41.56, 1246.8]);
  assert.equal(d.arbeitslosengeld({ brutto: 3500 }).lohnsteuer, 13.33);
  assert.equal(d.arbeitslosengeld({ brutto: 3000, kind: true }).satz, 67);
  assert.equal(d.arbeitslosengeld({ brutto: 12000 }).bemessungsentgelt, 277.81);
  assert.deepEqual([d.algDauer(40, 11), d.algDauer(40, 12), d.algDauer(40, 20), d.algDauer(45, 60), d.algDauer(50, 30), d.algDauer(56, 40), d.algDauer(60, 48)], [0, 6, 10, 12, 15, 18, 24]);
});
test('Elterngeld: Ersatzrate, Grenzen und Zuschläge', () => {
  assert.deepEqual([d.ersatzrate(2000), d.ersatzrate(1240), d.ersatzrate(1220), d.ersatzrate(1100), d.ersatzrate(800), d.ersatzrate(300)], [65, 65, 66, 67, 77, 100]);
  const e = d.elterngeld({ brutto: 3500 });
  assert.equal(e.rate, 65);
  assert.equal(e.basis, Math.round(e.netto * 65) / 100);
  assert.equal(e.plus, Math.round(e.basis * 50) / 100);
  assert.equal(d.elterngeld({ brutto: 9000 }).basis, 1800);
  assert.deepEqual([d.elterngeld({ brutto: 0 }).basis, d.elterngeld({ brutto: 0 }).plus], [300, 150]);
  const g = d.elterngeld({ brutto: 0, geschwister: true, mehrlinge: 2 });
  assert.deepEqual([g.bonus, g.zuschlag, g.basis], [75, 300, 675]);
  assert.equal(d.elterngeld({ brutto: 6000, zvE: 180000 }).basis, 0);
});

test('English interface matches the German one', () => {
  const r = d.germanNetSalary({ gross: 3500 });
  assert.deepEqual([r.net, r.wageTax, r.socialSecurity, r.solidaritySurcharge], [2333.25, 405.5, 761.25, 0]);
  assert.throws(() => d.germanNetSalary({ gross: 0 }), RangeError);
});
