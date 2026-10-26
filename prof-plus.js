/* =====================================================================
   prof-plus.js — onglets Note et Pilotage, alertes, progression
   Barème : fiche « Évaluation EPS : badminton » du carnet GAREEPS
   (document « BAD cycle complet, dernière version », page 18) :
   au moins 3 matchs de 4 min contre des adversaires de niveau équivalent,
   projet annoncé avant le match, coach au temps mort à 2 min, arbitre élève.
   AFL1 /12 · AFL2 /2, 4 ou 6 · AFL3 /2, 4 ou 6 (4 degrés).
   ===================================================================== */
'use strict';
const r05=x=>Math.round(x*20)/20;               // arrondi au 0,05
const r2=x=>Math.round(x*100)/100;
const fr=x=>x==null||x===''||isNaN(x)?'–':String(r2(x)).replace('.',',');
const estEntier=x=>Number.isInteger(+x);

/* ---------- Grille GAREEPS (textes de la fiche, sans modification) ---------- */
const GRILLE={
  afl1:[{k:'t',lab:'Technique',d:['Fautes directes · Pas de coup fort · Service mise en jeu','1 coup efficace en CD ou en R · Service neutralisé','1 profil préférentiel (att ou def) et un coup fort pour chaque · Service varié gênant','Plusieurs profils selon adv et frappes efficaces · Service crée une situation favorable']},
        {k:'p',lab:'Projet',d:['Pas de projet ou illisible · 35 pts marqués à 2','1 projet basique : exploite pt faible adv ou son pt fort · 35 à 60 pts','Projet combine pts forts, pts faibles et contre des pts forts adv · 60 à 75 pts','Idem mais l’adapte au cours du match selon l’évolution du score · 75 pts et +']}],
  afl2:[{k:'c',lab:'Carnet',d:['Carnet absent · Investissement –','Carnet incomplet · Investissement =','Carnet complet · Investissement +','Carnet exact · Se surpasse ++']},
        {k:'r',lab:'Préparation, analyse',d:['Prépa et récup aléatoires · Pas d’analyse de force · Choix aléatoires','Prépa, récup stéréotypées · Repère pt fort ou faible · Choisis de travailler ce qu’il préfère','Prépa et récup adaptées au thème choisi · Repère profil jeu adv · Travaille ses pts faibles','Prépa récup adaptées : élève ressource · Repère et explique · Travaille selon besoin et projet de jeu']}],
  afl3:[{k:'c',lab:'Coach',d:['Coach peu attentif · Aucune interaction au sein du binôme','Attentif à son partenaire, l’encourage · Apporte des conseils simples','Attentif, l’encourage de façon constructive · Apporte des conseils pertinents','Attentif, l’encourage de façon constructive · Apporte des conseils avisés à ≠ moments']},
        {k:'s',lab:'Partenaire',d:['Pas disponible','Dispo pour renvoyer','Sparring efficace','Adapte encore l’exercice selon le niveau du joueur']},
        {k:'a',lab:'Arbitre',d:['Ne connaît pas les règles','Doute mais arbitre','Arbitre, gestes maîtrisés','Sûr, explique ses décisions']}]};
// Fourchettes par degré : 4 parts égales du barème (AFL1 /12 : 0–3, 3–6, 6–9, 9–12).
const fourchette=(max,d)=>[(d-1)*max/4,d*max/4];
const REPS={'6/2':[6,2],'4/4':[4,4],'2/6':[2,6]};
const POS=[[0,'bas'],[0.5,'milieu'],[1,'haut']];
// Repère « points marqués » de la fiche (ligne Projet) : moins de 35, 35 à 60, 60 à 75, 75 et plus.
// Pas utilisé dans les suggestions : en 3 matchs de 4 min, un élève marque 20 à 35 points, tout le monde serait en D1.
const reperePts=p=>p==null?null:p<35?1:p<60?2:p<75?3:4;

