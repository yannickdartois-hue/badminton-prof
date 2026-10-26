/* =====================================================================
   prof-cycle.js — Tournois joués sans tablettes
   Les tournois saisis sur l'iPad dans la page outils du cycle
   (montante-descendante, ronde suisse) deviennent des poules de l'outil
   prof : appel, classement, note et export les prennent en compte.
   Source : même appareil (lecture directe) ou fichier de sauvegarde
   « tournois-bad-….json » exporté depuis le cycle badminton.
   ===================================================================== */
'use strict';
let CY_FICHIER=[];const CY_SEL={};
function cyTournois(){
  let L={};try{L=JSON.parse(localStorage.getItem('bad-tournois')||'{}')||{}}catch(e){}
  const vus=new Set(),out=[];
  Object.values(L).concat(CY_FICHIER).forEach(t=>{if(!t||t.deleted||!t.id||vus.has(t.id))return;vus.add(t.id);out.push(t)});
  return out.sort((a,b)=>(b.updated||Date.parse(b.date)||0)-(a.updated||Date.parse(a.date)||0));
}
const cyType=t=>t.type==='swiss'?'ronde suisse':t.type==='atp'?'défi ATP':t.mode==='binome'?'binômes':'montante-descendante';
function cyRaison(t){
  if(t.type==='eval')return 'fiche d’évaluation : saisie dans le cycle, non importée ici';
  if(t.type==='atp')return 'défi ATP : pas de poules, non importé';
  if(t.mode==='binome')return 'binômes : pas de résultat individuel, non importé';
  if(!t.rounds||!t.rounds.length)return 'aucun tour joué';
  return '';
}
/* Paires de matchs d'un terrain, comme dans les tournois du cycle badminton (cycle-badminton-old.html, mdP) :
   grp = demi-terrains, groupes de 4 (S1–S3) ; grand = grand terrain, à 4 les matchs 3 et 4 dépendent des matchs 1 et 2 ;
   poule = tous contre tous ; duel = un match par demi-terrain. */
