/* =====================================================================
   logique.js — calculs sans affichage (poules, rencontres, export, QR)
   Badminton · appli élève et outil prof · Lycée Georges Pompidou
   Fichier commun aux deux dépôts : garder la même version des deux côtés.
   ===================================================================== */
(function(root){
'use strict';

/* ---------- Projets de jeu annoncés avant un match (index partagé appli élève / outil prof) ---------- */
const PROJETS=['Servir court, puis attaquer au filet','Servir long sur le revers','Faire reculer, puis amortir','Déplacer droite-gauche',
  'Jouer sur le revers adverse','Smasher le volant haut','Éviter le centre du terrain','Tenir l’échange sans faute','Jouer dans le dos de l’adversaire','Attaquer avant la 5e frappe'];

/* ---------- Formats des matchs ----------
   « t3 »    : au temps, 3 min (un seul score ; égalité possible = match nul)
   « p15 »   : 1 set de 15 points (2 points d’écart, plafond 21)
   « p15-2 » : 2 sets gagnants de 15 points
   « p11-s » : 2 sets secs de 11 points, sans écart (forme de l’épreuve) ; à 1 set partout, total des points */
const PLAFOND={11:15,15:21,21:30};
function infoFmt(f){
  f=String(f||'p15');
  let m=/^t(\d+(?:[.,]\d+)?)$/.exec(f);
  if(m){const min=parseFloat(m[1].replace(',','.'));return {temps:min,pts:0,mode:'t',need:1,max:1,lib:'au temps, '+String(min).replace('.',',')+' min'}}
  m=/^p(\d+)(?:-([2s]))?$/.exec(f);
  const pts=m?+m[1]:15,mode=m&&m[2]?m[2]:'1';
  if(mode==='2')return {temps:0,pts,mode,need:2,max:3,lib:'2 sets gagnants de '+pts+' points'};
  if(mode==='s')return {temps:0,pts,mode,need:2,max:2,lib:'2 sets secs de '+pts+' points'};
  return {temps:0,pts,mode:'1',need:1,max:1,lib:'1 set de '+pts+' points'};
}
const libFmt=f=>infoFmt(f).lib;
const FORMATS=[['t2','Au temps · 2 min'],['t2.5','Au temps · 2 min 30'],['t3','Au temps · 3 min'],['t4','Au temps · 4 min'],['t5','Au temps · 5 min'],['t6','Au temps · 6 min'],
  ['p11','1 set de 11 points'],['p15','1 set de 15 points'],['p21','1 set de 21 points'],['p11-2','2 sets gagnants de 11'],['p15-2','2 sets gagnants de 15'],['p21-2','2 sets gagnants de 21'],['p11-s','2 sets secs de 11 (épreuve)']];
// Fin d'un set en points : P points avec 2 d'écart (plafond), ou P points tout court en set sec.
function setFini(a,b,fmt){
  const F=infoFmt(fmt);if(F.temps)return false;
  if(F.mode==='s')return a>=F.pts||b>=F.pts;
  const cap=PLAFOND[F.pts]||F.pts+9;
  return ((a>=F.pts||b>=F.pts)&&Math.abs(a-b)>=2)||a>=cap||b>=cap;
}
// Service en badminton : le joueur qui gagne l'échange sert ; il sert de la droite si son score est pair, de la gauche s'il est impair.
function zoneService(score){return score%2===0?'droite':'gauche'}

/* ---------- Poules ---------- */
// Ordre « tous contre tous » (méthode du cercle). Renvoie une liste de [i,j].
function ordreMatchs(n){
  const ids=[...Array(n).keys()];
  if(n%2)ids.push(-1);
  const m=ids.length,tours=[];
  for(let r=0;r<m-1;r++){
    for(let k=0;k<m/2;k++){
      const a=ids[k],b=ids[m-1-k];
      if(a>=0&&b>=0)tours.push(a<b?[a,b]:[b,a]);
    }
    ids.splice(1,0,ids.pop());
  }
  return tours;
}
// Arbitre : un joueur qui ne joue pas ce match, celui qui a le moins arbitré.
function creerMatchs(n){
  const cnt=Array(n).fill(0);
  return ordreMatchs(n).map(([a,b],i,all)=>{
    let libres=[...Array(n).keys()].filter(x=>x!==a&&x!==b);
    const suiv=all[i+1]||[];
    const pref=libres.filter(x=>!suiv.includes(x));
    if(pref.length)libres=pref;
    let arb=null;
    if(libres.length){arb=libres.sort((x,y)=>cnt[x]-cnt[y]||x-y)[0];cnt[arb]++}
    return {a,b,arb,m:[],f:null};
  });
}
/* Rencontre de binômes (forme de l'épreuve) : joueurs [A1, A2, B1, B2].
   1. A1–B1 (arbitre A2) · 2. A2–B2 (A1) · 3. A1–B2 (B1) · 4. A2–B1 (B2) · 5. double A–B. */
function creerRencontre(){
  return [{a:0,b:2,arb:1},{a:1,b:3,arb:0},{a:0,b:3,arb:2},{a:1,b:2,arb:3},{a:0,b:2,arb:null,dbl:true}].map(x=>Object.assign({m:[],f:null},x));
}
const valide=s=>s&&s[0]!==''&&s[1]!==''&&s[0]!=null&&s[1]!=null&&isFinite(+s[0])&&isFinite(+s[1]);
function etatMatch(mt,fmt){
  const F=infoFmt(fmt),P=F.pts||F.temps||1;
  if(mt.f==='a')return {fini:true,w:'b',nul:false,ma:0,mb:F.need,pa:0,pb:F.temps?0:P*F.need,forfait:true};
  if(mt.f==='b')return {fini:true,w:'a',nul:false,ma:F.need,mb:0,pa:F.temps?0:P*F.need,pb:0,forfait:true};
  let ma=0,mb=0,pa=0,pb=0,n=0;
  if(F.temps){
    const s=(mt.m||[]).find(valide);
    if(!s)return {fini:false,w:null,nul:false,ma:0,mb:0,pa:0,pb:0,forfait:false};
    const x=+s[0],y=+s[1];
    return {fini:true,w:x>y?'a':x<y?'b':null,nul:x===y,ma:x>y?1:0,mb:y>x?1:0,pa:x,pb:y,forfait:false};
  }
  for(const s of mt.m||[]){
    if(!valide(s))continue;
    const x=+s[0],y=+s[1];if(x===y)continue;
    pa+=x;pb+=y;n++;if(x>y)ma++;else mb++;
    if(F.mode!=='s'&&(ma>=F.need||mb>=F.need))break;
    if(F.mode==='s'&&n>=2)break;
  }
  if(F.mode==='s'){
    const fini=n>=2;
    if(!fini)return {fini,w:null,nul:false,ma,mb,pa,pb,forfait:false};
    const w=ma>mb?'a':mb>ma?'b':pa>pb?'a':pb>pa?'b':null;
    return {fini,w,nul:!w,ma,mb,pa,pb,forfait:false};
  }
  const fini=ma>=F.need||mb>=F.need;
  return {fini,w:fini?(ma>mb?'a':'b'):null,nul:false,ma,mb,pa,pb,forfait:false};
}
// Victoire 3 points, nul 2, défaite 1, forfait 0. Les doubles de rencontre ne comptent pas dans le classement individuel.
function stats(n,matchs,fmt,filtre){
  const S=[...Array(n).keys()].map(i=>({i,pts:0,j:0,v:0,nl:0,d:0,mg:0,mp:0,pg:0,pp:0}));
  for(const mt of matchs){
    if(mt.dbl)continue;
    if(filtre&&!(filtre.has(mt.a)&&filtre.has(mt.b)))continue;
    const e=etatMatch(mt,fmt);if(!e.fini)continue;
    const A=S[mt.a],B=S[mt.b];
    A.j++;B.j++;A.mg+=e.ma;A.mp+=e.mb;B.mg+=e.mb;B.mp+=e.ma;A.pg+=e.pa;A.pp+=e.pb;B.pg+=e.pb;B.pp+=e.pa;
    if(e.nul){A.nl++;B.nl++;A.pts+=2;B.pts+=2;continue}
    const W=e.w==='a'?A:B,L=e.w==='a'?B:A;
    W.v++;L.d++;W.pts+=3;L.pts+=(e.forfait?0:1);
  }
  return S;
}
// Classement : points, puis entre ex aequo : points des matchs entre eux, différence de sets, différence de points, points marqués.
function classement(n,matchs,fmt){
  const S=stats(n,matchs,fmt);
  const groupes={};S.forEach(s=>(groupes[s.pts]=groupes[s.pts]||[]).push(s.i));
  const ordre=[];
  Object.keys(groupes).map(Number).sort((a,b)=>b-a).forEach(p=>{
    const g=groupes[p];
    if(g.length===1){ordre.push(g[0]);return}
    const sub=stats(n,matchs,fmt,new Set(g));
    g.sort((x,y)=>sub[y].pts-sub[x].pts
      ||(sub[y].mg-sub[y].mp)-(sub[x].mg-sub[x].mp)
      ||(sub[y].pg-sub[y].pp)-(sub[x].pg-sub[x].pp)
      ||(S[y].mg-S[y].mp)-(S[x].mg-S[x].mp)
      ||(S[y].pg-S[y].pp)-(S[x].pg-S[x].pp)
      ||S[y].pg-S[x].pg
      ||x-y);
    ordre.push(...g);
  });
  return ordre.map((i,k)=>Object.assign({rang:k+1},S[i]));
}
// Bilan d'une rencontre de binômes : matchs gagnés (double compris), puis total des points.
function bilanRencontre(P){
  if(!P.rb)return null;
  const R={A:{mg:0,pts:0},B:{mg:0,pts:0},joues:0,fini:false,gagnant:null};
  P.matchs.forEach(m=>{const e=etatMatch(m,P.fmt);if(!e.fini)return;R.joues++;R.A.pts+=e.pa;R.B.pts+=e.pb;if(e.w==='a')R.A.mg++;else if(e.w==='b')R.B.mg++});
  R.fini=R.joues===P.matchs.length;
  if(R.fini)R.gagnant=R.A.mg>R.B.mg?'A':R.B.mg>R.A.mg?'B':R.A.pts>R.B.pts?'A':R.B.pts>R.A.pts?'B':null;
  return R;
}
const prenom=n=>String(n||'').split(/\s+/)[0];
// Nom d'un camp (« Léa » ou « Léa / Hugo » pour un double de rencontre)
function camp(P,m,c){const i=m[c];return m.dbl?prenom(P.joueurs[i])+' / '+prenom(P.joueurs[i+1]):P.joueurs[i]}
function joueDans(m,i){return m.a===i||m.b===i||(m.dbl&&(m.a+1===i||m.b+1===i))}
function coteDe(m,i){return m.a===i||(m.dbl&&m.a+1===i)?'a':'b'}
function texteScore(mt,fmt,depuis){ // score vu par le joueur « depuis » ('a' ou 'b')
  const e=etatMatch(mt,fmt),F=infoFmt(fmt);
  if(e.forfait)return depuis===e.w?'victoire par forfait':'forfait';
  const sets=(mt.m||[]).filter(valide).filter(s=>F.temps||+s[0]!==+s[1]).map(s=>depuis==='a'?s[0]+'-'+s[1]:s[1]+'-'+s[0]);
  if(F.temps||F.mode==='1')return (sets[0]||'')+(e.nul?' (nul)':'');
  const mm=depuis==='a'?e.ma+'-'+e.mb:e.mb+'-'+e.ma;
  const auxPoints=F.mode==='s'&&e.ma===e.mb&&!e.nul?' · aux points '+(depuis==='a'?e.pa+'-'+e.pb:e.pb+'-'+e.pa):'';
  return mm+(sets.length?' ('+sets.join(', ')+')':'')+auxPoints+(e.nul?' (nul)':'');
}
// Résumé de la poule pour un joueur (index i), pour son fichier.
function resumePoule(P,i){
  const n=P.joueurs.length,C=classement(n,P.matchs,P.fmt),me=C.find(c=>c.i===i);
  const total=P.matchs.length,joues=P.matchs.filter(m=>etatMatch(m,P.fmt).fini).length;
  let mouvement=null;
  if(P.mouv&&!P.rb&&joues===total&&total>0){
    if(me.rang===1&&P.num>1)mouvement='monte en poule '+(P.num-1);
    else if(me.rang===n)mouvement='descend en poule '+(P.num+1);
    else mouvement='reste en poule '+P.num;
  }
  const o={
    numero:P.num,nbJoueurs:n,format:libFmt(P.fmt),
    rang:me.rang,points:me.pts,victoires:me.v,nuls:me.nl,defaites:me.d,sets:me.mg+'-'+me.mp,pointsMarques:me.pg+'-'+me.pp,
    termine:joues===total,mouvement,
    matchs:P.matchs.filter(m=>joueDans(m,i)).map(m=>{
      const e=etatMatch(m,P.fmt),cote=coteDe(m,i),adv=camp(P,m,cote==='a'?'b':'a'),j=cote==='a'?0:1;
      const pj=m.pj&&m.pj[j]!=null?m.pj[j]:null,ok=m.pjok&&m.pjok[j]!=null?m.pjok[j]:null;
      return {contre:adv,double:!!m.dbl,joue:e.fini,gagne:e.fini&&!e.nul?e.w===cote:null,nul:e.fini&&e.nul,score:e.fini?texteScore(m,P.fmt,cote):'',
        projet:pj==null?null:PROJETS[pj],projetReussi:pj==null?null:ok};
    }),
    arbitrages:P.matchs.filter(m=>m.arb===i).length,
    classement:C.map(c=>({rang:c.rang,joueur:P.joueurs[c.i],points:c.pts,v:c.v,n:c.nl,d:c.d}))
  };
  if(P.rb){
    const B=bilanRencontre(P),moiA=i<2,nous=moiA?'A':'B',eux=moiA?'B':'A';
    const simples=P.matchs.filter(m=>!m.dbl&&(m.a===i||m.b===i)),dbl=P.matchs.find(m=>m.dbl);
    const ed=dbl?etatMatch(dbl,P.fmt):null;
    o.rencontre={binome:P.joueurs.slice(moiA?0:2,moiA?2:4),adversaires:P.joueurs.slice(moiA?2:4,moiA?4:2),
      terminee:B.fini,gagnee:B.fini?(B.gagnant?B.gagnant===nous:null):null,matchsGagnes:B[nous].mg+'-'+B[eux].mg,
      pointsBinome:B[nous].pts,pointsAdversaires:B[eux].pts,
      simplesGagnes:simples.filter(m=>{const e=etatMatch(m,P.fmt);return e.fini&&!e.nul&&e.w===(m.a===i?'a':'b')}).length,simplesJoues:simples.filter(m=>etatMatch(m,P.fmt).fini).length,
      doubleGagne:ed&&ed.fini?(ed.nul?null:ed.w===(moiA?'a':'b')):null};
  }
  return o;
}

/* ---------- Noms de fichiers ---------- */
function slug(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'').slice(0,24)}
function nomFichier(classe,eleve,seance,suffixe){
  const parts=String(eleve||'').trim().split(/\s+/);
  const prenom=parts[0]||'',nom=parts.slice(1).join(' ');
  const who=slug(nom?nom:prenom)+(nom?slug(prenom).slice(0,1).toUpperCase():'');
  return (slug(classe)||'Classe')+'_'+(who||'Eleve')+'_S'+seance+(suffixe?'_'+suffixe:'')+'.json';
}

/* ---------- QR : version compacte d'un fichier ---------- */
const cut=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s};
function versQR(o){
  const q={a:'BDE',v:1,c:o.classe,e:o.eleve,s:o.seance,d:o.date,ts:Math.round(Date.now()/1000)};
  if(o.type==='poule'){q.t='p'}
  else{
    q.x=(o.axes||[]).map(a=>[a.axe,a.valideAujourdhui?1:0]);
    if(o.changementsAxe&&o.changementsAxe.length)q.ch=o.changementsAxe.map(c=>[c.de,c.vers,cut(c.motif,40)]);
    q.ex=(o.exercices||[]).map(e=>[e.axe,e.exercice,e.niveau||0,cut(e.remarque,60),cut(e.verifiePar||'',30)]);
    if(o.bilan)q.b=cut(o.bilan,150);
    if(o.dispense)q.dp=1;
    if(o.groupe&&o.groupe.length>1)q.gr=o.groupe.map(n=>cut(n,40));
    if(o.arbitrePoule)q.ap=[o.arbitrePoule.numero,o.arbitrePoule.matchs];
    if(o.etoile)q.et=o.etoile.map(a=>a.degre||0);
    if(o.grilleCoach){const g=o.grilleCoach;q.g=[g.c0,g.c1,g.c2,g.c3,g.cx];if(g.projet)q.pj=cut(g.projet,80)}
  }
  if(o.poule){const p=o.poule;q.p=[p.numero,p.nbJoueurs,p.rang,p.points,p.termine?1:0,p.mouvement||'',p.matchs.map(m=>[m.contre,m.gagne==null?(m.nul?2:-1):m.gagne?1:0,m.score]),p.arbitrages]}
  return q;
}
function b64url(bytes){let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function chaineQR(o){
  const json=JSON.stringify(versQR(o)),raw=new TextEncoder().encode(json);
  try{
    if(typeof CompressionStream==='function'){
      const cs=new CompressionStream('deflate-raw');
      const buf=await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();
      return 'BDE1:'+b64url(new Uint8Array(buf));
    }
  }catch(e){}
  return 'BDE0:'+b64url(raw);
}

root.TTL={prenom,PROJETS,FORMATS,infoFmt,libFmt,setFini,zoneService,ordreMatchs,creerMatchs,creerRencontre,etatMatch,classement,bilanRencontre,camp,joueDans,coteDe,texteScore,resumePoule,nomFichier,slug,versQR,chaineQR};
})(typeof window!=='undefined'?window:globalThis);