/* ---------- Réglages de la note, par classe ---------- */
function cfgNote(){
  DB.notes=DB.notes||{};const id=norm(DB.classe);
  const C=DB.notes[id]||(DB.notes[id]={seances:null,el:{}});
  if(!C.el)C.el={};return C;
}
// Matchs notés : par défaut la dernière séance jouée (tous ses tours), poules seulement.
function seancesNotees(C){
  if(C.seances&&C.seances.length)return C.seances;
  const K=[...new Set(poulesClasse().filter(p=>!p.rb).map(p=>p.seance))].sort((a,b)=>a-b);
  if(!K.length)return [];const der=Math.floor(K[K.length-1]);return K.filter(x=>Math.floor(x)===der);
}
// Matchs de l'épreuve pour un élève : joués, V-N-D, points marqués (simples des poules des séances notées)
function matchsEpreuve(k,R,C){
  const T=seancesNotees(C),x=R[k]||{},o={j:0,v:0,n:0,d:0,pts:0,contre:0,tours:[]};
  T.forEach(t=>{const c=x[t];if(!c||c.rencontre)return;o.tours.push(t);
    c.matchs.filter(m=>m.fini&&!m.dbl).forEach(m=>{o.j++;if(m.gagne)o.v++;else if(m.nul)o.n++;else o.d++})});
  // points marqués et encaissés, à partir des poules elles-mêmes
  poulesClasse().filter(p=>T.includes(p.seance)&&!p.rb).forEach(p=>p.matchs.forEach(m=>{if(m.dbl)return;const e=TTL.etatMatch(m,p.fmt);if(!e.fini)return;
    ['a','b'].forEach(c=>{if(cleEleve(p.classe,p.joueurs[m[c]])===k){o.pts+=c==='a'?e.pa:e.pb;o.contre+=c==='a'?e.pb:e.pa}})}));
  return o;
}

/* ---------- Calcul : pour chaque AFL, un degré et une place dans la fourchette (bas, milieu, haut) ---------- */
function noteAFL(max,d,p){if(!d)return null;const [a,b]=fourchette(max,d);return a+(p==null?0.5:p)*(b-a)}
function noteEleve(k,R,C){
  const e=C.el[k]||{},rep=REPS[e.rep||'4/4'],M=matchsEpreuve(k,R,C);
  const r={a1:noteAFL(12,e.a1,e.p1),a2:noteAFL(rep[0],e.a2,e.p2),a3:noteAFL(rep[1],e.a3,e.p3)};
  const tot=[r.a1,r.a2,r.a3].every(v=>v!=null)?r2(r.a1+r.a2+r.a3):null;
  return {e,rep,r,M,tot,tot05:tot==null?null:Math.round(tot*2)/2};
}
const selD=(champ,k,val)=>`<select class="nsel" data-note="${champ}" data-k="${esc(k)}" aria-label="${champ}"><option value="">—</option>${[1,2,3,4].map(d=>`<option value="${d}"${+val===d?' selected':''}>D${d}</option>`).join('')}</select>`;
const selP=(champ,k,val)=>`<select class="nsel" data-note="${champ}" data-k="${esc(k)}" aria-label="position">${POS.map(([v,l])=>`<option value="${v}"${(val==null?0.5:+val)===v?' selected':''}>${l}</option>`).join('')}</select>`;
// Descripteurs de la fiche pour le degré choisi (ou les 4 degrés si aucun)
const descr=(afl,d)=>GRILLE[afl].map(l=>`<div><b>${l.lab}</b> : ${esc(d?l.d[d-1]:'—')}</div>`).join('');

