/* =========================================================
   ERP Ovo Caipira · PAINEL (tela inicial da gestão)
   ---------------------------------------------------------
   Organização deste arquivo:
     1. Avisos (alerta urgente, embalagem acabando, checklist)
     2. Caminho do ovo (hoje)
     3. Números de cada sistema no período
     4. Gráfico, conferência granja × recebimento, pedidos
     5. Colaboradoras hoje (só administrador)
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n;
    var periodo = UI.novoPeriodo('sem');

    function ind(nome, valor, det, ruim) { return '<div class="indicador' + (ruim ? ' ruim' : '') + '"><span>' + nome + '</span><b>' + valor + '</b><em>' + det + '</em></div>'; }
    function veAlgum(u, sis) { var s = D.SISTEMAS.find(function (x) { return x.id === sis; }); return s.telas.some(function (t) { return D.podeVer(u, t[0]); }); }

    Sistema.tela('painel', { desenhar: function (el, db) {
        var u = Sistema.usuario(), hoje = D.hoje(), p = periodo;
        var veGranja = veAlgum(u, 'granja'), veBenef = veAlgum(u, 'benef'), admin = u.perfil !== 'Colaboradora';   // administrador e equipe veem as colaboradoras

        /* ---------- 1. AVISOS ---------- */
        var avisos = [];
        if (veGranja) {
            db.alertas.filter(function (a) { return a.resolvido !== 'Sim' && D.podeVer(u, 'g-alertas'); }).forEach(function (a) {
                avisos.push('<a class="aviso ' + (a.gravidade === 'Urgente' ? 'erro' : 'atencao') + '" href="#g-alertas"><span class="bolinha">!</span><span><b>' + h(a.gravidade) + ' · ' + (a.registrado_por ? 'aviso de ' + h(a.registrado_por) : 'Granja') + '</b><br>' + h(a.descricao) + (a.lote ? ' (Lote ' + h(a.lote) + ')' : '') + '</span></a>');
            });
            /* checklist pendente: só o administrador vê (um aviso só, com o número) */
            var semCheck = u.perfil !== 'Administrador' ? [] : D.lotesAtivos(db).filter(function (l) { return !db.checklist_colab.some(function (c) { return c.data === hoje && c.tipo === 'lote' && String(c.lote) === String(l.lote); }); });
            if (semCheck.length) avisos.push('<a class="aviso atencao" href="colaboradora.html#checklist"><span class="bolinha">i</span><span><b>Checklist do dia: ' + semCheck.length + ' lote(s) pendente(s)</b><br>Lotes ' + semCheck.map(function (l) { return h(String(l.lote).split('/')[0]); }).join(', ') + '</span></a>');
        }
        /* pendências automáticas (coleta não lançada, conferência): todo mundo da gestão vê, primeiro */
        avisos = D.pendencias(db).map(function (p) { return D.pendenciaHTML(p, h); }).concat(avisos);
        if (veBenef) db.embalagens.forEach(function (e) {
            var sd = D.saldoEmbalagem(db, e).saldo;
            if (D.situacaoEmbalagem(e, sd)[0] === 'Comprar') avisos.push('<a class="aviso erro" href="#b-embalagens"><span class="bolinha">!</span><span><b>Comprar embalagem</b><br>' + h(D.nomeTipoEmbalagem(e.tipo)) + ', lote ' + h(e.lote) + ': restam ' + fmt(sd) + ' unidades.</span></a>');
        });

        /* ---------- 2. CAMINHO DO OVO (hoje) ---------- */
        var col = db.coletas.filter(function (c) { return c.data === hoje; });
        var prodDia = D.producaoDiaria(db).filter(function (x) { return x.data === hoje; });
        var sai = D.saidas(db).filter(function (s) { return s.data === hoje; });   // automática a partir das coletas
        var rec = db.recebimentos.filter(function (r) { return r.data_postura === hoje; });
        var benef = db.producoes.filter(function (x) { return x.data === hoje; });
        var est = D.estoque(db).reduce(function (s, e) { return s + D.MAQUINA.reduce(function (t, m) { return t + Math.max(0, n(e.qtd[m.chave])); }, 0); }, 0);
        var etapa = function (cls, sis, nome, valor, det, link) {
            var dentro = '<small>' + sis + '</small><b>' + nome + '</b><strong>' + valor + '</strong><span>' + det + '</span>';
            return D.podeVer(u, link) ? '<li class="' + cls + '"><a href="#' + link + '" style="color:inherit;text-decoration:none">' + dentro + '<em class="abrir-etapa">Abrir →</em></a></li>'
                : '<li class="' + cls + ' sem-link"><div>' + dentro + '</div></li>';   // sem acesso: só mostra o número
        };
        var caminho = etapa('granja', 'GRANJA', 'Coleta', fmt(col.reduce(function (s, c) { return s + D.totalColeta(c); }, 0)), col.length + ' coleta(s)', 'g-coletas') +
            etapa('granja', 'GRANJA', 'Produção diária', fmt(prodDia.reduce(function (s, x) { return s + x.bons; }, 0)), 'ovos bons', 'g-producao') +
            etapa('granja', 'GRANJA', 'Saída de ovos', fmt(sai.reduce(function (s, x) { return s + D.totalSaida(x); }, 0)), sai.length + ' lote(s) · automática', 'g-saida') +
            etapa('benef', 'BENEFICIAMENTO', 'Recebimento', fmt(rec.reduce(function (s, r) { return s + D.totalRecebido(r); }, 0)), rec.map(function (r) { return r.lote_receb; }).join(' e ') || 'nada ainda', 'b-recebimento') +
            etapa('benef', 'BENEFICIAMENTO', 'Beneficiamento', fmt(benef.reduce(function (s, x) { return s + D.embalados(x); }, 0)), 'ovos embalados', 'b-beneficiamento') +
            etapa('benef', 'BENEFICIAMENTO', 'Estoque', fmt(est), 'embalagens prontas', 'b-estoque') +
            etapa('benef', 'BENEFICIAMENTO', 'Pedidos', fmt(db.pedidos.filter(function (x) { return x.situacao !== 'Entregue'; }).length), 'a entregar', 'b-pedidos') +
            etapa('benef', 'BENEFICIAMENTO', 'Romaneio', fmt(db.pedidos.filter(function (x) { return x.situacao === 'Entregue' && x.fechado_em === hoje; }).length), 'entregue(s) hoje', 'b-romaneio');

        /* ---------- 3. NÚMEROS DE CADA SISTEMA ---------- */
        var noPer = function (d) { return D.noPeriodo(d, p.de, p.ate); };
        var colP = db.coletas.filter(function (c) { return noPer(c.data); });
        var tCol = colP.reduce(function (s, c) { return s + D.totalColeta(c); }, 0), bons = colP.reduce(function (s, c) { return s + n(c.bons); }, 0);
        var perdas = db.mortalidade.filter(function (m) { return noPer(m.data); }).reduce(function (s, m) { return s + n(m.mortes) + n(m.abate); }, 0);
        var vivas = D.lotesAtivos(db).reduce(function (s, l) { return s + D.avesVivas(db, l); }, 0);
        var tRec = db.recebimentos.filter(function (r) { return noPer(r.data_postura); }).reduce(function (s, r) { return s + D.totalRecebido(r); }, 0);
        var tProd = db.producoes.filter(function (x) { return noPer(x.data); }).reduce(function (s, x) { return s + D.embalados(x); }, 0);
        var entregues = db.pedidos.filter(function (x) { return x.situacao === 'Entregue' && noPer(x.fechado_em); }).length;
        var blocos = '';
        if (veGranja) blocos += bloco('granja', 'GRANJA', 'g-resumo', ind('Aves vivas', fmt(vivas), D.lotesAtivos(db).length + ' lote(s) ativo(s)') + ind('Coletado', fmt(tCol), 'ovos no período') + ind('Ovos bons', UI.pct(bons, tCol), 'do coletado') + ind('Mortes + abates', fmt(perdas), 'no período', perdas > 0));
        if (veBenef) blocos += bloco('benef', 'BENEFICIAMENTO', 'b-resumo', ind('Recebido', fmt(tRec), 'ovos da granja') + ind('Produzido', fmt(tProd), 'ovos embalados') +
            ind('Diferença', tRec ? ((tRec - tProd) / tRec * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—', 'perdas, sobra e a beneficiar') + ind('Pedidos entregues', entregues, 'no período'));
        if (admin) {
            var ck = db.checklist_colab.filter(function (c) { return noPer(c.data); });
            var nc = ck.reduce(function (s, c) { return s + n(c.nc); }, 0);
            var colabHoje = colaboradorasHoje(db);
            blocos += bloco('colab', 'COLABORADORAS', 'relatorios?aba=colab', ind('Coletas hoje', colabHoje.filter(function (c) { return c.ok; }).length + ' de ' + colabHoje.length, 'colaboradoras lançaram') +
                ind('Checklists', fmt(ck.length), 'no período') + ind('Não conformes', fmt(nc), 'itens no período', nc > 0) +
                ind('Perda na coleta', UI.pct(tCol - bons, tCol), 'trincados, def. e sujos'));
        }

        /* ---------- 4. GRÁFICO, CONFERÊNCIA E PEDIDOS ---------- */
        var partes = UI.partes(p.de, p.ate);
        var a = partes.map(function (pt) { return db.coletas.filter(function (c) { return D.noPeriodo(c.data, pt.de, pt.ate); }).reduce(function (s, c) { return s + D.totalColeta(c); }, 0); });
        var b = partes.map(function (pt) { return db.producoes.filter(function (x) { return D.noPeriodo(x.data, pt.de, pt.ate); }).reduce(function (s, x) { return s + D.embalados(x); }, 0); });
        var conf = D.saidas(db).slice(0, 6).map(function (s) {
            var rec = D.recebidoDaGranja(db, s.data, s.lote);
            var dif = rec == null ? null : rec - D.totalSaida(s);
            return [D.diaMes(s.data), '<b>' + h(D.codigoDoDia(db, s.data, s.lote)) + '</b>', fmt(D.totalSaida(s)), rec == null ? '—' : fmt(rec),
                dif == null ? UI.tag('Chegando', 'atencao') : dif ? UI.tag('Diferença de ' + fmt(Math.abs(dif)), 'erro') : UI.tag('Confere', 'ok')];
        });
        var pedidos = db.pedidos.filter(function (x) { return x.situacao !== 'Entregue'; }).concat(db.pedidos.filter(function (x) { return x.situacao === 'Entregue'; }).slice(-2))
            .slice(0, 6).map(function (x) {
                return '<li style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--linha)"><b style="width:44px">#' + x.numero + '</b>' +
                    '<span style="flex:1 1 180px;min-width:0"><b style="font-weight:600">' + h(x.cliente) + '</b><br><span class="nota" style="margin:0">' + h(D.textoItens(db, x)) + '</span></span>' +
                    '<span class="nota" style="margin:0">Entrega ' + D.diaMes(x.entrega) + '</span>' + UI.tag(x.situacao, x.situacao === 'Entregue' ? 'ok' : 'atencao') + '</li>';
            }).join('');

        /* ---------- 5. COLABORADORAS HOJE ---------- */
        var colab = admin ? colaboradorasHoje(db).map(function (c) {
            return '<li style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--linha);border-radius:10px;background:var(--fundo)"><span class="avatar" style="width:32px;height:32px;background:#2f3450;color:#f4c542">' + h(c.nome.charAt(0)) + '</span>' +
                '<span><b style="display:block;font-size:var(--fs-sm)">' + h(c.nome) + '</b><span style="font-size:var(--fs-peq);color:' + (c.ok ? 'var(--ok-t)' : 'var(--at-t)') + '">' + (c.ok ? 'Coleta lançada' : 'Sem coleta hoje') + '</span></span></li>';
        }).join('') : '';

        el.innerHTML =
            '<div class="cabecalho"><div><p class="eyebrow">' + UI.dataExtenso() + '</p><h1>' + UI.saudacao() + ', ' + h(u.nome) + '</h1><p>Granja, beneficiamento e colaboradoras no mesmo painel.</p></div></div>' +
            (avisos.length ? '<div class="avisos">' + avisos.join('') + '</div>' : '') +
            '<div class="card"><div class="card-titulo"><h2>Caminho do ovo · hoje</h2><span class="nota" style="margin:0">Cada etapa alimenta a próxima, sem digitar de novo</span></div><ol class="etapas">' + caminho + '</ol></div>' +
            UI.periodoHTML(p) +
            '<div class="grade" style="margin-bottom:16px">' + blocos + '</div>' +
            '<div class="grade larga">' +
                '<div class="card"><div class="card-titulo"><h2>Coletado na granja × embalado</h2>' + UI.legenda([['Coletado', 'var(--suave)'], ['Embalado', 'var(--destaque)']]) + '</div>' + UI.grafico(partes.map(function (x) { return x.rotulo; }), a, b) + '</div>' +
                '<div class="card"><div class="card-titulo"><h2>Conferência: saída da granja × recebimento</h2><a href="#b-recebimento">Ver lotes →</a></div>' +
                    UI.tabela(['Data', 'Lote da coleta', { t: 'Saiu', num: 1 }, { t: 'Recebido', num: 1 }, 'Situação'], conf, 'Nenhuma saída lançada.') + '</div>' +
                (D.podeVer(u, 'b-pedidos') ? '<div class="card"><div class="card-titulo"><h2>Pedidos em andamento</h2><a href="#b-pedidos">Ir para pedidos →</a></div><ul style="list-style:none;margin:0;padding:0">' + (pedidos || '<li class="vazio">Nenhum pedido.</li>') + '</ul></div>' : '') +
                (admin ? '<div class="card"><div class="card-titulo"><h2>Colaboradoras hoje</h2>' + (D.podeVer(u, 'relatorios') ? '<a href="#relatorios?aba=colab">Ver relatórios →</a>' : '') + '</div><ul style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">' + colab + '</ul></div>' : '') +
            '</div>';
        UI.ligarPeriodo(el, periodo, Sistema.atualizar);
    } });

    function bloco(cls, nome, link, conteudo) {
        return '<section class="card" style="margin:0"><div class="card-titulo"><span class="sistema-chip ' + cls + '">' + nome + '</span><a href="#' + link + '">Abrir →</a></div><div class="indicadores" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0">' + conteudo + '</div></section>';
    }
    /* Quem das colaboradoras já lançou coleta hoje */
    function colaboradorasHoje(db) {
        var hoje = D.hoje();
        var pessoas = D.colaboradorasSemLogin(db).length > 0;   // demonstração: conta as pessoas, não o login compartilhado
        return db.usuarios.filter(function (x) { return x.perfil === 'Colaboradora' && x.situacao === 'Ativo' && !(pessoas && D.loginCompartilhado(x)); }).map(function (x) {
            var ok = db.coletas.some(function (c) { return c.data === hoje && (D.loginCompartilhado(x) || c.coletado_por === x.nome || String(c.lancado_por || '').indexOf(x.nome) === 0); });
            return { nome: x.nome, ok: ok };
        });
    }
})();
