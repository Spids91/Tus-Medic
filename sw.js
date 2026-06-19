const C='tus-medic-20260619201942';
const ASSETS=['/','/index.html','/manifest.json','/css/style.css',
  '/js/data/medications.js','/js/data/hospitals.js','/js/data/terms.js',
  '/js/app.js','/js/home.js','/js/reference.js','/js/detail.js',
  '/js/quiz.js','/js/study.js','/js/settings.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res&&res.status===200&&e.request.method==='GET'){const c=res.clone();caches.open(C).then(cache=>cache.put(e.request,c));}return res;})));});
