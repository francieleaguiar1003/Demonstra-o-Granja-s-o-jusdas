/* =========================================================
   ERP Ovo Caipira · SISTEMA DA GESTÃO (menu, rotas e topo)
   ---------------------------------------------------------
   Cada tela se registra assim (ver js/telas/):
     Sistema.tela('g-lotes', { titulo: 'Lotes', sistema: 'granja',
                               desenhar: function (el, db) { ... } });
   O endereço da página diz qual tela abrir: sistema.html#g-lotes

   Organização deste arquivo:
     1. Registro das telas
     2. Menu lateral (só telas liberadas)
     3. Barra do topo (caminho, selos, sininho com alertas e tarefas do dia, tema)
     4. Abrir uma tela
     5. Trocar senha e sair
     6. Início
   ========================================================= */
var Sistema = (function () {
    'use strict';
    var $ = UI.$, D = Dominio;
    var TELAS = {};
    var gruposFechados = {};
    var usuario = null;


    /* =====================================================
       1. REGISTRO DAS TELAS
       ===================================================== */
    function tela(id, def) { TELAS[id] = def; }
    function nomeDaTela(id) {
        if (id === 'busca') return 'Resultado da busca';
        var todas = D.TELAS_SOLTAS.concat.apply(D.TELAS_SOLTAS, D.SISTEMAS.map(function (s) { return s.telas; }));
        var t = todas.find(function (x) { return x[0] === id; });
        return t ? t[1] : id;
    }
    function sistemaDaTela(id) { return D.SISTEMAS.find(function (s) { return s.telas.some(function (t) { return t[0] === id; }); }); }


    /* =====================================================
       2. MENU LATERAL
       Painel no topo, grupos GRANJA / BENEFICIAMENTO / CADASTROS,
       Relatórios no fim. Só aparece o que a pessoa pode ver.
       ===================================================== */
    function contadores(db) {
        var hoje = D.hoje();
        var alertas = db.alertas.filter(function (a) { return a.resolvido !== 'Sim'; }).length;
        var comprar = db.embalagens.filter(function (e) { return D.situacaoEmbalagem(e, D.saldoEmbalagem(db, e).saldo)[0] === 'Comprar'; }).length;
        return { 'g-conferencia': D.coletasSemConferir ? D.coletasSemConferir(db) : 0, 'g-alertas': alertas, 'b-embalagens': comprar, 'b-pedidos': db.pedidos.filter(function (p) { return p.situacao === 'A entregar'; }).length };
    }
    function montarMenu(atual) {
        var db = API.dados(), cont = contadores(db);
        var item = function (id, nome, ic) {
            if (!D.podeVer(usuario, id)) return '';
            return '<a href="#' + id + '"' + (id === atual ? ' class="ativo" aria-current="page"' : '') + '>' + (ic ? UI.icone(ic) : '') + UI.h(nome) +
                (cont[id] ? '<span class="contador">' + cont[id] + '</span>' : '') + '</a>';
        };
        var html = item('painel', 'Painel', 'painel');
        D.SISTEMAS.forEach(function (s) {
            var itens = s.telas.map(function (t) { return item(t[0], t[1]); }).join('');
            if (!itens) return;
            html += '<div class="grupo' + (gruposFechados[s.id] ? ' fechado' : '') + '">' +
                '<button class="grupo-botao" data-grupo="' + s.id + '" aria-expanded="' + !gruposFechados[s.id] + '"><i class="ponto" style="background:' + s.cor + '"></i><span>' + s.nome + '</span>' +
                '<svg class="seta" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
                '<div class="grupo-itens">' + itens + '</div></div>';
        });
        html += '<div style="margin-top:8px">' + item('relatorios', 'Relatórios', 'relatorio') +
            (D.TELAS_COLAB.some(function (t) { return D.podeVer(usuario, t[0]); }) ? '<a href="colaboradora.html">' + UI.icone('pessoas') + 'Área das colaboradoras</a>' : '') + '</div>';
        $('#menu-itens').innerHTML = html;
        UI.ligar($('#menu-itens'), '[data-grupo]', 'click', function (e, b) { gruposFechados[b.dataset.grupo] = !gruposFechados[b.dataset.grupo]; montarMenu(atual); });
    }


    /* =====================================================
       3. BARRA DO TOPO
       ===================================================== */
    function montarTopo(id) {
        var s = sistemaDaTela(id);
        $('#caminho').innerHTML = (s ? '<span class="sistema-chip ' + s.id + '">' + s.nome + '</span>' : 'Visão geral › ') + '<b>' + UI.h(nomeDaTela(id)) + '</b>';
        /* Recomeçar: só na demonstração local (na online, os dados são preparados na planilha) */
        var selos = !API.nomeDemo ? '' : API.demo && usuario.perfil === 'Administrador'
            ? '<button class="selo-demo" type="button" data-zerar-demo title="Recomeçar a demonstração (zerada, só cadastros, 1 semana ou 1 mês)">Demonstração · recomeçar</button> '
            : '<span class="selo-demo">' + UI.h(API.nomeDemo) + '</span> ' + UI.seloTrocarVersao();
        selos += UI.selosFila();
        $('#selos').innerHTML = selos;
        UI.ligarSelosFila($('#selos'), atualizar);
        var zerar = $('[data-zerar-demo]');
        if (zerar) zerar.onclick = function () {
            /* Demonstração: voltar ao sítio de exemplo ou começar zerada */
            var fundo = document.createElement('div');
            fundo.className = 'janela-fundo';
            var MODOS = [
                ['zerado', 'Zerada', 'O sistema do zero: só os 3 logins, sem nenhum cadastro.'],
                ['cadastros', 'Só os cadastros', 'Lotes das aves, linhagens, produtos e clientes. Nenhum lançamento.'],
                ['semana', '1 semana de demonstração', 'Cadastros + 7 dias de coletas, conferências, beneficiamento e pedidos.'],
                ['mes', '1 mês de demonstração', 'Cadastros + 30 dias de coletas, conferências, beneficiamento e pedidos.']
            ];
            fundo.innerHTML = '<div class="janela" style="max-width:560px"><div class="janela-cabeca"><h2>Recomeçar a demonstração</h2><button type="button" class="btn alt pequeno" data-fechar aria-label="Fechar">✕</button></div>' +
                '<p class="nota intro">Escolha como começar. Em todas, entram só os 3 logins (<b>admin</b>, <b>granja</b> e <b>coleta</b>, senha demo123), e tudo o que foi lançado na demonstração é apagado.</p>' +
                '<div class="modos-demo">' + MODOS.map(function (m) {
                    return '<button type="button" class="modo-demo" data-modo="' + m[0] + '"><b>' + m[1] + '</b><small>' + m[2] + '</small></button>';
                }).join('') + '</div>' +
                '<div class="acoes"><button class="btn alt" data-fechar>Cancelar</button></div></div>';
            document.body.appendChild(fundo);
            fundo.addEventListener('click', function (e) {
                var b = e.target.closest('[data-modo]');
                if (b) {
                    if (!confirm('Recomeçar a demonstração como "' + b.querySelector('b').textContent + '"? Tudo o que foi lançado até agora na demonstração é apagado.')) return;
                    API.restaurarExemplo(b.dataset.modo); API.sair(); location.replace('index.html'); return;   // volta para a entrada
                }
                if (e.target === fundo || e.target.hasAttribute('data-fechar')) fundo.remove();
            });
        };
        var db = API.dados();
        /* Sininho para todos: pendências (coleta não lançada, conferência).
           Tarefas e alertas continuam só para o administrador. */
        var admin = usuario.perfil === 'Administrador';
        var urgentes = D.pendencias(db).length + (admin ? db.alertas.filter(function (a) { return a.resolvido !== 'Sim'; }).length + minhasTarefas(db).filter(function (t) { return !t.feita; }).length : 0);
        var sino = $('#botao-avisos');
        sino.innerHTML = UI.icone('sino') + (urgentes ? '<span class="contador">' + urgentes + '</span>' : '');
        sino.onclick = function (e) { e.preventDefault(); janelaAvisos(); };
        sino.hidden = false;
    }

    /* SININHO: tarefas de hoje (as do responsável primeiro) e alertas abertos */
    var simples = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); };
    function ehResponsavel(t) {
        var r = simples(t.responsavel), nome = simples(usuario.nome).split(' ')[0], login = simples(usuario.usuario);
        return !!r && (r.indexOf(nome) >= 0 || r === login || r === 'todos' || r === 'equipe');
    }
    function minhasTarefas(db) { return D.tarefasDoDia(db, D.hoje()).filter(function (x) { return ehResponsavel(x.tarefa); }); }
    /* NOTIFICAÇÃO AO ABRIR O SISTEMA (administradores): se houver alerta aberto ou tarefa
       de hoje por fazer, a janela de avisos abre sozinha, uma vez por login/aba. */
    function notificarAoAbrir() {
        if (usuario.perfil !== 'Administrador') return;
        var s = API.sessao() || {};
        var chave = API.PREFIXO + 'erp-ovo-notificou-' + s.token + '-' + usuario.usuario + '-' + (s.criado || '');   // uma vez por login e por aba aberta
        try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, '1'); } catch (e) { /* segue */ }
        var db = API.dados();
        var alertas = db.alertas.filter(function (a) { return a.resolvido !== 'Sim'; }).length;
        var tarefas = D.tarefasDoDia(db, D.hoje()).filter(function (x) { return !x.feita; }).length;
        if (!alertas && !tarefas) return;
        janelaAvisos('Olá, ' + usuario.nome.split(' ')[0] + '! Você tem ' +
            [alertas ? alertas + ' alerta(s) aberto(s)' : '', tarefas ? tarefas + ' tarefa(s) para hoje' : ''].filter(Boolean).join(' e '));
    }
    function janelaAvisos(chamada) {
        var db = API.dados(), hoje = D.tarefasDoDia(db, D.hoje());
        var minhas = hoje.filter(function (x) { return ehResponsavel(x.tarefa); }), outras = hoje.filter(function (x) { return !ehResponsavel(x.tarefa); });
        var alertas = db.alertas.filter(function (a) { return a.resolvido !== 'Sim'; });
        var admin = usuario.perfil === 'Administrador', pend = D.pendencias(db);
        var linhaTarefa = function (x) {
            var t = x.tarefa;
            return '<div class="item-aviso"><span><b>' + UI.h(t.descricao) + '</b>' + (t.obrigatoria === 'Sim' ? ' ' + UI.tag('obrigatória', 'erro') : '') +
                '<br><small class="nota" style="margin:0">' + (t.lote ? 'Lote ' + UI.h(t.lote) + ' · ' : '') + 'Responsável: ' + UI.h(t.responsavel) +
                (x.feita ? ' · <b style="color:var(--ok-t)">feita por ' + UI.h(x.feita.feita_por) + '</b>' + (x.feita.observacao ? ': ' + UI.h(x.feita.observacao) : '') : '') + '</small></span>' +
                (x.feita ? UI.tag('Feita', 'ok') : '<button class="btn pequeno" data-feita="' + UI.h(t.id) + '">Marcar feita</button>') + '</div>';
        };
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<div class="janela" style="max-width:640px;width:100%"><h2>' + (typeof chamada === 'string' ? UI.h(chamada) : 'Avisos de hoje') + '</h2>' +
            '<h3 class="subtitulo">Pendências da granja</h3>' + (pend.map(function (p) {
                return '<div class="item-aviso"><span><b style="color:var(--' + (p.grav === 'erro' ? 'er' : 'at') + '-t)">' + UI.h(p.titulo) + '</b><br><small class="nota" style="margin:0">' + UI.h(p.texto) + '</small></span>' +
                    (D.podeVer(usuario, p.link) ? '<a class="btn alt pequeno" href="#' + p.link + '">Ver</a>' : '') + '</div>';
            }).join('') || '<p class="vazio">Nenhuma pendência: todas lançaram e tudo foi conferido.</p>') +
            (!admin ? '' : '<h3 class="subtitulo">Suas tarefas de hoje</h3>' + (minhas.map(linhaTarefa).join('') || '<p class="vazio">Nenhuma tarefa sua hoje.</p>') +
            (outras.length ? '<h3 class="subtitulo">Outras tarefas de hoje</h3>' + outras.map(linhaTarefa).join('') : '') +
            '<h3 class="subtitulo">Alertas abertos</h3>' + (alertas.map(function (a) {
                return '<div class="item-aviso"><span><b>' + UI.h(a.gravidade) + '</b> · ' + UI.h(a.descricao) + '<br><small class="nota" style="margin:0">' + D.br(a.data) + (a.lote ? ' · Lote ' + UI.h(a.lote) : '') + (a.registrado_por ? ' · aviso de ' + UI.h(a.registrado_por) : '') + '</small></span>' +
                    (D.podeVer(usuario, 'g-alertas') ? '<a class="btn alt pequeno" href="#g-alertas">Ver</a>' : '') + '</div>';
            }).join('') || '<p class="vazio">Nenhum alerta aberto.</p>')) +
            '<div class="acoes"><button class="btn alt" type="button" data-fechar>Fechar</button></div></div>';
        document.body.appendChild(fundo);
        var fechar = function () { fundo.remove(); };
        fundo.addEventListener('click', function (e) {
            if (e.target === fundo || e.target.hasAttribute('data-fechar') || e.target.closest('a')) { fechar(); return; }
            var b = e.target.closest('[data-feita]');
            if (b) { fechar(); marcarTarefa(db.tarefas.find(function (t) { return t.id === b.dataset.feita; })); }
        });
    }
    /* Marca a tarefa como feita hoje, com observação (fica no histórico) */
    function marcarTarefa(t, data) {
        data = data || D.hoje();
        UI.abrirJanela({ tabela: 'tarefas_feitas', titulo: 'Tarefa feita · ' + t.descricao, campos: ['data', 'feita_por', 'observacao'], soLer: ['data'],
            valores: { tarefa: t.id, data: data, feita_por: usuario.nome, observacao: '' },
            aoSalvar: async function (v) {
                v.tarefa = t.id;
                await API.salvar('tarefas_feitas', v, null, 'Granja', 'Tarefa feita: ' + t.descricao + (v.observacao ? ' · ' + v.observacao : ''));
                UI.avisar('Tarefa marcada como feita'); atualizar();
            } });
    }


    /* =====================================================
       4. ABRIR UMA TELA
       ===================================================== */
    function abrir() {
        var id = (location.hash || '#painel').slice(1).split('?')[0] || 'painel';
        if (!TELAS[id] || !D.podeVer(usuario, id)) id = 'painel';
        montarMenu(id);
        montarTopo(id);
        var el = $('#tela');
        try {
            TELAS[id].desenhar(el, API.dados());
            /* Selo do PAC (Plano de Autocontrole) no título das telas que fazem parte dele */
            var pac = Dominio.PAC[id], h1 = el.querySelector('h1');
            if (pac && h1 && !h1.querySelector('.selo-pac')) h1.insertAdjacentHTML('beforeend', ' <span class="tag selo-pac" title="' + UI.h(pac) + '">' + UI.h(pac.split(' · ')[0]) + '</span>');
        } catch (err) {
            console.error(err);
            el.innerHTML = '<div class="card"><h2>Não foi possível abrir esta tela</h2><p class="nota">' + UI.h(err.message) + '</p></div>';
        }
        document.body.classList.remove('menu-aberto');
        document.title = nomeDaTela(id) + ' · ERP Ovo Caipira';
    }
    /* Redesenha a tela atual (depois de salvar algo) */
    function atualizar() { abrir(); }
    /* Lê a planilha de novo e redesenha */
    async function recarregar() { await API.carregar(); abrir(); }


    /* =====================================================
       5. TROCAR SENHA E SAIR
       ===================================================== */
    function janelaSenha() {
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" style="max-width:420px"><h2>Trocar minha senha</h2>' +
            '<label>Senha atual<input type="password" name="atual" required></label>' +
            '<label style="margin-top:12px">Nova senha (mínimo 6 caracteres)<input type="password" name="nova" minlength="6" required></label>' +
            '<label style="margin-top:12px">Repita a nova senha<input type="password" name="repete" required></label>' +
            '<p class="msg" hidden></p><div class="acoes"><button class="btn" type="submit">Salvar</button><button class="btn alt" type="button" data-fechar>Cancelar</button></div></form>';
        document.body.appendChild(fundo);
        fundo.addEventListener('click', function (e) { if (e.target === fundo || e.target.hasAttribute('data-fechar')) fundo.remove(); });
        fundo.querySelector('form').addEventListener('submit', async function (e) {
            e.preventDefault();
            var f = e.target, msg = f.querySelector('.msg');
            if (f.nova.value.length < 6) { msg.textContent = 'A nova senha precisa ter pelo menos 6 caracteres.'; msg.hidden = false; return; }
            if (f.nova.value !== f.repete.value) { msg.textContent = 'As novas senhas não são iguais.'; msg.hidden = false; return; }
            var r = await API.trocarSenha(f.atual.value, f.nova.value);
            if (!r.ok) { msg.textContent = r.erro; msg.hidden = false; return; }
            fundo.remove(); UI.avisar('Senha trocada. Use a nova no próximo login.');
        });
    }
    function sair() { API.sair(); location.replace('index.html'); }


    /* =====================================================
       6. INÍCIO
       ===================================================== */
    async function iniciar() {
        usuario = UI.exigirLogin(false);
        if (!usuario) return;
        $('#menu-avatar').textContent = usuario.nome.charAt(0);
        $('#menu-nome').textContent = usuario.nome;
        $('#menu-perfil').textContent = usuario.perfil;
        $('#menu-nome').parentNode.title = usuario.nome + ' · ' + usuario.perfil;   // nome inteiro ao passar o mouse
        $('#botao-senha').innerHTML = UI.icone('chave') + 'Trocar senha';
        $('#botao-sair').innerHTML = UI.icone('sair') + 'Sair';
        $('#botao-tema').innerHTML = UI.ICONE_TEMA;
        $('#botao-menu').innerHTML = UI.icone('menu');
        $('#icone-busca').innerHTML = '<span style="display:inline-flex;width:16px;color:var(--suave)">' + UI.icone('busca') + '</span>';
        $('#botao-tema').addEventListener('click', UI.trocarTema);
        $('#botao-senha').addEventListener('click', janelaSenha);
        $('#botao-sair').addEventListener('click', sair);
        $('#botao-menu').addEventListener('click', function () { document.body.classList.add('menu-aberto'); });
        $('#fundo-menu').addEventListener('click', function () { document.body.classList.remove('menu-aberto'); });
        $('#busca-geral').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && this.value.trim()) { location.hash = 'busca?q=' + encodeURIComponent(this.value.trim()); }
        });
        window.addEventListener('hashchange', abrir);
        window.addEventListener('erp-fila-enviada', abrir);   // a rede voltou e o que estava guardado foi lançado
        try {
            await API.carregar();
        } catch (err) {
            $('#tela').innerHTML = '<div class="card"><h2>Não foi possível ler a planilha</h2><p class="nota">' + UI.h(err.message) + '</p></div>';
            return;
        }
        abrir();
        notificarAoAbrir();
    }

    return { tela: tela, iniciar: iniciar, atualizar: atualizar, recarregar: recarregar, usuario: function () { return usuario; }, nomeDaTela: nomeDaTela, marcarTarefa: marcarTarefa };
})();