/* ---------- Indicateurs tirés des séances (aides, jamais une note automatique) ---------- */
function indicateurs(k,R){
  const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance);
  const Ss=[...new Set(seancesClasse().map(Math.floor))];
  const A=arbitrages();
  const recues=Ss.filter(s=>recsClasse().some(r=>r.k===k&&r.seance===s)||Object.keys(R[k]||{}).some(x=>Math.floor(+x)===s)).length;
  const ex=recs.flatMap(r=>r.ex.filter(e=>e.niv)), hauts=ex.filter(e=>e.niv>=3).length, hautsV=ex.filter(e=>e.niv>=3&&e.obs).length;
  // validations faites pour les autres (rôle d'observateur, AFL3)
  const moi=norm(nomAffiche(k)),valid=recsClasse().reduce((a,r)=>a+r.ex.filter(e=>e.obs&&norm(e.obs)===moi).length,0);
  // projets de jeu annoncés en match (choix tactiques)
  const pjs=Object.values(R[k]||{}).flatMap(c=>c.matchs.filter(m=>m.pj!=null&&m.fini)),pjOk=pjs.filter(m=>m.pjok===true).length,pjDiff=new Set(pjs.map(m=>m.pj)).size;
  const mt=new Set(recs.flatMap(r=>r.axes.filter(a=>a.val).map(a=>a.k)));
  const chg=recs.reduce((a,r)=>a+r.chg.length,0);
  const arb=Object.values(R[k]||{}).reduce((a,c)=>a+(c.arb||0),0)+Object.values(A[k]||{}).reduce((a,c)=>a+c.matchs,0);
  const roles=recs.flatMap(r=>r.ex.filter(e=>/^R/.test(e.n)&&e.niv>=3));
  // étoile : moyenne des axes AFL1 (début → fin)
  const et=recs.filter(r=>r.etoile&&r.etoile.some(Boolean));
  const moyAFL1=e=>{const v=e.slice(0,3).filter(Boolean);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  // codes du coach notés au tableau de marque : comme joueur (0-3, x) et comme arbitre-coach (AFL3)
  const codes=[0,0,0,0,0];let coach=0;
  poulesClasse().forEach(P=>P.matchs.forEach(m=>{if(!m.co)return;
    ['a','b'].forEach(s=>{if(cleEleve(P.classe,P.joueurs[m[s]])===k&&m.co[s])m.co[s].forEach((v,i)=>codes[i]+=v)});
    const ar=P.arbDisp||(m.arb!=null?P.joueurs[m.arb]:'');if(ar&&cleEleve(P.classe,ar)===k)coach++}));
  return {seances:Ss.length,recues,ex:ex.length,hauts,hautsV,valid,pj:pjs.length,pjOk,pjDiff,mt:mt.size,chg,arb,roles:roles.length,codes,coach,
    etDeb:et.length?moyAFL1(et[0].etoile):null,etFin:et.length>1?moyAFL1(et[et.length-1].etoile):null};
}
function suggestionAFL2(I){
  const t=I.seances?I.recues/I.seances:0;
  if(t<.5)return 1;
  if(t<.75||I.chg>=2)return 2;
  if(t>=.9&&I.mt>=2&&I.chg===0)return 4;
  return I.mt>=1?3:2;
}
function suggestionAFL3(I){const r=I.roles+(I.valid>=3?1:0)+(I.coach>=3?1:0);if(!I.arb&&!r)return 1;if(!r)return 2;return r>=2&&I.arb>=4?4:3}
// Choix tactiques : projets annoncés avant les matchs et réalisés
function suggestionTactique(I,ref){let d;if(!I.pj)d=1;else{const t=I.pjOk/I.pj;d=t<.5?2:t>=2/3&&I.pjDiff>=3?4:(I.pjDiff>=2?3:2)}return ref?Math.round((d+ref)/2):d}
// AFL1 : projets annoncés et réalisés, repère des points marqués, étoile AFL1 en fin de cycle
function suggestionAFL1(I,M){const t=suggestionTactique(I,null),et=I.etFin!=null?I.etFin:I.etDeb;return Math.max(1,Math.min(4,Math.round(et!=null?(t+et)/2:t)))}
// Alerte : auto-évaluation haute alors que les résultats en match sont faibles
function alertes(k,R,I){
  const L=[],CC=classementCycle(R)[k],n=Object.keys(classementCycle(R)).length;
  const basTiers=CC&&n>=6&&CC.place>n*2/3;
  if(basTiers&&I.ex>=3&&I.hauts/I.ex>=.7)L.push('Niveaux d’exercices très hauts (vert) mais classement dans le dernier tiers : à vérifier en observant.');
  if(basTiers&&I.etFin!=null?I.etFin>=3:basTiers&&I.etDeb!=null&&I.etDeb>=3)L.push('Étoile AFL1 « bien maîtrisé » ou plus, mais classement dans le dernier tiers.');
  if(I.chg>=2)L.push(I.chg+' changements d’axe sans match à thème validé.');
  if(I.hauts>=3&&I.hautsV/I.hauts<.3)L.push('Niveaux verts rarement vérifiés par un observateur ('+I.hautsV+' sur '+I.hauts+').');
  return L;
}

