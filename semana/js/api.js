/* =========================================================
   ERP Ovo Caipira · CAMADA DE DADOS
   ---------------------------------------------------------
   As telas só conversam com o objeto API. Ele decide sozinho
   para onde vão os dados:
     - MODO PLANILHA       (js/config.js com API_URL)
       → Google Apps Script → planilha do Google
     - MODO DEMONSTRAÇÃO   (API_URL vazio)
       → navegador (localStorage), com dados de exemplo
     - DEMONSTRAÇÃO ONLINE (API_URL + DEMO_ONLINE: true)
       → é o modo planilha, ligado a uma planilha de demonstração.
         Os 3 sites online ficam no mesmo endereço (github.io), então
         todas as chaves do aparelho levam o prefixo do site (PREFIXO).

   Uso nas telas:
     await API.entrar('admin', 'demo123');
     var db = await API.carregar();          // todas as abas
     await API.salvar('coletas', { data, lote, ... });       // novo
     await API.salvar('coletas', { bons: 250 }, id);         // editar
     await API.excluir('coletas', id);

   Organização deste arquivo:
     1. Modo e chaves de armazenamento
     2. Sessão (quem está logado nesta aba)
     3. Planilha: envio para o Apps Script
     4. Demonstração: banco no navegador
     5. Fila sem internet (modo planilha)
     6. Funções usadas pelas telas
   ========================================================= */
