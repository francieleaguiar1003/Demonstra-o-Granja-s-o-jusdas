/* =========================================================
   ERP Ovo Caipira · TELAS DO BENEFICIAMENTO
   ---------------------------------------------------------
   Organização deste arquivo:
     1. Resumo do beneficiamento
     2. Recebimento (confere com a Saída de ovos da granja)
     3. Lançamento de embalagens (compras por lote, com NF)
     4. Beneficiamento (produção + conferência dos 100%)
     5. Produção embalada (pentes produzidos, embalagens usadas e o que está pronto)
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var S = 'Beneficiamento';
    function ind(nome, valor, det, ruim) { return '<div class="indicador' + (ruim ? ' ruim' : '') + '"><span>' + nome + '</span><b>' + valor + '</b><em>' + det + '</em></div>'; }
    function produzido(db, lote_receb) { return db.producoes.find(function (p) { return p.lote_receb === lote_receb; }); }

    /* Conferência do recebimento com a saída da granja */
    function conferenciaGranja(db, r) {
        var s = D.saidaDoRecebimento(db, r);
        if (!s) return { tag: UI.tag('Sem saída da granja', 'atencao'), texto: 'Não há Saída de ovos da granja para este lote e data.', tipo: 'atencao' };
        /* ainda tem coleta do dia sem conferir e receber na granja */
        var faltam = D.coletasNaoRecebidas(db).filter(function (c) { return c.data === r.data_postura && String(c.lote || '') === String(r.lote_granja || ''); });
        if (faltam.length) return { tag: UI.tag('Faltam ' + faltam.length + ' coleta(s)', 'atencao'), tipo: 'atencao', faltam: faltam.length,
            texto: 'Ainda faltam ' + faltam.length + ' coleta(s) deste dia para conferir e receber na Granja › Conferência dos ovos (' + fmt(faltam.reduce(function (t, c) { return t + D.totalColeta(c); }, 0)) + ' ovos).' +
                ' Se produzir agora, essas coletas entram depois num complemento (ex.: ' + r.lote_receb.split('-')[0] + '-2).' };
        /* soma outros recebimentos do mesmo dia/lote (complemento de coleta lançada depois) */
        var outros = db.recebimentos.filter(function (x) { return x.id !== r.id && x.data_postura === r.data_postura && String(x.lote_granja) === String(r.lote_granja); });
        var recebido = outros.reduce(function (t, x) { return t + D.totalRecebido(x); }, D.totalRecebido(r));
        var dif = recebido - D.totalSaida(s);
        if (!dif) return { tag: UI.tag('Confere', 'ok'), texto: 'Confere com a granja: a Saída de ovos do ' + (s.lote ? 'Lote ' + s.lote : 'dia') + ' em ' + D.br(s.data) + ' foi de ' + fmt(D.totalSaida(s)) + ' ovos (responsável: ' + s.responsavel + ').', tipo: 'ok' };
        return { tag: UI.tag((dif > 0 ? '+' : '') + fmt(dif) + ' ovos', 'erro'), texto: 'Diferença com a granja: saíram ' + fmt(D.totalSaida(s)) + ' ovos e chegaram ' + fmt(recebido) + (outros.length ? ' somando ' + (outros.length + 1) + ' recebimentos' : '') + ' (' + (dif > 0 ? '+' : '') + fmt(dif) + ').', tipo: 'erro' };
    }


    /* =====================================================
       1. RESUMO DO BENEFICIAMENTO
       ===================================================== */
    var periodoResumo = UI.novoPeriodo('sem');
    Sistema.tela('b-resumo', { desenhar: function (el, db) {
        var p = periodoResumo;
        var rec = db.recebimentos.filter(function (r) { return D.noPeriodo(r.data_postura, p.de, p.ate); });
        var prod = db.producoes.filter(function (x) { return D.noPeriodo(x.data, p.de, p.ate); });
        var tRec = rec.reduce(function (s, r) { return s + D.totalRecebido(r); }, 0);
        var tProd = prod.reduce(function (s, x) { return s + D.embalados(x); }, 0);
        var entregues = db.pedidos.filter(function (x) { return x.situacao === 'Entregue' && D.noPeriodo(x.fechado_em, p.de, p.ate); }).length;
        var partes = UI.partes(p.de, p.ate);
        var a = partes.map(function (pt) { return db.recebimentos.filter(function (r) { return D.noPeriodo(r.data_postura, pt.de, pt.ate); }).reduce(function (s, r) { return s + D.totalRecebido(r); }, 0); });
        var b = partes.map(function (pt) { return db.producoes.filter(function (x) { return D.noPeriodo(x.data, pt.de, pt.ate); }).reduce(function (s, x) { return s + D.embalados(x); }, 0); });

        var avisos = [];
        db.embalagens.forEach(function (e) {
            var sd = D.saldoEmbalagem(db, e).saldo;
            if (D.situacaoEmbalagem(e, sd)[0] === 'Comprar') avisos.push('<a class="aviso erro" href="#b-embalagens"><span class="bolinha">!</span><span><b>Comprar embalagem</b><br>' + h(D.nomeTipoEmbalagem(e.tipo)) + ', lote ' + h(e.lote) + ': restam ' + fmt(sd) + ' unidades.</span></a>');
        });
        var chegando = D.chegandoDaGranja(db);
        if (chegando.length) avisos.push('<a class="aviso atencao" href="#g-conferencia"><span class="bolinha">i</span><span><b>' + chegando.length + ' lote(s) chegando da granja</b><br>Confira e receba em Granja › Conferência dos ovos.</span></a>');
        var aguardando = db.recebimentos.filter(function (r) { return !produzido(db, r.lote_receb); });
        if (aguardando.length) avisos.push('<a class="aviso atencao" href="#b-beneficiamento"><span class="bolinha">i</span><span><b>' + aguardando.length + ' lote(s) esperando beneficiamento</b><br>' + aguardando.map(function (r) { return h(r.lote_receb); }).join(', ') + '</span></a>');
        db.recebimentos.forEach(function (r) {
            var c = conferenciaGranja(db, r);
            if (c.tipo === 'erro' && r.data_postura >= D.somarDias(D.hoje(), -7)) avisos.push('<a class="aviso erro" href="#b-recebimento"><span class="bolinha">!</span><span><b>Diferença com a granja · ' + h(r.lote_receb) + '</b><br>' + h(c.texto) + '</span></a>');
        });

        /* Resumo das embalagens: por tipo, quanto foi comprado, usado (total e no período) e o saldo */
        var usoNoPeriodo = {};
        prod.forEach(function (x) { var u = D.usadasDaProducao(x); Object.keys(u).forEach(function (id) { usoNoPeriodo[id] = n(usoNoPeriodo[id]) + n(u[id]); }); });
        var linhasEmb = D.TIPOS_EMBALAGEM.map(function (t) {
            var lotes = db.embalagens.filter(function (e) { return e.tipo === t.chave; });
            var s = lotes.reduce(function (acc, e) { var x = D.saldoEmbalagem(db, e); acc.c += x.comprado; acc.u += x.usado; acc.s += x.saldo; acc.p += n(usoNoPeriodo[e.id]); return acc; }, { c: 0, u: 0, s: 0, p: 0 });
            var comSaldo = lotes.filter(function (e) { return D.saldoEmbalagem(db, e).saldo > 0; }).length;
            /* situação do tipo pelo saldo total: até o aviso mínimo = Comprar; até 1,5× = Atenção */
            var aviso = lotes.length ? Math.max.apply(null, lotes.map(function (e) { return n(e.aviso_minimo); })) : 0;
            var pior = !lotes.length ? ['Sem compra', 'neutra'] : s.s <= aviso ? ['Comprar', 'erro'] : s.s <= aviso * 1.5 ? ['Atenção', 'atencao'] : ['Ok', 'ok'];
            return [h(t.nome), fmt(s.c), fmt(s.u), fmt(s.p), '<b>' + fmt(s.s) + '</b>', comSaldo + ' de ' + lotes.length, UI.tag(pior[0], pior[1])];
        });
        var cardEmb = '<div class="card"><div class="card-titulo"><h2>Embalagens</h2><a href="#b-embalagens">Lançamento de embalagens →</a></div>' +
            UI.tabela(['Tipo', { t: 'Comprado', num: 1 }, { t: 'Usado', num: 1 }, { t: 'Usado no período', num: 1 }, { t: 'Saldo', num: 1 }, 'Lotes com saldo', 'Situação'], linhasEmb) + '</div>';

        var aEntregar = db.pedidos.filter(function (x) { return x.situacao !== 'Entregue'; }).sort(function (x, y) { return String(x.entrega).localeCompare(String(y.entrega)); });
        el.innerHTML =
            '<div class="cabecalho"><div><p class="eyebrow">' + UI.dataExtenso() + '</p><h1>Resumo do beneficiamento</h1><p>Recebido × produzido, embalagens e pedidos.</p></div>' +
            '<div class="acoes" style="margin:0"><a class="btn alt" href="#g-conferencia">Conferir e receber</a><a class="btn" href="#b-beneficiamento">Beneficiar lote</a></div></div>' +
            (avisos.length ? '<div class="avisos">' + avisos.join('') + '</div>' : '') +
            UI.periodoHTML(p) +
            '<div class="indicadores">' + ind('Recebido', fmt(tRec), 'ovos da granja') + ind('Produzido', fmt(tProd), 'ovos embalados') +
                ind('Diferença', tRec ? ((tRec - tProd) / tRec * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—', 'perdas, sobra e lotes a beneficiar') + ind('Pedidos entregues', entregues, 'no período') + '</div>' +
            '<div class="grade larga"><div class="card"><div class="card-titulo"><h2>Recebido × produzido</h2>' + UI.legenda([['Recebido', 'var(--suave)'], ['Produzido', 'var(--destaque)']]) + '</div>' + UI.grafico(partes.map(function (x) { return x.rotulo; }), a, b) + '</div>' +
            '<div class="card"><div class="card-titulo"><h2>Pedidos em andamento</h2>' + (D.podeVer(Sistema.usuario(), 'b-pedidos') ? '<a href="#b-pedidos">Ir para pedidos →</a>' : '') + '</div>' +
            UI.tabela(['Pedido', 'Cliente', 'Itens', 'Entrega', 'Situação'], aEntregar.map(function (x) {
                return ['#' + x.numero, h(x.cliente), h(D.textoItens(db, x)), D.diaMes(x.entrega), UI.tag(x.situacao, 'atencao')];
            }), 'Nenhum pedido em andamento.') + '</div></div>' +
            cardEmb;
        UI.ligarPeriodo(el, periodoResumo, Sistema.atualizar);
    } });


    /* =====================================================
       2. RECEBIMENTO
       Os lotes chegam pela Granja › Conferência dos ovos, no botão
       "Conferir e receber": todas as coletas do dia viram UM lote só,
       cujo número é o dia da produção (ex.: 1911). Aqui fica a lista
       dos lotes recebidos. Se chegar coleta depois, ela é SOMADA ao
       mesmo lote (enquanto ele não foi beneficiado).
       ===================================================== */
    var receberAgora = null;   // item escolhido em "Chegando da granja" (na Conferência dos ovos)
    var recebendo = null;      // marca o recebimento que está sendo salvo pela conferência

    /* Números que vêm da granja (saída automática ou ajustada) */
    function valoresDaGranja(db, data, lote) {
        var s = D.saidaDoDia(db, data, lote);
        if (!s) return null;
        var c = D.coletasDoDia(db, data, lote) || { defeituosos: 0 };
        var def = Math.min(n(c.defeituosos), n(s.def_sujos));
        return { bom: n(s.bons), trincado: n(s.trincados), defeito: def, sujo: n(s.def_sujos) - def };
    }

    var periodoReceb = UI.novoPeriodo('sem');
    var telaRecebimento = CadastroPadrao('b-recebimento', {
        tabela: 'recebimentos', sistema: S, titulo: 'Recebimento de ovos', semNovo: true,
        sub: 'Lotes que chegaram da granja (um por dia de produção). Para receber, use Granja › Conferência dos ovos › Conferir e receber.',
        soLer: ['lote_receb'],
        ordenar: function (a, b) { return String(b.data_postura).localeCompare(String(a.data_postura)) || String(b.lote_receb).localeCompare(String(a.lote_receb)); },
        /* período escolhido no topo; lote recebido e ainda não produzido fica em destaque; depois da produção não edita */
        filtrar: function (r) { return D.noPeriodo(r.data_postura, periodoReceb.de, periodoReceb.ate); },
        classeLinha: function (r, db) { return produzido(db, r.lote_receb) ? '' : 'linha-pendente'; },
        podeEditar: function (r, db) { return !produzido(db, r.lote_receb); },
        tituloLista: 'Lotes recebidos no período',
        colunas: [{ t: 'Lote', v: function (r) { return '<b>' + h(r.lote_receb) + '</b>'; } }, { t: 'Postura', v: function (r) { return D.br(r.data_postura); } },
            { t: 'Bom', num: 1, v: function (r) { return fmt(r.bom); } }, { t: 'Trinc.', num: 1, v: function (r) { return fmt(r.trincado); } },
            { t: 'Defeito', num: 1, v: function (r) { return fmt(r.defeito); } }, { t: 'Sujo', num: 1, v: function (r) { return fmt(r.sujo); } },
            { t: 'Total', num: 1, v: function (r) { return '<b>' + fmt(D.totalRecebido(r)) + '</b>'; } },
            { t: 'Conferência', v: function (r, db) { return conferenciaGranja(db, r).tag; } },
            { t: 'Beneficiamento', v: function (r, db) {
                if (produzido(db, r.lote_receb)) return UI.tag('Produção salva', 'ok') + '<br><small class="nota" style="margin:0">não dá mais para editar</small>';
                var c = conferenciaGranja(db, r);
                return '<a class="tag atencao" href="#b-beneficiamento?lote=' + encodeURIComponent(r.lote_receb) + '">Aguardando produção' + (c.faltam ? ' · faltam ' + c.faltam + ' coleta(s)' : '') + '</a>';
            } }],
        novo: function (db) {
            var alvo = receberAgora || D.chegandoDaGranja(db)[0] || { data: D.hoje(), lote: (D.lotesAtivos(db)[0] || {}).lote || '', bom: 0, trincado: 0, defeito: 0, sujo: 0 };
            receberAgora = null;
            return { lote_receb: D.proximoLoteReceb(db, alvo.data, alvo.lote), data_postura: alvo.data, lote_granja: alvo.lote, bom: alvo.bom, trincado: alvo.trincado, defeito: alvo.defeito, sujo: alvo.sujo };
        },
        subFormulario: 'Os números já vêm da granja (coletas). Confira o que chegou de verdade e corrija se tiver diferença.',
        extraFormulario: function () { return '<p class="faixa" data-faixa-granja hidden></p>'; },
        aoAbrir: function (f, db, linha) {
            var faixa = f.querySelector('[data-faixa-granja]');
            var conferir = function () {
                var r = { data_postura: f.data_postura.value, lote_granja: f.lote_granja.value, bom: f.bom.value, trincado: f.trincado.value, defeito: f.defeito.value, sujo: f.sujo.value };
                var c = conferenciaGranja(db, r);
                faixa.className = 'faixa ' + c.tipo; faixa.textContent = c.texto; faixa.hidden = false;
            };
            var puxar = function () {
                if (!linha) f.lote_receb.value = D.proximoLoteReceb(db, f.data_postura.value, f.lote_granja.value);
                var g = valoresDaGranja(db, f.data_postura.value, f.lote_granja.value);
                if (g) { f.bom.value = g.bom; f.trincado.value = g.trincado; f.defeito.value = g.defeito; f.sujo.value = g.sujo; }
                conferir();
            };
            f.data_postura.addEventListener('change', puxar); f.lote_granja.addEventListener('change', puxar);
            f.addEventListener('input', conferir);
            conferir();
        },
        antesDeSalvar: function (v) {
            if (recebendo) { v.coletas_ate = new Date().toISOString(); recebendo = null; }   // até aqui as coletas já entraram no lote
            return v;
        },
        validar: function (v, db, id) {
            var antes = id && db.recebimentos.find(function (r) { return r.id === id; });
            if (antes && produzido(db, antes.lote_receb)) throw new Error('O lote ' + antes.lote_receb + ' já tem produção salva: não dá para mudar o recebimento (a conta do beneficiamento ficaria errada). O administrador exclui a produção primeiro, se precisar corrigir.');
            if (db.recebimentos.some(function (r) { return r.id !== id && r.lote_receb === v.lote_receb; })) throw new Error('O lote ' + v.lote_receb + ' já existe.');
            if (n(v.bom) < 1) throw new Error('Informe a quantidade de ovo bom.');
        },
        topo: function (db) {
            /* resumo do período */
            var p = periodoReceb, recs = db.recebimentos.filter(function (r) { return D.noPeriodo(r.data_postura, p.de, p.ate); });
            var tot = recs.reduce(function (t, r) { return t + D.totalRecebido(r); }, 0), bons = recs.reduce(function (t, r) { return t + n(r.bom); }, 0);
            var semProd = db.recebimentos.filter(function (r) { return !produzido(db, r.lote_receb); }).length;
            var resumo = UI.periodoHTML(p) + '<div class="indicadores">' + ind('Lotes recebidos', fmt(recs.length), 'no período') + ind('Ovos recebidos', fmt(tot), fmt(bons) + ' bons') +
                ind('Ovos bons', UI.pct(bons, tot), 'do que chegou') + ind('Trincados, defeito e sujos', UI.pct(tot - bons, tot), fmt(tot - bons) + ' ovos') +
                ind('Aguardando produção', fmt(semProd), 'lote(s) recebidos sem produção', semProd > 0) + '</div>';
            var n1 = D.chegandoDaGranja(db).length;
            return resumo + (n1 ? '<a class="faixa atencao" style="display:block;text-decoration:none;margin:0 0 16px" href="#g-conferencia"><b>' + n1 + ' lote(s) esperando na Conferência dos ovos</b> · conferir e receber →</a>' : '');
        },
        descrever: function (v) { return 'lote ' + v.lote_receb + ' · ' + fmt(D.totalRecebido(v)) + ' ovos'; },
        podeExcluir: function (id, db) {
            var r = db.recebimentos.find(function (x) { return x.id === id; });
            return r && produzido(db, r.lote_receb) ? 'Este lote já tem produção salva. Exclua a produção primeiro.' : '';
        },
        acoesLinha: function (r) { return '<button class="btn alt pequeno" data-ficha="' + h(r.id) + '">Imprimir</button>'; },
        ligar: function (el, db) {
            UI.ligarPeriodo(el, periodoReceb, Sistema.atualizar);
            UI.ligar(el, '[data-ficha]', 'click', function (e, b) {
                var r = db.recebimentos.find(function (x) { return x.id === b.dataset.ficha; });
                UI.imprimirFolha(UI.cabecalhoFolha('Recebimento · lote ' + r.lote_receb, 'Data do lote: ' + D.br(r.data_postura), D.PAC['b-recebimento']) +
                    '<table><tr><th>Lote</th><th>Postura</th><th>Ovo bom</th><th>Trincado</th><th>Defeito</th><th>Sujo</th><th>Total</th></tr><tr><td>' + h(r.lote_receb) + '</td><td>' + D.br(r.data_postura) + '</td><td>' +
                    fmt(r.bom) + '</td><td>' + fmt(r.trincado) + '</td><td>' + fmt(r.defeito) + '</td><td>' + fmt(r.sujo) + '</td><td>' + fmt(D.totalRecebido(r)) + '</td></tr></table>' +
                    '<p class="rodape">' + h(conferenciaGranja(db, r).texto) + '</p><div class="assinaturas"><div><span></span>Recebido por</div><div><span></span>Conferido por</div></div>');
            });
        }
    });

    /* CONFERIR E RECEBER (chamado pela Granja › Conferência dos ovos)
       Na granja cada coleta é separada. Quando é conferida e recebida, ela é
       SOMADA ao lote do dia do beneficiamento (número = dia da produção, ex.: 1911).
       O primeiro recebimento do dia cria o lote; os próximos somam nele.
       (Se o lote do dia já foi beneficiado, abre um complemento: 1911-2.) */
    function alvoDoDia(db, data, lote) {
        var recs = db.recebimentos.filter(function (r) { return r.data_postura === data && String(r.lote_granja || '') === String(lote || ''); })
            .sort(function (a, b) { return String(a.criado_em || '').localeCompare(String(b.criado_em || '')); });
        var ult = recs[recs.length - 1];
        return ult && !produzido(db, ult.lote_receb) ? ult : null;
    }
    async function receberColetas(lista) {
        var agora = new Date().toISOString(), dias = {};
        lista.forEach(function (c) { var k = c.data + '|' + (c.lote || ''); (dias[k] = dias[k] || []).push(c); });
        var lotes = [];
        for (var k in dias) {
            var cs = dias[k], data = cs[0].data, lote = String(cs[0].lote || ''), db = API.dados(), alvo = alvoDoDia(db, data, lote);
            var soma = function (campo) { return cs.reduce(function (t, c) { return t + n(c[campo]); }, 0); };
            var add = { bom: soma('bons'), trincado: soma('trincados'), defeito: soma('defeituosos'), sujo: soma('sujos') };
            var cod;
            if (alvo) {
                cod = alvo.lote_receb;
                await API.salvar('recebimentos', { bom: n(alvo.bom) + add.bom, trincado: n(alvo.trincado) + add.trincado, defeito: n(alvo.defeito) + add.defeito, sujo: n(alvo.sujo) + add.sujo, coletas_ate: agora },
                    alvo.id, S, 'Recebeu ' + cs.length + ' coleta(s) no lote ' + cod + ' · +' + fmt(add.bom + add.trincado + add.defeito + add.sujo) + ' ovos');
            } else {
                cod = D.proximoLoteReceb(db, data, lote);
                await API.salvar('recebimentos', Object.assign({ lote_receb: cod, data_postura: data, lote_granja: lote, coletas_ate: agora }, add), null, S,
                    'Abriu o lote ' + cod + ' com ' + cs.length + ' coleta(s) · ' + fmt(add.bom + add.trincado + add.defeito + add.sujo) + ' ovos');
            }
            for (var i = 0; i < cs.length; i++) await API.salvar('coletas', { recebido_em: agora, lote_receb: cod }, cs[i].id, S, 'Coleta de ' + cs[i].coletado_por + ' entrou no lote ' + cod);
            lotes.push(cod);
        }
        return lotes;
    }
    /* Coleta já recebida que foi corrigida na conferência: corrige o lote do dia também */
    async function ajustarRecebido(antes, depois) {
        var db = API.dados(), r = db.recebimentos.find(function (x) { return x.lote_receb === antes.lote_receb; });
        if (!r) return '';
        if (produzido(db, r.lote_receb)) return 'O lote ' + r.lote_receb + ' já foi beneficiado: a correção ficou só na coleta.';
        var d = function (a, b) { return n(depois[b]) - n(antes[b]); };
        await API.salvar('recebimentos', { bom: n(r.bom) + d(0, 'bons'), trincado: n(r.trincado) + d(0, 'trincados'), defeito: n(r.defeito) + d(0, 'defeituosos'), sujo: n(r.sujo) + d(0, 'sujos') },
            r.id, S, 'Corrigiu o lote ' + r.lote_receb + ' pela conferência da coleta de ' + antes.coletado_por);
        return '';
    }
    window.Recebimento = { receberColetas: receberColetas, ajustarRecebido: ajustarRecebido, alvoDoDia: alvoDoDia };


    /* =====================================================
       3. LANÇAMENTO DE EMBALAGENS
       Cada compra é um lote com nota fiscal. O "usado" sai
       sozinho das produções salvas no Beneficiamento.
       ===================================================== */
    /* NOVA COMPRA DE EMBALAGENS: separada por tipo (Dúzia, Pente 20, Pente 30, Caixa).
       Cada tipo tem a SUA nota fiscal e o SEU fornecedor (podem vir de notas e fornecedores
       diferentes). Os campos de cima são um atalho: o que for digitado neles é copiado para
       todos os tipos que ainda não foram mudados à mão. Preenche só os tipos que vieram;
       cada um vira um lote. */
    function novaCompra(db) {
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela janela-larga" novalidate><div class="janela-cabeca"><h2>Lançar compra de embalagens</h2><button type="button" class="btn alt pequeno" data-fechar aria-label="Fechar">✕</button></div>' +
            '<p class="nota intro">Preencha a quantidade de cada tipo que veio (deixe 0 nos que não vieram). Se tudo veio na mesma nota, digite a nota e o fornecedor em cima que eles são copiados para todos; se algum tipo veio em outra nota ou de outro fornecedor, é só trocar dentro do quadro dele. Guarde a nota fiscal (PDF ou foto) na pasta da empresa no Google Drive com o número da NF no nome.</p>' +
            '<div class="form"><label>Nota fiscal nº <small>(copia para todos)</small><input name="nota_fiscal" data-filtro="doc" inputmode="numeric"></label>' +
                '<label>Data da compra *<input type="date" name="data_compra" value="' + D.hoje() + '" max="' + D.hoje() + '"></label>' +
                '<label>Fornecedor <small>(copia para todos)</small><input name="fornecedor"></label></div>' +
            '<div class="compra-tipos">' + D.TIPOS_EMBALAGEM.map(function (t) {
                return '<fieldset class="compra-tipo" data-tipo="' + t.chave + '"><legend>' + h(t.nome) + '</legend><small class="nota" style="margin:0">Lote ' + D.proximoLoteEmbalagem(db, t.chave) + ' (automático)</small>' +
                    '<div class="compra-nota"><label>Nota fiscal nº<input data-nf="' + t.chave + '" data-filtro="doc" inputmode="numeric"></label>' +
                    '<label>Fornecedor<input data-forn="' + t.chave + '"></label></div>' +
                    '<small class="nota compra-aviso" data-nf-aviso="' + t.chave + '"></small>' +
                    '<label>Quantidade comprada<input type="number" min="0" inputmode="numeric" data-qtd="' + t.chave + '" value="0"></label>' +
                    '<label>Avisar quando baixar de<input type="number" min="0" inputmode="numeric" data-aviso="' + t.chave + '" value="200"></label></fieldset>';
            }).join('') + '</div>' +
            '<p class="msg" role="alert"></p><div class="acoes"><button class="btn" type="submit">Salvar compra</button><button class="btn alt" type="button" data-fechar>Cancelar</button></div></form>';
        document.body.appendChild(fundo);
        var f = fundo.querySelector('form'), msg = f.querySelector('.msg');
        var campo = function (attr, t) { return f.querySelector('[' + attr + '="' + t + '"]'); };
        f.nota_fiscal.focus();

        /* Atalho de cima: copia para os quadros que não foram mudados à mão */
        [['nota_fiscal', 'data-nf'], ['fornecedor', 'data-forn']].forEach(function (par) {
            f[par[0]].addEventListener('input', function () {
                D.TIPOS_EMBALAGEM.forEach(function (t) { var c = campo(par[1], t.chave); if (!c.dataset.mao) c.value = f[par[0]].value; });
                conferirTodas();
            });
            D.TIPOS_EMBALAGEM.forEach(function (t) {
                campo(par[1], t.chave).addEventListener('input', function () { if (this.value.trim()) this.dataset.mao = '1'; else delete this.dataset.mao; conferirTodas(); });
            });
        });

        /* Nota repetida: confere tipo por tipo (mesmo número + mesmo fornecedor já lançado) */
        var itemDe = function (t) {
            return { t: t, nf: campo('data-nf', t.chave).value.trim(), forn: campo('data-forn', t.chave).value.trim(),
                qtd: n(campo('data-qtd', t.chave).value), aviso: n(campo('data-aviso', t.chave).value) };
        };
        var repetidaDe = function (x) { return x.nf ? D.notaRepetida(API.dados(), x.nf, null, { data_compra: f.data_compra.value, tipo: x.t.chave, fornecedor: x.forn }) : null; };
        var conferirTodas = function () {
            D.TIPOS_EMBALAGEM.forEach(function (t) {
                var rep = repetidaDe(itemDe(t)), av = campo('data-nf-aviso', t.chave);
                av.textContent = rep ? 'Essa nota já está cadastrada (' + D.nomeTipoEmbalagem(rep.tipo) + ', lote ' + rep.lote + ', ' + D.br(rep.data_compra) + (rep.fornecedor ? ', ' + rep.fornecedor : '') + ').' : '';
                av.style.display = rep ? '' : 'none';
            });
        };
        f.data_compra.addEventListener('change', conferirTodas);
        conferirTodas();

        var fechar = function () { fundo.remove(); document.removeEventListener('keydown', esc); };
        var esc = function (e) { if (e.key === 'Escape') fechar(); };   // Esc ou Cancelar fecham (clicar fora não)
        document.addEventListener('keydown', esc);
        fundo.addEventListener('click', function (e) { if (e.target.hasAttribute('data-fechar')) fechar(); });
        f.addEventListener('submit', async function (e) {
            e.preventDefault(); msg.textContent = '';
            var data = f.data_compra.value;
            if (!data) { msg.textContent = 'Informe a data da compra.'; return; }
            var itens = D.TIPOS_EMBALAGEM.map(itemDe).filter(function (x) { return x.qtd > 0; });
            if (!itens.length) { msg.textContent = 'Informe a quantidade de pelo menos um tipo de embalagem.'; return; }
            var semNF = itens.find(function (x) { return !x.nf; });
            if (semNF) { msg.textContent = 'Informe o número da nota fiscal de ' + semNF.t.nome + '.'; campo('data-nf', semNF.t.chave).focus(); return; }
            for (var k = 0; k < itens.length; k++) {
                var rep = repetidaDe(itens[k]);
                if (rep) { msg.textContent = itens[k].t.nome + ': a nota nº ' + itens[k].nf + ' já está cadastrada (' + D.nomeTipoEmbalagem(rep.tipo) + ', lote ' + rep.lote + ', compra de ' + D.br(rep.data_compra) + (rep.fornecedor ? ', ' + rep.fornecedor : '') + ').'; campo('data-nf', itens[k].t.chave).focus(); return; }
            }
            var bt = f.querySelector('[type=submit]'); bt.disabled = true; bt.textContent = 'Salvando…';
            try {
                for (var i = 0; i < itens.length; i++) {
                    var x = itens[i], v = { tipo: x.t.chave, lote: D.proximoLoteEmbalagem(API.dados(), x.t.chave), nota_fiscal: x.nf, data_compra: data, fornecedor: x.forn, comprado: x.qtd, aviso_minimo: x.aviso };
                    await API.salvar('embalagens', v, null, S, 'Lançou compra · ' + x.t.nome + ' · lote ' + v.lote + ' · NF ' + x.nf + (x.forn ? ' · ' + x.forn : '') + ' · ' + fmt(x.qtd) + ' un.');
                }
                fechar(); UI.avisar('Compra salva: ' + itens.map(function (x) { return x.t.nome + ' ' + fmt(x.qtd); }).join(' · ')); Sistema.atualizar();
            } catch (err) { msg.textContent = err.message; bt.disabled = false; bt.textContent = 'Salvar compra'; }
        });
    }

    CadastroPadrao('b-embalagens', {
        tabela: 'embalagens', sistema: S, titulo: 'Lançamento de embalagens', semNovo: true,
        /* Nova compra: janela própria, separada pelos 4 tipos (igual aos quadros do topo) */
        botoesTopo: function () { return '<button class="btn" data-nova-compra>+ Lançar compra</button>'; },
        ligar: function (el, db) { UI.ligar(el, '[data-nova-compra]', 'click', function () { novaCompra(db); }); },
        sub: 'Compra de embalagens por lote, com nota fiscal. O Pente 30 G e o Pente 30 Caipirinho usam a mesma embalagem.',
        soLer: ['lote'],
        ordenar: function (a, b) { return String(a.tipo).localeCompare(String(b.tipo)) || String(b.lote).localeCompare(String(a.lote)); },
        colunas: [{ t: 'Embalagem', v: function (r) { return h(D.nomeTipoEmbalagem(r.tipo)); } }, { t: 'Lote', v: function (r) { return h(r.lote); } },
            { t: 'NF', v: function (r) { return h(r.nota_fiscal); } }, { t: 'Compra', v: function (r) { return D.br(r.data_compra); } }, { t: 'Fornecedor', v: function (r) { return h(r.fornecedor); } },
            { t: 'Comprado', num: 1, v: function (r) { return fmt(r.comprado); } }, { t: 'Usado', num: 1, v: function (r, db) { return fmt(D.saldoEmbalagem(db, r).usado); } },
            { t: 'Saldo', num: 1, v: function (r, db) { return '<b>' + fmt(D.saldoEmbalagem(db, r).saldo) + '</b>'; } },
            { t: 'Situação', v: function (r, db) { var s = D.situacaoEmbalagem(r, D.saldoEmbalagem(db, r).saldo); return UI.tag(s[0], s[1]); } }],
        novo: function (db) { return { tipo: 'duzia', lote: D.proximoLoteEmbalagem(db, 'duzia'), data_compra: D.hoje(), aviso_minimo: 200 }; },
        aoAbrir: function (f, db, linha) { if (!linha) f.tipo.addEventListener('change', function () { f.lote.value = D.proximoLoteEmbalagem(db, f.tipo.value); }); },
        subFormulario: 'Guarde a nota fiscal (PDF ou foto) na pasta da empresa no Google Drive com o número da NF no nome.',
        validar: function (v, db, id) {
            if (n(v.comprado) < 1) throw new Error('Informe a quantidade comprada.');
            var rep = D.notaRepetida(db, v.nota_fiscal, id, { data_compra: v.data_compra, tipo: v.tipo, fornecedor: v.fornecedor });
            if (rep) throw new Error('Essa nota fiscal (nº ' + v.nota_fiscal + ') já está cadastrada: ' + D.nomeTipoEmbalagem(rep.tipo) + ', lote ' + rep.lote + ', compra de ' + D.br(rep.data_compra) + '.');
        },
        descrever: function (v) { return D.nomeTipoEmbalagem(v.tipo) + ' · lote ' + v.lote + ' · ' + fmt(v.comprado) + ' un.'; },
        topo: function (db) {
            return '<div class="indicadores">' + D.TIPOS_EMBALAGEM.map(function (t) {
                var lotes = db.embalagens.filter(function (e) { return e.tipo === t.chave; });
                var saldo = lotes.reduce(function (s, e) { return s + D.saldoEmbalagem(db, e).saldo; }, 0);
                var ruim = lotes.some(function (e) { return D.situacaoEmbalagem(e, D.saldoEmbalagem(db, e).saldo)[0] === 'Comprar'; });
                return ind(h(t.nome), fmt(saldo), 'unidades em ' + lotes.length + ' lote(s)', ruim);
            }).join('') + '</div>';
        }
    });


    /* =====================================================
       4. BENEFICIAMENTO
       Escolhe o lote recebido → digita a produção, as perdas
       e as embalagens usadas → o lote só salva se fechar 100%.
       ===================================================== */
    var loteBenef = null;
    var form = {};
    Sistema.tela('b-beneficiamento', { desenhar: function (el, db) {
        var pedido = /lote=([^&]+)/.exec(location.hash);
        if (pedido) loteBenef = decodeURIComponent(pedido[1]);
        var lista = db.recebimentos.slice().sort(function (a, b) {
            return (produzido(db, a.lote_receb) ? 1 : 0) - (produzido(db, b.lote_receb) ? 1 : 0) || String(b.data_postura).localeCompare(String(a.data_postura));
        });
        if (!lista.some(function (r) { return r.lote_receb === loteBenef; })) loteBenef = lista.length ? lista[0].lote_receb : null;
        var r = db.recebimentos.find(function (x) { return x.lote_receb === loteBenef; });
        var feito = r && produzido(db, r.lote_receb);
        if (form.lote !== loteBenef) form = { lote: loteBenef, duzia: 0, pente20: 0, pente30: 0, caipirinho: 0, trincado: 0, defeito: 0, sujo: 0, quebrado: 0, sobra: 0 };

        var fila = lista.slice(0, 14).map(function (x) {
            var p = produzido(db, x.lote_receb), c = conferenciaGranja(db, x);
            return '<li><button class="cartao-pedido' + (x.lote_receb === loteBenef ? ' ativo' : '') + '" data-escolher="' + h(x.lote_receb) + '"><b>' + h(x.lote_receb) + '</b> <span style="display:inline">· postura ' + D.diaMes(x.data_postura) + '</span>' +
                '<span>' + (x.lote_granja ? 'Granja Lote ' + h(x.lote_granja) : 'Coletas do dia') + ' · ' + fmt(D.totalRecebido(x)) + ' ovos</span>' +
                (p ? UI.tag('Produção salva', 'ok') : c.tipo === 'erro' ? UI.tag('Diferença com a granja', 'erro') : UI.tag(c.faltam ? 'Aguardando · faltam ' + c.faltam + ' coleta(s)' : 'Aguardando', 'atencao')) + '</button></li>';
        }).join('');

        var corpo = '<div class="card"><p class="vazio">Lance um recebimento para beneficiar.</p></div>';
        if (r && feito) {
            var c = D.conferencia(r, feito);
            corpo = '<div class="card borda-ok"><h2>Produção do lote ' + h(r.lote_receb) + ' já salva</h2>' + tabelaConferencia(c) +
                '<p class="nota">Salva por ' + h(feito.lancado_por) + '. Para refazer, o administrador exclui a produção na lista abaixo e lança de novo.</p></div>';
        } else if (r) {
            corpo = '<div class="card"><h2>1 · Recebimento do lote</h2><div class="indicadores">' + ind('Ovo bom', fmt(r.bom), '') + ind('Trincado', fmt(r.trincado), '') +
                ind('Com defeito', fmt(r.defeito), '') + ind('Sujo', fmt(r.sujo), '') + '<div class="indicador escuro"><span>Disponível para produzir</span><b>' + fmt(r.bom) + '</b><em>só os ovos bons</em></div></div>' +
                '<p class="nota" style="margin:8px 0 0">Chegaram ' + fmt(D.totalRecebido(r)) + ' ovos; trincados, com defeito e sujos (' + fmt(D.perdaRecebimento(r)) + ') não entram na produção.</p>' +
                '<p class="faixa ' + conferenciaGranja(db, r).tipo + '">' + h(conferenciaGranja(db, r).texto) + '</p></div>' +
                '<div class="grade"><div class="card"><h2>2 · Embalagens produzidas</h2><div class="form">' +
                D.MAQUINA.map(function (m) { return '<label>' + h(m.nome) + '<input type="number" min="0" inputmode="numeric" data-campo="' + m.chave + '" value="' + form[m.chave] + '"><span data-ovos="' + m.chave + '"></span></label>'; }).join('') + '</div></div>' +
                '<div class="card"><h2>3 · Perdas e sobra da máquina</h2><div class="form">' +
                [['trincado', 'Ovo trincado'], ['defeito', 'Ovo com defeito'], ['sujo', 'Ovo sujo'], ['quebrado', 'Ovo quebrado (sucção da máquina)'], ['sobra', 'Sobra (não embalados)']].map(function (x) {
                    return '<label>' + x[1] + '<input type="number" min="0" inputmode="numeric" data-campo="' + x[0] + '" value="' + form[x[0]] + '"></label>';
                }).join('') + '</div></div></div>' +
                '<div class="card"><h2>4 · Embalagens usadas (baixa no estoque de compra)</h2><p class="nota" style="margin:0 0 12px">A quantidade já vem da produção. Sai sozinho do lote de compra mais antigo; dá para usar mais de um lote em cada tipo.</p><div class="grade" data-embalagens></div></div>' +
                '<div class="card" data-card-conferencia><div class="card-titulo"><h2>5 · Conferência dos ovos bons</h2><span data-situacao></span></div><div data-conferencia></div>' +
                '<div class="acoes"><button class="btn" data-salvar>Salvar produção e dar baixa</button></div>' +
                '<p class="nota">Os números mudam enquanto você digita. Ao salvar, a produção aparece em Produção embalada e fica disponível no Romaneio.</p></div>';
        }

        el.innerHTML = '<div class="cabecalho"><div><h1>Beneficiamento</h1><p>Classificação e embalagem na máquina. A conferência mostra se a conta fecha; se não fechar, dá para salvar assim mesmo e a diferença fica registrada.</p></div></div>' +
            '<div class="lado-a-lado"><div class="estreito card"><h2>Lotes recebidos</h2><p class="nota" style="margin:0 0 12px">Vêm da Granja › Conferência dos ovos: cada dia é um lote (número = dia da produção).</p>' +
            (D.chegandoDaGranja(db).length ? '<a class="faixa atencao" style="display:block;margin:0 0 12px;text-decoration:none" href="#g-conferencia"><b>' + D.chegandoDaGranja(db).length + ' lote(s) chegando da granja</b> · conferir e receber →</a>' : '') + '<ul style="list-style:none;margin:0;padding:0">' + (fila || '<li class="vazio">Nenhum recebimento.</li>') + '</ul></div>' +
            '<div class="largo">' + corpo + '</div></div>' +
            '<div class="card"><h2>Produções salvas</h2>' + UI.tabela(['Lote', 'Data', { t: 'Ovos embalados', num: 1 }, { t: 'Perdas', num: 1 }, { t: 'Sobra', num: 1 }, 'Conferência', 'Lançado por', ''],
                db.producoes.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 30).map(function (p) {
                    return [h(p.lote_receb), D.br(p.data), fmt(D.embalados(p)), fmt(n(p.trincado) + n(p.defeito) + n(p.sujo) + n(p.quebrado)), fmt(p.sobra),
                        p.diferenca ? UI.tag(p.diferenca, 'atencao') : UI.tag('Fecha', 'ok'), h(p.lancado_por),
                        Sistema.usuario().perfil === 'Administrador' ? '<button class="btn perigo pequeno" data-excluir-prod="' + h(p.id) + '">Excluir</button>' : ''];
                })) + '</div>';

        UI.ligar(el, '[data-escolher]', 'click', function (e, b) { loteBenef = b.dataset.escolher; history.replaceState(null, '', '#b-beneficiamento'); Sistema.atualizar(); });
        UI.ligar(el, '[data-excluir-prod]', 'click', async function (e, b) {
            if (!UI.confirmar('Excluir esta produção? O estoque e as embalagens usadas voltam como estavam antes dela.')) return;
            await API.excluir('producoes', b.dataset.excluirProd, S); UI.avisar('Produção excluída'); Sistema.atualizar();
        });
        if (!r || feito) return;

        /* --- conta ao vivo --- */
        /* EMBALAGENS USADAS: cada tipo pode sair de MAIS DE UM lote de compra.
           Sozinho, o sistema pega do lote de compra mais antigo e passa para o
           próximo quando o saldo acaba. Dá para trocar o lote e a quantidade à mão. */
        var escolhaEmb = {};        // { tipo: { manual: bool, linhas: [[idCompra, qtd], ...] } }
        var comSaldo = function (tipo) {
            return db.embalagens.filter(function (e) { return e.tipo === tipo && D.saldoEmbalagem(db, e).saldo > 0; })
                .sort(function (a, b) { return String(a.data_compra || '').localeCompare(String(b.data_compra || '')) || String(a.lote).localeCompare(String(b.lote)); });
        };
        var automatico = function (tipo, precisa) {
            var falta = precisa, out = [];
            comSaldo(tipo).forEach(function (e) { if (falta > 0) { var q = Math.min(falta, D.saldoEmbalagem(db, e).saldo); out.push([e.id, q]); falta -= q; } });
            return out.length ? out : (comSaldo(tipo)[0] ? [[comSaldo(tipo)[0].id, precisa]] : []);
        };
        function quantoUsa() {
            var usa = { duzia: n(form.duzia), pente20: n(form.pente20), pente30: n(form.pente30) + n(form.caipirinho) };
            usa.caixa = D.caixasUsadas({ duzia: form.duzia, pente20: form.pente20, pente30: form.pente30, caipirinho: form.caipirinho });   // 30 dúzias · 15 P20 · 10 P30 por caixa
            return usa;
        }
        function desenharEmbalagens() {
            var usa = quantoUsa();
            $('[data-embalagens]', el).innerHTML = D.TIPOS_EMBALAGEM.map(function (t) {
                var lotes = comSaldo(t.chave), es = escolhaEmb[t.chave] || (escolhaEmb[t.chave] = { manual: false, linhas: [] });
                if (!es.manual) es.linhas = automatico(t.chave, usa[t.chave]);
                if (!lotes.length) return '<div class="bloco-lotes" style="margin:0"><b>' + h(t.nome) + '</b><p class="nota" style="color:var(--er-t)">Nenhum lote com saldo. Lance a compra em Lançamento de embalagens.</p></div>';
                var soma = es.linhas.reduce(function (s, x) { return s + n(x[1]); }, 0);
                var linhas = es.linhas.map(function (x, k) {
                    var compra = lotes.find(function (e) { return e.id === x[0]; }), saldo = compra ? D.saldoEmbalagem(db, compra).saldo : 0;
                    return '<div class="linha-lote"><select data-emb-lote="' + t.chave + '|' + k + '">' + lotes.map(function (e) {
                            return '<option value="' + e.id + '"' + (e.id === x[0] ? ' selected' : '') + '>Lote ' + h(e.lote) + ' · saldo ' + fmt(D.saldoEmbalagem(db, e).saldo) + '</option>';
                        }).join('') + '</select>' +
                        '<input type="number" min="0" inputmode="numeric" data-emb-qtd="' + t.chave + '|' + k + '" value="' + n(x[1]) + '" aria-label="Quantidade">' +
                        (es.linhas.length > 1 ? '<button type="button" class="btn alt" data-emb-tirar="' + t.chave + '|' + k + '" aria-label="Tirar este lote">✕</button>' : '<span></span>') +
                        (n(x[1]) > saldo ? '<small class="nota" style="grid-column:1/-1;margin:0;color:var(--er-t)">Este lote só tem ' + fmt(saldo) + '.</small>' : '') + '</div>';
                }).join('');
                var ok = soma === usa[t.chave];
                return '<div class="bloco-lotes" style="margin:0"><b>' + h(t.nome) + '</b>' + linhas +
                    '<div class="acoes-linha" style="margin-top:8px">' + (es.linhas.length < lotes.length ? '<button type="button" class="btn alt pequeno" data-emb-mais="' + t.chave + '">+ Usar outro lote</button>' : '') +
                    (es.manual ? '<button type="button" class="btn alt pequeno" data-emb-auto="' + t.chave + '">Mais antigo primeiro</button>' : '') + '</div>' +
                    '<p class="nota" style="margin:8px 0 0">Precisa <b>' + fmt(usa[t.chave]) + '</b> · escolhido ' + fmt(soma) + (ok ? ' ✓' : ' · <b style="color:var(--er-t)">' + (soma < usa[t.chave] ? 'faltam ' + fmt(usa[t.chave] - soma) : 'passou ' + fmt(soma - usa[t.chave])) + '</b>') + '</p></div>';
            }).join('');
            var pega = function (b) { var p = b.split('|'); return [p[0], Number(p[1])]; };
            UI.ligar(el, '[data-emb-lote]', 'change', function (e, s) { var p = pega(s.dataset.embLote); escolhaEmb[p[0]].manual = true; escolhaEmb[p[0]].linhas[p[1]][0] = s.value; desenharEmbalagens(); });
            UI.ligar(el, '[data-emb-qtd]', 'change', function (e, s) { var p = pega(s.dataset.embQtd); escolhaEmb[p[0]].manual = true; escolhaEmb[p[0]].linhas[p[1]][1] = n(s.value); desenharEmbalagens(); });
            UI.ligar(el, '[data-emb-tirar]', 'click', function (e, b) { var p = pega(b.dataset.embTirar); escolhaEmb[p[0]].manual = true; escolhaEmb[p[0]].linhas.splice(p[1], 1); desenharEmbalagens(); });
            UI.ligar(el, '[data-emb-auto]', 'click', function (e, b) { escolhaEmb[b.dataset.embAuto].manual = false; desenharEmbalagens(); });
            UI.ligar(el, '[data-emb-mais]', 'click', function (e, b) {
                var tipo = b.dataset.embMais, es = escolhaEmb[tipo], usados = es.linhas.map(function (x) { return x[0]; });
                var prox = comSaldo(tipo).find(function (x) { return usados.indexOf(x.id) < 0; });
                es.manual = true; es.linhas.push([prox ? prox.id : comSaldo(tipo)[0].id, 0]); desenharEmbalagens();
            });
            return usa;
        }
        function conferir() {
            var c = D.conferencia(r, form);
            D.MAQUINA.forEach(function (m) { $('[data-ovos="' + m.chave + '"]', el).textContent = fmt(n(form[m.chave]) * m.ovos) + ' ovos'; });
            $('[data-conferencia]', el).innerHTML = tabelaConferencia(c);
            $('[data-situacao]', el).innerHTML = c.diferenca === 0 ? UI.tag('Fecha', 'ok') : c.diferenca > 0 ? UI.tag('Faltam ' + fmt(c.diferenca) + ' ovos', 'atencao') : UI.tag('Excedeu ' + fmt(-c.diferenca) + ' ovos', 'erro');
            $('[data-card-conferencia]', el).className = 'card ' + (c.diferenca === 0 ? 'borda-ok' : c.diferenca > 0 ? 'borda-atencao' : 'borda-erro');
            return c;
        }
        UI.ligar(el, '[data-campo]', 'input', function (e, i) { form[i.dataset.campo] = n(i.value); conferir(); desenharEmbalagens(); });
        desenharEmbalagens(); conferir();

        UI.ligar(el, '[data-salvar]', 'click', async function (e, b) {
            var c = conferir();
            if (!c.embalados) { UI.avisar('Informe quantas embalagens foram produzidas.'); return; }
            /* passou dos ovos bons: não deixa (não existe embalar mais ovo do que chegou) */
            if (c.diferenca < 0) { UI.avisar('Excedeu a quantidade de ovos bons: a soma dá ' + fmt(c.total) + ', mas só chegaram ' + fmt(c.recebido) + ' ovos bons (passou ' + fmt(-c.diferenca) + '). Ajuste os números.'); return; }
            /* faltou para fechar 100%: salva assim mesmo e a diferença fica registrada na produção */
            var usa = desenharEmbalagens(), usadas = {};
            for (var i = 0; i < D.TIPOS_EMBALAGEM.length; i++) {
                var t = D.TIPOS_EMBALAGEM[i];
                if (!usa[t.chave]) continue;
                var linhas = (escolhaEmb[t.chave] || { linhas: [] }).linhas.filter(function (x) { return n(x[1]) > 0; });
                if (!linhas.length) { UI.avisar('Sem lote de compra de ' + t.nome + '. Lance a compra primeiro.'); return; }
                var soma = linhas.reduce(function (s2, x) { return s2 + n(x[1]); }, 0);
                if (soma !== usa[t.chave]) { UI.avisar(t.nome + ': precisa ' + fmt(usa[t.chave]) + ', mas os lotes escolhidos somam ' + fmt(soma) + '.'); return; }
                for (var k = 0; k < linhas.length; k++) usadas[linhas[k][0]] = n(usadas[linhas[k][0]]) + n(linhas[k][1]);
            }
            for (var id in usadas) {
                var compra = db.embalagens.find(function (x) { return x.id === id; }), saldo = D.saldoEmbalagem(db, compra).saldo;
                if (usadas[id] > saldo) { UI.avisar('Embalagem lote ' + compra.lote + ' só tem ' + fmt(saldo) + ' unidades.'); return; }
            }
            b.disabled = true; b.textContent = 'Salvando…';
            var v = { lote_receb: r.lote_receb, data: D.hoje(), embalagens_usadas: JSON.stringify(usadas),
                diferenca: c.diferenca === 0 ? '' : (c.diferenca > 0 ? 'Faltaram ' + fmt(c.diferenca) : 'Sobraram ' + fmt(-c.diferenca)) + ' ovos (de ' + fmt(c.recebido) + ' bons)' };
            ['duzia', 'pente20', 'pente30', 'caipirinho', 'trincado', 'defeito', 'sujo', 'quebrado', 'sobra'].forEach(function (k) { v[k] = n(form[k]); });
            try {
                await API.salvar('producoes', v, null, S, 'Salvou a produção do lote ' + r.lote_receb + ' · ' + fmt(c.embalados) + ' ovos embalados' + (v.diferenca ? ' · diferença: ' + v.diferenca : ''));
                form = {}; UI.avisar('Produção salva e embalagens descontadas' + (v.diferenca ? ' · diferença registrada: ' + v.diferenca : '')); Sistema.atualizar();
            } catch (err) { UI.avisar(err.message); b.disabled = false; b.textContent = 'Salvar produção e dar baixa'; }
        });
    } });

    /* Conferência do lote: a conta mostra só os OVOS BONS e o que foi embalado.
       Perdas da máquina, sobra e o que foi separado no recebimento ficam À PARTE.
       Para salvar, embalados + perdas da máquina + sobra têm que bater com os bons
       (assim nenhum ovo some sem registro). */
    function tabelaConferencia(c) {
        var p = function (x) { return UI.pct(x, c.recebido); };
        var w = function (x) { return Math.max(0, Math.min(100, x / Math.max(c.recebido, 1) * 100)) + '%'; };
        var conta = fmt(c.embalados) + ' + ' + fmt(c.perdaBen) + ' + ' + fmt(c.sobra) + ' = ' + fmt(c.total);
        return '<div class="barra-conferencia" role="img" aria-label="Ovos bons embalados"><i style="width:' + w(c.embalados) + ';background:var(--granja)"></i></div>' +
            UI.tabela(['Ovos bons', { t: 'Ovos', num: 1 }, { t: '%', num: 1 }], [
                ['<b>Ovos bons recebidos (disponível para produzir)</b>', '<b>' + fmt(c.recebido) + '</b>', '100%'],
                ['<i style="display:inline-block;width:10px;height:10px;background:var(--granja);margin-right:6px"></i>Embalados', '<b>' + fmt(c.embalados) + '</b>', p(c.embalados)]
            ]) +
            '<p class="acesso-sub" style="margin-top:16px">À parte</p>' +
            UI.tabela(['', { t: 'Ovos', num: 1 }], [
                ['Perdas da máquina (trincado, defeito, sujo, quebrado)', fmt(c.perdaBen)],
                ['Sobra (não embalados)', fmt(c.sobra)],
                ['Separados no recebimento (trincado, defeito e sujo)', fmt(c.perdaRec)]
            ]) +
            '<p class="faixa ' + (c.diferenca === 0 ? 'ok' : c.diferenca > 0 ? 'atencao' : 'erro') + '" style="margin-top:12px">' + (c.diferenca === 0
                ? '<b>Fecha:</b> embalados + perdas da máquina + sobra = ' + conta + ' (ovos bons).'
                : c.diferenca > 0 ? '<b>Não fecha:</b> ' + conta + ', mas os ovos bons são ' + fmt(c.recebido) + ' (faltam ' + fmt(c.diferenca) + ' ovos). Pode salvar assim mesmo: a diferença fica registrada.'
                : '<b>Excedeu a quantidade de ovos bons:</b> ' + conta + ', mas só chegaram ' + fmt(c.recebido) + ' ovos bons (passou ' + fmt(-c.diferenca) + '). Não dá para salvar: ajuste os números.') + '</p>';
    }


    /* =====================================================
       5. PRODUÇÃO EMBALADA
       O que saiu do beneficiamento: quantos pentes e dúzias
       foram produzidos, quantas embalagens foram usadas e o
       que está pronto para entregar (sai pelo romaneio).
       ===================================================== */
    var periodoEstoque = UI.novoPeriodo('sem');
    Sistema.tela('b-estoque', { desenhar: function (el, db) {
        var p = periodoEstoque;
        var prod = db.producoes.filter(function (x) { return D.noPeriodo(x.data, p.de, p.ate); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
        var qtd = D.MAQUINA.map(function (m) { return prod.reduce(function (s, x) { return s + n(x[m.chave]); }, 0); });
        var ovos = prod.reduce(function (s, x) { return s + D.embalados(x); }, 0);
        var usadas = D.embalagensUsadas(db, prod);
        var textoUsadas = function (u) { return D.TIPOS_EMBALAGEM.filter(function (t) { return n(u[t.chave]); }).map(function (t) { return t.nome.replace(/ \(.*\)/, '') + ' ' + fmt(u[t.chave]); }).join(' · ') || '—'; };

        /* Pronto para entregar (estoque por lote) */
        var est = D.estoque(db).filter(function (e) { return D.MAQUINA.some(function (m) { return n(e.qtd[m.chave]) > 0; }); });
        var totais = D.MAQUINA.map(function (m) { return est.reduce(function (s, e) { return s + n(e.qtd[m.chave]); }, 0); });

        el.innerHTML = '<div class="cabecalho"><div><h1>Produção embalada</h1><p>O que saiu do beneficiamento: quantos pentes e dúzias foram produzidos e quantas embalagens foram usadas.</p></div>' +
            '<div class="acoes" style="margin:0"><a class="btn" href="#b-beneficiamento">Beneficiar lote</a></div></div>' +
            UI.periodoHTML(p, true) +

            '<h2 class="secao">Produzido no período</h2>' +
            '<div class="indicadores">' + D.MAQUINA.map(function (m, i) {
                return ind(h(m.nome), fmt(qtd[i]), (m.chave === 'duzia' ? 'dúzias' : 'pentes') + ' · ' + fmt(qtd[i] * m.ovos) + ' ovos');
            }).join('') + '<div class="indicador escuro"><span>Total embalado</span><b>' + fmt(ovos) + '</b><em>ovos em ' + prod.length + ' lote(s)</em></div></div>' +

            '<h2 class="secao">Embalagens usadas no período</h2>' +
            '<div class="indicadores">' + D.TIPOS_EMBALAGEM.map(function (t) {
                var saldo = db.embalagens.filter(function (e) { return e.tipo === t.chave; }).reduce(function (s, e) { return s + D.saldoEmbalagem(db, e).saldo; }, 0);
                return ind(h(t.nome), fmt(usadas[t.chave] || 0), 'usadas · restam ' + fmt(saldo) + ' no estoque de compra', false);
            }).join('') + '</div>' +

            '<div class="card"><h2>Produção por lote</h2>' +
            UI.tabela(['Lote', 'Beneficiado em'].concat(D.MAQUINA.map(function (m) { return { t: m.nome, num: 1 }; })).concat([{ t: 'Ovos embalados', num: 1 }, { t: 'Embalagens usadas', quebra: 1 }, 'Lançado por']),
                prod.map(function (x) {
                    return [h(x.lote_receb), D.br(x.data)].concat(D.MAQUINA.map(function (m) { return fmt(x[m.chave]); }))
                        .concat(['<b>' + fmt(D.embalados(x)) + '</b>', h(textoUsadas(D.embalagensUsadas(db, [x]))), '<span class="nota" style="margin:0">' + h(x.lancado_por) + '</span>']);
                }).concat(prod.length ? [['<b>Total</b>', ''].concat(qtd.map(function (q) { return '<b>' + fmt(q) + '</b>'; })).concat(['<b>' + fmt(ovos) + '</b>', '<b>' + h(textoUsadas(usadas)) + '</b>', ''])] : []),
                'Nenhuma produção salva neste período.') + '</div>' +

            '<div class="card"><div class="card-titulo"><h2>Pronto para entregar (sai pelo romaneio)</h2>' + (D.podeVer(Sistema.usuario(), 'b-romaneio') ? '<a href="#b-romaneio">Ir para o romaneio →</a>' : '') + '</div>' +
            UI.tabela(['Lote', 'Postura', 'Validade'].concat(D.MAQUINA.map(function (m) { return { t: m.nome, num: 1 }; })), est.map(function (e) {
                return [h(e.lote), D.br(e.data), D.br(D.validade(e.data, db))].concat(D.MAQUINA.map(function (m) { return fmt(e.qtd[m.chave]); }));
            }).concat(est.length ? [['<b>Total</b>', '', ''].concat(totais.map(function (t) { return '<b>' + fmt(t) + '</b>'; }))] : []), 'Nada pronto para entregar.') +
            '<p class="nota">Entra quando a produção é salva no Beneficiamento e sai quando o romaneio é fechado.</p></div>';
        UI.ligarPeriodo(el, periodoEstoque, Sistema.atualizar);
    } });
})();
