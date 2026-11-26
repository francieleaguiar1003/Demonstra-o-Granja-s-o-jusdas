/* =========================================================
   ERP Ovo Caipira · FUNCIONAR SEM INTERNET (service worker)
   ---------------------------------------------------------
   Guarda as páginas, o visual e os scripts no aparelho.
   Assim o sistema ABRE mesmo sem sinal (os dados vêm da
   última cópia e os lançamentos esperam a internet voltar).

   Organização deste arquivo:
     1. Versão e lista de arquivos (preenchidas pelo build.py)
     2. Instalar: guarda os arquivos
     3. Ativar: apaga as cópias de versões antigas
     4. Buscar: tenta a internet primeiro; sem internet, usa a cópia
   ========================================================= */

/* 1. VERSÃO E ARQUIVOS (o build.py troca a versão a cada pacote novo)
   PREFIXO_CACHE: nome do site. Na demonstração online os 3 sites ficam no mesmo
   endereço; cada um apaga SÓ os caches com o prefixo dele. */
var PREFIXO_CACHE = 'erp-ovo-online-semana-';
var VERSAO = 'erp-ovo-online-semana-20261126-021646';
var ARQUIVOS = ['./', 'colaboradora.html', 'css/style.css', 'img/icone-192.png', 'img/icone-512.png', 'img/logo.png', 'index.html', 'js/api.js', 'js/colaboradora.js', 'js/comum.js', 'js/config.js', 'js/demo-dados.js', 'js/dominio.js', 'js/entrada.js', 'js/sistema.js', 'js/telas/beneficiamento.js', 'js/telas/cadastro-padrao.js', 'js/telas/cadastros.js', 'js/telas/configuracoes.js', 'js/telas/granja.js', 'js/telas/painel.js', 'js/telas/pedidos.js', 'js/telas/relatorios.js', 'manifest.webmanifest', 'sistema.html'];

/* 2. INSTALAR */
self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

/* 3. ATIVAR */
self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (nomes) {
        return Promise.all(nomes.filter(function (n) { return n.indexOf(PREFIXO_CACHE) === 0 && n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); }));
});

/* 4. BUSCAR
   Só os arquivos do próprio sistema (a planilha do Google nunca passa por aqui).
   Internet primeiro (sempre a versão mais nova); se falhar ou demorar 6 s, a cópia. */
self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    e.respondWith(new Promise(function (ok) {
        var pronto = false;
        var daCopia = function () {
            return caches.open(VERSAO).then(function (c) {
                return c.match(req, { ignoreSearch: true }).then(function (r) { return r || c.match('index.html'); });
            });
        };
        var timer = setTimeout(function () { daCopia().then(function (r) { if (!pronto && r) { pronto = true; ok(r); } }); }, 6000);
        fetch(req).then(function (resp) {
            if (resp && resp.ok) { var copia = resp.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); }); }
            clearTimeout(timer); if (!pronto) { pronto = true; ok(resp); }
        }).catch(function () {
            clearTimeout(timer);
            daCopia().then(function (r) { if (!pronto) { pronto = true; ok(r || Response.error()); } });
        });
    }));
});
