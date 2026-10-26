/* =====================================================================
   prof-saisie.js — Note : saisie rapide au doigt, élève par élève
   Le tableau de l'onglet Note reste tel quel (vue d'ensemble, export).
   Ici : un élève à l'écran, la grille GAREEPS de chaque AFL en 4 gros
   boutons (descripteurs de la fiche dedans), bas / milieu / haut, Suivant.
   Même barème, mêmes données que l'onglet Note.
   ===================================================================== */
'use strict';
let SR=null;
function srRendre(){
  let o=document.getElementById('sr');
  const L=eleves();if(SR==null||!L.length){if(o)o.remove();return}
  SR=Math.max(0,Math.min(L.length-1,SR));
  const k=L[SR],C=cfgNote(),R=resultatsPoules(),N=noteEleve(k,R,C),I=indicateurs(k,R),e=N.e,M=N.M,ref=reperePts(M.j?M.pts:null);
  const crit=[['afl1','a1','p1','AFL1',12,N.r.a1,'suggestion D'+suggestionAFL1(I,M)],
    ['afl2','a2','p2','AFL2 · se préparer, s’entraîner',N.rep[0],N.r.a2,'suggestion D'+suggestionAFL2(I)],
    ['afl3','a3','p3','AFL3 · coach, partenaire, arbitre',N.rep[1],N.r.a3,'suggestion D'+suggestionAFL3(I)]];
  const lignes=crit.map(([afl,f,pf,lab,max,val,sug])=>{const dg=e[f]||0;
    return `<div class="sr-c"><div class="sr-l"><b>${lab}</b> <span class="muted">/${max} · ${sug}</span></div>
      <div class="sr-d">${[1,2,3,4].map(d=>{const [a,b]=fourchette(max,d);return `<button type="button" class="sr-b n${d}${dg===d?' on':''}" data-sr="deg" data-f="${f}" data-d="${d}"><i class="p${d}"></i>D${d}<small>${fr(a)}–${fr(b)}</small><span class="sr-txt">${GRILLE[afl].map(l=>esc(l.d[d-1])).join('<br>')}</span></button>`}).join('')}</div>
      <div class="sr-v">${dg?POS.map(([v,l])=>`<button type="button" class="bt mini${(e[pf]==null?0.5:e[pf])===v?' on':''}" data-sr="pos" data-f="${pf}" data-v="${v}">${l}</button>`).join(''):''}<b>${val==null?'—':fr(val)}</b></div></div>`}).join('');
  const html=`<div class="sr-in" role="dialog" aria-label="Saisie rapide des notes">
    <div class="sr-h"><div><div class="small muted">${SR+1} / ${L.length} · ${esc(DB.classe)}</div><h2>${esc(nomAffiche(k))}</h2></div><button type="button" class="bt mini" data-sr="fermer">Fermer</button></div>
    <div class="sr-res"><span>Épreuve : <b>${M.j}</b> match${M.j>1?'s':''} · ${M.v} V, ${M.n} N, ${M.d} D · ${M.pts} points marqués · projets ${I.pjOk}/${I.pj}</span><span>Total /20 : <b class="tot">${fr(N.tot05)}</b></span></div>
    <div class="sr-rep"><span class="small">Répartition AFL2/AFL3</span>${Object.keys(REPS).map(r=>`<button type="button" class="bt mini${(e.rep||'4/4')===r?' on':''}" data-sr="rep" data-v="${r}">${r}</button>`).join('')}</div>
    ${lignes}
    <div class="sr-nav"><button type="button" class="bt" data-sr="nav" data-v="-1" ${SR?'':'disabled'}>‹ Précédent</button><button type="button" class="bt orange" data-sr="nav" data-v="1" ${SR<L.length-1?'':'disabled'}>Suivant ›</button></div>
  </div>`;
  if(!o){o=document.createElement('div');o.id='sr';o.className='sr';document.body.appendChild(o)}
  o.innerHTML=html;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act="saisierapide"],[data-sr]');if(!b)return;
  e.stopImmediatePropagation();
  if(b.dataset.act==='saisierapide'){SR=0;srRendre();return}
  const a=b.dataset.sr,L=eleves(),k=L[SR],C=cfgNote(),el=C.el[k]||(C.el[k]={});
  if(a==='fermer'){SR=null;srRendre();rendre();return}
  if(a==='nav'){SR+=+b.dataset.v;srRendre();document.querySelector('.sr-in').scrollTop=0;return}
  if(a==='rep'){el.rep=b.dataset.v;sauver();srRendre();return}
  if(a==='deg'){const f=b.dataset.f,d=+b.dataset.d;el[f]=el[f]===d?null:d;sauver();srRendre();return}
  if(a==='pos'){el[b.dataset.f]=+b.dataset.v;sauver();srRendre();return}
},true);
document.addEventListener('keydown',e=>{if(SR==null)return;if(e.key==='Escape'){SR=null;srRendre();rendre()}});
const stSR=document.createElement('style');
stSR.textContent=`.sr-b .sr-txt{display:block;font-size:12px;line-height:1.25;font-weight:400;margin-top:4px;text-align:left}`;
document.head.appendChild(stSR);
