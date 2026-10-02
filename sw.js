/* Service worker: deixa o app instalável e abrir rápido.
   Arquivos do site: tenta a internet primeiro (sempre pega a versão nova)
   e usa o que está guardado se estiver sem rede.
   Script do Supabase (CDN): guardado para o app abrir offline.
   Chamadas ao banco nunca são guardadas. */

const CACHE = "controle-v1";
const BASE = ["./", "index.html", "style.css", "app.js", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* Banco de dados e autenticação: sempre direto da rede */
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in")) return;

  /* Biblioteca do CDN: guardada, atualiza em segundo plano */
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        }).catch(() => hit);

        return hit || net;
      })
    );
    return;
  }

  /* Arquivos do próprio site: rede primeiro, cache como reserva */
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() =>
        caches.match(req).then(hit => hit || caches.match("index.html"))
      )
    );
  }
});