/* ---------- Onglet Note ---------- */
function vNote(){
  const L=eleves();if(!L.length)return `<h2>Note</h2><p class="muted">Aucune donnée pour cette classe.</p>`;
  const C=cfgNote(),R=resultatsPoules(),TN=seancesNotees(C);
  const K=[...new Set(poulesClasse().filter(p=>!p.rb).map(p=>p.seance))].sort((a,b)=>a-b);
  const cel=(afl,k,max,champ,pos,val,sug,e)=>`<td>${selD(champ,k,e[champ])} ${e[champ]?selP(pos,k,e[pos]):''}<div><b>${fr(val)}</b> /${max}</div><div class="small muted">suggestion D${sug}</div><details class="small"><summary>grille</summary>${descr(afl,e[champ])}</details></td>`;
  return `<h2>Note · ${esc(DB.classe)}</h2>
  <div class="rangee noprint"><button class="bt orange" type="button" data-act="saisierapide">Saisie rapide, élève par élève</button><span class="small muted">La grille de la fiche à l’écran, 4 gros boutons par AFL, Suivant.</span></div>
  <section class="carte"><h3>Évaluation GAREEPS</h3>
    <p class="small">Au moins 3 matchs de 4 min contre des adversaires de niveau équivalent. Avant le match, chacun décrit son projet (points forts, faibles, stratégie) ; le coach conseille son joueur au temps mort à 2 min ; l’arbitre dirige la rencontre et désigne le vainqueur.</p>
    <p class="small"><b>Matchs de l’épreuve</b> (séances et tours lus pour les aides) :</p>
    <div class="rangee">${K.length?K.map(x=>`<label class="coche mini"><input type="checkbox" data-ntour="${x}" ${TN.includes(x)?'checked':''}> ${labS(x)}</label>`).join(''):'<span class="muted small">aucune poule reçue</span>'}</div>
    <p class="small muted">AFL1 /12, AFL2 et AFL3 /2, 4 ou 6 selon la répartition choisie par l’élève. Pour chaque AFL : le degré (D1 à D4, 4 parts égales du barème, ex. AFL1 : 0–3, 3–6, 6–9, 9–12), puis bas, milieu ou haut de la fourchette. Les descripteurs de la fiche s’affichent sous « grille ».</p>
  </section>
  <div class="tablewrap"><table class="cl bil note"><thead><tr><th>Élève</th><th>Rép. AFL2/3</th><th>Matchs de l’épreuve</th>
    <th>AFL1 /12</th><th>AFL2</th><th>AFL3</th><th>Total /20</th><th>Aides</th></tr></thead><tbody>
  ${L.map(k=>{const N=noteEleve(k,R,C),I=indicateurs(k,R),A=alertes(k,R,I),e=N.e,M=N.M,ref=reperePts(M.j?M.pts:null);
    return `<tr><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button>${A.length?` <span class="badge st-oubli" title="${esc(A.join(' '))}">⚠</span>`:''}</td>
      <td><select class="nsel" data-note="rep" data-k="${esc(k)}">${Object.keys(REPS).map(r=>`<option${(e.rep||'4/4')===r?' selected':''}>${r}</option>`).join('')}</select></td>
      <td class="small">${M.j?`<b>${M.j}</b> match${M.j>1?'s':''}${M.j<3?' <span class="badge st-oubli">moins de 3</span>':''}<br>${M.v} V · ${M.n} N · ${M.d} D<br>points marqués ${M.pts}`:'<span class="muted">aucun match lu</span>'}<br>projets ${I.pjOk}/${I.pj} réalisés</td>
      ${cel('afl1',k,12,'a1','p1',N.r.a1,suggestionAFL1(I,M),e)}
      ${cel('afl2',k,N.rep[0],'a2','p2',N.r.a2,suggestionAFL2(I),e)}
      ${cel('afl3',k,N.rep[1],'a3','p3',N.r.a3,suggestionAFL3(I),e)}
      <td><b class="tot">${fr(N.tot05)}</b>${N.tot!=null&&N.tot!==N.tot05?`<div class="small muted">${fr(N.tot)}</div>`:''}</td>
      <td class="small aides">${I.recues}/${I.seances} séances (carnet) · ${I.hauts}/${I.ex} exos vert (${I.hautsV} vérifiés) · ${I.valid} validation${I.valid>1?'s':''} faite${I.valid>1?'s':''} · ${I.mt} MT validé${I.mt>1?'s':''} · ${I.chg} chgt axe · ${I.arb} arbitrage${I.arb>1?'s':''}${I.coach?` · ${I.coach} match${I.coach>1?'s':''} codé${I.coach>1?'s':''} en coach`:''}${I.codes.some(Boolean)?` · codes reçus 0:${I.codes[0]} 1:${I.codes[1]} 2:${I.codes[2]} 3:${I.codes[3]} x:${I.codes[4]}`:''}${I.etDeb!=null?` · étoile AFL1 ${fr(I.etDeb)}${I.etFin!=null?'→'+fr(I.etFin):''}`:''}${A.length?`<div class="alerte">${A.map(esc).join('<br>')}</div>`:''}</td></tr>`}).join('')}
  </tbody></table></div>
  <p class="small muted">Degrés : c’est toi qui choisis ; les « suggestions » et les aides viennent des séances reçues (carnet, exercices, matchs à thème, projets, arbitrages, codes du coach) et ne sont qu’un repère. Les adversaires étant de niveau équivalent, les victoires ne donnent pas la note. Total arrondi au demi-point.</p>
  <div class="rangee noprint"><button class="bt orange" type="button" data-act="csvnote">Exporter les notes (CSV)</button><button class="bt" type="button" data-act="imprimer">Imprimer</button></div>`;
}
function exporterNotes(){
  const C=cfgNote(),R=resultatsPoules();
  const rows=[['Classe','Élève','Répartition AFL2/AFL3','Matchs de l’épreuve','Victoires','Nuls','Défaites','Points marqués','Projets réalisés','Degré AFL1','AFL1 /12','Degré AFL2','AFL2','Degré AFL3','AFL3','Total /20','Total arrondi','Alertes']];
  eleves().forEach(k=>{const N=noteEleve(k,R,C),e=N.e,M=N.M,I=indicateurs(k,R);
    rows.push([DB.classe,nomAffiche(k),e.rep||'4/4',M.j,M.v,M.n,M.d,M.pts,I.pj?I.pjOk+'/'+I.pj:'',
      e.a1?'D'+e.a1:'',dec(N.r.a1==null?null:r2(N.r.a1)),e.a2?'D'+e.a2:'',dec(N.r.a2==null?null:r2(N.r.a2)),e.a3?'D'+e.a3:'',dec(N.r.a3==null?null:r2(N.r.a3)),dec(N.tot),dec(N.tot05),alertes(k,R,I).join(' ')])});
  telecharger('BAD_'+(DB.classe||'classe').replace(/[^A-Za-z0-9]+/g,'')+'_notes.csv',csv(rows));
}

