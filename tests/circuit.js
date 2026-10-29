/* =====================================================================
   tests/circuit.js — test automatique des 2 applis badminton (élève + prof)
   À lancer avant chaque mise en ligne. Classe fictive, aucune vraie donnée.

   Préparer (une fois) : npm i playwright   (ou playwright déjà installé)
   Servir le dossier qui contient les dépôts côte à côte (badminton-eleves, badminton-prof) :
       python3 -m http.server 8810
   Lancer depuis ce même dossier :
       node badminton-prof/tests/circuit.js
   Options : BASE=http://localhost:8810   COMMUN=chemin de mon-eps/atelier/ecran-de-cours/commun
   Sortie : une ligne OK / ÉCHEC par vérification ; code de sortie 1 s'il y a un échec.
   ===================================================================== */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = (process.env.BASE || 'http://localhost:8810').replace(/\/$/, '');
const RACINE = path.resolve(__dirname, '..', '..');
const ELEVE = BASE + '/badminton-eleves/', PROF = BASE + '/badminton-prof/';
let echecs = 0;
const ok = (nom, cond, detail) => { console.log((cond ? 'OK     ' : 'ÉCHEC  ') + nom + (detail != null ? '  (' + detail + ')' : '')); if (!cond) echecs++; };
const md5 = f => { try { return crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'); } catch (e) { return null; } };

(async () => {
  /* ---------- 0. Fichiers partagés : copies identiques ---------- */
  for (const f of ['logique.js', 'scan.js', 'donnees.js', 'qrcode.js', 'jsqr.js', 'eps-aide.js', 'eps-charte-v1.css']) {
    const a = md5(path.join(RACINE, 'badminton-eleves', f)), b = md5(path.join(RACINE, 'badminton-prof', f));
    ok('Même ' + f + ' dans les deux dépôts', a && a === b);
  }
  const COMMUN = process.env.COMMUN || path.join(RACINE, 'mon-eps', 'atelier', 'ecran-de-cours', 'commun');
  if (fs.existsSync(COMMUN)) for (const f of ['eps-aide.js', 'eps-charte-v1.css'])
    ok(f + ' = version du portail (mon-eps)', md5(path.join(COMMUN, f)) === md5(path.join(RACINE, 'badminton-eleves', f)));
  // Chaque fichier listé dans les service workers existe (sinon l'appli ne s'installe pas hors ligne)
  for (const r of ['badminton-eleves', 'badminton-prof']) {
    const sw = fs.readFileSync(path.join(RACINE, r, 'sw.js'), 'utf8');
    const L = [...sw.matchAll(/'([^']+\.(?:html|js|css|png|jpg|woff2|webmanifest))'/g)].map(m => m[1]);
    const manque = L.filter(f => !fs.existsSync(path.join(RACINE, r, f)));
    ok(r + ' : fichiers du hors ligne présents (' + L.length + ')', !manque.length, manque.join(', ') || null);
  }

  const b = await chromium.launch(); const erreurs = [], externes = new Set();
  const page = async (ctx, u) => { const p = await ctx.newPage(); p.on('pageerror', e => erreurs.push(u + ' : ' + e.message)); p.on('dialog', d => d.accept()); p.on('request', r => { const h = new URL(r.url()).host; if (h !== new URL(BASE).host && !/^(data|blob):/.test(r.url())) externes.add(h); }); await p.goto(u); await p.waitForTimeout(700); return p; };
  const ipad = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const tab = await b.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true });

  /* ---------- 1. Prof : liste de classe, QR de démarrage ---------- */
  const P = await page(ipad, PROF); await P.evaluate(() => localStorage.clear()); await P.reload(); await P.waitForTimeout(500);
  const C = await P.evaluate(async () => { await importerListe([], 'MARTIN Léa\nBERNARD Hugo\nPETIT Inès\nDURAND Tom\nLEROY Zoé\nGIRARD Max', '2DTEST'); return DB.classesL; });
  const cl = Object.keys(C)[0];
  ok('Liste collée importée', cl && C[cl].eleves.length === 6, cl);
  await P.evaluate(c => { DB.classe = c; sauver(); }, cl);
  const qrClasse = await P.evaluate(async c => { const L = DB.classesL[c]; return TTQR.encoder({ a: 'BDE', v: 1, t: 'C', c, l: L.eleves, u: '', k: await clePublique() }); }, cl);
  ok('QR de démarrage', /^BDE[01]:/.test(qrClasse));

  /* ---------- 2. Élève : groupe, étoile, exercice, poule de 4 au temps, analyse, 15 min ---------- */
  const E = await page(tab, ELEVE); await E.evaluate(() => localStorage.clear()); await E.reload(); await E.waitForTimeout(500);
  await E.evaluate(async t => { recevoirClasse(await TTQR.decoder(t)); }, qrClasse);
  await E.waitForTimeout(400); await E.evaluate(() => { fermer(); });
  await E.evaluate(async c => { await nouveauGroupe(c, '1234'); }, cl);
  await E.evaluate(() => { const L = S.cfg.eleves; S.eleves = [{ id: 'e1', nom: L[0] }, { id: 'e2', nom: L[1] }]; S.classe = S.cfg.classe; S.seance = 9; S.tab = 'seance'; sauver(); rendre(); });
  ok('Groupe créé et carnet chiffré', await E.evaluate(() => { const g = Object.values(ROOT.groupes)[0]; return !!(g && g.data && !g.clair); }));
  await E.evaluate(() => { const r = rec('e1', 9); r.etoile = { strat: 1, cont: 2, diff: 3, eng: 2, ana: 1, coach: 3, arb: 2 }; r.axes = ['strat', 'ana']; r.exos = [{ slot: 0, ex: '1', niv: 3, rq: '', obs: 'Professeur' }]; r.g15 = { duo: 'dégagés en diagonale', duel: '2 matchs en 5 points' }; touche(r); rendre(); });
  ok('Image et vidéo de l’exercice 1', await E.evaluate(() => !!document.querySelector('.illus img[src="img/ex1.jpg"]') && !!VID.ex['1']));
  ok('Bandeau « vidéo à vérifier »', await E.locator('.vverif').count() > 0);
  ok('Gestion des 15 min affichée en séance 9', await E.locator('[data-ch="g15"]').count() === 2);
  await E.evaluate(() => { S.tab = 'poule'; rendre(); });
  ok('Plus de bascule « rencontre de binômes »', await E.locator('[data-act="ptype"]').count() === 0);
  ok('Format proposé en séance 9 : 4 min', await E.locator('#p-fmt').inputValue() === 't4');
  const noms = await E.evaluate(() => S.cfg.eleves.slice(0, 4));
  const sels = E.locator('select.pj');
  if (await sels.count() < 4) await E.click('[data-act="pplus"]');
  for (let i = 0; i < 4; i++) await E.locator('select.pj').nth(i).selectOption({ label: noms[i] });
  await E.click('[data-act="pcreer"]'); await E.waitForTimeout(200);
  ok('Poule de 4 : 6 matchs', await E.locator('.match').count() === 6);
  const scores = [[8, 5], [6, 9], [7, 7], [10, 4], [5, 8], [9, 6]];
  for (let i = 0; i < 6; i++) { await E.fill(`input[data-m="${i}"][data-s="0"][data-c="0"]`, String(scores[i][0])); await E.fill(`input[data-m="${i}"][data-s="0"][data-c="1"]`, String(scores[i][1])); }
  await E.waitForTimeout(200);
  ok('Classement : victoire 3, nul 2, défaite 1', await E.evaluate(() => { const P = S.poules[pk()], C = TTL.classement(4, P.matchs, P.fmt); return C.reduce((a, c) => a + c.pts, 0) === 24 && C.some(c => c.nl === 1); }));
  await E.click('[data-act="analyse"][data-m="0"]'); await E.waitForTimeout(150);
  await E.fill('textarea[data-ch="an"][data-j="0"][data-k="st"]', 'attaquant, revers faible');
  await E.fill('textarea[data-ch="an"][data-j="0"][data-k="str"]', 'jouer sur son revers');
  await E.fill('textarea[data-ch="an"][data-j="0"][data-k="apr"]', 'plus court à la mi-temps');
  await E.click('[data-act="fermerRendre"]');
  ok('Analyse du match enregistrée', await E.evaluate(() => S.poules[pk()].matchs[0].an[0].str === 'jouer sur son revers'));
  // tableau de marque au temps : temps mort à la mi-temps
  await E.click('[data-act="marque"][data-m="1"]'); await E.click('[data-act="mqservice"][data-v="a"]');
  await E.evaluate(() => { S.poules[pk()].matchs[MQ.i].live.fin = Date.now() + 110000; }); await E.waitForTimeout(900);
  ok('Temps mort automatique à 2 min', await E.locator('#tm').count() === 1);
  await E.click('[data-act="tmfermer"]'); await E.click('[data-act="mqfermer"]');
  // rouvrir un match terminé au tableau de marque efface son score : on le ressaisit
  await E.fill('input[data-m="1"][data-s="0"][data-c="0"]', '6'); await E.fill('input[data-m="1"][data-s="0"][data-c="1"]', '9'); await E.waitForTimeout(150);
  const fichiers = await E.evaluate(() => fichiers(9).map(f => JSON.stringify(f.o)));
  const qrs = await E.evaluate(async () => { QRS = null; await montrerQR(0); const t = QRS.map(q => q.txt); fermer(); return t; });
  ok('Fichiers de fin de séance', fichiers.length >= 2, fichiers.length);
  ok('QR codes de fin de séance', qrs.length >= 3, qrs.length);
  ok('Aucun QR trop gros', await E.evaluate(q => q.every(t => { try { const x = qrcode(0, 'L'); x.addData(t, 'Byte'); x.make(); return true } catch (e) { return false } }), qrs));

  /* ---------- 3. Prof : import QR puis fichiers, tournoi, note ---------- */
  const imp = await P.evaluate(async q => { const out = []; for (const t of q) out.push(importerQR(await TTQR.decoder(t))); sauver(); return out; }, qrs);
  ok('Import des QR', imp.length === qrs.length, imp.join(' | '));
  await P.evaluate(F => { F.forEach(t => importerObjet(JSON.parse(t))); sauver(); }, fichiers);
  ok('Poule reconstruite (6 matchs, analyse lue)', await P.evaluate(() => { const p = poulesClasse()[0]; return p && p.matchs.length === 6 && p.matchs[0].an && p.matchs[0].an[0].str === 'jouer sur son revers'; }));
  ok('Gestion des 15 min lue', await P.evaluate(() => recsClasse().some(r => r.g15 && r.g15.duo === 'dégagés en diagonale')));
  for (const v of ['appel', 'tournoi', 'eleves', 'pilotage', 'note', 'export', 'classes', 'import']) {
    await P.click(`[data-act="vue"][data-v="${v}"]`); await P.waitForTimeout(150);
  }
  await P.click('[data-act="vue"][data-v="note"]');
  const N = await P.evaluate(() => { const p = poulesClasse()[0], m0 = p.matchs[0], k = cleEleve(p.classe, p.joueurs[m0.a]); const C = cfgNote(); C.el[k] = { rep: '4/4', a1: 3, p1: 1, a2: 2, a3: 4, p3: 0 }; const n = noteEleve(k, resultatsPoules(), C); return { j: n.M.j, an: n.M.an.length, tot: n.tot }; });
  ok('Matchs de l’épreuve lus (3 par élève)', N.j === 3, JSON.stringify(N));
  ok('Analyse comptée dans la note', N.an === 1);
  ok('Calcul GAREEPS : 9 + 1,5 + 3 = 13,5', N.tot === 13.5, N.tot);
  await P.click('[data-act="saisierapide"]'); await P.waitForTimeout(200);
  ok('Saisie rapide avec la grille', await P.locator('.sr-b .sr-txt').count() >= 12);
  await P.click('[data-sr="fermer"]');
  const csv = await P.evaluate(() => { let t = ''; const old = telecharger; telecharger = (n, x) => { t = x; }; exporterNotes(); telecharger = old; return t; });
  ok('Export CSV des notes', /Matchs analysés/.test(csv) && csv.split('\n').length >= 6);
  ok('Aucun envoi vers un autre site pendant le circuit', !externes.size, [...externes].join(', ') || null);

  /* ---------- 4. Démos, mode d'emploi, hors ligne, affichage ---------- */
  for (const [u, nom] of [[ELEVE + '?demo', 'élève'], [PROF + '?demo', 'prof']]) {
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } }); const p = await page(ctx, u);
    ok('Démo ' + nom, await p.locator('.demo-bandeau').count() === 1);
    await p.click('.baide'); await p.waitForTimeout(200);
    ok('Mode d’emploi ' + nom, await p.locator('.epsa-fen').count() === 1);
    await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(2000);
    await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(800);
    ok('Hors ligne ' + nom, /Badminton/.test(await p.locator('.barre').innerText()));
    await ctx.close();
  }
  for (const [w, h, nom] of [[390, 844, 'téléphone'], [1180, 820, 'iPad paysage'], [1340, 800, 'Galaxy Tab paysage'], [800, 1280, 'Galaxy Tab portrait']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    for (const u of [ELEVE + '?demo', PROF + '?demo']) { const p = await page(ctx, u); ok('Pas de débordement ' + nom + ' ' + (u.includes('prof') ? 'prof' : 'élève'), !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))); }
    await ctx.close();
  }
  ok('Aucune erreur JavaScript', !erreurs.length, erreurs.slice(0, 3).join(' | ') || null);
  await b.close();
  console.log(echecs ? `\n${echecs} échec(s).` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
