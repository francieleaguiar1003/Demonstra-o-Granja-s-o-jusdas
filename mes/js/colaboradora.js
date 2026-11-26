/* =========================================================
   ERP Ovo Caipira · ÁREA DAS COLABORADORAS
   ---------------------------------------------------------
   Telas (pelo endereço: colaboradora.html#coleta):
     resumo · coleta · mortalidade · checklist · avisos
   O que ela salva vai direto para a granja (Coletas e
   Mortalidade) e o checklist vai para a gestão ver em
   Relatórios › Colaboradoras.

   Organização deste arquivo:
     1. Início e menu
     2. Resumo (tela inicial dela)
     3. Registrar coleta
     4. Registrar mortalidade
     5. Checklist do dia
     6. Avisos (ela manda para os administradores)
     7. Alterar senha e sair
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var S = 'Colaboradoras';
    var usuario = null;
    /* [tela, nome, vai para a granja?, acesso que libera a tela (Usuários › o que pode acessar)] */
    var TODAS = [['resumo', 'Resumo', '', 'c-resumo'], ['coleta', 'Registrar coleta', 'granja', 'g-coletas'], ['mortalidade', 'Registrar mortalidade', 'granja', 'g-mortalidade'], ['checklist', 'Checklist do dia', '', 'c-checklist'], ['avisos', 'Avisos', '', 'c-avisos']];
    var TELAS = TODAS;

    /* LOGIN COMPARTILHADO (só na demonstração: o login "coleta", usado por várias pessoas
       ao mesmo tempo). Ao entrar, a pessoa escolhe quem ela é entre as colaboradoras
       cadastradas em Usuários; a página mostra só os lotes dela (do cadastro dela).
       A escolha fica lembrada nesta aba; "Trocar" volta para a escolha. */
    var CHAVE_QUEM = API.PREFIXO + 'erp-ovo-quem-lanca';
    function compartilhado() { return D.loginCompartilhado(usuario); }
    function quemLanca() { if (!compartilhado()) return usuario.nome; try { return sessionStorage.getItem(CHAVE_QUEM) || ''; } catch (e) { return ''; } }
    function pessoasDaColeta(db) { return D.colaboradorasSemLogin(db); }
    function pessoaAtual(db) { var q = quemLanca(); return pessoasDaColeta(db).find(function (p) { return p.nome === q; }) || null; }
    function precisaEscolher(db) { return compartilhado() && pessoasDaColeta(db).length > 0 && !pessoaAtual(db); }
    function meusLotes(db) {
        if (compartilhado() && pessoasDaColeta(db).length) { var p = pessoaAtual(db); return p ? D.lotesDoUsuario(db, p) : []; }
        return D.lotesDoUsuario(db, usuario);
    }
    function quemPendencias(db) { return compartilhado() ? (pessoaAtual(db) || usuario) : usuario; }
    function escolherPessoa(el, db) {
        var pessoas = pessoasDaColeta(db);
        el.innerHTML = '<p class="eyebrow">Login da coleta · ' + UI.dataExtenso() + '</p><h1 class="titulo-colab">Quem está usando agora?</h1>' +
            '<p class="nota intro">Este login é usado por várias pessoas. Toque no seu nome: a página vai mostrar só os lotes que são seus (do seu cadastro em Usuários).</p>' +
            '<div class="escolher-pessoa">' + pessoas.map(function (p) {
                var lotes = D.lotesDoUsuario(db, p).map(function (l) { return String(l.lote).split('/')[0]; });
                return '<button type="button" class="pessoa-coleta" data-pessoa="' + h(p.nome) + '"><b>' + h(p.nome) + '</b><small>' + (lotes.length ? 'Lotes ' + lotes.join(', ') : 'Sem lote cadastrado') + '</small></button>';
            }).join('') + '</div>';
        UI.ligar(el, '[data-pessoa]', 'click', function (e, b) { lembrarQuem(b.dataset.pessoa); UI.avisar('Olá, ' + b.dataset.pessoa + '! Mostrando só os seus lotes.'); abrir(); });
    }
    function lembrarQuem(nome) { if (compartilhado()) try { sessionStorage.setItem(CHAVE_QUEM, nome); } catch (e) { /* segue */ } }
    function campoNome(db, nomeCampo, valor) {
        return '<label>Seu nome <small class="nota" style="margin:0">(quem ' + (nomeCampo === 'coletado_por' ? 'coletou' : 'fez') + ')</small><input name="' + nomeCampo + '" value="' + h(valor) + '" list="lista-nomes" autocomplete="off" placeholder="Escreva o seu nome"></label>' +
            '<datalist id="lista-nomes">' + D.nomesQueColhem(db).map(function (x) { return '<option value="' + h(x) + '">'; }).join('') + '</datalist>';
    }
    function ehMeu(db, lote) { return meusLotes(db).some(function (l) { return String(l.lote) === String(lote); }); }
    function ind(nome, valor, det, ruim) { return '<div class="indicador' + (ruim ? ' ruim' : '') + '"><span>' + nome + '</span><b>' + valor + '</b><em>' + det + '</em></div>'; }
    function opcoesLotes(db, sel) { return meusLotes(db).map(function (l) { return '<option value="' + h(l.lote) + '"' + (String(l.lote) === String(sel) ? ' selected' : '') + '>' + h(D.nomeLote(db, l.lote)) + '</option>'; }).join(''); }
    /* Checklist de hoje: um por lote de aves cadastrado + um de serviços gerais (sem lote) */
    function checklistDeHoje(db, lote, tipo) {
        return db.checklist_colab.find(function (c) { return c.data === D.hoje() && c.tipo === tipo && (tipo === 'geral' || String(c.lote) === String(lote)); });
    }
    function checklistsDeHoje(db) {
        return meusLotes(db).map(function (l) { return { tipo: 'lote', lote: l.lote, nome: D.nomeLote(db, l.lote), feito: checklistDeHoje(db, l.lote, 'lote') }; })
            .concat([{ tipo: 'geral', lote: '', nome: 'Serviços gerais (vestiário, sala de coleta…)', feito: checklistDeHoje(db, '', 'geral') }]);
    }


    /* =====================================================
       1. INÍCIO E MENU
       ===================================================== */
    async function iniciar() {
        usuario = UI.exigirLogin(true);
        if (!usuario) return;
        $('#menu-avatar').textContent = usuario.nome.charAt(0);
        $('#menu-nome').textContent = usuario.nome;
        $('#menu-perfil').textContent = usuario.perfil;
        $('#menu-nome').parentNode.title = usuario.nome + ' · ' + usuario.perfil;
        $('#botao-senha').innerHTML = UI.icone('chave') + 'Trocar senha';
        $('#botao-sair').innerHTML = UI.icone('sair') + 'Sair';
        $('#botao-tema').innerHTML = UI.ICONE_TEMA;
        $('#botao-menu').innerHTML = UI.icone('menu');
        $('#botao-tema').addEventListener('click', UI.trocarTema);
        $('#botao-sair').addEventListener('click', function () { API.sair(); location.replace('index.html'); });
        $('#botao-senha').addEventListener('click', janelaSenha);
        $('#botao-menu').addEventListener('click', function () { document.body.classList.add('menu-aberto'); });
        document.addEventListener('click', function (e) {   // "Trocar" (login compartilhado): volta para a escolha do nome
            if (!e.target.closest('[data-trocar-pessoa]')) return;
            try { sessionStorage.removeItem(CHAVE_QUEM); } catch (x) { /* segue */ }
            location.hash = ''; abrir();
        });
        $('#fundo-menu').addEventListener('click', function () { document.body.classList.remove('menu-aberto'); });
        window.addEventListener('hashchange', abrir);
        window.addEventListener('erp-fila-enviada', abrir);   // a rede voltou e o que estava guardado foi lançado
        try { await API.carregar(); } catch (e) { $('#tela').innerHTML = '<div class="card"><h2>Não foi possível ler a planilha</h2><p class="nota">' + h(e.message) + '</p></div>'; return; }
        abrir();
    }
    function abrir() {
        if (!/^#checklist/.test(location.hash) && typeof ck !== 'undefined') ck.aberto = false;   // saiu do checklist: fecha a janela dele
        TELAS = TODAS.filter(function (t) { return D.podeVer(usuario, t[3]); });   // só as telas liberadas para a pessoa
        if (!TELAS.length) { $('#tela').innerHTML = '<div class="card"><h2>Nenhuma tela liberada</h2><p class="nota">Peça para a administradora liberar em Usuários.</p></div>'; return; }
        var id = (location.hash || '#' + TELAS[0][0]).slice(1);
        if (!TELAS.some(function (t) { return t[0] === id; })) id = TELAS[0][0];
        var db = API.dados();
        /* Login compartilhado: primeiro escolhe quem é (nome no menu + botão Trocar) */
        var pessoa = compartilhado() ? pessoaAtual(db) : null;
        $('#menu-nome').textContent = pessoa ? pessoa.nome : usuario.nome;
        $('#menu-avatar').textContent = (pessoa ? pessoa.nome : usuario.nome).charAt(0);
        $('#menu-perfil').innerHTML = pessoa ? 'Login ' + h(usuario.usuario) + ' · <button type="button" class="trocar-pessoa" data-trocar-pessoa>Trocar</button>' : h(usuario.perfil);
        if (precisaEscolher(db)) {
            $('#menu-itens').innerHTML = ''; $('#selos').innerHTML = API.nomeDemo ? '<span class="selo-demo">' + h(API.nomeDemo) + '</span>' : '';
            escolherPessoa($('#tela'), db); document.body.classList.remove('menu-aberto'); window.scrollTo(0, 0); return;
        }
        var pendentes = checklistsDeHoje(db).filter(function (x) { return !x.feito; }).length;
        var abertos = meusAvisos(db).filter(function (a) { return a.resolvido !== 'Sim'; }).length;
        $('#menu-itens').innerHTML = TELAS.map(function (t) {
            var extra = t[2] ? '<small>→ granja</small>' : (t[0] === 'checklist' && pendentes ? '<span class="contador">' + pendentes + '</span>' : (t[0] === 'avisos' && abertos ? '<span class="contador">' + abertos + '</span>' : ''));
            return '<a href="#' + t[0] + '" class="' + (t[0] === id ? 'ativo ' : '') + (t[2] ? 'granja-link' : '') + '"' + (t[0] === id ? ' aria-current="page"' : '') + '>' + t[1] + ' ' + extra + '</a>';
        }).join('') + (usuario.perfil !== 'Colaboradora' ? '<a href="sistema.html" style="margin-top:12px">← Voltar ao sistema da gestão</a>' : '');
        montarSino(db);
        $('#selos').innerHTML = (API.nomeDemo ? '<span class="selo-demo">' + h(API.nomeDemo) + '</span> ' : '') + UI.selosFila();
        UI.ligarSelosFila($('#selos'), abrir);
        ({ resumo: resumo, coleta: coleta, mortalidade: mortalidade, checklist: checklist, avisos: avisos })[id]($('#tela'), db);
        document.body.classList.remove('menu-aberto');
        window.scrollTo(0, 0);
    }


    /* =====================================================
       2. RESUMO
       ===================================================== */
    var periodo = UI.novoPeriodo('sem');
    function resumo(el, db) {
        var p = periodo, lotes = meusLotes(db), hoje = D.hoje();
        var meu = function (r) { return ehMeu(db, r.lote) && D.noPeriodo(r.data, p.de, p.ate); };
        var col = db.coletas.filter(function (r) { return (!r.lote || ehMeu(db, r.lote)) && D.noPeriodo(r.data, p.de, p.ate); });   // coletas por dia (sem lote) contam para todas
        var mort = db.mortalidade.filter(meu);
        var total = col.reduce(function (s, c) { return s + D.totalColeta(c); }, 0), bons = col.reduce(function (s, c) { return s + n(c.bons); }, 0);
        var nm = mort.reduce(function (s, r) { return s + n(r.mortes); }, 0), na = mort.reduce(function (s, r) { return s + n(r.abate); }, 0);

        var avisos = [];
        /* coleta não lançada (dela): aparece antes de tudo */
        D.pendencias(db, quemPendencias(db)).forEach(function (p) {
            avisos.push('<div class="faixa ' + p.grav + '"><b>' + h(p.titulo) + '</b><br>' + h(p.grav === 'erro' ? p.texto.replace(/ Um administrador.*$/, ' Avise um administrador para lançar a coleta esquecida.') : p.texto) + (p.grav === 'erro' ? '' : ' <a href="#coleta">Registrar coleta</a>') + '</div>');
        });
        /* primeiro os avisos que ela mandou (aguardando ou resolvidos há pouco) */
        if (D.podeVer(usuario, 'c-avisos')) meusAvisos(db).forEach(function (a) {
            if (a.resolvido !== 'Sim') avisos.push('<div class="faixa ' + (a.gravidade === 'Urgente' ? 'erro' : 'atencao') + '"><b>Seu aviso · aguardando</b> · ' + h(a.gravidade) + (a.lote ? ' · Lote ' + h(a.lote) : '') + ' · ' + D.br(a.data) + '<br>' + h(a.descricao) + ' <a href="#avisos">Ver avisos</a></div>');
            else if (D.diasEntre(a.data, hoje) <= 3) avisos.push('<div class="faixa ok"><b>✓ Seu aviso foi resolvido</b> · ' + D.br(a.data) + '<br>' + h(a.descricao) + '</div>');
        });
        checklistsDeHoje(db).forEach(function (x) {
            if (!x.feito) avisos.push('<div class="faixa atencao"><b>Checklist de hoje pendente</b> · ' + h(x.nome) + '. <a href="#checklist">Abrir checklist</a></div>');
        });
        var deHoje = db.coletas.filter(function (x) { return x.data === hoje && !x.lote; }), codHoje = D.codigoDoDia(db, hoje, '');
        avisos.push(deHoje.length ? '<div class="faixa ok"><b>Hoje:</b> ' + deHoje.length + ' coleta(s) no lote da coleta <b>' + h(codHoje) + '</b> (' + fmt(deHoje.reduce(function (s, x) { return s + D.totalColeta(x); }, 0)) + ' ovos).</div>'
            : '<div class="faixa atencao"><b>Hoje:</b> nenhuma coleta lançada ainda. A primeira cria o lote da coleta ' + h(codHoje) + '.</div>');

        /* 1ª linha: coletas por dia (granja toda) · depois cada lote (mortes, e coletas antigas com lote) */
        var linhas = [{ lote: '' }].concat(lotes).map(function (l) {
            var c = col.filter(function (x) { return String(x.lote || '') === String(l.lote); }), m = mort.filter(function (x) { return String(x.lote) === String(l.lote); });
            var t = c.reduce(function (s, x) { return s + D.totalColeta(x); }, 0), b = c.reduce(function (s, x) { return s + n(x.bons); }, 0);
            var dias = {}; c.forEach(function (x) { dias[x.data] = 1; });
            var soma = function (k) { return c.reduce(function (s, x) { return s + n(x[k]); }, 0); };
            if (l.lote && !c.length) return [h(D.nomeLote(db, l.lote)), '—', '—', '—', '—', '—', '—', '—',              // coletas agora são por dia
                fmt(m.reduce(function (s, x) { return s + n(x.mortes); }, 0)), fmt(m.reduce(function (s, x) { return s + n(x.abate); }, 0))];
            return [h(D.nomeLote(db, l.lote)), Object.keys(dias).length, fmt(t), fmt(b), fmt(soma('trincados')), fmt(soma('defeituosos')), fmt(soma('sujos')), UI.pct(t - b, t),
                fmt(m.reduce(function (s, x) { return s + n(x.mortes); }, 0)), fmt(m.reduce(function (s, x) { return s + n(x.abate); }, 0))];
        });
        var partes = UI.partes(p.de, p.ate);
        var serie = partes.map(function (pt) { return db.coletas.filter(function (c) { return (!c.lote || ehMeu(db, c.lote)) && D.noPeriodo(c.data, pt.de, pt.ate); }).reduce(function (s, c) { return s + D.totalColeta(c); }, 0); });

        el.innerHTML = '<div class="cabecalho"><div><p class="eyebrow">Colaboradoras da granja · ' + UI.dataExtenso() + '</p><h1>' + (compartilhado() ? (quemLanca() ? 'Olá, ' + h(quemLanca()) : 'Olá!') : 'Olá, ' + h(usuario.nome)) + '</h1>' +
            '<p>Avisos, fechamento do período e os números principais dos seus lotes.</p></div><a class="btn" href="#coleta">Registrar coleta</a></div>' +
            (lotes.length ? '' : '<div class="faixa erro">Nenhum lote liberado para você. Peça ao administrador para liberar em Usuários.</div>') +
            '<div style="display:grid;gap:8px;margin-bottom:16px">' + avisos.join('') + '</div>' +
            UI.periodoHTML(p) +
            '<div class="card"><h2>Fechamento do período por lote</h2><div class="indicadores">' +
                ind('Coletados', fmt(total), 'ovos nas coletas') + ind('Ovos bons', fmt(bons), UI.pct(bons, total) + ' do coletado') +
                ind('Descartes', fmt(total - bons), UI.pct(total - bons, total) + ' · trincados, defeituosos e sujos') + ind('Mortes + abates', fmt(nm + na), nm + ' morte(s) · ' + na + ' abate(s)', nm + na > 0) + '</div>' +
                UI.tabela(['Lote', { t: 'Dias', num: 1 }, { t: 'Coletados', num: 1 }, { t: 'Bons', num: 1 }, { t: 'Trinc.', num: 1 }, { t: 'Def.', num: 1 }, { t: 'Sujos', num: 1 }, { t: 'Perda %', num: 1 }, { t: 'Mortes', num: 1 }, { t: 'Abates', num: 1 }], linhas) + '</div>' +
            '<div class="card"><h2>Coleta por dia no período</h2>' + UI.grafico(partes.map(function (x) { return x.rotulo; }), serie) + '</div>' +
            '<div class="grade"><div class="card"><h2>Meus lotes</h2>' + lotes.map(function (l) {
                var feito = checklistDeHoje(db, l.lote, 'lote');
                return '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--linha)"><div><b>' + h(D.nomeLote(db, l.lote)) + '</b><div class="nota" style="margin:0">' +
                    fmt(D.avesVivas(db, l)) + ' galinhas · alojado em ' + D.br(l.data_inicio) + '</div></div><a class="btn ' + (feito ? 'alt' : '') + '" href="#checklist?lote=' + encodeURIComponent(l.lote) + '">' + (feito ? 'Checklist de hoje feito' : 'Checklist de hoje · pendente') + '</a></div>';
            }).join('') + '</div>' +
            '<div class="card"><h2>Mortalidade nos meus lotes</h2>' + (mort.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 5).map(function (r) {
                return '<div class="faixa erro"><b>' + (n(r.mortes) ? r.mortes + ' morte(s)' : '') + (n(r.mortes) && n(r.abate) ? ' · ' : '') + (n(r.abate) ? r.abate + ' abate(s)' : '') + ' · ' + h(D.nomeLote(db, r.lote)) + '</b><br><small>' + D.br(r.data) + ' · ' + h(r.motivo) + (r.observacao ? ' — ' + h(r.observacao) : '') + '</small></div>';
            }).join('') || '<p class="vazio">Nenhuma mortalidade lançada neste período.</p>') + '</div></div>';
        UI.ligarPeriodo(el, periodo, abrir);
    }


    /* =====================================================
       3. REGISTRAR COLETA
       ===================================================== */
    /* Nº da coleta: 1ª, 2ª… desta colaboradora no dia */
    var proximaColeta = D.proximaColeta;   // 1ª, 2ª, 3ª… sem limite
    function contador(nome, campo, valor, ajuda) {
        return '<div><span class="rotulo">' + nome + '</span><div class="contador-campo">' +
            '<button type="button" data-menos="' + campo + '" aria-label="Menos ' + nome + '">−</button><input inputmode="numeric" data-filtro="digitos" name="' + campo + '" aria-label="' + nome + '" value="' + valor + '">' +
            '<button type="button" data-mais="' + campo + '" aria-label="Mais ' + nome + '">+</button></div>' + (ajuda ? '<small class="nota" style="margin:4px 0 0;display:block">' + ajuda + '</small>' : '') + '</div>';
    }
    function ligarContadores(f, depois) {
        f.addEventListener('click', function (e) {
            var k = e.target.dataset.menos || e.target.dataset.mais;
            if (!k) return;
            f.elements[k].value = Math.max(0, n(f.elements[k].value) + (e.target.dataset.mais ? 1 : -1));
            depois();
        });
        f.addEventListener('input', depois);
    }
    function coleta(el, db) {
        var hoje = D.hoje();
        /* Coleta por dia: não tem lote. Todas as coletas do dia formam o lote da coleta (ex.: 1811) */
        var lista = db.coletas.filter(function (c) { return c.data === hoje && !c.lote; }).sort(function (a, b) { return String(a.criado_em || '').localeCompare(String(b.criado_em || '')); });
        el.innerHTML = '<p class="eyebrow">Vai direto para Granja › Coletas</p><h1 class="titulo-colab">Registrar coleta</h1>' +
            '<p class="nota intro">Não precisa escolher lote: todas as coletas do dia formam o <b>lote da coleta</b>, que segue para o beneficiamento com o mesmo número.</p>' +
            '<div class="lado-a-lado"><form class="card largo" novalidate><div class="form">' +
                '<label>Data da coleta <small class="nota" style="margin:0">(automática: hoje)</small><input type="date" name="data" value="' + hoje + '" readonly></label>' +
                (compartilhado() && pessoaAtual(db) ? '<label>Coletado por<input name="coletado_por" value="' + h(pessoaAtual(db).nome) + '" readonly title="Para lançar em nome de outra pessoa, use Trocar no menu"></label>' :
                 compartilhado() ? campoNome(db, 'coletado_por', quemLanca()) : '<label>Coletado por<input name="coletado_por" value="' + h(usuario.nome) + '"></label>') +
                '<label>Nº da sua coleta hoje<input name="n_coleta" value="' + proximaColeta(db, hoje, quemLanca()) + '" readonly title="Sai sozinho: cada coleta nova é a próxima do dia"></label></div>' +
                '<p class="nota" style="margin:8px 0 0">Fez outra coleta? É só lançar de novo: o número sobe sozinho (1ª, 2ª, 3ª… sem limite).</p>' +
                '<p class="faixa" data-lote-dia style="margin-top:var(--esp-4)"></p>' +
                '<div class="form" style="margin-top:16px">' + contador('Ovos bons', 'bons', 0) + contador('Ovos trincados', 'trincados', 0) + contador('Ovos defeituosos', 'defeituosos', 0) + contador('Ovos sujos', 'sujos', 0) + '</div>' +
                '<p class="faixa ok" data-total></p>' +
                '<div class="form" style="margin-top:8px"><label>Conformidade<select name="conformidade"><option>Conforme</option><option>Não conforme</option></select></label>' +
                '<label style="grid-column:span 2">Observação <small class="nota" style="margin:0">(se não conforme, o que faltou)</small><input name="observacao" placeholder="Ex.: ninho 3 sem cama, faltou recolher no corredor"></label></div>' +
                '<p class="faixa erro" data-erro hidden></p>' +
                '<button class="btn grande" type="submit">Salvar coleta na granja</button></form>' +
            '<div class="card estreito"><h2>Coletas de hoje · lote da coleta ' + h(D.codigoDoDia(db, hoje, '')) + '</h2>' + (lista.map(function (c) {
                return '<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--linha)"><span><b>' + h(c.coletado_por) + '</b> · coleta ' + h(c.n_coleta) +
                    (D.loteDaColeta(db, c) !== D.codigoLoteDia('', hoje) ? ' · lote <b>' + h(D.loteDaColeta(db, c)) + '</b>' : '') + '<br><small class="nota" style="margin:0">' +
                    fmt(c.bons) + ' bons · ' + fmt(c.trincados) + ' trinc. · ' + fmt(c.defeituosos) + ' def. · ' + fmt(c.sujos) + ' sujos' + (c.conformidade === 'Não conforme' ? ' · <b style="color:var(--er-t)">não conforme</b>' : '') + '</small></span><b style="font-size:var(--fs-lg)">' + fmt(D.totalColeta(c)) + '</b></div>';
            }).join('') || '<p class="vazio">Nenhuma coleta lançada hoje.</p>') +
            (lista.length ? '<p class="faixa ok" style="margin-top:12px"><b>Total do dia: ' + fmt(lista.reduce(function (t, c) { return t + D.totalColeta(c); }, 0)) + ' ovos</b> em ' + lista.length + ' coleta(s)</p>' : '') + '</div></div>';

        var f = $('form', el);
        var total = function () {
            var v = { bons: f.bons.value, trincados: f.trincados.value, defeituosos: f.defeituosos.value, sujos: f.sujos.value };
            $('[data-total]', el).innerHTML = 'Total da coleta: <b style="font-size:var(--fs-xl)">' + fmt(D.totalColeta(v)) + '</b> ovos (bons: ' + fmt(v.bons) + ' · descarte: ' + fmt(n(v.trincados) + n(v.defeituosos) + n(v.sujos)) + ')';
        };
        /* Lote da coleta: nasce na 1ª coleta do dia e junta as outras */
        var loteDia = function () {
            var data = f.data.value, cod = D.loteDestino(db, data, '');
            var ja = db.coletas.filter(function (c) { return c.data === data && !c.lote && D.loteDaColeta(db, c) === cod; });
            var recebido = db.recebimentos.find(function (r) { return r.data_postura === data && !r.lote_granja; });
            $('[data-lote-dia]', el).innerHTML = recebido && cod === recebido.lote_receb
                ? 'O lote da coleta <b>' + h(cod) + '</b> já foi recebido no beneficiamento: esta coleta vai ser <b>somada a ele</b> (mesmo lote).'
                : !ja.length && recebido
                ? 'O lote ' + h(recebido.lote_receb) + ' já foi beneficiado. Esta coleta vai como complemento: <b>lote ' + h(cod) + '</b>.'
                : ja.length
                ? 'Esta coleta entra no <b>lote da coleta ' + h(cod) + '</b>, que já tem ' + fmt(ja.reduce(function (t, c) { return t + D.totalColeta(c); }, 0)) + ' ovos de ' + ja.length + ' coleta(s).'
                : 'Esta é a 1ª coleta do dia: ela cria o <b>lote da coleta ' + h(cod) + '</b>.';
        };
        ligarContadores(f, total); total(); loteDia();
        var sugerir = function () { f.n_coleta.value = proximaColeta(db, f.data.value, f.coletado_por.value.trim()); loteDia(); };
        f.data.addEventListener('change', sugerir); f.coletado_por.addEventListener('change', sugerir); f.coletado_por.addEventListener('input', sugerir);
        if (compartilhado() && !f.coletado_por.value) f.coletado_por.focus();
        f.addEventListener('submit', async function (e) {
            e.preventDefault();
            var erro = $('[data-erro]', el), b = f.querySelector('[type=submit]');
            f.data.value = D.hoje();                                                                     // o dia é sempre o de hoje (sem erro de data)
            f.n_coleta.value = proximaColeta(API.dados(), f.data.value, f.coletado_por.value.trim());   // confere de novo na hora de salvar
            var v = { data: f.data.value, lote: '', n_coleta: f.n_coleta.value, coletado_por: f.coletado_por.value.trim(),
                bons: n(f.bons.value), trincados: n(f.trincados.value), defeituosos: n(f.defeituosos.value), sujos: n(f.sujos.value),
                conformidade: f.conformidade.value, observacao: f.observacao.value.trim() };
            var falha = !v.coletado_por ? (compartilhado() ? 'Escreva o seu nome em "Seu nome" (este login é usado por várias pessoas).' : 'Informe quem coletou.') : !D.totalColeta(v) ? 'Informe a quantidade de ovos.' :
                v.conformidade === 'Não conforme' && !v.observacao ? 'Não conforme: escreva na observação o que faltou.' :
                db.coletas.some(function (c) { return c.data === v.data && String(c.coletado_por) === v.coletado_por && String(c.n_coleta) === v.n_coleta; }) ? 'A sua coleta nº ' + v.n_coleta + ' deste dia já foi lançada.' : '';
            if (falha) { erro.textContent = falha; erro.hidden = false; return; }
            lembrarQuem(v.coletado_por);
            b.disabled = true; b.textContent = 'Salvando na granja…';
            try {
                var cod = D.loteDestino(db, v.data, '');
                await API.salvar('coletas', v, null, S, 'Lançou coleta nº ' + v.n_coleta + ' · lote da coleta ' + cod + ' · ' + D.br(v.data) + ' · ' + D.totalColeta(v) + ' ovos (pela área das colaboradoras)');
                UI.avisar('Coleta nº ' + v.n_coleta + ' salva no lote da coleta ' + cod + '. Pode lançar a próxima.'); abrir();
            } catch (err) { erro.textContent = err.message; erro.hidden = false; b.disabled = false; b.textContent = 'Salvar coleta na granja'; }
        });
    }


    /* =====================================================
       4. REGISTRAR MORTALIDADE
       ===================================================== */
    var motivo = 'Briga';
    function mortalidade(el, db) {
        var lote = (meusLotes(db)[0] || {}).lote || '';
        var recentes = db.mortalidade.filter(function (r) { return ehMeu(db, r.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 6);
        el.innerHTML = '<p class="eyebrow">Vai direto para Granja › Mortalidade</p><h1 class="titulo-colab">Registrar mortalidade</h1>' +
            '<p class="nota intro">O que você salvar aqui entra em Granja › Mortalidade e já atualiza o número de aves vivas do lote.</p>' +
            '<div class="lado-a-lado"><form class="card largo" novalidate><div class="form">' +
                '<label>Data<input type="date" name="data" value="' + D.hoje() + '"></label><label>Lote<select name="lote">' + opcoesLotes(db, lote) + '</select></label></div>' +
                '<div class="form" style="margin-top:16px">' + contador('Mortes', 'mortes', 0, 'Aves encontradas mortas') + contador('Abate', 'abate', 0, 'Aves sacrificadas ou retiradas') + '</div>' +
                '<fieldset style="margin:16px 0 0;padding:0;border:0"><legend class="rotulo">Motivo</legend><div class="motivos">' +
                    D.MOTIVOS.map(function (m) { return '<button type="button" data-motivo="' + h(m) + '" aria-pressed="' + (m === motivo) + '" class="' + (m === motivo ? 'ativo' : '') + '">' + h(m) + '</button>'; }).join('') + '</div></fieldset>' +
                '<label style="margin-top:16px">Observação<textarea name="observacao" rows="2" placeholder="O que foi visto (opcional)"></textarea></label>' +
                '<p class="faixa" data-resumo></p><button class="btn grande" type="submit">Salvar mortalidade na granja</button></form>' +
            '<div class="estreito"><div class="card"><h2 data-titulo-aves></h2><div class="indicadores" data-aves style="grid-template-columns:repeat(3,minmax(0,1fr))"></div></div>' +
            '<div class="card"><h2>Mortalidade recente nos seus lotes</h2>' + (recentes.map(function (r) {
                return '<div class="faixa erro"><b>' + (n(r.mortes) ? r.mortes + ' morte(s)' : '') + (n(r.mortes) && n(r.abate) ? ' · ' : '') + (n(r.abate) ? r.abate + ' abate(s)' : '') + ' · ' + h(r.motivo) + '</b><br><small>' +
                    D.br(r.data) + ' · Lote ' + h(r.lote) + (r.observacao ? ' · ' + h(r.observacao) : '') + ' · lançado por ' + h(r.lancado_por) + '</small></div>';
            }).join('') || '<p class="vazio">Nenhuma mortalidade lançada.</p>') + '</div></div></div>';

        var f = $('form', el);
        var atualizar = function () {
            var l = D.acharLote(db, f.lote.value);
            var vivas = l ? D.avesVivas(db, l) : 0, total = n(f.mortes.value) + n(f.abate.value);
            $('[data-titulo-aves]', el).textContent = 'Aves do ' + (l ? D.nomeLote(db, l.lote) : 'lote');
            $('[data-aves]', el).innerHTML = ind('Alojadas', fmt(l ? l.aves_iniciais : 0), '') + ind('Vivas', fmt(vivas - total), 'depois deste lançamento') + ind('Perdas', fmt(n(l && l.aves_iniciais) - vivas + total), '', true);
            var r = $('[data-resumo]', el);
            r.className = 'faixa ' + (total ? 'atencao' : 'ok');
            r.textContent = total ? 'Vai lançar ' + f.mortes.value + ' morte(s) e ' + f.abate.value + ' abate(s) · motivo ' + motivo + '. O lote passa a ter ' + fmt(vivas - total) + ' aves vivas.' : 'Sem mortes nem abates: vai registrar que o lote não teve perdas.';
        };
        ligarContadores(f, atualizar);
        f.lote.addEventListener('change', atualizar);
        UI.ligar(el, '[data-motivo]', 'click', function (e, b) {
            motivo = b.dataset.motivo;
            UI.$$('[data-motivo]', el).forEach(function (x) { x.classList.toggle('ativo', x === b); x.setAttribute('aria-pressed', x === b); });
            atualizar();
        });
        atualizar();
        f.addEventListener('submit', async function (e) {
            e.preventDefault();
            var v = { data: f.data.value, lote: f.lote.value, mortes: n(f.mortes.value), abate: n(f.abate.value), motivo: motivo, observacao: f.observacao.value.trim() };
            var l = D.acharLote(db, v.lote);
            if (!l) { UI.avisar('Escolha o lote.'); return; }
            if (v.mortes + v.abate < 1) v.motivo = 'Sem perdas';   // pode salvar zerado (registra que não houve perdas)
            if (v.mortes + v.abate > D.avesVivas(db, l)) { UI.avisar('O número passa das aves vivas do lote.'); return; }
            var b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Salvando na granja…';
            try {
                await API.salvar('mortalidade', v, null, S, 'Lançou mortalidade · Lote ' + v.lote + ' · ' + v.mortes + ' morte(s), ' + v.abate + ' abate(s) · ' + v.motivo);
                UI.avisar('Mortalidade salva na granja'); abrir();
            } catch (err) { UI.avisar(err.message); b.disabled = false; b.textContent = 'Salvar mortalidade na granja'; }
        });
    }


    /* =====================================================
       5. CHECKLIST DO DIA
       Um por lote, todos os dias. Duas abas: lote e serviços gerais.
       ===================================================== */
    var ck = { lote: null, tipo: 'lote', respostas: {}, chave: '', aberto: false };
    document.addEventListener('keydown', function (e) {   // Esc fecha a janela do checklist
        if (e.key === 'Escape' && ck.aberto && /^#checklist/.test(location.hash)) { ck.aberto = false; ck.chave = ''; abrir(); }
    });
    function checklist(el, db) {
        var m = /lote=([^&]+)/.exec(location.hash);
        var lotes = meusLotes(db), todos = checklistsDeHoje(db);
        if (m) { ck.lote = decodeURIComponent(m[1]); ck.tipo = 'lote'; ck.aberto = true; history.replaceState(null, '', '#checklist'); }   // veio do resumo: já abre a janela do lote
        /* Um checklist para cada lote de aves cadastrado: abre o primeiro que falta */
        var atual = todos.find(function (x) { return x.tipo === ck.tipo && (x.tipo === 'geral' || String(x.lote) === String(ck.lote)); });
        if (!atual) { atual = todos.find(function (x) { return !x.feito; }) || todos[0]; ck.tipo = atual.tipo; ck.lote = atual.lote; }
        if (ck.tipo === 'geral') ck.lote = '';
        var itens = ck.tipo === 'geral' ? D.CHECK_GERAL : D.CHECK_LOTE;
        var feito = (ck.tipo === 'geral' || ck.lote) ? checklistDeHoje(db, ck.lote, ck.tipo) : null;
        var chave = ck.lote + '|' + ck.tipo;
        if (ck.chave !== chave) { ck.chave = chave; ck.respostas = feito ? D.lerJSON(feito.respostas, []).reduce(function (o, x, i) { o[i] = x; return o; }, {}) : {}; }

        var historico = db.checklist_colab.filter(function (c) { return ck.tipo === 'geral' ? c.tipo === 'geral' : c.tipo === 'lote' && String(c.lote) === String(ck.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 7);

        /* Página: um cartão por lote (+ serviços gerais) com o botão "Responder".
           O checklist abre numa janela (popup) por cima. */
        var cartoes = '<div class="ck-cartoes">' + todos.map(function (x) {
            return '<div class="ck-cartao' + (x.feito ? ' feito' : '') + '"><b>' + h(x.nome) + '</b>' +
                '<span>' + (x.feito ? '✓ Feito por ' + h(x.feito.colaboradora) + (n(x.feito.nc) ? ' · NC ' + x.feito.nc : '') : 'Pendente hoje') + '</span>' +
                '<button type="button" class="btn ' + (x.feito ? 'alt ' : '') + 'pequeno" data-ck="' + x.tipo + '|' + h(x.lote) + '">' + (x.feito ? 'Ver / refazer' : 'Responder') + '</button></div>';
        }).join('') + '</div>';
        var ultimos = db.checklist_colab.filter(function (c) { return c.tipo === 'geral' || todos.some(function (x) { return x.tipo === 'lote' && String(x.lote) === String(c.lote); }); })
            .sort(function (a, b) { return String(b.data + b.lote).localeCompare(String(a.data + a.lote)); }).slice(0, 12);

        var janela = !ck.aberto ? '' : '<div class="janela-fundo"><div class="janela janela-larga" role="dialog" aria-modal="true">' +
                '<div class="janela-cabeca"><div><h2>' + (ck.tipo === 'geral' ? 'Serviços gerais' : 'Checklist · ' + h(D.nomeLote(db, ck.lote))) + ' · hoje</h2><p class="nota" style="margin:4px 0 0">' +
                    (feito ? 'Salvo por ' + h(feito.colaboradora) + '. Se refizer, fica registrado quem alterou.' : ck.tipo === 'geral' ? 'Vestiário, sala de coleta e áreas comuns' : 'Marque Conforme ou Não conforme em cada item') + '</p></div>' +
                    '<div style="display:flex;gap:8px;align-items:center"><span data-situacao></span><button type="button" class="btn alt pequeno" data-fechar-ck aria-label="Fechar">✕</button></div></div>' +
                '<div class="progresso"><i data-barra></i></div><p class="nota" data-contagem style="margin:0 0 12px"></p>' +
                '<div class="checkgrade">' + itens.map(function (t, i) {
                    return '<div class="checkitem" data-item="' + i + '"><p>' + (i + 1) + '. ' + h(t) + '</p><div class="checkopcoes">' +
                        '<button type="button" class="c" data-resp="' + i + '|C">Conforme</button><button type="button" class="nc" data-resp="' + i + '|NC">Não conforme</button></div></div>';
                }).join('') + '</div>' +
                (compartilhado() && !pessoaAtual(db) ? '<div class="form" style="margin-top:16px">' + campoNome(db, 'quem_fez', feito ? feito.colaboradora : quemLanca()).replace('name="quem_fez"', 'name="quem_fez" data-quem') + '</div>' : '') +
                '<label style="margin-top:16px">Observação (opcional)<textarea data-obs rows="2" placeholder="Algo que a gestão precisa saber hoje">' + h(feito ? feito.observacao : '') + '</textarea></label>' +
                '<div class="acoes" style="margin-top:16px"><button class="btn grande" data-salvar>' + (feito ? 'Salvar alterações do checklist de hoje' : 'Salvar checklist de hoje') + '</button>' +
                '<button type="button" class="btn alt" data-fechar-ck>Cancelar</button></div>' +
                (historico.length ? '<h3 class="subtitulo">Últimos dias deste ' + (ck.tipo === 'geral' ? 'checklist' : 'lote') + '</h3><p class="nota" style="margin:0">' + historico.map(function (c) {
                    return D.br(c.data) + ': ' + (n(c.nc) ? '<b style="color:var(--er-t)">NC ' + c.nc + '</b>' : 'tudo conforme');
                }).join(' · ') + '</p>' : '') +
            '</div></div>';

        el.innerHTML = '<p class="eyebrow">Checklist diário · ' + UI.dataExtenso() + '</p><h1 class="titulo-colab">Checklist do dia</h1>' +
            '<p class="nota intro">Todos os dias: <b>um checklist para cada lote seu</b> e um de serviços gerais. Toque em <b>Responder</b> no cartão do lote.</p>' +
            (lotes.length ? '' : '<div class="faixa atencao">Nenhum lote de aves cadastrado (ou liberado para você). Por enquanto só aparece o de serviços gerais.</div>') +
            cartoes +
            '<div class="card"><h2>Últimos checklists</h2>' + (ultimos.map(function (c) {
                return '<div style="padding:10px 0;border-bottom:1px solid var(--linha)"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + D.br(c.data) + ' · ' + (c.tipo === 'geral' ? 'Serviços gerais' : 'Lote ' + h(c.lote)) + '</b>' +
                    UI.tag(n(c.nc) ? 'NC ' + c.nc : 'Tudo conforme', n(c.nc) ? 'erro' : 'ok') + '</div><small class="nota" style="margin:0">C=' + c.c + ' · NC=' + c.nc + ' · por ' + h(c.colaboradora) + (c.observacao ? ' · ' + h(c.observacao) : '') + '</small></div>';
            }).join('') || '<p class="vazio">Nenhum checklist ainda.</p>') + '</div>' +
            janela;

        UI.ligar(el, '[data-ck]', 'click', function (e, b) { var p = b.dataset.ck.split('|'); ck.tipo = p[0]; ck.lote = p[1]; ck.aberto = true; history.replaceState(null, '', '#checklist'); checklist(el, db); });
        UI.ligar(el, '[data-fechar-ck]', 'click', function () { ck.aberto = false; ck.chave = ''; checklist(el, db); });
        if (!ck.aberto) return;

        var marcar = function () {
            var feitos = Object.keys(ck.respostas).length, c = Object.keys(ck.respostas).filter(function (k) { return ck.respostas[k] === 'C'; }).length;
            UI.$$('[data-item]', el).forEach(function (box) {
                var r = ck.respostas[box.dataset.item];
                box.className = 'checkitem' + (r === 'C' ? ' c' : r === 'NC' ? ' nc' : '');
                UI.$$('[data-resp]', box).forEach(function (b) { var on = b.dataset.resp.split('|')[1] === r; b.classList.toggle('marcado', on); b.setAttribute('aria-pressed', on); });
            });
            $('[data-barra]', el).style.width = (feitos / itens.length * 100) + '%';
            $('[data-contagem]', el).innerHTML = '<b>' + feitos + '</b> de ' + itens.length + ' respondidos · <span style="color:var(--ok-t)">Conforme: ' + c + '</span> · <span style="color:var(--er-t)">Não conforme: ' + (feitos - c) + '</span>';
            $('[data-situacao]', el).innerHTML = feitos === itens.length ? UI.tag(feito ? 'Feito hoje' : 'Pronto para salvar', 'ok') : UI.tag('Pendente hoje', 'atencao');
        };
        marcar();
        UI.ligar(el, '[data-resp]', 'click', function (e, b) { var p = b.dataset.resp.split('|'); ck.respostas[p[0]] = p[1]; marcar(); });
        UI.ligar(el, '[data-salvar]', 'click', async function (e, b) {
            if (ck.tipo === 'lote' && !ck.lote) return;
            var resp = itens.map(function (_, i) { return ck.respostas[i]; });
            if (resp.some(function (x) { return !x; })) { UI.avisar('Responda todos os itens antes de salvar.'); return; }
            var c = resp.filter(function (x) { return x === 'C'; }).length;
            var quem = !compartilhado() ? usuario.nome : pessoaAtual(db) ? pessoaAtual(db).nome : $('[data-quem]', el).value.trim();
            if (!quem) { UI.avisar('Escreva o seu nome em "Seu nome" antes de salvar.'); $('[data-quem]', el).focus(); return; }
            lembrarQuem(quem);
            var v = { data: D.hoje(), lote: ck.lote, tipo: ck.tipo, colaboradora: quem, respostas: JSON.stringify(resp), c: c, nc: resp.length - c, observacao: $('[data-obs]', el).value.trim() };
            b.disabled = true; b.textContent = 'Salvando…';
            try {
                await API.salvar('checklist_colab', v, feito && feito.id, S, (feito ? 'Refez' : 'Concluiu') + ' o checklist do dia · ' + (ck.tipo === 'geral' ? 'Serviços gerais' : 'Lote ' + ck.lote) + ' · C=' + c + ' NC=' + (resp.length - c));
                ck.chave = ''; ck.aberto = false; UI.avisar('Checklist de hoje salvo'); abrir();
            } catch (err) { UI.avisar(err.message); b.disabled = false; b.textContent = 'Salvar checklist de hoje'; }
        });
    }


    /* =====================================================
       6. AVISOS
       A colaboradora avisa um problema (bebedouro vazando, ave doente,
       falta de ração…). Vai para os administradores em ALERTAS › Alertas
       e no sino. Ela acompanha aqui se já foi resolvido.
       ===================================================== */
    var gravidade = 'Atenção';
    function meusAvisos(db) {
        return db.alertas.filter(function (a) { return String(a.registrado_por) === String(usuario.nome); })
            .sort(function (a, b) { return String(b.data + (b.criado_em || '')).localeCompare(String(a.data + (a.criado_em || ''))); });
    }
    /* SININHO: os avisos dela (abertos e resolvidos nos últimos dias), igual ao sino da gestão */
    function montarSino(db) {
        var sino = $('#botao-avisos');
        sino.hidden = false;   // sempre: mostra as coletas que faltam e, se liberado, os avisos dela
        var abertos = meusAvisos(db).filter(function (a) { return a.resolvido !== 'Sim'; }).length + D.pendencias(db, quemPendencias(db)).length;
        sino.innerHTML = UI.icone('sino') + (abertos ? '<span class="contador">' + abertos + '</span>' : '');
        sino.onclick = function (e) { e.preventDefault(); janelaAvisos(); };
    }
    function janelaAvisos() {
        var pend = D.pendencias(API.dados(), quemPendencias(API.dados()));
        var podeAvisar = D.podeVer(usuario, 'c-avisos');
        var lista = podeAvisar ? meusAvisos(API.dados()) : [], abertos = lista.filter(function (a) { return a.resolvido !== 'Sim'; }), feitos = lista.filter(function (a) { return a.resolvido === 'Sim'; }).slice(0, 5);
        var item = function (a) {
            return '<div class="item-aviso"><span><b>' + (a.resolvido === 'Sim' ? '✓ Resolvido' : 'Aguardando') + ' · ' + h(a.gravidade) + '</b> · ' + h(a.descricao) +
                '<br><small class="nota" style="margin:0">' + D.br(a.data) + (a.lote ? ' · Lote ' + h(a.lote) : ' · Geral') + '</small></span></div>';
        };
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<div class="janela" style="max-width:520px"><h2>Meus avisos</h2>' +
            (pend.length ? '<h3 class="subtitulo">Suas coletas</h3>' + pend.map(function (p) {
                return '<div class="item-aviso"><span><b style="color:var(--' + (p.grav === 'erro' ? 'er' : 'at') + '-t)">' + h(p.titulo) + '</b><br><small class="nota" style="margin:0">' + h(p.grav === 'erro' ? p.texto.replace(/ Um administrador.*$/, ' Avise um administrador.') : p.texto) + '</small></span>' +
                    (p.grav === 'erro' ? '' : '<a class="btn pequeno" href="#coleta">Registrar</a>') + '</div>';
            }).join('') : '') +
            (!podeAvisar ? (pend.length ? '' : '<p class="vazio">Nenhuma pendência.</p>') : '<h3 class="subtitulo">Aguardando os administradores</h3>' + (abertos.map(item).join('') || '<p class="vazio">Nenhum aviso aberto.</p>') +
            '<h3 class="subtitulo">Resolvidos</h3>' + (feitos.map(item).join('') || '<p class="vazio">Nenhum ainda.</p>')) +
            '<div class="acoes">' + (podeAvisar ? '<a class="btn" href="#avisos">Mandar um aviso</a>' : '') + '<button class="btn alt" type="button" data-fechar>Fechar</button></div></div>';
        document.body.appendChild(fundo);
        fundo.addEventListener('click', function (e) { if (e.target === fundo || e.target.hasAttribute('data-fechar') || e.target.closest('a')) fundo.remove(); });
    }
    function avisos(el, db) {
        var lista = meusAvisos(db);
        el.innerHTML = '<p class="eyebrow">Vai para os administradores</p><h1 class="titulo-colab">Avisos</h1>' +
            '<p class="nota intro">Viu algum problema na granja? Avise aqui. Os administradores recebem na hora em Alertas e respondem marcando como resolvido.</p>' +
            '<div class="lado-a-lado"><form class="card largo" novalidate>' +
                '<div class="form"><label>Lote<select name="lote"><option value="">Geral (sem lote)</option>' + opcoesLotes(db, '') + '</select></label></div>' +
                '<fieldset style="margin:16px 0 0;padding:0;border:0"><legend class="rotulo">É urgente?</legend><div class="motivos">' +
                    [['Urgente', 'Urgente: resolver agora'], ['Atenção', 'Atenção: pode esperar']].map(function (g) {
                        return '<button type="button" data-gravidade="' + g[0] + '" aria-pressed="' + (g[0] === gravidade) + '" class="' + (g[0] === gravidade ? 'ativo' : '') + '">' + g[1] + '</button>';
                    }).join('') + '</div></fieldset>' +
                '<label style="margin-top:16px">O que aconteceu<textarea name="descricao" rows="4" placeholder="Ex.: bebedouro do lote vazando, ave com o olho inchado, acabou a ração do silo…"></textarea></label>' +
                '<button class="btn grande" type="submit" style="margin-top:16px">Enviar aviso</button></form>' +
            '<div class="estreito"><div class="card"><h2>Meus avisos</h2>' + (lista.slice(0, 15).map(function (a) {
                var ok = a.resolvido === 'Sim';
                return '<div class="faixa ' + (ok ? 'ok' : (a.gravidade === 'Urgente' ? 'erro' : 'atencao')) + '"><b>' + (ok ? '✓ Resolvido' : 'Aguardando') + ' · ' + h(a.gravidade) + (a.lote ? ' · Lote ' + h(a.lote) : '') + '</b><br>' +
                    h(a.descricao) + '<br><small>' + D.br(a.data) + '</small></div>';
            }).join('') || '<p class="vazio">Você ainda não mandou nenhum aviso.</p>') + '</div></div></div>';

        var f = $('form', el);
        UI.contarCaracteres(f.descricao, D.MIN_DESCRICAO, D.MAX_DESCRICAO);
        UI.ligar(el, '[data-gravidade]', 'click', function (e, b) {
            gravidade = b.dataset.gravidade;
            UI.$$('[data-gravidade]', el).forEach(function (x) { x.classList.toggle('ativo', x === b); x.setAttribute('aria-pressed', x === b); });
        });
        f.addEventListener('submit', async function (e) {
            e.preventDefault();
            var v = { data: D.hoje(), lote: f.lote.value, gravidade: gravidade, descricao: f.descricao.value.trim(), registrado_por: usuario.nome, resolvido: 'Não' };
            if (!v.descricao) { UI.avisar('Escreva o que aconteceu.'); f.descricao.focus(); return; }
            var curta = UI.descricaoCurta(v.descricao);
            if (curta) { UI.avisar(curta); f.descricao.focus(); return; }
            var b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Enviando…';
            try {
                await API.salvar('alertas', v, null, S, 'Mandou aviso · ' + v.gravidade + (v.lote ? ' · Lote ' + v.lote : '') + ' · ' + v.descricao);
                UI.avisar('Aviso enviado para os administradores'); abrir();
            } catch (err) { UI.avisar(err.message); b.disabled = false; b.textContent = 'Enviar aviso'; }
        });
    }


    /* =====================================================
       7. ALTERAR SENHA
       ===================================================== */
    function janelaSenha() {
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" style="max-width:440px"><h2>Alterar minha senha</h2><p class="nota" style="margin:0 0 12px">Escolha uma senha que só você conheça.</p>' +
            '<label>Senha atual<input type="password" name="atual"></label><label style="margin-top:12px">Nova senha (mínimo 6 caracteres)<input type="password" name="nova"></label>' +
            '<label style="margin-top:12px">Confirme a nova senha<input type="password" name="repete"></label><p class="msg" hidden></p>' +
            '<div class="acoes"><button class="btn" type="submit">Salvar nova senha</button><button class="btn alt" type="button" data-fechar>Cancelar</button></div></form>';
        document.body.appendChild(fundo);
        fundo.addEventListener('click', function (e) { if (e.target === fundo || e.target.hasAttribute('data-fechar')) fundo.remove(); });
        fundo.querySelector('form').addEventListener('submit', async function (e) {
            e.preventDefault();
            var f = e.target, msg = f.querySelector('.msg');
            var erro = f.nova.value.length < 6 ? 'A nova senha precisa ter pelo menos 6 caracteres.' : f.nova.value !== f.repete.value ? 'As novas senhas não são iguais.' : f.nova.value === f.atual.value ? 'Escolha uma senha diferente da atual.' : '';
            if (erro) { msg.textContent = erro; msg.hidden = false; return; }
            var r = await API.trocarSenha(f.atual.value, f.nova.value);
            if (!r.ok) { msg.textContent = r.erro; msg.hidden = false; return; }
            fundo.remove(); UI.avisar('Senha alterada. Use a nova no próximo login.');
        });
    }

    iniciar();
})();