/* ---------- Onglet Pilotage ---------- */
function vPilotage(){
  const K=[...new Set(poulesClasse().map(p=>p.seance))].sort((a,b)=>a-b);
  const R=resultatsPoules();
  let h=`<h2>Pilotage · ${esc(DB.classe)}</h2>`;
  // 1. Poules de la suite (montante-descendante)
  if(K.length){
    DB.pilote=K.includes(DB.pilote)?DB.pilote:K[K.length-1];
    const P=poulesClasse().filter(p=>p.seance===DB.pilote).sort((a,b)=>a.num-b.num),nb=P.length?Math.max(...P.map(p=>p.num)):0;
    const nouv={};
    P.forEach(p=>{const n=p.joueurs.length,C=TTL.classement(n,p.matchs,p.fmt),tous=p.matchs.every(m=>TTL.etatMatch(m,p.fmt).fini);
      C.forEach(c=>{let dest=p.num;if(tous&&n>1&&p.mouv!==false){if(c.rang===1&&p.num>1)dest=p.num-1;else if(c.rang===n&&p.num<nb)dest=p.num+1}
        (nouv[dest]=nouv[dest]||[]).push({nom:p.joueurs[c.i],de:p.num,rang:c.rang,inc:!tous})})});
    h+=`<section class="carte"><h3>Poules pour la suite</h3><p class="small muted">D’après ${labS(DB.pilote)} : le 1er monte, le dernier descend. À recopier dans l’appli au tour suivant.</p>
      <div class="strip noprint">${K.map(x=>`<button type="button" data-act="pilote" data-v="${x}" class="${x===DB.pilote?'ici':''}">${labS(x)}</button>`).join('')}</div>
      <div class="poules">${Object.keys(nouv).map(Number).sort((a,b)=>a-b).map(t=>`<div class="carte"><b>Poule ${t}</b><ol>${nouv[t].map(j=>`<li>${esc(j.nom)} <span class="small muted">${j.de<t?'↓ de '+j.de:j.de>t?'↑ de '+j.de:''}${j.inc?' (poule incomplète)':''}</span></li>`).join('')}</ol></div>`).join('')}</div>
      <p class="small muted">Absents et dispensés du jour : à retirer à la main. Les élèves sans poule reçue n’apparaissent pas.</p></section>`;
  }
  // 2. Regroupement par thème (dernière séance de travail)
  const Si=[...new Set(recsClasse().map(r=>r.seance))].sort((a,b)=>a-b),der=Si[Si.length-1];
  if(der){
    const parT={};recsClasse().filter(r=>r.seance===der&&!r.disp).forEach(r=>{const th=new Set(r.ex.map(e=>{const i=exInfo(e.n);return i?i.t.n:null}).filter(Boolean));
      (th.size?[...th]:['?']).forEach(t=>(parT[t]=parT[t]||[]).push(nomAffiche(r.k)))});
    const DT=[];for(let t=1;t<=7;t++)DT.push(t+'A',t+'B');let iT=0;
    h+=`<section class="carte"><h3>Thèmes travaillés · séance ${der}</h3><p class="small muted">Pour organiser les demi-terrains à la séance suivante : 2 ou 3 élèves par demi-terrain en long, si possible sur le même thème (A et B = les deux moitiés d’un terrain). Les exercices de jongles et de parcours (5 à 8) se font autour des terrains, sans les occuper.</p>
      <table class="cl"><thead><tr><th>Thème</th><th>Élèves</th><th>Demi-terrains proposés</th></tr></thead><tbody>
      ${Object.keys(parT).sort((a,b)=>(+a||99)-(+b||99)).map(t=>{const L=parT[t],nt=Math.ceil(L.length/3),tabs=[...Array(nt)].map(()=>DT[iT++]).filter(Boolean);
        const th=t==='?'?null:GA.themes.find(x=>x.n===+t);
        return `<tr><td>${th?`${th.n} · ${esc(th.t)}`:'Sans exercice'}</td><td>${L.length} : ${L.map(esc).join(', ')}</td><td>${tabs.join(', ')||'—'}</td></tr>`}).join('')}</tbody></table></section>`;
  }
  // 3. Élèves à voir en priorité
  const prio=[];
  eleves().forEach(k=>{const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance),I=indicateurs(k,R),why=[];
    const cnt={};recs.forEach(r=>r.ex.forEach(e=>{(cnt[e.n]=cnt[e.n]||[]).push(e.niv||0)}));
    Object.entries(cnt).forEach(([n,v])=>{if(v.length>=3&&Math.max(...v)<3)why.push(`bloqué sur l’exercice ${n} (${v.length} séances, jamais vert)`)});
    if(I.chg>=2)why.push(I.chg+' changements d’axe non validés');
    const Ss=[...new Set(seancesClasse().map(Math.floor))].sort((a,b)=>a-b).slice(-2),A=arbitrages();
    if(Ss.length===2&&Ss.every(s=>['rien','absent'].includes(statut(k,s,R,A).c)))why.push('rien reçu aux 2 dernières séances');
    alertes(k,R,I).filter(a=>!/changements d’axe/.test(a)).forEach(a=>why.push(a));
    if(why.length)prio.push([k,why])});
  h+=`<section class="carte"><h3>À voir en priorité</h3>${prio.length?`<ul>${prio.map(([k,w])=>`<li><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button> : ${w.map(esc).join(' ; ')}</li>`).join('')}</ul>`:'<p class="muted">Personne à signaler.</p>'}</section>
  <div class="rangee noprint"><button class="bt" type="button" data-act="imprimer">Imprimer</button></div>`;
  return h;
}