const CY_MIN={grp:2.5,grand:2.5,poule:2.5,duel:4};
const CY_POULE5=[[0,1],[2,3],[0,4],[1,2],[3,4],[0,2],[1,3],[2,4],[0,3],[1,4]];
function cyMdPairs(s){
  if(s===2)return [[0,1]];if(s===3)return [[1,2],[0,2],[0,1]];if(s===4)return [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  if(s===5){const o=[];for(let k=0;k<5;k++){o.push([(k+1)%5,(k+4)%5].sort((a,b)=>a-b));o.push([(k+2)%5,(k+3)%5].sort((a,b)=>a-b))}return o}
  const o=[];for(let i=0;i<s;i++)for(let j=i+1;j<s;j++)o.push([i,j]);return o;
}
function cyMdAll(s){if(s===5)return CY_POULE5;if(s===4)return [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];if(s===3)return [[0,1],[0,2],[1,2]];if(s===2)return [[0,1]];const o=[];for(let i=0;i<s;i++)for(let j=i+1;j<s;j++)o.push([i,j]);return o}
const cyWin=sc=>sc&&(sc[0]+sc[1]>0)&&sc[0]!==sc[1]?(sc[0]>sc[1]?0:1):null;
function cyPairs(r,ti,mode){
  const tb=r.tables[ti],s=tb.length,m=r.m||mode||'grp';
  if(m==='grand'){
    if(s===4){const a=cyWin((r.sc||{})[ti+':0-1']),b=cyWin((r.sc||{})[ti+':2-3']);
      if(a==null||b==null)return [[0,1],[2,3]];
      const w1=a,l1=1-a,w2=2+b,l2=5-w2;return [[0,1],[2,3],[w1,w2].sort((x,y)=>x-y),[l1,l2].sort((x,y)=>x-y)]}
    if(s===5)return CY_POULE5.slice(0,5);
    return cyMdAll(s);
  }
  if(m==='poule')return cyMdAll(s);
  return cyMdPairs(s);
}
function cyRef(s,p){const f=[...Array(s).keys()].filter(i=>!p.includes(i));return f.length?f[0]:null}
// Tournoi du cycle → liste de {tour, num, fmt, joueurs, matchs} au format des poules de l'outil prof.
// Matchs au temps : un seul score par match ; égalité = match nul (score non nul) ; 0-0 = non joué.
function cyPoules(t){
  const out=[];
  if(t.type==='swiss'){
    t.rounds.forEach((r,ri)=>(r.matches||[]).forEach((m,mi)=>{
      if(m.a==null||m.b==null)return;
      let s=[];if(m.sa||m.sb)s=[[+m.sa||0,+m.sb||0]];else if(m.w)s=[m.w==='a'?[1,0]:[0,1]];
      out.push({tour:ri+1,num:mi+1,fmt:'t4',joueurs:[t.names[m.a],t.names[m.b]],matchs:[{a:0,b:1,arb:null,m:s}]});
    }));
  }else{
    t.rounds.forEach((r,ri)=>(r.tables||[]).forEach((tb,ti)=>{
      if(!tb||tb.length<2)return;
      const mode=r.m||t.mode||'grp';
      const ms=cyPairs(r,ti,mode).map(p=>{const k1=ti+':'+p[0]+'-'+p[1],sc=(r.sc||{})[k1];
        return {a:p[0],b:p[1],arb:cyRef(tb.length,p),m:sc&&(sc[0]+sc[1]>0)?[[+sc[0],+sc[1]]]:[]}});
      out.push({tour:ri+1,num:ti+1,fmt:'t'+(+t.matchMin||CY_MIN[mode]||2.5),joueurs:tb.slice(),matchs:ms});
    }));
  }
  return out;
}
// « Léa » tapé dans le cycle → « Léa MARTIN » si un seul élève de la liste a ce prénom.
function cyNom(n,L){
  const x=norm(n);if(!x)return n;
  const exact=L.find(e=>norm(e)===x);if(exact)return exact;
  const pre=L.filter(e=>norm(partsNom(e).pre||e.split(' ')[0])===x);
  return pre.length===1?pre[0]:n;
}
function cyClasseDefaut(t){
  const C=Object.keys(DB.classesL);
  return C.find(c=>norm(c)===norm(t.classe||''))||DB.classe||C[0]||'';
}
function cySeanceDefaut(t){const m=String(t.seance||'').match(/\d+/);return m?Math.min(12,Math.max(1,+m[0])):Math.floor(Math.max(0,...seancesClasse()))+1}
function cyImporter(id){
  const t=cyTournois().find(x=>x.id===id);if(!t)return;
  const sel=CY_SEL[id]||{},classe=sel.c||cyClasseDefaut(t),s=sel.s||cySeanceDefaut(t);
  if(!classe){alert('Importe d’abord la liste de la classe (onglet Classes).');return}
  const P=cyPoules(t);if(!P.length){alert('Aucun match à importer dans ce tournoi.');return}
  const L=(DB.classesL[classe]||{eleves:[]}).eleves,tours=new Set(P.map(p=>p.tour)).size;
  const ts=Math.round((t.updated||Date.parse(t.date)||Date.now())/1000);
  let nM=0;
  P.forEach(p=>{const cle=tours>1?s+'.'+p.tour:String(s);
    nM+=p.matchs.filter(m=>m.m.length).length;
    ajouterPoule(classe,cle,{num:p.num,fmt:p.fmt,joueurs:p.joueurs.map(n=>cyNom(n,L)),arbDisp:'',matchs:p.matchs},ts)});
  DB.cycleImp=DB.cycleImp||{};DB.cycleImp[id]={classe,s,d:new Date().toISOString()};
  journal('Tournoi du cycle « '+(t.seance||'')+' » ('+cyType(t)+') → '+classe+', séance '+s+(tours>1?' en '+tours+' tours':'')+' · '+nM+' matchs');
  DB.classe=classe;DB.seance=tours>1?+(s+'.1'):s;sauver();rendre();
}
function vTournoisCycle(){
  const T=cyTournois().slice(0,10),C=Object.keys(DB.classesL).sort();
  return `<section class="carte" id="cy"><h3>Tournois joués sans tablettes</h3>
  <p class="small muted">Tournois saisis sur cet appareil dans la page du cycle (Tournois), ou chargés depuis le fichier « tournois-bad-….json » exporté par le cycle (bouton « Choisir des fichiers » ci-dessus). Choisis la classe et la séance, puis importe : chaque terrain devient une poule (1 terrain = 1 poule, 1 tour = 1 tour noté). Matchs au temps : une égalité compte comme un match nul.</p>
  ${T.length?`<ul class="cyl">${T.map(t=>{const r=cyRaison(t),imp=(DB.cycleImp||{})[t.id],sel=CY_SEL[t.id]||{},cl=sel.c||cyClasseDefaut(t),s=sel.s||cySeanceDefaut(t);
    const nT=(t.rounds||[]).length,nJ=(t.names||[]).length||new Set((t.rounds||[]).flatMap(x=>(x.tables||[]).flat())).size;
    return `<li><b>${esc(t.seance||'Tournoi')}</b> · ${esc(cyType(t))} · ${esc(t.classe||'classe non notée')} · ${new Date(t.date||Date.now()).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} · ${nJ} joueurs · ${nT} tour${nT>1?'s':''}
      ${imp?`<span class="badge">importé : ${esc(imp.classe)}, séance ${imp.s}</span>`:''}
      ${r?`<div class="small muted">${esc(r)}</div>`:`<div class="rangee">
        <select data-cy="c" data-id="${esc(t.id)}" aria-label="Classe">${(C.length?C:['']).map(c=>`<option ${c===cl?'selected':''}>${esc(c)}</option>`).join('')}</select>
        <select data-cy="s" data-id="${esc(t.id)}" aria-label="Séance">${[...Array(12).keys()].map(i=>`<option value="${i+1}" ${i+1===s?'selected':''}>Séance ${i+1}</option>`).join('')}</select>
        <button class="bt mini" type="button" data-act="cyimp" data-id="${esc(t.id)}">${imp?'Réimporter':'Importer'}</button></div>`}</li>`}).join('')}</ul>`
    :'<p class="small">Aucun tournoi du cycle sur cet appareil.</p>'}
  <p class="small muted">iPad : si le cycle et l’outil prof sont installés comme deux applis sur l’écran d’accueil, ils ne partagent pas leur mémoire. Passe alors par le fichier : cycle → « Exporter tous les tournois », puis « Choisir des fichiers » ici.</p></section>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act="cyimp"]');if(!b)return;
  e.stopImmediatePropagation();cyImporter(b.dataset.id);
},true);
document.addEventListener('change',e=>{
  const t=e.target,f=t.dataset&&t.dataset.cy;if(!f)return;
  e.stopImmediatePropagation();const S=CY_SEL[t.dataset.id]||(CY_SEL[t.dataset.id]={});
  if(f==='c')S.c=t.value;else S.s=+t.value;
},true);
