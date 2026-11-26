/* =========================================================
   ERP Ovo Caipira · TELAS DA GRANJA
   ---------------------------------------------------------
   Organização deste arquivo:
     1.  Resumo da granja
     2.  Lotes (lista, ficha do lote, curva e lançamentos)
     3.  Entrada dos ovos (coletas) e Conferência dos ovos
     4.  Produção diária (soma das coletas + ovos pequenos)
     5.  Mortalidade e abate
     6.  Saída de ovos (vai para o Recebimento do beneficiamento)
     7.  (o checklist diário saiu da granja: agora é só o das colaboradoras, um por lote de aves)
     8.  Peso semanal
     9.  Tarefas
     10. Alertas
     11. Regras usadas em mais de uma tela
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var S = 'Granja';


    /* =====================================================
       11. REGRAS USADAS EM MAIS DE UMA TELA
       (ficam no começo porque as telas usam)
       ===================================================== */
    /* Lote precisa existir, estar ativo e a data não pode ser antes do alojamento */
    function checarLote(db, valores, id) {
        var lote = D.acharLote(db, valores.lote);
        if (!lote) throw new Error('Cadastre o lote antes de lançar.');
        if (lote.ativo === 'Não' && !id) throw new Error('O lote ' + lote.lote + ' está inativo.');
        if (valores.data && lote.data_inicio && valores.data < lote.data_inicio) throw new Error('A data não pode ser antes do alojamento do lote (' + D.br(lote.data_inicio) + ').');
        return lote;
    }
    /* Não deixa repetir a mesma combinação (ex.: data + lote) */
    function unico(db, tabela, valores, id, campos, texto) {
        var repetido = (db[tabela] || []).some(function (r) { return r.id !== id && campos.every(function (c) { return String(r[c]) === String(valores[c]); }); });
        if (repetido) throw new Error(texto || 'Já existe um lançamento igual. Edite o que já existe.');
    }
    var colLote = { t: 'Lote', v: function (r, db) { return h(D.nomeLote(db, r.lote)); } };
    var colData = { t: 'Data', v: function (r) { return D.br(r.data); } };
    var colQuem = { t: 'Lançado por', v: function (r) { return '<span class="nota" style="margin:0">' + h(r.alterado_por || r.lancado_por || '') + '</span>'; } };
    function primeiroLote(db) { var l = D.lotesAtivos(db)[0]; return l ? l.lote : ''; }


    /* =====================================================
       1. RESUMO DA GRANJA
       ===================================================== */
    var periodoResumo = UI.novoPeriodo('sem');
    Sistema.tela('g-resumo', { desenhar: function (el, db) {
        var p = periodoResumo, hoje = D.hoje();
        var noPer = function (r) { return D.noPeriodo(r.data, p.de, p.ate); };
        var coletas = db.coletas.filter(noPer), mortes = db.mortalidade.filter(noPer);
        var total = coletas.reduce(function (s, c) { return s + D.totalColeta(c); }, 0);
        var bons = coletas.reduce(function (s, c) { return s + n(c.bons); }, 0);
        var lotes = D.lotesAtivos(db);
        var vivas = lotes.reduce(function (s, l) { return s + D.avesVivas(db, l); }, 0);
        var perdas = mortes.reduce(function (s, r) { return s + n(r.mortes) + n(r.abate); }, 0);

        /* Avisos do dia */
        var avisos = [];
        db.alertas.filter(function (a) { return a.resolvido !== 'Sim' && D.podeVer(Sistema.usuario(), 'g-alertas'); }).forEach(function (a) {
            avisos.push('<a class="aviso ' + (a.gravidade === 'Urgente' ? 'erro' : 'atencao') + '" href="#g-alertas"><span class="bolinha">!</span><span><b>' + h(a.gravidade) + (a.lote ? ' · Lote ' + h(a.lote) : '') + (a.registrado_por ? ' · aviso de ' + h(a.registrado_por) : '') + '</b><br>' + h(a.descricao) + '</span></a>');
        });
        /* checklist do dia das colaboradoras pendente: só o administrador vê (um aviso só, com o número) */
        if (Sistema.usuario().perfil === 'Administrador') {
            var semCheck = lotes.filter(function (l) { return !db.checklist_colab.some(function (c) { return c.data === hoje && c.tipo === 'lote' && String(c.lote) === String(l.lote); }); });
            if (semCheck.length) avisos.push('<a class="aviso atencao" href="colaboradora.html#checklist"><span class="bolinha">i</span><span><b>Checklist do dia: ' + semCheck.length + ' lote(s) pendente(s)</b><br>Lotes ' + semCheck.map(function (l) { return h(String(l.lote).split('/')[0]); }).join(', ') + '</span></a>');
        }
        /* pendências automáticas: coleta não lançada e conferência atrasada (aparecem primeiro) */
        avisos = D.pendencias(db).map(function (p) { return D.pendenciaHTML(p, h); }).concat(avisos);

        /* Primeira linha = granja toda (as coletas são por dia, sem lote).
           Depois uma linha por lote: idade, aves e mortes. */
        var pc = function (x) { return x ? x.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—'; };
        var gt = D.posturaPeriodo(db, '', p.de, p.ate);
        var linhas = [['<b>Granja toda · lote da coleta</b>', '—', '<b>' + fmt(vivas) + '</b>', '<b>' + fmt(gt.total) + '</b>', UI.pct(gt.bons, gt.total), pc(gt.real), gt.guia == null ? '—' : pc(gt.guia), '<b>' + fmt(perdas) + '</b>']].concat(lotes.map(function (l) {
            var pl = D.posturaPeriodo(db, l.lote, p.de, p.ate);              // só coletas antigas que tinham lote
            var sem = D.idade(l), guia = D.posturaGuia(db, l, sem);
            var m = mortes.filter(function (x) { return String(x.lote) === String(l.lote); }).reduce(function (s, x) { return s + n(x.mortes) + n(x.abate); }, 0);
            return [h(D.nomeLote(db, l.lote)), sem == null ? '—' : sem + ' sem', fmt(D.avesVivas(db, l)), pl.total ? fmt(pl.total) : '—', pl.total && pl.bons != null ? UI.pct(pl.bons, pl.total) : '—',
                pc(pl.real), guia == null ? '—' : pc(guia), fmt(m)];
        }));

        var partes = UI.partes(p.de, p.ate);
        var serie = partes.map(function (pt) { return db.coletas.filter(function (c) { return D.noPeriodo(c.data, pt.de, pt.ate); }).reduce(function (s, c) { return s + D.totalColeta(c); }, 0); });
        var tarefas = tarefasDeHoje(db);

        el.innerHTML =
            '<div class="cabecalho"><div><p class="eyebrow">' + UI.dataExtenso() + '</p><h1>Resumo da granja</h1><p>Lotes, coletas, postura e mortalidade no período.</p></div>' +
            '<div class="acoes" style="margin:0"><a class="btn alt" href="#g-coletas">Lançar coleta</a><a class="btn" href="#g-saida">Saída de ovos</a></div></div>' +
            (avisos.length ? '<div class="avisos">' + avisos.join('') + '</div>' : '') +
            UI.periodoHTML(p) +
            '<div class="indicadores">' +
                ind('Aves vivas', fmt(vivas), lotes.length + ' lote(s) ativo(s)') + ind('Coletado', fmt(total), 'ovos no período') +
                ind('Ovos bons', UI.pct(bons, total), fmt(bons) + ' ovos') + ind('Mortes + abates', fmt(perdas), 'no período', perdas > 0) + '</div>' +
            '<div class="grade larga"><div class="card"><h2>Por lote</h2>' +
                UI.tabela(['Lote', 'Idade', { t: 'Aves vivas', num: 1 }, { t: 'Coletado', num: 1 }, { t: '% bons', num: 1 }, { t: 'Postura média', num: 1 }, { t: 'Guia', num: 1 }, { t: 'Perdas', num: 1 }], linhas) +
                '<p class="nota">Postura média = ovos por dia ÷ aves vivas. Guia = curva do manual da linhagem na idade atual.</p></div>' +
            '<div class="card"><h2>Coletado por dia</h2>' + UI.grafico(partes.map(function (x) { return x.rotulo; }), serie) + '</div></div>' +
            '<div class="card"><h2>Tarefas de hoje</h2>' + (tarefas.length ? UI.tabela(['Tarefa', 'Lote', 'Responsável', 'Obrigatória'], tarefas.map(function (t) {
                return [h(t.descricao), t.lote ? 'Lote ' + h(t.lote) : 'Todos', h(t.responsavel), t.obrigatoria === 'Sim' ? UI.tag('Obrigatória', 'erro') : UI.tag('Não', 'neutra')];
            })) : '<p class="vazio">Nenhuma tarefa para hoje.</p>') + '</div>';
        UI.ligarPeriodo(el, periodoResumo, Sistema.atualizar);
    } });
    function ind(nome, valor, det, ruim) { return '<div class="indicador' + (ruim ? ' ruim' : '') + '"><span>' + nome + '</span><b>' + valor + '</b><em>' + det + '</em></div>'; }
    function tarefasDeHoje(db) {
        var nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        var hoje = D.hoje(), dia = nomes[new Date().getDay()];
        return db.tarefas.filter(function (t) { return t.ativo !== 'Não' && (t.dia === 'Todos os dias' || t.dia === dia || (t.dia === 'Data específica' && t.data_especifica === hoje)); });
    }


    /* =====================================================
       2. LOTES
       Lista no topo; ao escolher, mostra a ficha, a postura
       comparada com o guia e os lançamentos do lote.
       ===================================================== */
    var loteEscolhido = null, abaLote = 'coletas';
    Sistema.tela('g-lotes', { desenhar: function (el, db) {
        var lotes = db.lotes.slice().sort(function (a, b) { return String(a.lote).localeCompare(String(b.lote), 'pt-BR', { numeric: true }); });
        if (!lotes.some(function (l) { return l.lote === loteEscolhido; })) loteEscolhido = lotes.length ? lotes[0].lote : null;
        var sel = D.acharLote(db, loteEscolhido);

        var hj = D.hoje();
        var lista = lotes.map(function (l) {
            var sem = D.idade(l), v = D.avesVivas(db, l), aviso = avisoDoLote(db, l);
            var pl = D.posturaPeriodo(db, l.lote, D.somarDias(hj, -6), hj);
            return ['<button class="btn ' + (l.lote === loteEscolhido ? '' : 'alt ') + 'pequeno" data-lote="' + h(l.lote) + '">Lote ' + h(l.lote) + '</button>' +
                    (aviso ? ' <span class="piscando" title="' + h(aviso) + '"></span>' : ''),
                h(l.linhagem), sem == null ? '—' : sem + ' sem', fmt(v) + ' / ' + fmt(l.aves_iniciais),
                pl.dias && l.ativo !== 'Não' ? pl.real.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—',
                D.br(l.descarte_previsto || D.descartePrevisto(l, db)), l.ativo === 'Não' ? UI.tag('Encerrado' + (l.data_encerramento ? ' ' + D.br(l.data_encerramento) : ''), 'neutra') : UI.tag('Ativo', 'ok')];
        });

        var ficha = '<p class="vazio">Cadastre o primeiro lote.</p>', curva = '', abas = '';
        if (sel) {
            var sem = D.idade(sel), vivas = D.avesVivas(db, sel);
            ficha = '<p class="eyebrow">Ficha do lote</p><h2 class="titulo-ficha">Lote ' + h(sel.lote) + ' · ' + h(sel.linhagem) + '</h2>' +
                '<div class="indicadores" style="grid-template-columns:1fr 1fr">' + ind('Aves vivas', fmt(vivas), 'de ' + fmt(sel.aves_iniciais) + ' alojadas') + ind('Idade', sem == null ? '—' : sem + ' sem', sel.data_nascimento ? 'pelo nascimento' : 'pelo alojamento') + '</div>' +
                '<table class="tabela"><tbody>' + [['Nascimento', D.br(sel.data_nascimento) || '—'], ['Alojamento', D.br(sel.data_inicio)], ['Descarte previsto', D.br(sel.descarte_previsto || D.descartePrevisto(sel, db)) + ' (' + D.semanasDescarte(db) + ' semanas)'],
                    ['Origem', h((sel.origem || '—') + (sel.cidade ? ' · ' + sel.cidade : ''))], ['GTA', h(sel.gta || '—')], ['Nota fiscal', h(sel.nota_fiscal || '—')]]
                    .map(function (x) { return '<tr><td style="color:var(--suave)">' + x[0] + '</td><td>' + x[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
                '<div class="acoes"><button class="btn" data-ficha-controle>Ficha controle (imprimir)</button><button class="btn alt" data-editar-lote>Editar lote</button>' +
                (sel.ativo !== 'Não' ? '<button class="btn alt" data-encerrar-lote>Encerrar lote (descarte)</button>' : '') + '</div>' +
                (avisoDoLote(db, sel) ? '<p class="faixa atencao" style="margin-top:12px"><span class="piscando"></span> ' + h(avisoDoLote(db, sel)) + '</p>' : '');

            /* Postura semanal real × guia (últimas 11 semanas) */
            var ate = sem == null ? 0 : sem, semanas = [];
            for (var s = Math.max(0, ate - 10); s <= ate; s++) semanas.push(s);
            var base = sel.data_nascimento || sel.data_inicio;
            var real = semanas.map(function (w) {
                var de = D.somarDias(base, w * 7), fim = D.somarDias(base, w * 7 + 6);
                var pl = D.posturaPeriodo(db, sel.lote, de, fim);                  // coletas antigas com lote
                if (!pl.dias) pl = D.posturaPeriodo(db, '', de, fim);             // coletas por dia: postura da granja toda
                return Math.round(pl.real * 10) / 10;
            });
            var daGranja = !db.coletas.some(function (c) { return String(c.lote) === String(sel.lote); }) && !db.producao.some(function (p) { return String(p.lote) === String(sel.lote) && n(p.ovos_lote) > 0; });
            var guia = semanas.map(function (w) { var g = D.posturaGuia(db, sel, w); return g == null ? 0 : Math.round(g * 10) / 10; });
            var ultimo = real[real.length - 1], g = guia[guia.length - 1];
            curva = '<div class="card"><div class="card-titulo"><h2>Postura real × guia da linhagem (%)</h2>' + UI.legenda([['Real', 'var(--granja)'], ['Guia de manejo', 'var(--azul)']]) + '</div>' +
                UI.grafico(semanas.map(function (w) { return 'S' + w; }), real, null, guia, 100) +
                '<p class="nota">' + (ultimo ? 'Semana ' + ate + ': ' + ultimo.toLocaleString('pt-BR') + '% de postura contra ' + g.toLocaleString('pt-BR') + '% do guia ' + h(sel.linhagem) + '.' : 'Ainda sem coletas nas últimas semanas.') +
                    (daGranja ? ' A postura real é da <b>granja toda</b>. Para ver a deste lote, lance <b>Ovos por lote</b> em Produção diária.' : '') + '</p></div>';

            var doLote = function (t) { return db[t].filter(function (r) { return String(r.lote) === String(sel.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 12); };
            var conteudo = {
                coletas: UI.tabela(['Data', 'Nº', 'Coletado por', { t: 'Bons', num: 1 }, { t: 'Trinc.', num: 1 }, { t: 'Def.', num: 1 }, { t: 'Sujos', num: 1 }, { t: 'Total', num: 1 }],
                    db.coletas.filter(function (c) { return !c.lote || String(c.lote) === String(sel.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 12).map(function (c) { return [D.br(c.data), h(c.n_coleta), h(c.coletado_por), fmt(c.bons), fmt(c.trincados), fmt(c.defeituosos), fmt(c.sujos), '<b>' + fmt(D.totalColeta(c)) + '</b>']; })),
                mortalidade: UI.tabela(['Data', { t: 'Mortes', num: 1 }, { t: 'Abate', num: 1 }, 'Motivo', { t: 'Observação', quebra: 1 }],
                    doLote('mortalidade').map(function (m) { return [D.br(m.data), fmt(m.mortes), fmt(m.abate), h(m.motivo), h(m.observacao)]; })),
                checklist: UI.tabela(['Data', 'Colaboradora', { t: 'Conforme', num: 1 }, { t: 'Não conforme', num: 1 }, 'Observação'],
                    db.checklist_colab.filter(function (c) { return c.tipo === 'lote' && String(c.lote) === String(sel.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 12).map(function (c) {
                        return [D.br(c.data), h(c.colaboradora), fmt(c.c), n(c.nc) ? UI.tag(String(c.nc), 'erro') : '0', h(c.observacao)];
                    }), 'Nenhum checklist das colaboradoras neste lote.'),
                peso: UI.tabela(['Data', 'Idade', { t: 'Peso médio (g)', num: 1 }, { t: 'Guia (g)', num: 1 }, 'Diferença', { t: 'Aves pesadas', num: 1 }, 'Uniformidade', 'Observação'], doLote('pesagens').map(function (p) {
                    var a = D.avaliarPesagem(db, p);
                    return [D.br(p.data), a.semana == null ? '—' : a.semana + ' sem.', fmt(p.peso_medio), a.guia == null ? '—' : fmt(Math.round(a.guia)), a.guia == null ? '—' : UI.tag((a.dif > 0 ? '+' : '') + fmt(Math.round(a.dif)) + ' g', a.situacao === 'no guia' ? 'ok' : a.situacao === 'abaixo' ? 'erro' : 'atencao'), fmt(p.aves_pesadas), p.uniformidade ? p.uniformidade + '%' : '—', h(p.observacao)];
                })),
                vacinas: (sel.data_nascimento ? '' : '<p class="faixa atencao">Cadastre a data de nascimento do lote para calcular as datas das vacinas.</p>') +
                    UI.tabela(['Idade', 'Data prevista', 'Vacina', 'Situação', ''], D.vacinasDoLote(db, sel).map(function (x, i) {
                        var cor = { 'Aplicada': 'ok', 'Atrasada': 'erro', 'Hoje': 'atencao' }[x.situacao] || 'neutra';
                        return [x.idade + ' dias', D.br(x.prevista) || '—', h(x.vacina),
                            UI.tag(x.situacao === 'Aplicada' ? 'Aplicada ' + D.br(x.feita.data_aplicada) : x.situacao, cor) + (x.feita && x.feita.aplicado_por ? '<br><small class="nota" style="margin:0">' + h(x.feita.aplicado_por) + '</small>' : ''),
                            x.feita ? '<button class="btn alt pequeno" data-vacina="' + i + '">Ver / corrigir</button>' : '<button class="btn pequeno" data-vacina="' + i + '">Marcar aplicada</button>'];
                    }), 'Sem protocolo de vacinas.')
            };
            abas = '<div class="card"><div class="abas" role="tablist">' + [['coletas', 'Coletas'], ['vacinas', 'Vacinas'], ['mortalidade', 'Mortalidade e abate'], ['checklist', 'Checklist do dia'], ['peso', 'Peso semanal']].map(function (a) {
                return '<button role="tab" aria-selected="' + (abaLote === a[0]) + '" class="' + (abaLote === a[0] ? 'ativo' : '') + '" data-aba="' + a[0] + '">' + a[1] + '</button>';
            }).join('') + '</div>' + conteudo[abaLote] + '</div>';
        }

        el.innerHTML =
            '<div class="cabecalho"><div><h1>Lotes das aves</h1><p>Cadastro de cada turma de aves (número/ano), idade, aves vivas, vacinas e tudo o que foi lançado no lote.</p></div>' +
            '<div class="acoes" style="margin:0"><button class="btn alt" data-protocolo>Protocolo de vacinas</button><button class="btn" data-novo-lote>+ Novo lote</button></div></div>' +
            '<div class="card">' + UI.tabela(['Lote', 'Linhagem', 'Idade', 'Aves vivas', 'Postura (7 dias)', 'Descarte previsto', 'Situação'], lista, 'Nenhum lote cadastrado.') +
            '<p class="nota"><span class="piscando"></span> = o lote tem alerta aberto, vacina atrasada ou do dia, ou tarefa pendente hoje.</p></div>' +
            '<div class="lado-a-lado"><div class="estreito card borda-granja">' + ficha + '</div><div class="largo">' + curva + abas + '</div></div>';

        UI.ligar(el, '[data-lote]', 'click', function (e, b) { loteEscolhido = b.dataset.lote; Sistema.atualizar(); });
        UI.ligar(el, '[data-aba]', 'click', function (e, b) { abaLote = b.dataset.aba; Sistema.atualizar(); });
        UI.ligar(el, '[data-novo-lote]', 'click', function () { formLote(db, null); });
        UI.ligar(el, '[data-editar-lote]', 'click', function () { formLote(db, sel); });
        UI.ligar(el, '[data-ficha-controle]', 'click', function () { UI.imprimirFolha(fichaControle(db, sel), 'paisagem'); });
        UI.ligar(el, '[data-encerrar-lote]', 'click', function () { encerrarLote(db, sel); });
        UI.ligar(el, '[data-protocolo]', 'click', function () { janelaProtocolo(db); });
        UI.ligar(el, '[data-vacina]', 'click', function (e, b) {
            var x = D.vacinasDoLote(db, sel)[Number(b.dataset.vacina)];
            UI.abrirJanela({ tabela: 'vacinas', titulo: x.vacina + ' · Lote ' + sel.lote, soLer: ['lote', 'idade', 'vacina', 'data_prevista'],
                valores: x.feita || { lote: sel.lote, idade: x.idade, vacina: x.vacina, data_prevista: x.prevista, data_aplicada: D.hoje(), aplicado_por: Sistema.usuario().nome },
                aoSalvar: async function (v) {
                    await API.salvar('vacinas', v, x.feita && x.feita.id, S, 'Vacina ' + x.vacina + ' aplicada · Lote ' + sel.lote + ' · ' + D.br(v.data_aplicada));
                    UI.avisar('Vacina registrada'); Sistema.atualizar();
                } });
        });
    } });

    /* Sinal piscando no lote: alerta aberto, vacina atrasada/do dia ou tarefa pendente hoje */
    function avisoDoLote(db, l) {
        if (l.ativo === 'Não') return '';
        var motivos = [];
        var al = (db.alertas || []).filter(function (a) { return String(a.lote) === String(l.lote) && a.resolvido !== 'Sim'; }).length;
        if (al) motivos.push(al + ' alerta(s) aberto(s)');
        var vac = D.vacinasDoLote(db, l).filter(function (x) { return x.situacao === 'Atrasada' || x.situacao === 'Hoje'; });
        if (vac.length) motivos.push(vac.length + ' vacina(s) ' + (vac.some(function (x) { return x.situacao === 'Atrasada'; }) ? 'atrasada(s)' : 'para hoje'));
        var tar = D.tarefasDoDia(db, D.hoje()).filter(function (t) { return !t.feita && String(t.tarefa.lote) === String(l.lote); }).length;
        if (tar) motivos.push(tar + ' tarefa(s) pendente(s) hoje');
        return motivos.join(' · ');
    }

    /* FICHA CONTROLE DE LOTES (igual à da porta do galpão) — sai em folha deitada */
    function fichaControle(db, l) {
        var idades = D.controleIdades(l, db), porCol = Math.ceil(idades.length / 4), sem = D.idade(l);
        var linhasIdade = [];
        for (var i = 0; i < porCol; i++) {
            var cel = [];
            for (var c = 0; c < 4; c++) {
                var x = idades[c * porCol + i];
                cel.push(x ? '<td' + (x.semana === sem ? ' class="destaque"' : '') + '>' + x.semana + '</td><td' + (x.semana === sem ? ' class="destaque"' : '') + '>' + D.br(x.data) + '</td>' : '<td></td><td></td>');
            }
            linhasIdade.push('<tr>' + cel.join('') + '</tr>');
        }
        var vac = D.vacinasDoLote(db, l).map(function (x) {
            return '<tr><td>' + x.idade + '</td><td>' + (D.br(x.prevista) || '') + '</td><td>' + h(x.vacina) + '</td><td>' + (x.feita ? D.br(x.feita.data_aplicada) : '') + '</td></tr>';
        }).join('');
        var cab = [['Data chegada', D.br(l.data_inicio)], ['Data nasc.', D.br(l.data_nascimento) || ''], ['Semanas', sem == null ? '' : sem], ['Número lote', h(l.lote)],
            ['Origem', h(l.origem || '')], ['Cidade', h(l.cidade || '')], ['Quantidade animais', fmt(l.aves_iniciais)], ['Aves vivas hoje', fmt(D.avesVivas(db, l))],
            ['Nº GTA', h(l.gta || '')], ['Nota fiscal', h(l.nota_fiscal || '') + (l.data_nota ? ' · ' + D.br(l.data_nota) : '')], ['Raça', h(l.linhagem)], ['Descarte previsto', D.br(l.descarte_previsto || D.descartePrevisto(l, db))]];
        return '<div class="ficha-controle">' +
            '<div class="fc-topo"><div><h1>Ficha controle de lotes</h1>' +
                '<table class="fc-cab">' + [0, 4, 8].map(function (k) { return '<tr>' + cab.slice(k, k + 4).map(function (c) { return '<th>' + c[0] + '</th><td>' + c[1] + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' +
                '<div class="fc-lote"><small>LOTE</small>' + h(l.lote) + '</div><img src="img/logo.png" alt=""></div>' +
            '<div class="fc-corpo"><div><h3>Controle de idades</h3><table class="fc-tab"><tr>' + '<th>Semana</th><th>Data</th>'.repeat(4) + '</tr>' + linhasIdade.join('') + '</table></div>' +
            '<div><h3>Protocolo de vacinas</h3><table class="fc-tab"><tr><th>Idade (dias)</th><th>Data prevista</th><th>Vacina</th><th>Aplicada em</th></tr>' + vac + '</table></div></div>' +
            '<p class="miuda">' + h(CONFIG.SITIO) + ' · impresso em ' + D.br(D.hoje()) + '</p></div>';
    }

    /* ENCERRAR LOTE: descarte total das aves (abate no frigorífico). Zera as aves
       vivas, marca o lote como encerrado e oferece abrir o lote do mesmo espaço. */
    function encerrarLote(db, l) {
        var vivas = D.avesVivas(db, l), num = String(l.lote).split('/')[0];
        var anoNovo = Math.max(Number(D.hoje().slice(0, 4)), Number(String(l.lote).split('/')[1] || 0) + 1);
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" novalidate style="max-width:560px;width:100%"><h2>Encerrar lote ' + h(l.lote) + '</h2>' +
            '<p class="nota">Registra o descarte total das <b>' + fmt(vivas) + ' aves vivas</b> (abate no frigorífico). O lote fica encerrado e para de contar aves.</p>' +
            '<div class="form"><label>Data do descarte<input type="date" name="data" value="' + D.hoje() + '"></label>' +
            '<label>Frigorífico<input name="frigorifico" placeholder="Nome do frigorífico"></label>' +
            '<label style="grid-column:1/-1">Observação<input name="obs" placeholder="Ex.: GTA de saída, nota do frigorífico"></label></div>' +
            '<p class="msg faixa erro" hidden></p><div class="acoes"><button class="btn alt" type="button" data-fechar>Cancelar</button><button class="btn perigo" type="submit">Encerrar lote</button></div></form>';
        document.body.appendChild(fundo);
        var fechar = function () { fundo.remove(); };
        fundo.addEventListener('click', function (ev) { if (ev.target === fundo || ev.target.hasAttribute('data-fechar')) fechar(); });
        fundo.querySelector('form').addEventListener('submit', async function (ev) {
            ev.preventDefault();
            var f = ev.target, msg = f.querySelector('.msg');
            if (!f.data.value) { msg.textContent = 'Informe a data do descarte.'; msg.hidden = false; return; }
            if (!UI.confirmar('Encerrar o lote ' + l.lote + ' com o descarte de ' + fmt(vivas) + ' aves? Não dá para desfazer pelo sistema.')) return;
            f.querySelector('[type=submit]').disabled = true;
            if (vivas > 0) await API.salvar('mortalidade', { data: f.data.value, lote: l.lote, mortes: 0, abate: vivas, motivo: 'Descarte final (abate no frigorífico)',
                observacao: [f.frigorifico.value.trim() && 'Frigorífico: ' + f.frigorifico.value.trim(), f.obs.value.trim()].filter(Boolean).join(' · ') }, null, S,
                'Descarte final do lote ' + l.lote + ' · ' + fmt(vivas) + ' aves');
            await API.salvar('lotes', { ativo: 'Não', data_encerramento: f.data.value }, l.id, S, 'Encerrou o lote ' + l.lote);
            fechar(); UI.avisar('Lote ' + l.lote + ' encerrado');
            var novo = num + '/' + anoNovo;
            if (!D.acharLote(API.dados(), novo) && UI.confirmar('Abrir agora o próximo lote deste espaço (' + novo + ')?')) formLote(API.dados(), null, { lote: novo });
            else Sistema.atualizar();
        });
    }

    /* PROTOCOLO DE VACINAS: uma linha por vacina, "idade em dias - vacina" */
    function janelaProtocolo(db) {
        var atual = (db.config || []).find(function (c) { return c.chave === 'protocolo_vacinas'; });
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" novalidate style="max-width:560px;width:100%"><h2>Protocolo de vacinas</h2>' +
            '<p class="nota">Uma vacina por linha: <b>idade em dias - nome da vacina</b>. A data de cada lote sai sozinha (nascimento + idade).</p>' +
            '<textarea name="texto" rows="16" style="width:100%;font:inherit">' + h(D.textoProtocolo(db)) + '</textarea>' +
            '<div class="acoes"><button class="btn alt" type="button" data-fechar>Cancelar</button><button class="btn" type="submit">Salvar protocolo</button></div></form>';
        document.body.appendChild(fundo);
        var fechar = function () { fundo.remove(); };
        fundo.addEventListener('click', function (ev) { if (ev.target === fundo || ev.target.hasAttribute('data-fechar')) fechar(); });
        fundo.querySelector('form').addEventListener('submit', async function (ev) {
            ev.preventDefault();
            await API.salvar('config', { chave: 'protocolo_vacinas', valor: ev.target.texto.value.trim() }, atual && atual.id, S, 'Alterou o protocolo de vacinas');
            fechar(); UI.avisar('Protocolo salvo'); Sistema.atualizar();
        });
    }

    function formLote(db, lote, preset) {
        UI.abrirJanela({
            tabela: 'lotes', titulo: lote ? 'Editar lote ' + lote.lote : 'Novo lote',
            sub: 'Lote = número do espaço + ano de alojamento (ex.: 20/2026). O descarte previsto é calculado pelo nascimento (' + D.semanasDescarte(db) + ' semanas) e pode ser mudado. As vacinas saem sozinhas pela data de nascimento.',
            valores: lote || Object.assign({ lote: D.proximoLote(db), data_inicio: D.hoje(), ativo: 'Sim', linhagem: (db.linhagens[0] || {}).linhagem }, preset || {}),
            aoAbrir: function (f) {
                var calc = function () { if (!f.descarte_previsto.dataset.mexeu) f.descarte_previsto.value = D.descartePrevisto({ data_nascimento: f.data_nascimento.value, data_inicio: f.data_inicio.value }, db); };
                f.descarte_previsto.addEventListener('input', function () { this.dataset.mexeu = '1'; });
                f.data_nascimento.addEventListener('change', calc); f.data_inicio.addEventListener('change', calc);
                if (!lote) calc();
            },
            aoSalvar: async function (v) {
                v.lote = String(v.lote).trim();
                if (!/^\d{1,3}\/\d{4}$/.test(v.lote) && !lote) throw new Error('Use número/ano no lote, ex.: 20/2026.');
                unico(db, 'lotes', v, lote && lote.id, ['lote'], 'Já existe o lote ' + v.lote + '.');
                if (v.data_nascimento && v.data_nascimento > v.data_inicio) throw new Error('O nascimento tem que ser antes (ou no dia) do alojamento.');
                if (n(v.aves_iniciais) < 1) throw new Error('Informe ao menos uma ave alojada.');
                if (lote && lote.lote !== v.lote && ['coletas', 'mortalidade', 'saida'].some(function (t) { return db[t].some(function (r) { return String(r.lote) === String(lote.lote); }); }))
                    throw new Error('Este lote já tem lançamentos: o número não pode mudar.');
                if (!v.descarte_previsto) v.descarte_previsto = D.descartePrevisto(v, db);
                await API.salvar('lotes', v, lote && lote.id, S, (lote ? 'Editou o lote ' : 'Cadastrou o lote ') + v.lote);
                loteEscolhido = v.lote;
                UI.avisar('Lote salvo'); Sistema.atualizar();
            }
        });
    }


    /* =====================================================
       3. ENTRADA DOS OVOS (as coletas das colaboradoras)
          e CONFERÊNCIA DOS OVOS (reconferir o que foi lançado)
       ===================================================== */
    /* Nº da coleta: 1ª, 2ª… de cada colaboradora no dia */
    var proximaColeta = D.proximaColeta;   // 1ª, 2ª, 3ª… sem limite
    function textoContagem(c) { return fmt(c.bons) + ' bons / ' + fmt(c.trincados) + ' trinc. / ' + fmt(c.defeituosos) + ' def. / ' + fmt(c.sujos) + ' sujos = ' + fmt(D.totalColeta(c)); }

    /* RECONFERIR O DIA: todas as coletas daquele dia numa tabela só, para conferir e corrigir */
    function reconferirDia(db, data) {
        var cs = db.coletas.filter(function (c) { return c.data === data; }).sort(function (a, b) { return String(a.coletado_por).localeCompare(String(b.coletado_por)) || n(a.n_coleta) - n(b.n_coleta); });
        var campos = ['bons', 'trincados', 'defeituosos', 'sujos'];
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" novalidate style="max-width:860px;width:100%"><h2>Conferir e receber o dia · ' + D.br(data) + '</h2>' +
            '<p class="nota">Os números são os que as colaboradoras lançaram. Onde a conferência deu diferente, corrija. Ao salvar, todas ficam conferidas e as que faltam são <b>recebidas no lote ' + h(D.loteDestino(db, data, '')) + '</b> do beneficiamento.</p>' +
            '<div class="tabela-rolar"><table class="tabela"><thead><tr><th>Colaboradora</th><th>Nº</th><th>Bons</th><th>Trinc.</th><th>Def.</th><th>Sujos</th><th>Total</th></tr></thead><tbody>' +
            cs.map(function (c, i) {
                return '<tr data-linha="' + i + '"><td>' + h(c.coletado_por) + (c.reconferido_por ? '<br><small class="nota" style="margin:0">já reconferida</small>' : '') + '</td><td>' + h(c.n_coleta) + '</td>' +
                    campos.map(function (k) { return '<td><input type="number" min="0" inputmode="numeric" style="width:84px" data-k="' + k + '" value="' + n(c[k]) + '"></td>'; }).join('') +
                    '<td data-total><b>' + fmt(D.totalColeta(c)) + '</b></td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<p class="faixa" data-resumo></p>' +
            '<label>Motivo (se corrigiu algum número)<input name="motivo" placeholder="Ex.: recontagem na sala de coleta"></label>' +
            '<div class="acoes"><button class="btn alt" type="button" data-fechar>Cancelar</button><button class="btn" type="submit">Conferir e receber</button></div></form>';
        document.body.appendChild(fundo);
        var ler = function (i) { var tr = fundo.querySelector('[data-linha="' + i + '"]'), v = {}; campos.forEach(function (k) { v[k] = n(tr.querySelector('[data-k="' + k + '"]').value); }); return v; };
        var resumo = function () {
            var antes = 0, depois = 0, mud = 0;
            cs.forEach(function (c, i) {
                var v = ler(i); antes += D.totalColeta(c); depois += D.totalColeta(v);
                fundo.querySelector('[data-linha="' + i + '"] [data-total]').innerHTML = '<b>' + fmt(D.totalColeta(v)) + '</b>';
                if (campos.some(function (k) { return v[k] !== n(c[k]); })) mud++;
            });
            var r = fundo.querySelector('[data-resumo]');
            r.className = 'faixa ' + (mud ? 'atencao' : 'ok');
            r.innerHTML = mud ? '<b>' + mud + ' coleta(s) corrigida(s)</b> · total do dia de ' + fmt(antes) + ' para ' + fmt(depois) + ' ovos' : 'Tudo confere com o que foi lançado (' + fmt(antes) + ' ovos).';
        };
        fundo.addEventListener('input', resumo); resumo();
        var fechar = function () { fundo.remove(); };
        fundo.addEventListener('click', function (ev) { if (ev.target === fundo || ev.target.hasAttribute('data-fechar')) fechar(); });
        fundo.querySelector('form').addEventListener('submit', async function (ev) {
            ev.preventDefault();
            var bt = ev.target.querySelector('[type=submit]'); bt.disabled = true; bt.textContent = 'Salvando…';
            var carimbo = Sistema.usuario().nome + ' · ' + D.br(D.hoje()), motivo = ev.target.motivo.value.trim(), corrigidas = 0;
            for (var i = 0; i < cs.length; i++) {
                var c = cs[i], v = ler(i), mudou = campos.some(function (k) { return v[k] !== n(c[k]); });
                v.reconferido_por = carimbo;
                if (mudou) { corrigidas++; if (!c.contagem_original) v.contagem_original = textoContagem(c); v.recontado_por = carimbo; v.motivo_recontagem = motivo; }
                await API.salvar('coletas', v, c.id, S, 'Reconferiu a coleta de ' + c.coletado_por + ' · ' + D.br(data) + (mudou ? ' · de ' + fmt(D.totalColeta(c)) + ' para ' + fmt(D.totalColeta(v)) + ' ovos' : ' · confere'));
            }
            /* recebe no lote do dia do beneficiamento as que ainda não foram; corrige o lote das já recebidas */
            var dbAgora = API.dados(), novas = [], lotes = [];
            for (var j = 0; j < cs.length; j++) {
                var dep = dbAgora.coletas.find(function (x) { return x.id === cs[j].id; });
                if (!D.coletaRecebida(dbAgora, dep)) novas.push(dep);
                else if (cs[j].lote_receb && campos.some(function (k) { return n(dep[k]) !== n(cs[j][k]); })) await window.Recebimento.ajustarRecebido(cs[j], dep);
            }
            if (novas.length) lotes = await window.Recebimento.receberColetas(novas);
            fechar(); UI.avisar((corrigidas ? corrigidas + ' coleta(s) corrigida(s). ' : 'Tudo confere. ') + (novas.length ? novas.length + ' coleta(s) recebida(s) no lote ' + lotes.join(', ') : '')); Sistema.atualizar();
        });
    }
    CadastroPadrao('g-coletas', {
        tabela: 'coletas', sistema: S, titulo: 'Entrada dos ovos', botaoNovo: '+ Lançar coleta',
        soLer: ['data'],   // a data entra sozinha (hoje): cada coleta gera o lote do dia em que foi colhida
        classeLinha: function (r, db) { return D.coletaRecebida(db, r) ? '' : 'linha-pendente'; },   // ainda falta conferir: linha em destaque
        sub: 'Uma linha para cada coleta. Todas as coletas do dia, de todas as colaboradoras, formam o lote da coleta (ex.: 1811), que segue até o romaneio.',
        colunas: [colData, { t: 'Lote da coleta', v: function (r, db) { return '<b>' + h(D.loteDaColeta(db, r)) + '</b>'; } }, { t: 'Nº', v: function (r) { return h(r.n_coleta); } }, { t: 'Coletado por', v: function (r) { return h(r.coletado_por); } },
            { t: 'Bons', num: 1, v: function (r) { return fmt(r.bons); } }, { t: 'Trinc.', num: 1, v: function (r) { return fmt(r.trincados); } },
            { t: 'Def.', num: 1, v: function (r) { return fmt(r.defeituosos); } }, { t: 'Sujos', num: 1, v: function (r) { return fmt(r.sujos); } },
            { t: 'Total', num: 1, v: function (r, db) { return '<b>' + fmt(D.totalColeta(r)) + '</b>' + (!D.coletaRecebida(db, r) ? '<br>' + UI.tag('A conferir', 'atencao') : r.contagem_original ? '<br>' + UI.tag('Corrigida', 'atencao') : r.reconferido_por ? '<br>' + UI.tag('Reconferida', 'ok') : ''); } },
            { t: 'Conformidade', quebra: 1, v: function (r) {
                return (r.conformidade === 'Não conforme' ? UI.tag('Não conforme', 'erro') : r.conformidade ? UI.tag('Conforme', 'ok') : '—') +
                    (r.observacao ? '<br><small class="nota" style="margin:0">' + h(r.observacao) + '</small>' : '') +
                    (r.contagem_original ? '<br><small class="nota" style="margin:0">Antes: ' + h(r.contagem_original) + ' · ' + h(r.recontado_por || '') + (r.motivo_recontagem ? ' · ' + h(r.motivo_recontagem) : '') + '</small>' : '') +
                    (r.reconferido_por ? '<br><small class="nota" style="margin:0">Reconferida por ' + h(r.reconferido_por) + '</small>' : '') +
                    (r.motivo_data ? '<br>' + UI.tag('Lançada depois', 'atencao') + ' <small class="nota" style="margin:0">' + h(r.motivo_data) + '</small>' : '');
            } }, colQuem],
        novo: function (db) { var q = Sistema.usuario().nome; return { data: D.hoje(), n_coleta: proximaColeta(db, D.hoje(), q), coletado_por: q, conformidade: 'Conforme' }; },
        /* COLETA ESQUECIDA: só o administrador pode trocar a data (para trás), e precisa dizer o motivo */
        aoAbrir: function (f, db, linha) {
            var admin = Sistema.usuario().perfil === 'Administrador';
            var campoMotivo = f.motivo_data && f.motivo_data.closest('label');
            if (linha) { if (campoMotivo) { campoMotivo.hidden = !linha.motivo_data; f.motivo_data.readOnly = true; } return; }
            if (admin) {
                f.data.readOnly = false; f.data.max = D.hoje();
                f.data.closest('label').insertAdjacentHTML('beforeend', '<small class="nota" style="margin:4px 0 0">Administrador: troque a data só para lançar uma coleta esquecida.</small>');
                f.coletado_por.setAttribute('list', 'lista-colaboradoras');
                f.insertAdjacentHTML('beforeend', '<datalist id="lista-colaboradoras">' + D.nomesQueColhem(db)
                    .map(function (nome) { return '<option value="' + h(nome) + '">'; }).join('') + '</datalist>');
            }
            var sugerir = function () {
                f.n_coleta.value = proximaColeta(db, f.data.value, f.coletado_por.value.trim());
                if (campoMotivo) campoMotivo.hidden = f.data.value === D.hoje();
            };
            sugerir();
            f.data.addEventListener('change', sugerir); f.coletado_por.addEventListener('change', sugerir);
        },
        antesDeSalvar: function (v, db, id) { if (!id) { v.lote = ''; if (v.data === D.hoje()) v.motivo_data = ''; } },   // coleta é por dia: sem lote de galinhas
        validar: function (v, db, id) {
            if (!id && v.data !== D.hoje()) {
                if (Sistema.usuario().perfil !== 'Administrador') throw new Error('Só o administrador pode lançar coleta de outro dia.');
                if (v.data > D.hoje()) throw new Error('A data não pode ser depois de hoje.');
                if (!String(v.motivo_data || '').trim()) throw new Error('Informe o motivo de lançar a coleta em outro dia.');
            }
            var antiga = id && db.coletas.find(function (c) { return c.id === id; });
            if (antiga && D.coletaRecebida(db, antiga) && ['bons', 'trincados', 'defeituosos', 'sujos'].some(function (k) { return n(v[k]) !== n(antiga[k]); }))
                throw new Error('Esta coleta já foi recebida no beneficiamento. Para corrigir os números, use Conferência dos ovos › Conferir de novo.');
            unico(db, 'coletas', v, id, ['data', 'coletado_por', 'n_coleta'], 'A coleta nº ' + v.n_coleta + ' de ' + v.coletado_por + ' neste dia já foi lançada.');
            if (!D.totalColeta(v)) throw new Error('Informe a quantidade de ovos.');
        },
        descrever: function (v, db) { return 'lote da coleta ' + D.codigoDoDia(db, v.data, v.lote || '') + ' · ' + D.br(v.data) + ' · ' + fmt(D.totalColeta(v)) + ' ovos'; },
        topo: function (db) {
            var hoje = db.coletas.filter(function (c) { return c.data === D.hoje(); });
            var t = hoje.reduce(function (s, c) { return s + D.totalColeta(c); }, 0), b = hoje.reduce(function (s, c) { return s + n(c.bons); }, 0);
            return '<div class="indicadores">' + ind('Coletas hoje', hoje.length, 'lançamentos') + ind('Ovos hoje', fmt(t), 'todas as coletas') + ind('Ovos bons', UI.pct(b, t), fmt(b) + ' ovos') +
                ind('A conferir', fmt(D.coletasSemConferir(db)), 'últimos 7 dias · <a href="#g-conferencia">Conferência dos ovos</a>') + '</div>';
        }
    });

    /* CONFERÊNCIA DOS OVOS
       Cada coleta é separada (o lote dela é o dia da coleta). Aqui a equipe
       confere de novo o que as colaboradoras lançaram e RECEBE: a coleta
       conferida é somada ao lote do dia do beneficiamento (ex.: 1911).
       Só no beneficiamento as coletas do dia viram um lote só. */
    var diaConferencia = null;
    Sistema.tela('g-conferencia', { desenhar: function (el, db) {
        var podeReceber = D.podeVer(Sistema.usuario(), 'b-recebimento');
        var dias = [];
        for (var i = 0; i < 14; i++) {
            var d = D.somarDias(D.hoje(), -i), cs = db.coletas.filter(function (c) { return c.data === d; });
            if (cs.length) dias.push({ data: d, coletas: cs });
        }
        /* dias mais antigos que ainda têm coleta sem receber também aparecem */
        D.coletasNaoRecebidas(db).forEach(function (c) { if (!dias.some(function (x) { return x.data === c.data; })) dias.push({ data: c.data, coletas: db.coletas.filter(function (y) { return y.data === c.data; }) }); });
        /* dias com coleta a conferir primeiro; depois do mais novo para o mais antigo */
        var temPendente = function (x) { return x.coletas.some(function (c) { return !D.coletaRecebida(db, c); }) ? 0 : 1; };
        dias.sort(function (a, b) { return temPendente(a) - temPendente(b) || String(b.data).localeCompare(String(a.data)); });
        if (!dias.some(function (x) { return x.data === diaConferencia; }))
            diaConferencia = (dias.slice().reverse().find(function (x) { return x.coletas.some(function (c) { return !D.coletaRecebida(db, c); }); }) || dias[0] || {}).data || null;
        var linhasDia = dias.map(function (x) {
            var rec = x.coletas.filter(function (c) { return D.coletaRecebida(db, c); }).length, cor = x.coletas.filter(function (c) { return c.contagem_original; }).length;
            return ['<button class="btn ' + (x.data === diaConferencia ? '' : 'alt ') + 'pequeno" data-dia="' + x.data + '">' + D.br(x.data) + '</button>',
                fmt(x.coletas.length), fmt(x.coletas.reduce(function (s, c) { return s + D.totalColeta(c); }, 0)),
                (rec === x.coletas.length ? UI.tag('Recebido', 'ok') : UI.tag((x.coletas.length - rec) + ' a receber', 'atencao')) + (cor ? ' ' + UI.tag(cor + ' corrigida(s)', 'atencao') : ''),
                podeReceber && rec < x.coletas.length ? '<button class="btn pequeno" data-reconferir-dia="' + x.data + '">Conferir e receber o dia</button>' : ''];
        });
        /* as que ainda faltam conferir e receber ficam em cima */
        var pendente = function (c) { return D.coletaRecebida(db, c) ? 1 : 0; };
        var doDia = db.coletas.filter(function (c) { return c.data === diaConferencia; }).sort(function (a, b) { return pendente(a) - pendente(b) || String(a.coletado_por).localeCompare(String(b.coletado_por)) || n(a.n_coleta) - n(b.n_coleta); });
        var linhasColeta = doDia.map(function (c) {
            var recebida = D.coletaRecebida(db, c);
            return [h(c.coletado_por), h(c.n_coleta), '<b>' + h(D.codigoLoteDia('', c.data)) + '</b>', fmt(c.bons), fmt(c.trincados), fmt(c.defeituosos), fmt(c.sujos), '<b>' + fmt(D.totalColeta(c)) + '</b>',
                (c.conformidade === 'Não conforme' ? UI.tag('Não conforme', 'erro') : UI.tag('Conforme', 'ok')) + (c.observacao ? '<br><small class="nota" style="margin:0">' + h(c.observacao) + '</small>' : ''),
                (recebida ? UI.tag('Recebida · lote ' + D.loteDaColeta(db, c), 'ok') : UI.tag('A conferir e receber', 'atencao')) +
                    (c.contagem_original ? '<br>' + UI.tag('Corrigida', 'atencao') + '<br><small class="nota" style="margin:0">Antes: ' + h(c.contagem_original) + (c.motivo_recontagem ? ' · ' + h(c.motivo_recontagem) : '') + '</small>' : '') +
                    (c.reconferido_por ? '<br><small class="nota" style="margin:0">Conferida por ' + h(c.reconferido_por) + '</small>' : ''),
                podeReceber ? '<button class="btn ' + (recebida ? 'alt ' : '') + 'pequeno" data-recontar="' + h(c.id) + '">' + (recebida ? 'Conferir de novo' : 'Conferir e receber') + '</button>' : ''];
        });
        var falta = D.coletasNaoRecebidas(db).length;
        var atrasos = D.pendencias(db).map(function (p) { return D.pendenciaHTML(p, h); }).join('');
        el.innerHTML = '<div class="cabecalho"><div><h1>Conferência dos ovos</h1><p>Confira cada coleta que as colaboradoras lançaram e receba no beneficiamento. Na granja cada coleta é separada; no beneficiamento as coletas do dia viram um lote só (número = dia da produção, ex.: 1911).</p></div>' +
            '<div class="acoes" style="margin:0"><a class="btn alt" href="#g-coletas">← Entrada dos ovos</a><a class="btn alt" href="#g-saida">Saída de ovos →</a></div></div>' +
            (falta ? '<p class="faixa atencao" style="margin:0 0 16px"><b>' + falta + ' coleta(s) esperando conferir e receber.</b> Pode receber uma por uma ou o dia inteiro.</p>' : '<p class="faixa ok" style="margin:0 0 16px">Todas as coletas já foram conferidas e recebidas no beneficiamento.</p>') +
            (atrasos ? '<div class="avisos" style="margin:0 0 16px">' + atrasos + '</div>' : '') +
            /* um embaixo do outro, cada um na largura toda: os botões aparecem inteiros */
            '<div class="card"><h2>Dias</h2><div class="rolar-dias">' + UI.tabela(['Dia', { t: 'Coletas', num: 1 }, { t: 'Ovos', num: 1 }, 'Situação', ''], linhasDia, 'Nenhuma coleta nos últimos 14 dias.') + '</div></div>' +
            '<div class="card"><h2>' + (diaConferencia ? 'Coletas de ' + D.br(diaConferencia) : 'Coletas') + '</h2>' +
                UI.tabela(['Colaboradora', 'Nº', 'Lote', { t: 'Bons', num: 1 }, { t: 'Trinc.', num: 1 }, { t: 'Def.', num: 1 }, { t: 'Sujos', num: 1 }, { t: 'Total', num: 1 }, 'Na coleta', 'Beneficiamento', ''], linhasColeta, 'Escolha um dia.',
                    function (i) { return D.coletaRecebida(db, doDia[i]) ? '' : 'linha-pendente'; }) + '</div>';
        UI.ligar(el, '[data-dia]', 'click', function (e, b) { diaConferencia = b.dataset.dia; Sistema.atualizar(); });
        UI.ligar(el, '[data-reconferir-dia]', 'click', function (e, b) { reconferirDia(db, b.dataset.reconferirDia); });
        UI.ligar(el, '[data-recontar]', 'click', function (e, b) { reconferirColeta(db, db.coletas.find(function (x) { return x.id === b.dataset.recontar; })); });
    } });

    /* CONFERIR UMA COLETA: se mudar algum número, guarda a contagem original, quem conferiu e o motivo */
    function reconferirColeta(db, c) {

            var carimbo = Sistema.usuario().nome + ' · ' + D.br(D.hoje());
            UI.abrirJanela({ tabela: 'coletas', titulo: (D.coletaRecebida(db, c) ? 'Conferir de novo · ' : 'Conferir e receber · ') + h(c.coletado_por) + ' · coleta ' + h(c.n_coleta) + ' · ' + D.br(c.data),
                sub: 'Contagem de quem coletou: ' + fmt(c.bons) + ' bons, ' + fmt(c.trincados) + ' trinc., ' + fmt(c.defeituosos) + ' def., ' + fmt(c.sujos) + ' sujos (' + fmt(D.totalColeta(c)) + '). Se a conferência der diferente, corrija os números.',
                soLer: ['data', 'n_coleta', 'coletado_por'], valores: c,
                extra: '<label style="grid-column:1/-1">Motivo (se corrigiu algum número)<input name="motivo_recontagem" placeholder="Ex.: contagem não bateu na sala de coleta" value="' + h(c.motivo_recontagem || '') + '"></label>',
                aoSalvar: async function (v, f) {
                    var mudou = ['bons', 'trincados', 'defeituosos', 'sujos'].some(function (k) { return n(v[k]) !== n(c[k]); });
                    if (mudou) {
                        if (!c.contagem_original) v.contagem_original = textoContagem(c);
                        v.recontado_por = carimbo; v.motivo_recontagem = f.motivo_recontagem.value.trim();
                    }
                    v.reconferido_por = carimbo;
                    await API.salvar('coletas', v, c.id, S, 'Conferiu a coleta de ' + c.coletado_por + ' · ' + D.br(c.data) + (mudou ? ' · de ' + fmt(D.totalColeta(c)) + ' para ' + fmt(D.totalColeta(v)) + ' ovos' : ' · confere'));
                    /* recebe no lote do dia do beneficiamento (ou corrige, se já tinha sido recebida) */
                    var depois = API.dados().coletas.find(function (x) { return x.id === c.id; }), msg = '';
                    if (!D.coletaRecebida(API.dados(), depois)) { var lotes = await window.Recebimento.receberColetas([depois]); msg = 'Conferida e recebida no lote ' + lotes[0]; }
                    else if (mudou && c.lote_receb) msg = (await window.Recebimento.ajustarRecebido(c, depois)) || 'Conferência salva e lote ' + c.lote_receb + ' corrigido';
                    UI.avisar(msg || (mudou ? 'Conferência salva com correção' : 'Coleta conferida: confere')); Sistema.atualizar();
                } });
    }



    /* =====================================================
       4. PRODUÇÃO DIÁRIA
       Bons, trincados e defeituosos/sujos = soma das coletas.
       Só os ovos pequenos são digitados (conferência).
       ===================================================== */
    /* PRODUÇÃO POR LOTE DAS AVES: soma do "Ovos por lote" no período, com gráfico de barras
       (uma barra por lote) e a postura média de cada lote comparada com o guia */
    var periodoProd = UI.novoPeriodo('sem');
    function producaoPorLote(db, p) {
        var lotes = D.lotesAtivos(db);
        var linhas = lotes.map(function (l) {
            var reg = db.producao.filter(function (x) { return String(x.lote) === String(l.lote) && n(x.ovos_lote) > 0 && D.noPeriodo(x.data, p.de, p.ate); });
            var ovos = reg.reduce(function (s, x) { return s + n(x.ovos_lote); }, 0), dias = reg.length, aves = D.avesVivas(db, l);
            return { l: l, ovos: ovos, dias: dias, aves: aves, postura: dias && aves ? ovos / dias / aves * 100 : null, guia: D.guiaNoDia(db, l.lote, p.ate) };
        });
        var max = Math.max.apply(null, [1].concat(linhas.map(function (x) { return x.ovos; })));
        var total = linhas.reduce(function (s, x) { return s + x.ovos; }, 0);
        var pct = function (v) { return v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
        var barras = !total ? '<p class="vazio">Ainda não tem "Ovos por lote" lançado neste período. No fim do dia, clique em <b>Ovos por lote</b> na tabela de baixo.</p>' :
            '<div class="barras-lote">' + linhas.map(function (x) {
                /* cor pela postura comparada com o guia da linhagem:
                   verde = no guia ou acima (ganhando) · amarelo = caiu pouco (até 5 pontos abaixo)
                   vermelho = caiu muito (mais de 5 pontos abaixo) · cinza = linhagem sem curva do guia */
                var dif = x.postura != null && x.guia != null ? x.postura - x.guia : null;
                var cor = dif == null ? 'semguia' : dif >= 0 ? 'ganhando' : dif >= -5 ? 'pouco' : 'muito';
                var txtDif = dif == null ? 'sem guia' : (dif > 0 ? '+' : '') + dif.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
                return '<div class="barra-lote" title="' + h(D.nomeLote(db, x.l.lote)) + ': ' + fmt(x.ovos) + ' ovos em ' + x.dias + ' dia(s) · postura ' + pct(x.postura) + (x.guia != null ? ' · guia ' + pct(x.guia) : ' · sem curva do guia') + '">' +
                    '<span class="bl-nome"><b>' + h(String(x.l.lote).split('/')[0]) + '</b> ' + h(x.l.linhagem) + '</span>' +
                    '<span class="bl-trilho"><i class="' + cor + '" style="width:' + (x.ovos / max * 100) + '%"></i></span>' +
                    '<span class="bl-valor">' + fmt(x.ovos) + '</span><span class="bl-postura ' + cor + '">' + pct(x.postura) + '</span><span class="bl-dif ' + cor + '">' + txtDif + '</span></div>';
            }).join('') + '</div>' +
            '<p class="nota bl-legenda" style="margin:12px 0 0">Barra = ovos do lote no período · % = postura média (ovos por dia ÷ aves vivas) · último número = diferença para o guia, em pontos.<br>' +
                '<span class="bl-cor ganhando"></span> no guia ou acima (ganhando) &nbsp; <span class="bl-cor pouco"></span> caiu pouco (até 5 pontos abaixo) &nbsp; <span class="bl-cor muito"></span> caiu muito (mais de 5 pontos abaixo) &nbsp; <span class="bl-cor semguia"></span> sem curva do guia</p>';
        return '<div class="card"><div class="card-titulo"><h2>Produção por lote das aves</h2><span class="nota" style="margin:0">' + fmt(total) + ' ovos no período · ' +
                linhas.filter(function (x) { return x.ovos; }).length + ' de ' + linhas.length + ' lote(s) com contagem</span></div>' + barras + '</div>' +
            (total ? '<div class="card"><h2>Lotes no período</h2>' + UI.tabela(['Lote', 'Linhagem', { t: 'Aves vivas', num: 1 }, { t: 'Dias contados', num: 1 }, { t: 'Ovos', num: 1 }, { t: 'Postura média', num: 1 }, { t: 'Guia', num: 1 }],
                linhas.map(function (x) { return [h(String(x.l.lote)), h(x.l.linhagem), fmt(x.aves), fmt(x.dias), '<b>' + fmt(x.ovos) + '</b>', pct(x.postura), pct(x.guia)]; })) + '</div>' : '');
    }

    /* CURVA DE PRODUÇÃO DO LOTE (como o gráfico do peso): semana de vida embaixo,
       postura real do lote (linha cheia, da contagem "Ovos por lote") e a tabela do guia
       da linhagem (tracejada), com o pico da tabela marcado. Mostra também a idade do
       lote em dias e os ovos por ave nos dias contados, real × tabela. */
    var prodLoteGrafico = '';
    function curvaProducao(db, lote) {
        var l = D.acharLote(db, lote);
        if (!l) return '<p class="vazio">Escolha um lote.</p>';
        var base = l.data_nascimento || l.data_inicio, hj = D.hoje();
        if (!base) return '<p class="vazio">O lote ' + h(l.lote) + ' está sem data de nascimento: cadastre em Cadastros › Lotes das aves para o sistema saber a idade.</p>';
        var diasVida = D.diasEntre(base, hj), semHoje = D.idadeSemanas(l, hj);
        var guiaDe = function (w) { return D.posturaGuia(db, l, w); };
        /* real por semana de vida: ovos ÷ dias contados ÷ aves vivas */
        var porSem = {}, ovosAve = 0, tabelaAve = 0, diasContados = 0;
        db.producao.filter(function (p) { return String(p.lote) === String(l.lote) && n(p.ovos_lote) > 0; }).forEach(function (p) {
            var w = D.idadeSemanas(l, p.data), aves = Math.max(1, D.avesVivas(db, l, p.data));
            if (w == null) return;
            var x = porSem[w] || (porSem[w] = { sem: w, ovos: 0, dias: 0, aves: aves, ultimo: p.data });
            x.ovos += n(p.ovos_lote); x.dias++; if (p.data >= x.ultimo) { x.ultimo = p.data; x.aves = aves; }
            ovosAve += n(p.ovos_lote) / aves; diasContados++;
            var g = guiaDe(w); if (g != null) tabelaAve += g / 100;
        });
        var reais = Object.keys(porSem).map(function (k) { var x = porSem[k]; x.postura = x.ovos / x.dias / x.aves * 100; return x; }).sort(function (a, b) { return a.sem - b.sem; });
        /* pico da tabela (1ª semana com o maior valor) */
        var pico = null;
        for (var w0 = 15; w0 <= 100; w0++) { var g0 = guiaDe(w0); if (g0 != null && (!pico || g0 > pico.v + 1e-9)) pico = { sem: w0, v: g0 }; }
        var temGuia = !!pico;
        var s0 = 18, s1 = Math.min(100, Math.max(semHoje != null ? semHoje + 2 : 0, reais.length ? reais[reais.length - 1].sem + 2 : 0, pico ? pico.sem + 4 : 0, s0 + 12));
        if (semHoje != null && semHoje < s0) return '<p class="vazio">O lote ' + h(l.lote) + ' tem ' + fmt(diasVida) + ' dias de vida (' + semHoje + ' semanas): ainda não começou a postura.</p>';
        var guia = []; if (temGuia) for (var w = s0; w <= s1; w++) { var g = guiaDe(w); if (g != null) guia.push({ sem: w, v: g }); }
        var W = 760, H = 260, L = 46, R = 16, T = 14, B = 34, ymax = 100;
        var x = function (sem) { return L + (sem - s0) / Math.max(1, s1 - s0) * (W - L - R); };
        var y = function (v) { return T + (1 - Math.max(0, Math.min(ymax, v)) / ymax) * (H - T - B); };
        var grade = '';
        for (var k = 0; k <= 5; k++) { var v = ymax * k / 5; grade += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gp-grade"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="gp-eixo">' + v + '%</text>'; }
        var passoX = Math.max(1, Math.ceil((s1 - s0) / 14));
        for (var sx = s0; sx <= s1; sx += passoX) grade += '<text x="' + x(sx) + '" y="' + (H - 12) + '" text-anchor="middle" class="gp-eixo">' + sx + '</text>';
        var linha = function (pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.sem).toFixed(1) + ' ' + y(p.v != null ? p.v : p.postura).toFixed(1); }).join(' '); };
        var pc = function (v) { return v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'; };
        var marcaHoje = semHoje != null && semHoje <= s1 ? '<line x1="' + x(semHoje) + '" x2="' + x(semHoje) + '" y1="' + T + '" y2="' + (H - B) + '" class="cp-hoje"/><text x="' + (x(semHoje) + 4) + '" y="' + (T + 10) + '" class="gp-eixo">hoje</text>' : '';
        var marcaPico = pico && pico.sem <= s1 ? '<circle cx="' + x(pico.sem) + '" cy="' + y(pico.v) + '" r="7" class="cp-pico"><title>Pico da tabela: ' + pc(pico.v) + ' na semana ' + pico.sem + '</title></circle>' : '';
        var svg = '<svg class="grafico-peso" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Curva de produção do lote ' + h(l.lote) + ' por semana de vida">' + grade + marcaHoje +
            '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 1) + '" text-anchor="middle" class="gp-eixo">semana de vida</text>' +
            (guia.length ? '<path d="' + linha(guia) + '" class="gp-guia"/>' : '') + marcaPico +
            (reais.length ? '<path d="' + linha(reais) + '" class="gp-real"/>' + reais.map(function (p) {
                var g = guiaDe(p.sem), dif = g != null ? p.postura - g : null, cls = dif == null ? '' : dif >= 0 ? '' : dif >= -5 ? ' pouco' : ' abaixo';
                return '<circle cx="' + x(p.sem) + '" cy="' + y(p.postura) + '" r="4.5" class="gp-ponto' + cls + '"><title>Semana ' + p.sem + ': ' + pc(p.postura) + ' (' + fmt(p.ovos) + ' ovos em ' + p.dias + ' dia(s))' + (g != null ? ' · tabela ' + pc(g) : '') + '</title></circle>';
            }).join('') : '') + '</svg>';
        /* situação em relação ao pico */
        var fase = !pico || semHoje == null ? '' : semHoje < pico.sem ? 'subindo para o pico (faltam ' + (pico.sem - semHoje) + ' semana(s))' : semHoje <= pico.sem + 2 ? 'no pico' : 'depois do pico (' + (semHoje - pico.sem) + ' semanas)';
        var ultima = reais[reais.length - 1], gUlt = ultima ? guiaDe(ultima.sem) : null;
        var info = '<div class="indicadores" style="margin-top:var(--esp-3)">' +
            ind('Idade do lote', fmt(diasVida) + ' dias', semHoje + ' semanas de vida') +
            ind('Pico da tabela', pico ? pc(pico.v) : '—', pico ? 'na semana ' + pico.sem + (fase ? ' · lote ' + fase : '') : 'linhagem sem curva') +
            ind('Última semana contada', ultima ? pc(ultima.postura) : '—', ultima ? 'semana ' + ultima.sem + (gUlt != null ? ' · tabela ' + pc(gUlt) : '') : 'sem contagem por lote', ultima && gUlt != null && ultima.postura < gUlt - 5) +
            ind('Ovos por ave', diasContados ? ovosAve.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—', diasContados ? 'em ' + diasContados + ' dia(s) contados · tabela ' + tabelaAve.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'sem contagem por lote', diasContados && temGuia && ovosAve < tabelaAve * 0.95) +
            '</div>';
        return svg + '<p class="nota" style="margin:8px 0 0"><span class="gp-leg real"></span> postura real do lote (ovos ÷ aves vivas ÷ dias) &nbsp; <span class="gp-leg guia"></span> tabela do guia ' + h(l.linhagem) +
                (temGuia ? '' : ' (não cadastrada: Cadastros › Linhagens)') + ' &nbsp; <span class="gp-leg pico"></span> pico da tabela &nbsp; <span class="gp-leg pouco"></span> até 5 pontos abaixo &nbsp; <span class="gp-leg abaixo"></span> mais de 5 pontos abaixo</p>' +
            (reais.length ? '' : '<p class="faixa atencao" style="margin:12px 0 0">Ainda não tem contagem deste lote. No fim do dia, clique em <b>Ovos por lote</b> na tabela "Dia a dia" para a linha do lote aparecer.</p>') + info;
    }
    function cardCurvaProducao(db) {
        var lotes = D.lotesAtivos(db);
        if (!lotes.length) return '';
        if (!prodLoteGrafico || !D.acharLote(db, prodLoteGrafico)) prodLoteGrafico = lotes[0].lote;
        return '<div class="card"><div class="card-titulo"><h2>Curva de produção do lote</h2><label style="margin:0;min-width:240px">Lote<select data-prod-lote>' +
            lotes.map(function (l) { return '<option value="' + h(l.lote) + '"' + (String(l.lote) === String(prodLoteGrafico) ? ' selected' : '') + '>' + h(D.nomeLote(db, l.lote)) + '</option>'; }).join('') + '</select></label></div>' +
            curvaProducao(db, prodLoteGrafico) + '</div>';
    }

    Sistema.tela('g-producao', { desenhar: function (el, db) {
        var linhas = D.producaoDiaria(db).slice(0, 60).map(function (p) {
            var v = D.avesNoDia(db, p.lote, p.data);                         // lote '' = aves de todos os lotes
            var guia = D.guiaNoDia(db, p.lote, p.data);
            var porLote = D.ovosPorLote(db, p.data), nl = Object.keys(porLote).length;
            var somaLotes = Object.keys(porLote).reduce(function (s, k) { return s + porLote[k]; }, 0);
            return [D.br(p.data), p.lote ? h(D.nomeLote(db, p.lote)) : '<b>' + h(D.codigoDoDia(db, p.data, '')) + '</b>', fmt(p.coletas), fmt(p.bons), fmt(p.trincados), fmt(p.def_sujos), '<b>' + fmt(p.total) + '</b>', fmt(p.pequenos),
                v ? (p.total / v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—',
                guia == null ? '—' : guia.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%',
                p.lote ? '—' : !nl ? UI.tag('Não lançado', 'neutra') : somaLotes === p.total ? UI.tag(nl + ' lote(s) · confere', 'ok') : UI.tag(nl + ' lote(s) · ' + (somaLotes - p.total > 0 ? '+' : '') + fmt(somaLotes - p.total), 'atencao'),
                '<span class="acoes-linha">' + (p.lote ? '' : '<button class="btn pequeno" data-por-lote="' + p.data + '">Ovos por lote</button>') +
                '<button class="btn alt pequeno" data-pequenos="' + p.data + '|' + h(p.lote) + '">Ovos pequenos</button></span>'];
        });
        el.innerHTML = '<div class="cabecalho"><div><h1>Produção diária</h1><p>Soma automática das coletas de cada dia (lote da coleta). A postura da granja é: ovos ÷ aves vivas de todos os lotes.</p></div></div>' +
            '<p class="faixa ok" style="margin:0 0 16px"><b>Postura de cada lote:</b> no fim do dia, clique em <b>Ovos por lote</b> e informe quantos ovos saíram de cada lote de galinhas. A colaboradora continua sem escolher lote na coleta.</p>' +
            cardCurvaProducao(db) + UI.periodoHTML(periodoProd) + producaoPorLote(db, periodoProd) +
            '<div class="card"><h2>Dia a dia (todas as coletas)</h2>' + UI.tabela(['Data', 'Lote da coleta', { t: 'Coletas', num: 1 }, { t: 'Bons', num: 1 }, { t: 'Trincados', num: 1 }, { t: 'Def. e sujos', num: 1 }, { t: 'Total', num: 1 },
                { t: 'Pequenos', num: 1 }, { t: 'Postura granja', num: 1 }, { t: 'Guia', num: 1 }, 'Por lote', ''], linhas, 'Lance as coletas para ver a produção.') + '</div>';
        UI.ligarPeriodo(el, periodoProd, Sistema.atualizar);
        UI.ligar(el, '[data-prod-lote]', 'change', function (e, sel) { prodLoteGrafico = sel.value; Sistema.atualizar(); });
        /* Ovos por lote: a contagem do fim do dia de cada lote de galinhas → postura por lote */
        UI.ligar(el, '[data-por-lote]', 'click', function (e, b) {
            var data = b.dataset.porLote, lotes = D.lotesNoDia(db, data), porLote = D.ovosPorLote(db, data);
            var total = (D.producaoDiaria(db).find(function (x) { return x.data === data && !x.lote; }) || {}).total || 0;
            var fundo = document.createElement('div');
            fundo.className = 'janela-fundo';
            fundo.innerHTML = '<form class="janela" novalidate style="max-width:620px;width:100%"><h2>Ovos por lote · ' + D.br(data) + '</h2>' +
                '<p class="nota">Quantos ovos saíram de cada lote de galinhas hoje (contagem do fim do dia). Total das coletas do dia: <b>' + fmt(total) + '</b> ovos.</p>' +
                (lotes.length ? '<div class="form">' + lotes.map(function (l) {
                    return '<label>' + h(D.nomeLote(db, l.lote)) + ' <small class="nota" style="margin:0">(' + fmt(D.avesVivas(db, l, data)) + ' aves)</small><input type="number" min="0" inputmode="numeric" data-lote="' + h(l.lote) + '" value="' + (porLote[l.lote] != null ? porLote[l.lote] : '') + '"></label>';
                }).join('') + '</div>' : '<p class="vazio">Nenhum lote alojado nesta data.</p>') +
                '<p class="faixa" data-soma></p><div class="acoes"><button class="btn alt" type="button" data-fechar>Cancelar</button><button class="btn" type="submit">Salvar</button></div></form>';
            document.body.appendChild(fundo);
            var soma = function () {
                var t = 0; fundo.querySelectorAll('[data-lote]').forEach(function (i) { t += n(i.value); });
                var f = fundo.querySelector('[data-soma]');
                f.className = 'faixa ' + (t === total ? 'ok' : 'atencao');
                f.innerHTML = 'Soma dos lotes: <b>' + fmt(t) + '</b>' + (t === total ? ' · confere com as coletas' : ' · diferença de ' + fmt(t - total) + ' para as coletas do dia');
            };
            fundo.addEventListener('input', soma); soma();
            var fechar = function () { fundo.remove(); };
            fundo.addEventListener('click', function (ev) { if (ev.target === fundo || ev.target.hasAttribute('data-fechar')) fechar(); });
            fundo.querySelector('form').addEventListener('submit', async function (ev) {
                ev.preventDefault();
                var bt = ev.target.querySelector('[type=submit]'); bt.disabled = true;
                var inputs = Array.prototype.slice.call(fundo.querySelectorAll('[data-lote]'));
                for (var i = 0; i < inputs.length; i++) {
                    var lote = inputs[i].dataset.lote, valor = inputs[i].value === '' ? '' : n(inputs[i].value);
                    var atual = API.dados().producao.find(function (x) { return x.data === data && String(x.lote) === String(lote); });
                    if (valor === '' && !atual) continue;
                    if (atual && n(atual.ovos_lote) === n(valor)) continue;
                    await API.salvar('producao', Object.assign({}, atual || { data: data, lote: lote, pequenos: 0 }, { ovos_lote: valor }), atual && atual.id, S,
                        'Ovos por lote · ' + D.nomeLote(db, lote) + ' · ' + D.br(data) + ' · ' + fmt(valor) + ' ovos');
                }
                fechar(); UI.avisar('Ovos por lote salvos'); Sistema.atualizar();
            });
        });
        UI.ligar(el, '[data-pequenos]', 'click', function (e, b) {
            var par = b.dataset.pequenos.split('|');
            var atual = db.producao.find(function (x) { return x.data === par[0] && String(x.lote) === par[1]; });
            UI.abrirJanela({ tabela: 'producao', titulo: 'Ovos pequenos · ' + D.br(par[0]) + ' · ' + D.nomeLote(db, par[1]), soLer: ['data', 'lote', 'ovos_lote'],
                valores: atual || { data: par[0], lote: par[1], pequenos: 0 },
                aoSalvar: async function (v) { await API.salvar('producao', v, atual && atual.id, S, 'Ovos pequenos · Lote ' + par[1] + ' · ' + D.br(par[0])); UI.avisar('Salvo'); Sistema.atualizar(); } });
        });
    } });


    /* =====================================================
       5. MORTALIDADE E ABATE
       ===================================================== */
    CadastroPadrao('g-mortalidade', {
        tabela: 'mortalidade', sistema: S, titulo: 'Mortalidade e abate', botaoNovo: '+ Lançar mortalidade',
        sub: 'Mortes e abates por lote e dia. Atualiza sozinho o número de aves vivas.',
        colunas: [colData, colLote, { t: 'Mortes', num: 1, v: function (r) { return fmt(r.mortes); } }, { t: 'Abate', num: 1, v: function (r) { return fmt(r.abate); } },
            { t: 'Motivo', v: function (r) { return h(r.motivo); } }, { t: 'Observação', quebra: 1, v: function (r) { return h(r.observacao); } }, colQuem],
        novo: function (db) { return { data: D.hoje(), lote: primeiroLote(db), mortes: 0, abate: 0, motivo: 'Briga' }; },
        validar: function (v, db, id) {
            var lote = checarLote(db, v, id);
            if (n(v.mortes) + n(v.abate) < 1) v.motivo = 'Sem perdas';   // pode salvar zerado (registra que não houve perdas)
            var antes = (db.mortalidade.find(function (r) { return r.id === id; }) || {});
            if (D.avesVivas(db, lote) + n(antes.mortes) + n(antes.abate) - n(v.mortes) - n(v.abate) < 0) throw new Error('Mortes e abates passam do número de aves do lote.');
        },
        descrever: function (v, db) { return D.nomeLote(db, v.lote) + ' · ' + v.mortes + ' morte(s), ' + v.abate + ' abate(s) · ' + v.motivo; },
        topo: function (db) {
            return '<div class="indicadores">' + D.lotesAtivos(db).map(function (l) {
                var perdas = n(l.aves_iniciais) - D.avesVivas(db, l);
                return ind(h(D.nomeLote(db, l.lote)), fmt(D.avesVivas(db, l)) + ' aves', fmt(perdas) + ' perdas · ' + UI.pct(perdas, n(l.aves_iniciais)), false);
            }).join('') + '</div>';
        }
    });


    /* =====================================================
       6. SAÍDA DE OVOS (automática)
       Sai sozinha das coletas de cada dia e lote: ninguém
       precisa lançar. Se o que saiu de verdade for diferente,
       a granja clica em "Ajustar". O beneficiamento recebe
       em Recebimento › Chegando da granja.
       ===================================================== */
    /* SAÍDA DE OVOS
       Sai sozinha das coletas de cada dia. Mostra o resumo do período, as coletas e
       colaboradoras de cada dia, defeituosos e sujos separados, como está no
       beneficiamento (só compara quando todas as coletas do dia foram recebidas)
       e imprime o boletim de saída do dia. Ajustar: enquanto o dia não foi todo recebido. */
    var periodoSaida = UI.novoPeriodo('sem');
    function situacaoSaida(db, s) {
        var recs = db.recebimentos.filter(function (x) { return x.data_postura === s.data && String(x.lote_granja || '') === String(s.lote || ''); });
        var faltam = D.coletasNaoRecebidas(db).filter(function (c) { return c.data === s.data && String(c.lote || '') === String(s.lote || ''); });
        var codigos = recs.map(function (x) { return x.lote_receb; });
        var recebido = recs.reduce(function (t, x) { return t + D.totalRecebido(x); }, 0), dif = recebido - D.totalSaida(s);
        var tag = !recs.length ? UI.tag('Chegando no beneficiamento', 'atencao')
            : faltam.length ? UI.tag('Faltam ' + faltam.length + ' coleta(s)', 'atencao')
            : dif ? UI.tag(codigos.join(', ') + ' · ' + (dif > 0 ? '+' : '') + fmt(dif) + ' ovos', 'erro') : UI.tag(codigos.join(', ') + ' · confere', 'ok');
        return { recs: recs, faltam: faltam, codigos: codigos, tudoRecebido: recs.length > 0 && !faltam.length, tag: tag };
    }
    var defDe = function (s) { return s.defeituosos != null && s.defeituosos !== '' ? n(s.defeituosos) : n(s.def_sujos); };
    var sujDe = function (s) { return s.sujos != null && s.sujos !== '' ? n(s.sujos) : null; };

    Sistema.tela('g-saida', { desenhar: function (el, db) {
        var admin = Sistema.usuario().perfil === 'Administrador', p = periodoSaida, hoje = D.hoje();
        var lista = D.saidas(db).filter(function (s) { return D.noPeriodo(s.data, p.de, p.ate); });
        var soma = function (arr, f) { return arr.reduce(function (t, s) { return t + f(s); }, 0); };
        var tot = soma(lista, D.totalSaida), tri = soma(lista, function (s) { return n(s.trincados); }), ds = soma(lista, function (s) { return n(s.def_sujos); });
        var deHoje = D.saidas(db).filter(function (s) { return s.data === hoje; });
        var semReceber = D.saidas(db).filter(function (s) { return !situacaoSaida(db, s).tudoRecebido; }).length;
        var linhas = lista.map(function (s) {
            var st = situacaoSaida(db, s), manual = s.automatica ? null : db.saida.find(function (x) { return x.id === s.id; });
            var c = D.coletasDoDia(db, s.data, s.lote) || { coletas: 0, quem: [] };
            return ['<b>' + h(st.codigos.length ? st.codigos.join(', ') : D.proximoLoteReceb(db, s.data, s.lote)) + '</b>', D.br(s.data),
                fmt(c.coletas) + ' coleta(s)<br><small class="nota" style="margin:0">' + h(c.quem.join(', ')) + '</small>',
                fmt(s.bons), fmt(s.trincados), fmt(defDe(s)), sujDe(s) == null ? '—' : fmt(sujDe(s)), '<b>' + fmt(D.totalSaida(s)) + '</b>',
                s.automatica ? UI.tag('Automática', 'ok') : UI.tag('Ajustada', 'atencao') + '<br><small class="nota" style="margin:0">' + h(s.alterado_por || s.lancado_por || '') + '</small>', st.tag,
                '<span class="acoes-linha"><button class="btn alt pequeno" data-boletim="' + s.data + '|' + h(s.lote) + '">Boletim</button>' +
                    (st.tudoRecebido ? '' : '<button class="btn alt pequeno" data-ajustar="' + s.data + '|' + h(s.lote) + '">Ajustar</button>') +
                    (manual && admin && !st.tudoRecebido ? '<button class="btn perigo pequeno" data-auto="' + h(manual.id) + '">Voltar ao automático</button>' : '') + '</span>'];
        });
        el.innerHTML = '<div class="cabecalho"><div><h1>Saída de ovos</h1><p>Sai sozinha das coletas de cada dia, inclusive as que as colaboradoras lançam. O beneficiamento confere e recebe em Granja › Conferência dos ovos.</p></div></div>' +
            '<p class="faixa ok" style="margin:0 0 16px">Ninguém precisa lançar a saída. Use <b>Ajustar</b> só se o que saiu da granja for diferente da soma das coletas (dá para ajustar enquanto o dia não foi todo recebido). <b>Boletim</b> imprime a saída do dia para assinar.</p>' +
            UI.periodoHTML(p) +
            '<div class="indicadores">' + ind('Saiu hoje', fmt(soma(deHoje, D.totalSaida)), fmt(soma(deHoje, function (s) { return (D.coletasDoDia(db, s.data, s.lote) || {}).coletas || 0; })) + ' coleta(s)') +
                ind('No período', fmt(tot), lista.length + ' dia(s)') + ind('Trincados', UI.pct(tri, tot), fmt(tri) + ' ovos') +
                ind('Defeituosos e sujos', UI.pct(ds, tot), fmt(ds) + ' ovos') + ind('Ainda sem receber', fmt(semReceber), 'dia(s) com coleta a conferir', semReceber > 0) + '</div>' +
            '<div class="card">' + UI.tabela(['Lote da coleta', 'Postura', { t: 'Coletas', quebra: 1 }, { t: 'Bons', num: 1 }, { t: 'Trinc.', num: 1 }, { t: 'Def.', num: 1 }, { t: 'Sujos', num: 1 }, { t: 'Total', num: 1 }, 'Origem', 'Beneficiamento', ''],
                linhas, 'Nenhuma saída neste período.', function (k) { return situacaoSaida(db, lista[k]).tudoRecebido ? '' : 'linha-pendente'; }) + '</div>';
        UI.ligarPeriodo(el, p, Sistema.atualizar);
        UI.ligar(el, '[data-ajustar]', 'click', function (e, b) {
            var q = b.dataset.ajustar.split('|'), s = D.saidaDoDia(db, q[0], q[1]);
            var manual = s && !s.automatica ? db.saida.find(function (x) { return x.id === s.id; }) : null;
            var sug = D.coletasDoDia(db, q[0], q[1]) || {};
            UI.abrirJanela({ tabela: 'saida', titulo: 'Ajustar saída · ' + D.br(q[0]), soLer: ['data', 'lote'], campos: ['data', 'bons', 'trincados', 'defeituosos', 'sujos', 'responsavel'],
                sub: 'A soma das coletas foi: ' + fmt(sug.total || 0) + ' ovos (' + fmt(sug.bons || 0) + ' bons, ' + fmt(sug.trincados || 0) + ' trincados, ' + fmt(sug.defeituosos || 0) + ' defeituosos, ' + fmt(sug.sujos || 0) + ' sujos). Corrija para o que saiu de verdade.',
                valores: manual ? Object.assign({ defeituosos: defDe(manual), sujos: sujDe(manual) || 0 }, manual) : { data: q[0], lote: q[1], bons: s.bons, trincados: s.trincados, defeituosos: s.defeituosos, sujos: s.sujos, responsavel: Sistema.usuario().nome },
                aoSalvar: async function (v) {
                    v.lote = q[1]; v.def_sujos = n(v.defeituosos) + n(v.sujos);
                    await API.salvar('saida', v, manual && manual.id, S, 'Ajustou a saída de ovos · ' + D.br(v.data) + ' · ' + fmt(D.totalSaida(v)) + ' ovos');
                    UI.avisar('Saída ajustada'); Sistema.atualizar();
                } });
        });
        UI.ligar(el, '[data-auto]', 'click', async function (e, b) {
            if (!UI.confirmar('Apagar o ajuste e voltar a usar a soma das coletas?')) return;
            await API.excluir('saida', b.dataset.auto, S); UI.avisar('Voltou ao automático'); Sistema.atualizar();
        });
        /* BOLETIM DE SAÍDA do dia: coletas, totais e assinaturas */
        UI.ligar(el, '[data-boletim]', 'click', function (e, b) {
            var q = b.dataset.boletim.split('|'), s = D.saidaDoDia(db, q[0], q[1]), st = situacaoSaida(db, s);
            var cols = db.coletas.filter(function (c) { return c.data === q[0] && String(c.lote || '') === String(q[1] || ''); }).sort(function (a, c2) { return String(a.coletado_por).localeCompare(String(c2.coletado_por)) || n(a.n_coleta) - n(c2.n_coleta); });
            UI.imprimirFolha(UI.cabecalhoFolha('Boletim de saída de ovos · ' + D.br(q[0]), 'Lote da coleta: ' + (st.codigos.join(', ') || D.proximoLoteReceb(db, q[0], q[1])) + ' · ' + (s.automatica ? 'soma das coletas' : 'saída ajustada por ' + (s.alterado_por || s.lancado_por || '')), '') +
                '<table><tr><th>Colaboradora</th><th>Nº</th><th>Bons</th><th>Trincados</th><th>Defeituosos</th><th>Sujos</th><th>Total</th></tr>' +
                cols.map(function (c) { return '<tr><td>' + h(c.coletado_por) + '</td><td>' + h(c.n_coleta) + '</td><td>' + fmt(c.bons) + '</td><td>' + fmt(c.trincados) + '</td><td>' + fmt(c.defeituosos) + '</td><td>' + fmt(c.sujos) + '</td><td>' + fmt(D.totalColeta(c)) + '</td></tr>'; }).join('') +
                '<tr><th colspan="2">Saída da granja</th><th>' + fmt(s.bons) + '</th><th>' + fmt(s.trincados) + '</th><th>' + fmt(defDe(s)) + '</th><th>' + (sujDe(s) == null ? '—' : fmt(sujDe(s))) + '</th><th>' + fmt(D.totalSaida(s)) + '</th></tr></table>' +
                '<p class="rodape">Beneficiamento: ' + (st.recs.length ? (st.faltam.length ? 'recebido em parte (faltam ' + st.faltam.length + ' coleta(s))' : 'recebido · lote ' + st.codigos.join(', ')) : 'ainda não recebido') + '</p>' +
                '<div class="assinaturas"><div><span></span>Entregue por (granja)</div><div><span></span>Recebido por (beneficiamento)</div></div>');
        });
    } });


    /* =====================================================
       8. PESO SEMANAL
       ===================================================== */
    /* PESO SEMANAL
       · Situação de cada lote: última pesagem, idade, peso × guia da linhagem, dias sem pesar
       · Gráfico do lote escolhido: peso real semana a semana × curva do guia
       · Lançar pesagem: dá para digitar o peso de cada ave → média e uniformidade saem sozinhas */
    var pesoLoteGrafico = '';
    var fmtG = function (v) { return v == null ? '—' : fmt(Math.round(v)) + ' g'; };
    function tagPeso(a) {
        if (!a || a.guia == null) return UI.tag('sem curva do guia', 'neutra');
        var txt = (a.dif > 0 ? '+' : '') + fmt(Math.round(a.dif)) + ' g (' + (a.pct > 0 ? '+' : '') + a.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%)';
        return UI.tag(txt, a.situacao === 'no guia' ? 'ok' : a.situacao === 'abaixo' ? 'erro' : 'atencao');
    }
    function graficoPeso(db, lote) {
        var l = D.acharLote(db, lote);
        if (!l) return '<p class="vazio">Escolha um lote.</p>';
        var reais = db.pesagens.filter(function (p) { return String(p.lote) === String(l.lote); }).map(function (p) { return { sem: D.idadeSemanas(l, p.data), peso: n(p.peso_medio), data: p.data }; })
            .filter(function (x) { return x.sem != null && x.peso > 0; }).sort(function (a, b) { return a.sem - b.sem; });
        var temGuia = D.temCurvaPeso(db, l), semHoje = D.idadeSemanas(l, D.hoje());
        if (!reais.length && !temGuia) return '<p class="vazio">Sem pesagens deste lote e sem curva de peso da linhagem ' + h(l.linhagem) + '.</p>';
        var s0 = reais.length ? Math.max(0, reais[0].sem - 3) : Math.max(0, (semHoje || 20) - 10), s1 = Math.max(reais.length ? reais[reais.length - 1].sem + 3 : 0, semHoje != null ? semHoje + 1 : 0, s0 + 6);
        var guia = []; if (temGuia) for (var w = s0; w <= s1; w++) { var g = D.pesoGuia(db, l, w); if (g != null) guia.push({ sem: w, peso: g }); }
        var todos = reais.map(function (x) { return x.peso; }).concat(guia.map(function (x) { return x.peso; }));
        var ymin = Math.floor(Math.min.apply(null, todos) * 0.95 / 50) * 50, ymax = Math.ceil(Math.max.apply(null, todos) * 1.04 / 50) * 50;
        var W = 760, H = 260, L = 56, R = 16, T = 14, B = 34;
        var x = function (sem) { return L + (sem - s0) / Math.max(1, s1 - s0) * (W - L - R); };
        var y = function (p) { return T + (1 - (p - ymin) / Math.max(1, ymax - ymin)) * (H - T - B); };
        var grade = '', passos = 5;
        for (var k = 0; k <= passos; k++) { var v = ymin + (ymax - ymin) * k / passos; grade += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gp-grade"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="gp-eixo">' + fmt(Math.round(v)) + '</text>'; }
        var passoX = Math.max(1, Math.ceil((s1 - s0) / 12));
        for (var sx = s0; sx <= s1; sx += passoX) grade += '<text x="' + x(sx) + '" y="' + (H - 12) + '" text-anchor="middle" class="gp-eixo">' + sx + '</text>';
        var linha = function (pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.sem).toFixed(1) + ' ' + y(p.peso).toFixed(1); }).join(' '); };
        return '<svg class="grafico-peso" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Peso do lote ' + h(l.lote) + ' por semana de idade">' + grade +
            '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 1) + '" text-anchor="middle" class="gp-eixo">semana de idade</text>' +
            (guia.length ? '<path d="' + linha(guia) + '" class="gp-guia"/>' : '') +
            (reais.length ? '<path d="' + linha(reais) + '" class="gp-real"/>' + reais.map(function (p) {
                var g = D.pesoGuia(db, l, p.sem), baixo = g && p.peso < g * 0.95;
                return '<circle cx="' + x(p.sem) + '" cy="' + y(p.peso) + '" r="4.5" class="gp-ponto' + (baixo ? ' abaixo' : '') + '"><title>' + D.br(p.data) + ' · semana ' + p.sem + ': ' + fmt(p.peso) + ' g' + (g ? ' (guia ' + fmt(Math.round(g)) + ' g)' : '') + '</title></circle>';
            }).join('') : '') + '</svg>' +
            '<p class="nota" style="margin:8px 0 0"><span class="gp-leg real"></span> peso médio pesado &nbsp; <span class="gp-leg guia"></span> curva do guia ' + h(l.linhagem) + (temGuia ? '' : ' (não cadastrada: Cadastros › Linhagens)') + ' &nbsp; <span class="gp-leg abaixo"></span> mais de 5% abaixo do guia</p>';
    }

    CadastroPadrao('g-peso', {
        tabela: 'pesagens', sistema: S, titulo: 'Peso semanal', botaoNovo: '+ Lançar pesagem',
        sub: 'Peso corporal médio por lote, uma vez por semana, comparado com a curva de peso do guia da linhagem.',
        colunas: [colData, colLote,
            { t: 'Idade', v: function (r, db) { var a = D.avaliarPesagem(db, r); return a.semana == null ? '—' : a.semana + ' sem.'; } },
            { t: 'Peso médio', num: 1, v: function (r) { return '<b>' + fmt(r.peso_medio) + ' g</b>'; } },
            { t: 'Guia', num: 1, v: function (r, db) { return fmtG(D.avaliarPesagem(db, r).guia); } },
            { t: 'Diferença', v: function (r, db) { return tagPeso(D.avaliarPesagem(db, r)); } },
            { t: 'Aves', num: 1, v: function (r) { return fmt(r.aves_pesadas); } },
            { t: 'Uniformidade', num: 1, v: function (r) { return r.uniformidade ? r.uniformidade + '%' : '—'; } },
            { t: 'Observação', quebra: 1, v: function (r) { return h(r.observacao); } }, colQuem],
        novo: function (db) { return { data: D.hoje(), lote: primeiroLote(db), aves_pesadas: 30 }; },
        topo: function (db) {
            var sit = D.pesagemDosLotes(db);
            if (!pesoLoteGrafico || !D.acharLote(db, pesoLoteGrafico)) pesoLoteGrafico = (sit.find(function (x) { return x.ultima; }) || sit[0] || { lote: {} }).lote.lote || '';
            var semCurva = (db.linhagens || []).filter(function (lin) { return !String(lin.curva_peso || '').trim(); }).map(function (lin) { return lin.linhagem; });
            return (semCurva.length ? '<p class="faixa atencao" style="margin:0 0 16px"><b>Falta a curva de peso do guia</b> de: ' + semCurva.map(h).join(', ') + '. Cadastre em Cadastros › Linhagens (formato: <i>18:1450; 20:1550; 25:1750</i>) para comparar o peso com o esperado.</p>' : '') +
                '<p class="nota" style="margin:0 0 var(--esp-3)">A <b>curva de produção</b> de cada lote (postura × tabela do guia, com o pico) fica em <a href="#g-producao">Produção diária →</a></p>' +
                '<div class="card"><div class="card-titulo"><h2>Gráfico do lote</h2><label style="margin:0;min-width:240px">Lote<select data-peso-lote>' +
                    sit.map(function (x) { return '<option value="' + h(x.lote.lote) + '"' + (String(x.lote.lote) === String(pesoLoteGrafico) ? ' selected' : '') + '>' + h(D.nomeLote(db, x.lote.lote)) + '</option>'; }).join('') + '</select></label></div>' +
                    graficoPeso(db, pesoLoteGrafico) + '</div>' +
                '<div class="card"><h2>Situação dos lotes</h2>' + UI.tabela(['Lote', 'Última pesagem', 'Idade', { t: 'Peso', num: 1 }, { t: 'Guia', num: 1 }, 'Diferença', 'Uniformidade', 'Dias sem pesar'],
                    sit.map(function (x) {
                        var a = x.avaliacao, atras = x.dias != null && x.dias > D.DIAS_PESAGEM;
                        return [h(D.nomeLote(db, x.lote.lote)), x.ultima ? D.br(x.ultima.data) : '—', a && a.semana != null ? a.semana + ' sem.' : '—', x.ultima ? fmt(x.ultima.peso_medio) + ' g' : '—',
                            a ? fmtG(a.guia) : '—', a ? tagPeso(a) : '—', x.ultima && x.ultima.uniformidade ? x.ultima.uniformidade + '%' : '—',
                            x.dias == null ? '—' : atras ? UI.tag(x.ultima ? x.dias + ' dias' : 'nunca pesado', 'atencao') : x.dias + ' dia(s)'];
                    }), 'Nenhum lote ativo.') + '</div>';
        },
        ligar: function (el) {
            UI.ligar(el, '[data-peso-lote]', 'change', function (e, sel) { pesoLoteGrafico = sel.value; Sistema.atualizar(); });
        },
        /* Formulário: pesos ave por ave → média, aves e uniformidade; e o peso esperado do guia */
        aoAbrir: function (f, db) {
            var caixa = document.createElement('div'); caixa.className = 'faixa'; caixa.style.gridColumn = '1 / -1'; caixa.style.margin = '0';
            f.pesos.closest('label').insertAdjacentElement('afterend', caixa);
            f.pesos.placeholder = 'Ex.: 1450 1520 1490 1610 (separe por espaço ou um por linha)';
            var calc = function () {
                var e = D.estatPesos(f.pesos.value), l = D.acharLote(API.dados(), f.lote.value), sem = l ? D.idadeSemanas(l, f.data.value) : null, g = l ? D.pesoGuia(API.dados(), l, sem) : null;
                f.peso_medio.readOnly = f.aves_pesadas.readOnly = !!e;
                if (e) { f.peso_medio.value = e.media; f.aves_pesadas.value = e.qtd; f.uniformidade.value = e.uniformidade; }
                f.uniformidade.readOnly = true;
                var peso = n(f.peso_medio.value), partes = [];
                if (e) partes.push('<b>' + e.qtd + ' aves</b> · média <b>' + fmt(e.media) + ' g</b> · mín. ' + fmt(e.min) + ' · máx. ' + fmt(e.max) + ' · uniformidade <b>' + e.uniformidade + '%</b> (aves até 10% da média) · CV ' + String(e.cv).replace('.', ',') + '%');
                if (sem != null) partes.push('Idade do lote: <b>' + sem + ' semanas</b>' + (g ? ' · guia: <b>' + fmt(Math.round(g)) + ' g</b>' + (peso ? ' · diferença: <b>' + (peso - g > 0 ? '+' : '') + fmt(Math.round(peso - g)) + ' g</b>' : '') : ' · sem curva de peso da linhagem'));
                caixa.innerHTML = partes.join('<br>') || 'Digite o peso médio ou os pesos de cada ave.';
                caixa.className = 'faixa ' + (g && peso && peso < g * 0.95 ? 'erro' : e || g ? 'ok' : '');
            };
            ['input', 'change'].forEach(function (ev) { f.addEventListener(ev, function (e2) { if (e2.target !== f.peso_medio || !f.pesos.value.trim()) calc(); }); });
            calc();
        },
        antesDeSalvar: function (v) {
            var e = D.estatPesos(v.pesos);
            if (e) { v.peso_medio = e.media; v.aves_pesadas = e.qtd; v.uniformidade = e.uniformidade; v.pesos = e.valores.join(' '); }
            else { v.pesos = ''; v.uniformidade = ''; }
        },
        validar: function (v, db, id) {
            checarLote(db, v, id);
            if (n(v.peso_medio) < 1) throw new Error('Informe o peso médio em gramas (ou os pesos de cada ave).');
            if (n(v.peso_medio) < 300 || n(v.peso_medio) > 5000) throw new Error('Peso médio de ' + fmt(v.peso_medio) + ' g parece errado: confira se está em gramas (ex.: 1850).');
            unico(db, 'pesagens', v, id, ['data', 'lote']);
        }
    });


    /* =====================================================
       9. TAREFAS
       ===================================================== */
    CadastroPadrao('g-tarefas', {
        tabela: 'tarefas', sistema: S, titulo: 'Tarefas', botaoNovo: '+ Nova tarefa',
        sub: 'Rotinas da granja (vacina, produto, limpeza). As de hoje aparecem no Resumo.',
        ordenar: function (a, b) { return String(a.descricao).localeCompare(String(b.descricao)); },
        colunas: [{ t: 'Tarefa', quebra: 1, v: function (r) { return h(r.descricao); } }, { t: 'Lote', v: function (r) { return r.lote ? 'Lote ' + h(r.lote) : 'Todos'; } },
            { t: 'Quando', v: function (r) { return h(r.dia) + (r.dia === 'Data específica' ? ' · ' + D.br(r.data_especifica) : ''); } },
            { t: 'Responsável', v: function (r) { return h(r.responsavel); } }, { t: 'Obrigatória', v: function (r) { return r.obrigatoria === 'Sim' ? UI.tag('Sim', 'erro') : UI.tag('Não', 'neutra'); } },
            { t: 'Situação', v: function (r) { return r.ativo === 'Não' ? UI.tag('Inativa', 'neutra') : UI.tag('Ativa', 'ok'); } },
            { t: 'Hoje', quebra: 1, v: function (r, db) {
                var x = D.tarefasDoDia(db, D.hoje()).find(function (y) { return y.tarefa.id === r.id; });
                if (!x) return '<span class="nota" style="margin:0">não é hoje</span>';
                return x.feita ? UI.tag('Feita · ' + h(x.feita.feita_por), 'ok') + (x.feita.observacao ? '<br><small class="nota" style="margin:0">' + h(x.feita.observacao) + '</small>' : '') : UI.tag('Pendente', 'atencao');
            } }],
        acoesLinha: function (r, db) {
            var x = D.tarefasDoDia(db, D.hoje()).find(function (y) { return y.tarefa.id === r.id; });
            return x && !x.feita ? '<button class="btn pequeno" data-tarefa-feita="' + h(r.id) + '">Marcar feita</button>' : '';
        },
        ligar: function (el, db) {
            UI.ligar(el, '[data-tarefa-feita]', 'click', function (e, b) { Sistema.marcarTarefa(db.tarefas.find(function (t) { return t.id === b.dataset.tarefaFeita; })); });
        },
        tituloLista: 'Tarefas (o responsável vê as dele no sininho, lá em cima)',
        novo: function () { return { dia: 'Todos os dias', obrigatoria: 'Não', ativo: 'Sim' }; },
        aoAbrir: function (f) { UI.contarCaracteres(f.descricao, D.MIN_TAREFA, D.MAX_TAREFA); },   // limite de letras com contador
        validar: function (v) {
            var p = UI.descricaoCurta(v.descricao, D.MIN_TAREFA, D.MAX_TAREFA); if (p) throw new Error(p);
            if (v.dia === 'Data específica' && !v.data_especifica) throw new Error('Informe a data específica.');
        }
    });


    /* =====================================================
       10. ALERTAS
       ===================================================== */
    CadastroPadrao('g-alertas', {
        tabela: 'alertas', sistema: S, titulo: 'Alertas', botaoNovo: '+ Novo alerta',
        sub: 'Avisos urgentes (ex.: ave mancando, sinal de doença). Os não resolvidos aparecem no Painel.',
        colunas: [colData, { t: 'Lote', v: function (r) { return r.lote ? 'Lote ' + h(r.lote) : '—'; } },
            { t: 'Gravidade', v: function (r) { return UI.tag(r.gravidade, r.gravidade === 'Urgente' ? 'erro' : 'atencao'); } },
            { t: 'Descrição', quebra: 1, v: function (r) { return h(r.descricao); } }, { t: 'Registrado por', v: function (r) { return h(r.registrado_por); } },
            { t: 'Situação', v: function (r) { return r.resolvido === 'Sim' ? UI.tag('Resolvido', 'ok') : UI.tag('Aberto', 'erro'); } }],
        novo: function () { return { data: D.hoje(), gravidade: 'Urgente', resolvido: 'Não', registrado_por: Sistema.usuario().nome }; },
        /* descrição obrigatória com mínimo de caracteres (contador embaixo do campo) */
        aoAbrir: function (f) { UI.contarCaracteres(f.descricao, D.MIN_DESCRICAO, D.MAX_DESCRICAO); },
        validar: function (v) { var p = UI.descricaoCurta(v.descricao); if (p) throw new Error(p); },
        acoesLinha: function (r) { return r.resolvido === 'Sim' ? '' : '<button class="btn pequeno" data-resolver="' + h(r.id) + '">Resolvido</button>'; },
        ligar: function (el) {
            UI.ligar(el, '[data-resolver]', 'click', async function (e, b) {
                await API.salvar('alertas', { resolvido: 'Sim' }, b.dataset.resolver, S, 'Marcou um alerta como resolvido');
                UI.avisar('Alerta resolvido'); Sistema.atualizar();
            });
        }
    });
})();
