/* Hors ligne (modèle du portail mon-eps) : l'outil est gardé sur l'iPad à la première ouverture avec internet.
   La page est rechargée depuis GitHub si le réseau répond en moins de 3 s, sinon depuis l'iPad ;
   les autres fichiers sont servis depuis l'iPad et mis à jour en arrière-plan.
   Après une modification des fichiers : augmenter CACHE (bdp-v1 → bdp-v2…). */
const CACHE='bdp-v2';
const FICHIERS=['./','index.html','prof.js','prof-plus.js','prof-demo.js','prof-poules.js','prof-cycle.js','prof-saisie.js','donnees.js','logique.js','scan.js','jsqr.js','jszip.js','xlsx.js','qrcode.js','manifest.webmanifest',
  'icon-32.png','icon-180.png','icon-192.png','icon-512.png','polices/archivo.woff2','polices/atkinson-400.woff2','polices/atkinson-700.woff2'];
const IMAGES=[];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);
  await Promise.all(FICHIERS.concat(IMAGES).map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);
    try{const net=await Promise.race([fetch(r),new Promise((_,no)=>setTimeout(no,3000))]);if(net&&net.ok){c.put('index.html',net.clone());return net}throw 0}
    catch(x){return (await c.match('index.html'))||(await c.match('./'))||fetch(r)}})());return}
  e.respondWith((async()=>{const c=await caches.open(CACHE);
    const hit=await c.match(r,{ignoreSearch:true});
    const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||Response.error()})());
});