/* ---------- Fiche élève : progression ---------- */
function courbeRang(k,R){
  const {rangs,nb}=rangsClasse(R),x=rangs[k]||{},K=Object.keys(x).map(Number).sort((a,b)=>a-b);
  if(K.length<2)return '';
  const W=540,H=170,pl=36,pr=36,pt=14,pb=28,maxN=Math.max(...K.map(s=>nb[s]));
  const X=i=>pl+i*(W-pl-pr)/(K.length-1),Y=r=>pt+(r-1)*(H-pt-pb)/Math.max(1,maxN-1);
  const pts=K.map((s,i)=>`${X(i)},${Y(x[s])}`).join(' ');
  return `<section class="carte"><h3>Rang dans la classe</h3><svg viewBox="0 0 ${W} ${H}" class="courbe" role="img" aria-label="Rang dans la classe séance par séance">
    <line x1="${pl}" y1="${Y(1)}" x2="${W-pr}" y2="${Y(1)}" class="g"/><line x1="${pl}" y1="${Y(maxN)}" x2="${W-pr}" y2="${Y(maxN)}" class="g"/>
    <text x="${pl-6}" y="${Y(1)+4}" text-anchor="end">1er</text><text x="${pl-6}" y="${Y(maxN)+4}" text-anchor="end">${maxN}e</text>
    <polyline points="${pts}" class="l"/>${K.map((s,i)=>`<circle cx="${X(i)}" cy="${Y(x[s])}" r="4" class="p"/><text x="${X(i)}" y="${H-8}" text-anchor="middle">${labC(s)}</text><text x="${X(i)}" y="${Y(x[s])-8}" text-anchor="middle" class="v">${x[s]}</text>`).join('')}
  </svg></section>`;
}
function radarEtoiles(k){
  const recs=recsClasse().filter(r=>r.k===k&&r.etoile&&r.etoile.some(Boolean)).sort((a,b)=>a.seance-b.seance);
  if(!recs.length)return '';
  const a=recs[0],b=recs.length>1?recs[recs.length-1]:null,N=7,cx=150,cy=125,R=90;
  const pt=(i,v)=>{const t=-Math.PI/2+i*2*Math.PI/N,r=R*v/4;return [cx+r*Math.cos(t),cy+r*Math.sin(t)]};
  const poly=(e,cl)=>`<polygon class="${cl}" points="${e.map((v,i)=>pt(i,v||0).join(',')).join(' ')}"/>`;
  const lab=['Stratégie','Continuité','Mettre en diff.','Engagement','Analyse','Coach','Arbitrage'];
  let g=`<svg viewBox="0 0 300 250" class="radar2" role="img" aria-label="Étoile de début et de fin">`;
  for(let d=1;d<=4;d++)g+=`<polygon class="ring" points="${lab.map((_,i)=>pt(i,d).join(',')).join(' ')}"/>`;
  lab.forEach((l,i)=>{const [x,y]=pt(i,4.9);g+=`<text x="${x}" y="${y}" text-anchor="middle">${l}</text>`});
  g+=poly(a.etoile,'deb')+(b?poly(b.etoile,'fin'):'')+'</svg>';
  return `<section class="carte"><h3>Étoile : début et fin</h3>${g}<p class="small"><span class="leg deb"></span> séance ${a.seance}${b?` · <span class="leg fin"></span> séance ${b.seance}`:''}</p></section>`;
}

