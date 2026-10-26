/* =====================================================================
   prof-demo.js — mode démo de l'outil prof : une classe fictive « DÉMO »
   (28 élèves, 8 séances : poules au temps sur demi-terrains en S1–S3, en points ensuite,
   évaluation GAREEPS en séance 8 : poules de 4 de niveau voisin, 3 matchs de 4 min chacun).
   Les vraies données restent intactes : en démo rien n'est enregistré.
   Ouverture : bouton « Découvrir avec une classe fictive » ou adresse …/?demo
   ===================================================================== */
'use strict';
let DEMO=false,DB_REEL=null;
const DEMO_CL='DÉMO';
const DEMO_ELEVES=['ARNAUD Lucas','BENOIT Emma','BLANC Hugo','BRUN Léa','CARON Nathan','CHEVALIER Inès','DUBOIS Tom','DURAND Zoé','FAURE Sacha','FONTAINE Chloé',
  'GARNIER Enzo','GIRARD Manon','GUERIN Noah','HENRY Lina','LAMBERT Théo','LEROY Jade','MARTIN Louis','MERCIER Rose','MOREL Adam','PETIT Lou','ROUX Gabriel','SIMON Alice','VINCENT Jules','ROBIN Mila','AUBERT Yanis','COLIN Maëlle','LUCAS Raphaël','NOEL Anaïs'];