var API = (function () {
    'use strict';

    /* =====================================================
       1. MODO E CHAVES DE ARMAZENAMENTO
       ===================================================== */
    var URL_API = ((window.CONFIG && window.CONFIG.API_URL) || '').trim();
    /* Demonstração online: os 3 sites (cadastros, semana, mes) dividem o mesmo endereço,
       e por isso o mesmo localStorage. O prefixo separa as chaves de cada site
       (sem ele, entrar num site desloga ou mistura os dados do outro).
       Site online ainda sem a URL da planilha: NÃO vira a demonstração local; a entrada avisa. */
    var CFG = window.CONFIG || {};
    var ONLINE = !!CFG.DEMO_ONLINE;
    var DEMO = !URL_API && !ONLINE;
    var PREFIXO = ONLINE ? String(CFG.VERSAO_DEMO || 'demo') + ':' : '';
    var NOMES_VERSAO = { cadastros: 'só cadastros', semana: '1 semana', mes: '1 mês' };
    var NOME_DEMO = ONLINE ? 'Demonstração online · ' + (NOMES_VERSAO[CFG.VERSAO_DEMO] || CFG.VERSAO_DEMO || '') : (DEMO ? 'Demonstração' : '');
    var CHAVE_DEMO = 'erp-ovo-demo-v11';      // banco da demonstração (v11: 3 logins + colaboradoras sem login, cada uma com os lotes dela)
    var CHAVE_CACHE = PREFIXO + 'erp-ovo-cache-v1';     // última cópia da planilha
    var CHAVE_FILA = PREFIXO + 'erp-ovo-fila-v1';       // lançamentos esperando internet
    var CHAVE_RECUSADOS = PREFIXO + 'erp-ovo-recusados-v1';   // lançamentos da fila que a planilha não aceitou (para mostrar)
    var CHAVE_SESSAO = PREFIXO + 'erp-ovo-sessao-v1';   // quem está logado (nesta aba)

    var db = null;                            // cópia em memória de todas as abas

    function ler(chave, padrao, area) {
        try { var v = JSON.parse((area || localStorage).getItem(chave)); return v == null ? padrao : v; } catch (e) { return padrao; }
    }
    function gravar(chave, valor, area) {
        try { valor == null ? (area || localStorage).removeItem(chave) : (area || localStorage).setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
    }
    function completo(dados) {
        var out = dados && typeof dados === 'object' ? dados : {};
        Dominio.CHAVES.forEach(function (k) { if (!Array.isArray(out[k])) out[k] = []; });
        return out;
    }
    function novoId() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
    function carimbo() {
        var u = usuario();
        var d = new Date();
        return (u ? u.nome : '—') + ' · ' + Dominio.diaMes(Dominio.iso(d)) + ' ' + d.toTimeString().slice(0, 5);
    }


    /* =====================================================
       2. SESSÃO
       Fica guardada no aparelho (localStorage): fechar o navegador NÃO sai,
       para a colaboradora conseguir abrir o sistema sem internet.
       Vence depois de HORAS_SESSAO sem uso (cada uso renova). "Sair" apaga.
       ===================================================== */
    function renovarSessao() {
        var s = ler(CHAVE_SESSAO, null);
        if (s) { s.expira = Date.now() + ((window.CONFIG && window.CONFIG.HORAS_SESSAO) || 8) * 3600000; gravar(CHAVE_SESSAO, s); }
    }
    function sessao() {
        var s = ler(CHAVE_SESSAO, null);
        if (s && s.expira && Date.now() > s.expira) { gravar(CHAVE_SESSAO, null); return null; }
        /* Demonstração: o login não existe mais (recomeçou ou mudou a versão) → sai */
        if (s && DEMO && typeof DadosExemplo !== 'undefined') {
            var b = ler(CHAVE_DEMO, null);
            if (!b || !b.db || !(b.db.usuarios || []).some(function (u) { return String(u.usuario) === String(s.usuario && s.usuario.usuario) && u.situacao === 'Ativo'; })) { gravar(CHAVE_SESSAO, null); return null; }
        }
        return s;
    }
    function usuario() { var s = sessao(); return s ? s.usuario : null; }


    /* =====================================================
       3. PLANILHA: ENVIO PARA O APPS SCRIPT
       text/plain evita a pré-checagem (CORS) que o Apps Script não aceita.
       ===================================================== */
    async function chamar(corpo) {
        var s = sessao();
        corpo.token = s ? s.token : '';
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, 45000);
        try {
            var resp = await fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo), signal: ctrl.signal });
            var r = await resp.json();
            if (r.sair) { gravar(CHAVE_SESSAO, null); }
            if (r.ok && corpo.acao !== 'login') renovarSessao();
            if (!r.ok && corpo.acao !== 'login' && corpo.acao !== 'pedirSenha') { var erro = new Error(r.erro || 'Erro na planilha'); erro.sair = !!r.sair; throw erro; }
            return r;
        } catch (e) {
            if (e.name === 'AbortError' || e instanceof TypeError) e.semInternet = true;
            throw e;
        } finally { clearTimeout(timer); }
    }


    /* =====================================================
       4. DEMONSTRAÇÃO: BANCO NO NAVEGADOR
       ===================================================== */
    function bancoDemo() {
        var b = ler(CHAVE_DEMO, null);
        if (!b || !b.db) { b = { db: DadosExemplo.gerar(), senhas: {} }; gravar(CHAVE_DEMO, b); }
        b.db = completo(b.db);
        return b;
    }
    function salvarDemo(b) { gravar(CHAVE_DEMO, b); }

    /* Grava uma linha numa cópia do banco (usado na demonstração e na fila) */
    function aplicar(banco, tabela, dados, id) {
        if (id) {
            var atual = banco[tabela].find(function (r) { return r.id === id; });
            if (!atual) throw new Error('Registro não encontrado.');
            Object.assign(atual, dados, { alterado_por: carimbo() });
            return atual;
        }
        var linha = Object.assign({ id: novoId(), criado_em: new Date().toISOString(), lancado_por: carimbo(), alterado_por: '' }, dados);
        banco[tabela].push(linha);
        return linha;
    }
    function anotar(banco, sistema, texto) {
        var u = usuario(), d = new Date();
        banco.alteracoes.unshift({ id: novoId(), data: Dominio.iso(d), hora: d.toTimeString().slice(0, 5), quem: u ? u.nome : '—', sistema: sistema, o_que: texto });
    }


    /* =====================================================
       5. FILA SEM INTERNET (modo planilha)
       O lançamento fica guardado no aparelho e é enviado
       quando a conexão voltar.
       ===================================================== */
    function fila() { return ler(CHAVE_FILA, []); }
    /* Login venceu: volta para a entrada; o que estava guardado vai depois de entrar */
    function loginVencido() {
        gravar(CHAVE_SESSAO, null);
        setTimeout(function () { location.replace('index.html?venceu=1'); }, 1800);
    }
    function recusados() { return ler(CHAVE_RECUSADOS, []); }
    /* Envia o que ficou guardado. Nada é apagado sem ter sido aceito:
       - sem internet: para e tenta depois;
       - login vencido: para e espera a pessoa entrar de novo (a fila continua guardada);
       - a planilha recusou (ex.: coleta repetida): sai da fila e vai para a lista
         "não aceitos", que aparece no topo da tela até a pessoa ver. */
    var enviando = false;
    async function enviarFila() {
        if (DEMO || enviando || !sessao()) return 0;
        enviando = true;
        var eu = String((usuario() || {}).usuario || ''), enviados = 0;
        try {
            /* só envia o que a própria pessoa lançou (aparelho dividido: o de outra fica esperando ela entrar) */
            while (true) {
                var lista = fila(), i = lista.findIndex(function (x) { return !x.usuario || x.usuario === eu; });
                if (i < 0) break;
                try { await chamar(lista[i].corpo); enviados++; }
                catch (e) {
                    if (e.semInternet || e.sair) break;
                    var rec = recusados(); rec.push({ corpo: lista[i].corpo, erro: e.message, quando: lista[i].quando, usuario: lista[i].usuario }); gravar(CHAVE_RECUSADOS, rec);
                }
                lista = fila(); lista.splice(i, 1); gravar(CHAVE_FILA, lista);
            }
        } finally { enviando = false; }
        return enviados;
    }
    /* Tenta enviar o que ficou guardado: quando a internet volta e, por garantia,
       a cada 1 minuto (rede instável às vezes não avisa que voltou).
       Se enviou, avisa a pessoa e a tela se atualiza (evento erp-fila-enviada). */
    async function tentarEnviar() {
        if (!fila().length || !navigator.onLine) return;
        var n = await enviarFila();
        if (!n) return;
        if (window.UI) window.UI.avisar(n === 1 ? 'A rede normalizou: 1 lançamento que estava guardado foi lançado automaticamente.' : 'A rede normalizou: ' + n + ' lançamentos que estavam guardados foram lançados automaticamente.');
        try { await carregar(); } catch (e) { /* segue com a cópia */ }
        window.dispatchEvent(new Event('erp-fila-enviada'));
    }
    window.addEventListener('online', tentarEnviar);
    setInterval(tentarEnviar, 60000);

    /* Mensagem quando o lançamento fica guardado no aparelho (a tela mostra no lugar do "salvo") */
    var guardado = null;
    function mensagemGuardado(tabela, sair) {
        var oQue = tabela === 'coletas' ? 'Coleta não lançada' : 'Lançamento não enviado';
        var ela = tabela === 'coletas' ? 'Ela ficou guardada' : 'Ele ficou guardado';
        return sair
            ? oQue + ': o seu login venceu. ' + ela + ' neste aparelho e será ' + (tabela === 'coletas' ? 'lançada' : 'lançado') + ' assim que você entrar de novo.'
            : oQue + ' devido à instabilidade na rede. ' + ela + ' neste aparelho, aguardando a internet normalizar, e será ' + (tabela === 'coletas' ? 'lançada' : 'lançado') + ' automaticamente.';
    }
    function acabouDeGuardar() {
        var g = guardado; guardado = null;
        return g && Date.now() - g.quando < 4000 ? g.texto : '';
    }


    /* =====================================================
       6. FUNÇÕES USADAS PELAS TELAS
       ===================================================== */

    /* ---------- Entrar ---------- */
    async function entrar(login, senha) {
        login = String(login || '').trim().toLowerCase();
        if (!login) return { ok: false, erro: 'Informe o usuário.' };
        var horas = (window.CONFIG && window.CONFIG.HORAS_SESSAO) || 8;
        if (ONLINE && !URL_API) return { ok: false, erro: 'Esta demonstração online ainda não está ligada à planilha (falta a URL em js/config.js).' };
        if (DEMO && typeof DadosExemplo === 'undefined') {
            return { ok: false, erro: 'Planilha não configurada. Cole a URL do Apps Script em js/config.js (API_URL).' };
        }
        if (DEMO) {
            var b = bancoDemo();
            var u = b.db.usuarios.find(function (x) { return String(x.usuario).toLowerCase() === login; });
            var certa = (b.senhas[login] || DadosExemplo.SENHA);
            if (!u || senha !== certa) return { ok: false, erro: 'Usuário ou senha incorretos.' };
            if (u.situacao !== 'Ativo') return { ok: false, erro: 'Este usuário está bloqueado.' };
            gravar(CHAVE_SESSAO, { token: 'demo', usuario: u, expira: Date.now() + horas * 3600000, criado: Date.now() });
            return { ok: true, usuario: u };
        }
        try {
            var r = await chamar({ acao: 'login', usuario: login, senha: senha });
            if (r.ok) gravar(CHAVE_SESSAO, { token: r.token, usuario: r.usuario, expira: Date.now() + horas * 3600000, criado: Date.now() });
            return r;
        } catch (e) {
            return { ok: false, erro: 'Não foi possível conectar à planilha. Confira a internet e tente de novo.' };
        }
    }

    function sair() {
        if (!DEMO && sessao()) chamar({ acao: 'sair' }).catch(function () {});
        gravar(CHAVE_SESSAO, null);
        db = null;
    }

    /* ---------- Ler todas as abas ---------- */
    async function carregar() {
        if (DEMO) { db = bancoDemo().db; return db; }
        try {
            await enviarFila();
            var r = await chamar({ acao: 'snapshot' });
            db = completo(r.dados);
            gravar(CHAVE_CACHE, db);
        } catch (e) {
            if (e.sair) { loginVencido(); throw e; }
            if (!e.semInternet) throw e;
            db = completo(ler(CHAVE_CACHE, {}));   // sem internet: usa a última cópia
        }
        return db;
    }
    function dados() { return db || completo({}); }

    /* ---------- Salvar (novo ou edição) ---------- */
    async function salvar(tabela, valores, id, sistema, descricao) {
        if (!Dominio.TABELAS[tabela]) throw new Error('Tabela inválida: ' + tabela);
        var texto = descricao || ((id ? 'Editou ' : 'Lançou ') + Dominio.TABELAS[tabela].titulo.toLowerCase());
        if (DEMO) {
            var b = bancoDemo();
            var linha = aplicar(b.db, tabela, valores, id);
            if (valores.senha) { b.senhas[String(linha.usuario).toLowerCase()] = valores.senha; delete linha.senha; }
            if (tabela !== 'alteracoes') anotar(b.db, sistema || 'Sistema', texto);
            salvarDemo(b); db = b.db;
            return linha;
        }
        /* chave = código único deste lançamento (a planilha não grava duas vezes o mesmo) */
        var corpo = { acao: 'salvar', tabela: tabela, dados: valores, id: id || '', sistema: sistema || 'Sistema', descricao: texto, chave: novoId() };
        var quem = String((usuario() || {}).usuario || '');   // guardado antes: se o login vencer, a sessão some
        try {
            var r = await chamar(corpo);
            var copia = dados();
            var i = copia[tabela].findIndex(function (x) { return x.id === r.dados.id; });
            if (i >= 0) copia[tabela][i] = r.dados; else copia[tabela].push(r.dados);
            return r.dados;
        } catch (e) {
            if (!e.semInternet && !e.sair) throw e;
            /* sem internet ou login vencido: guarda no aparelho (nada se perde) */
            var lista = fila(); lista.push({ corpo: corpo, quando: new Date().toISOString(), usuario: quem }); gravar(CHAVE_FILA, lista);
            if (e.sair) loginVencido();
            guardado = { texto: mensagemGuardado(tabela, e.sair), quando: Date.now() };
            var local = aplicar(dados(), tabela, valores, id);
            local.pendente = true;
            return local;
        }
    }

    /* ---------- Excluir ---------- */
    async function excluir(tabela, id, sistema) {
        if (DEMO) {
            var b = bancoDemo();
            b.db[tabela] = b.db[tabela].filter(function (r) { return r.id !== id; });
            anotar(b.db, sistema || 'Sistema', 'Excluiu um registro de ' + Dominio.TABELAS[tabela].titulo.toLowerCase());
            salvarDemo(b); db = b.db;
            return { ok: true };
        }
        await chamar({ acao: 'excluir', tabela: tabela, id: id, sistema: sistema || 'Sistema' });
        dados()[tabela] = dados()[tabela].filter(function (r) { return r.id !== id; });
        return { ok: true };
    }

    /* ---------- Senhas ---------- */
    async function trocarSenha(atual, nova) {
        /* Demonstração online: os logins granja e coleta são compartilhados; só o administrador troca senha */
        if (ONLINE && (usuario() || {}).perfil !== 'Administrador') return { ok: false, erro: 'Na demonstração, só o administrador troca senhas.' };
        if (DEMO) {
            var b = bancoDemo(), u = usuario();
            var login = String(u.usuario).toLowerCase();
            if ((b.senhas[login] || DadosExemplo.SENHA) !== atual) return { ok: false, erro: 'A senha atual está incorreta.' };
            b.senhas[login] = nova; anotar(b.db, 'Acesso', 'Trocou a própria senha'); salvarDemo(b);
            return { ok: true };
        }
        try { return await chamar({ acao: 'trocarSenha', atual: atual, nova: nova }); } catch (e) { return { ok: false, erro: e.message }; }
    }
    /* "Esqueci minha senha": não muda nada, só avisa os administradores (alerta) */
    async function pedirSenha(login) {
        login = String(login || '').trim().toLowerCase();
        if (DEMO) {
            var b = bancoDemo(), u = b.db.usuarios.find(function (x) { return x.usuario === login && x.situacao === 'Ativo'; });
            if (u) {
                aplicar(b.db, 'alertas', { data: Dominio.hoje(), lote: '', gravidade: 'Atenção', descricao: u.nome + ' (' + u.usuario + ') esqueceu a senha. Volte para a senha inicial em Cadastros › Usuários.', registrado_por: 'Sistema', resolvido: 'Não' });
                b.db.alteracoes.unshift({ id: novoId(), data: Dominio.hoje(), hora: new Date().toTimeString().slice(0, 5), quem: u.nome, sistema: 'Acesso', o_que: 'Pediu ajuda: esqueceu a senha' });
                salvarDemo(b);
            }
            return { ok: true };
        }
        try { return await chamar({ acao: 'pedirSenha', usuario: login }); } catch (e) { return { ok: false, erro: 'Sem conexão com a planilha. Tente de novo ou fale com um administrador.' }; }
    }
    /* Só o administrador: volta a senha de alguém para a senha inicial */
    async function senhaInicial(id) {
        if (DEMO) {
            var b = bancoDemo(), u = b.db.usuarios.find(function (x) { return x.id === id; });
            if (!u) return { ok: false, erro: 'Usuário não encontrado.' };
            delete b.senhas[String(u.usuario).toLowerCase()];
            anotar(b.db, 'Acesso', 'Voltou a senha de ' + u.nome + ' para a senha inicial'); salvarDemo(b); db = b.db;
            return { ok: true };
        }
        try { return await chamar({ acao: 'senhaInicial', id: id }); } catch (e) { return { ok: false, erro: e.message }; }
    }

    /* ---------- Registro avulso (ex.: "Imprimiu o romaneio") ---------- */
    async function registrar(sistema, texto) {
        if (DEMO) { var b = bancoDemo(); anotar(b.db, sistema, texto); salvarDemo(b); db = b.db; return; }
        try { await chamar({ acao: 'registrar', sistema: sistema, descricao: texto }); } catch (e) { /* não bloqueia a tela */ }
    }

    /* ---------- Demonstração: apagar tudo e começar de novo ----------
       Volta ao começo, num dos 4 jeitos (demo-dados.js):
       'zerado' · 'cadastros' · 'semana' · 'mes'.
       As senhas trocadas também voltam para demo123. */
    function restaurarExemplo(modo) {
        if (!DEMO) return;
        gravar(CHAVE_DEMO, { db: DadosExemplo.gerar(modo), senhas: {} });
        db = bancoDemo().db;
    }

    return {
        demo: DEMO, online: ONLINE, PREFIXO: PREFIXO, nomeDemo: NOME_DEMO, CHAVE_FILA: CHAVE_FILA, usuario: usuario, sessao: sessao, entrar: entrar, sair: sair, carregar: carregar, dados: dados,
        salvar: salvar, excluir: excluir, trocarSenha: trocarSenha, pedirSenha: pedirSenha, senhaInicial: senhaInicial, registrar: registrar,
        restaurarExemplo: restaurarExemplo, pendentes: function () { return fila().length; }, enviarFila: enviarFila,
        recusados: recusados, acabouDeGuardar: acabouDeGuardar, limparRecusados: function () { gravar(CHAVE_RECUSADOS, null); }
    };
})();