/* ---------- Noms hors liste : fusion proposée ---------- */
function lev(a,b){const m=a.length,n=b.length,d=[...Array(n+1).keys()];for(let i=1;i<=m;i++){let p=d[0];d[0]=i;for(let j=1;j<=n;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[n]}
function suggestion(k){
  const L=liste().map(n=>cleEleve(DB.classe,n)),nom=k.split('|')[1];
  let best=null;L.forEach(c=>{const d=lev(nom,c.split('|')[1]);if(!best||d<best[1])best=[c,d]});
  if(!best||best[1]>Math.max(3,nom.length/3))return '';
  return ` <button class="bt mini" type="button" data-act="fusionvers" data-k="${esc(k)}" data-v="${esc(best[0])}">= ${esc(nomAffiche(best[0]))} ?</button>`;
}
function fusionner(src,dst){
  if(!src||!dst||src===dst)return;
  DB.alias[src]=dst;
  Object.keys(DB.rec).forEach(id=>{const r=DB.rec[id];if(r.k===src){delete DB.rec[id];const nid=dst+'|'+r.seance;if(!DB.rec[nid]||(DB.rec[nid].ts||0)<(r.ts||0))DB.rec[nid]=Object.assign(r,{k:dst})}});
  const C=cfgNote();if(C.el[src]&&!C.el[dst]){C.el[dst]=C.el[src]}delete C.el[src];
}

/* ---------- Branchement dans prof.js ---------- */
function codesFiche(k,R){
  const I=indicateurs(k,R),c=I.codes,g=c[0]+c[1]+c[2]+c[3];if(!g&&!c[4]&&!I.coach)return '';
  return `<section class="carte"><h3>Codes du coach en match</h3>
    ${g||c[4]?`<p>Points gagnés : <b>0</b> ${c[0]} · <b>1</b> ${c[1]} · <b>2</b> ${c[2]} · <b>3</b> ${c[3]} — fautes faciles <b>x</b> ${c[4]}</p>
    <p class="small muted">Score observé (1×1 + 2×2 + 3×3) : ${c[1]+2*c[2]+3*c[3]}${g?' · part des points gagnés « construits » (1, 2, 3) : '+Math.round(100*(c[1]+c[2]+c[3])/g)+' %':''}</p>`:''}
    ${I.coach?`<p class="small">A codé ${I.coach} match${I.coach>1?'s':''} comme arbitre-coach (AFL3).</p>`:''}</section>`;
}
window.PLUS={
  actions:['pilote','csvnote','fusionvers'],
  clic(a,b){
    if(a==='pilote'){DB.pilote=+b.dataset.v;return}
    if(a==='csvnote'){exporterNotes();return false}
    if(a==='fusionvers'){if(!confirm('Fusionner « '+nomAffiche(b.dataset.k)+' » avec « '+nomAffiche(b.dataset.v)+' » ?'))return false;fusionner(b.dataset.k,b.dataset.v);return}
  },
  change(t){
    if(t.dataset.ntour!=null){const C=cfgNote(),x=+t.dataset.ntour,L=new Set(seancesNotees(C));if(t.checked)L.add(x);else L.delete(x);C.seances=[...L].sort((a,b)=>a-b);sauver();rendre();return true}
    if(t.dataset.note){const C=cfgNote(),k=t.dataset.k,f=t.dataset.note,e=C.el[k]||(C.el[k]={});
      e[f]=t.value===''?null:(f==='rep'?t.value:+t.value);
      sauver();rendre();return true}
    return false;
  },
  fiche:(k,R)=>courbeRang(k,R)+radarEtoiles(k)+codesFiche(k,R),
  suggestion
};
rendre();
