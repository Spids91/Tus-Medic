const C='tus-medic-20260620080742';
const BASE='/Tus-Medic';
const ASSETS=[BASE+'/',BASE+'/index.html',BASE+'/manifest.json',BASE+'/css/style.css',
  BASE+'/js/data/medications.js',BASE+'/js/data/hospitals.js',BASE+'/js/data/terms.js',
  BASE+'/js/app.js',BASE+'/js/home.js',BASE+'/js/reference.js',BASE+'/js/detail.js',
  BASE+'/js/quiz.js',BASE+'/js/study.js',BASE+'/js/settings.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res&&res.status===200&&e.request.method==='GET'){const c=res.clone();caches.open(C).then(cache=>cache.put(e.request,c));}return res;})));});