function alea(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function construireDemo(){
  const r=alea(20261019),ent=(a,b)=>a+Math.floor(r()*(b-a+1)),pick=L=>L[Math.floor(r()*L.length)];
  const N=DEMO_ELEVES.length,niveau={};DEMO_ELEVES.forEach((n,i)=>niveau[n]=10+((i*7)%N)+r()*4); // niveau caché
  const d=vide();d.classesL[DEMO_CL]={eleves:DEMO_ELEVES.slice(),lien:''};d.classe=DEMO_CL;d.vue='tournoi';d.seance=8;
  const sauv=DB;DB=d; // les fonctions d'import écrivent dans DB
  const jour=s=>{const x=new Date(Date.now()-(8-s)*7*864e5);return x.toISOString().slice(0,10)};
  const exosAxe=k=>{const a=axe(k);return a?a.th.flatMap(t=>(GA.themes.find(x=>x.n===t)||{ex:[]}).ex.map(e=>e.n)):[]};
  // groupes de 3 (changent à la séance 5)
  const groupes=s=>{const L=s<5?DEMO_ELEVES.slice():DEMO_ELEVES.slice().reverse();const G=[];for(let i=0;i<L.length;i+=3)G.push(L.slice(i,i+3));return G};
  const absents={2:['MOREL Adam'],3:['HENRY Lina','PETIT Lou'],5:['GUERIN Noah'],6:['DUBOIS Tom'],7:['SIMON Alice']};
  const dispenses={4:['LAMBERT Théo'],5:['LAMBERT Théo']};
  const oubli={6:groupes(6)[2]}; // un groupe a joué mais n'a pas envoyé sa séance
  // ordre de départ des poules : niveau + bruit
  let ordre=DEMO_ELEVES.slice().sort((a,b)=>niveau[b]+r()*6-(niveau[a]+r()*6));
  const fmtS=s=>s<=3?'t3':s<8?'p15':'t4';
  const force=(m,J)=>m.dbl?(niveau[J[m.a]]+niveau[J[m.a+1]])/2-(niveau[J[m.b]]+niveau[J[m.b+1]])/2:niveau[J[m.a]]-niveau[J[m.b]];
  const scorer=(m,J,fmt)=>{const pa=1/(1+Math.exp(-force(m,J)/3)),F=TTL.infoFmt(fmt);
    if(F.temps){const a=ent(3,8)+Math.round(pa*6),b=ent(3,8)+Math.round((1-pa)*6);return [[a,b]]}
    const sets=[];let wa=0,wb=0;
    while(F.mode==='s'?sets.length<2:(wa<F.need&&wb<F.need)){const ga=r()<pa;let l=F.mode==='s'?ent(2,10):r()<.15?ent(F.pts-1,F.pts+3):ent(3,F.pts-3),w=F.pts;if(F.mode!=='s'&&l>=F.pts-1)w=l+2;sets.push(ga?[w,l]:[l,w]);ga?wa++:wb++}
    return sets};
  const jouer=(J,s,num,rb)=>{
    const fmt=fmtS(s),M=rb?TTL.creerRencontre():TTL.creerMatchs(J.length);
    M.forEach((m,i)=>{
      m.m=scorer(m,J,fmt);const e=TTL.etatMatch(m,fmt),wa=e.ma,wb=e.mb;
      if(r()<.45){m.pj=[ent(0,TTL.PROJETS.length-1),ent(0,TTL.PROJETS.length-1)];m.pjok=[r()<.6,r()<.5]}
      if(s>=3&&r()<.6){const c=x=>[ent(1,3),ent(1,5),ent(0,2),ent(0,2),ent(0,3)].map(v=>Math.round(v*x));m.co={a:c(wa>wb?1:.6),b:c(wb>wa?1:.6)}}
    });
    return {num,fmt,rb:!!rb,mouv:!rb,arbDisp:'',joueurs:J,matchs:M};
  };
  // 7 terrains, groupes de 4 ou 5 (comme les tournois du cycle)
  const tailles=n=>{let k=Math.min(7,Math.ceil(n/4));const base=Math.floor(n/k),plus=n%k;return [...Array(k)].map((_,j)=>base+(j<plus?1:0))};
  const resumes={};// k élève -> séance -> résumé
  const pouleSeance=(cle,s,presents)=>{
    const L=ordre.filter(n=>presents.includes(n)),P=[];let i=0;
    tailles(L.length).forEach((t,j)=>{const b=jouer(L.slice(i,i+t),s,j+1);i+=t;P.push(b);
      ajouterPoule(DEMO_CL,cle,b,Math.floor(Date.parse(jour(s))/1000)+8*3600+ent(0,40)*60);
      b.joueurs.forEach((n,x)=>{(resumes[n]=resumes[n]||{})[cle]=TTL.resumePoule(Object.assign({mouv:true},b),x)})});
    // montée / descente pour la séance suivante
    const cl=P.map(b=>TTL.classement(b.joueurs.length,b.matchs,b.fmt).sort((x,y)=>x.rang-y.rang).map(c=>b.joueurs[c.i])),K=cl.length;
    const res=cl.map((c,j)=>{const m=c.slice(j>0?1:0,j<K-1?c.length-1:c.length);if(j<K-1)m.unshift(cl[j+1][0]);if(j>0)m.push(cl[j-1][cl[j-1].length-1]);return m});
    ordre=res.flat().concat(ordre.filter(n=>!presents.includes(n)));
  };
  for(let s=1;s<=8;s++){
    const abs=absents[s]||[],disp=dispenses[s]||[],presents=DEMO_ELEVES.filter(n=>!abs.includes(n)&&!disp.includes(n));
    if(s<8)pouleSeance(String(s),s,presents);
    else pouleSeance('8',8,presents); // évaluation : poules de niveau voisin, 3 matchs de 4 min chacun
    const G=groupes(s);
    G.forEach(g=>{if(oubli[s]&&oubli[s].join()===g.join())return;const src=r()<.5?'qr':'fichier';g.forEach((nom,gi)=>{
      if(abs.includes(nom))return;
      const lv=niveau[nom],dp=disp.includes(nom),i=DEMO_ELEVES.indexOf(nom);
      const ax=dp?['ana','arb']:[['cont','strat'],['diff','eng'],['strat','coach'],['eng','ana']][i%4];
      const prog=Math.min(4,1+Math.floor((s+lv/8)/3.2));
      const ex=ax.map((k,sl)=>{const L=exosAxe(k),n=L[Math.min(L.length-1,Math.floor(s/3)+sl)];
        const niv=Math.max(1,Math.min(4,prog-(sl&&r()<.4?1:0)+(r()<.15?1:0)));
        return {axe:k,n:String(n),niv,rq:r()<.2?pick(['7 sur 10','revers à revoir','mieux en fin de séance','partenaire régulier','dégagé trop court']):'',obs:niv>=3&&r()<.6?g[(gi+1)%g.length]:''}});
      const et=s===1||s===8?GA.axes.map((a,j)=>Math.max(1,Math.min(4,Math.round(lv/7+(s===8?1:0)+(j%3===i%3?-1:0)+(r()<.3?1:0)-1)))):null;
      const rs=(resumes[nom]||{})[String(s)];
      ajouterRecord({classe:DEMO_CL,eleve:nom,seance:s,date:jour(s),ts:Math.floor(Date.parse(jour(s))/1000)+9*3600+ent(30,59)*60+gi,src,
        axes:ax.map((k,j)=>({k,val:s>=4&&j===0&&r()<.35})),
        chg:s===3&&i%7===0?[{de:'diff',vers:ax[0],motif:'C’est trop difficile pour l’instant'}]:[],
        ex,bilan:r()<.3?pick(['Bonne séance','Service court à travailler','J’ai progressé en dégagé','Difficile aujourd’hui']):'',disp:dp,groupe:g.slice(),
        etoile:et,grille:s>=3&&r()<.5?(()=>{const c=[ent(1,4),ent(2,6),ent(0,3),ent(0,2),ent(1,5)];return {c0:c[0],c1:c[1],c2:c[2],c3:c[3],cx:c[4],projet:'Servir court, puis attaquer au filet',scoreObserve:c[1]+2*c[2]+3*c[3]}})():null,
        pouleResume:rs?{num:rs.numero,n:rs.nbJoueurs,rang:rs.rang,pts:rs.points,v:rs.victoires,nl:rs.nuls||0,d:rs.defaites,mv:rs.mouvement||''}:null});
    })});
  }
  d.notes={[norm(DEMO_CL)]:{seances:null,el:{}}};
  DEMO_ELEVES.slice(0,10).forEach((n,i)=>{d.notes[norm(DEMO_CL)].el[cleEleve(DEMO_CL,n)]={rep:['4/4','6/2','2/6'][i%3],a1:1+Math.min(3,Math.floor(niveau[n]/8)),p1:[0,.5,1][i%3],a2:2+(i%3),a3:1+((i+1)%4),p2:.5,p3:.5}});
  d.journal=[{t:'Classe fictive « DÉMO » chargée',err:[],d:new Date().toISOString()}];
  d.saveAt=Date.now();
  DB=sauv;return d;
}
function entrerDemo(){
  if(DEMO)return;
  let d;try{d=construireDemo()}catch(e){alert('Démo impossible : '+(e.message||e));return}
  DB_REEL=DB;DB=d;DEMO=true;rendre();window.scrollTo(0,0);
}
function quitterDemo(){
  if(!DEMO)return;DB=DB_REEL;DB_REEL=null;DEMO=false;rendre();window.scrollTo(0,0);
  try{if(/[?&]demo\b/.test(location.search))history.replaceState(null,'',location.pathname)}catch(e){}
}
const carteDemo=()=>`<section class="carte demo-carte"><h3>👀 Découvrir l’outil</h3><p class="small muted">Une classe fictive de 28 élèves, 8 séances déjà reçues (poules au temps puis en points, évaluation GAREEPS en séance 8, absents, dispensé, groupe qui n’a pas envoyé). Tes vraies données ne sont pas touchées.</p><button class="bt" type="button" data-act="demo">Découvrir avec une classe fictive</button></section>`;
// En démo : rien n'est écrit sur l'appareil
const sauverReel=sauver;sauver=function(){if(!DEMO)sauverReel()};
const bandeauReel=bandeauSauvegarde;
bandeauSauvegarde=function(){return DEMO?`<div class="demo-bandeau"><span>👀 <b>Mode démo</b> · classe fictive « DÉMO », rien n’est enregistré. Tes vraies données sont intactes.</span><button class="bt mini" type="button" data-act="demoQuitter">Quitter la démo</button></div>`:bandeauReel()};
const vImportReel=vImport;vImport=function(){return vImportReel()+(DEMO?'':carteDemo())};
const vClassesReel=vClasses;vClasses=function(){return vClassesReel()+(DEMO?'':carteDemo())};
const proposerReel=proposerSauvegarde;proposerSauvegarde=function(){if(!DEMO)proposerReel()};
// Actions interceptées avant l'outil (phase de capture)
const BLOQUE=['sauvegarde','effacer','archiver','scanner','clsuppr','secours'];
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'),lab=e.target.closest('label[for]');
  if(b&&b.dataset.act==='demo'){e.stopImmediatePropagation();e.preventDefault();entrerDemo();return}
  if(b&&b.dataset.act==='demoQuitter'){e.stopImmediatePropagation();e.preventDefault();quitterDemo();return}
  if(!DEMO)return;
  if((b&&BLOQUE.includes(b.dataset.act))||(lab&&['fic','resto','cl-fic'].includes(lab.htmlFor))){
    e.stopImmediatePropagation();e.preventDefault();
    alert('Pas disponible en mode démo : quitte la démo pour importer, sauvegarder ou effacer tes vraies données.');
  }
},true);
const st=document.createElement('style');
st.textContent=`.demo-bandeau{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px 14px;border-radius:12px;background:#FFF3C4;color:#5C4300;border:2px dashed #C99A00}
.demo-bandeau span{flex:1}.demo-carte{border-style:dashed}
`;
document.head.appendChild(st);
if(/[?&]demo\b/.test(location.search))entrerDemo();else rendre();
