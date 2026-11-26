/* =========================================================
   ERP Ovo Caipira · RELATÓRIOS
   ---------------------------------------------------------
   Abas: Granja · Beneficiamento · Colaboradoras ·
   Registro (só administrador). Escolhe o relatório, o período
   e o lote: a folha aparece pronta para imprimir ou salvar
   em PDF, e também dá para baixar em CSV.
   A busca da barra do topo também cai aqui.

   Cada relatório: { aba, nome, gerar(db, filtro) → { cab, linhas, resumo } }

   Organização deste arquivo:
     1. Relatórios da granja
     2. Relatórios do beneficiamento
     3. Relatórios das colaboradoras
     4. Registro de alterações
     5. Busca geral
     6. Tela
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var estado = { aba: 'granja', rel: 'coletas', periodo: UI.novoPeriodo('sem'), lote: 'todos' };
    var doLote = function (f, lote) { return f.lote === 'todos' || lote == null || lote === '' || String(lote) === String(f.lote); };   // '' = coleta por dia (granja toda)
    var noPer = function (f, d) { return D.noPeriodo(d, f.de, f.ate); };

    var RELS = {

        /* =====================================================
           1. GRANJA
           ===================================================== */
        coletas: { aba: 'granja', grupo: 'Produção da granja', desc: 'Ovos coletados por dia (lote da coleta), com a perda', nome: 'Coleta dia a dia', gerar: function (db, f) {
            var p = D.producaoDiaria(db).filter(function (x) { return noPer(f, x.data) && doLote(f, x.lote); });
            var t = p.reduce(function (s, x) { return s + x.total; }, 0), b = p.reduce(function (s, x) { return s + x.bons; }, 0);
            return { resumo: [['Total coletado', fmt(t)], ['Ovos bons', fmt(b)], ['Perda', UI.pct(t - b, t)]],
                cab: ['Data', 'Lote da coleta', { t: 'Coletas', num: 1 }, { t: 'Bons', num: 1 }, { t: 'Trincados', num: 1 }, { t: 'Def. e sujos', num: 1 }, { t: 'Total', num: 1 }, { t: 'Perda %', num: 1 }],
                linhas: p.map(function (x) { return [D.br(x.data), '<b>' + h(D.codigoDoDia(db, x.data, x.lote)) + '</b>' + (x.lote ? ' · ' + h(D.nomeLote(db, x.lote)) : ''), x.coletas, fmt(x.bons), fmt(x.trincados), fmt(x.def_sujos), fmt(x.total), UI.pct(x.total - x.bons, x.total)]; }) };
        } },
        postura: { aba: 'granja', grupo: 'Produção da granja', desc: 'Postura média da granja (e de cada lote) comparada com o guia da linhagem', nome: 'Postura por lote × guia', gerar: function (db, f) {
            var lotes = D.lotesAtivos(db).filter(function (l) { return doLote(f, l.lote); });
            var pc = function (x) { return x ? x.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—'; };
            var gt = D.posturaPeriodo(db, '', f.de, f.ate);                     // coletas por dia = granja toda
            var linhaGranja = gt.dias ? [['<b>Granja toda</b>', 'Todos os lotes', '—', fmt(gt.aves), pc(gt.real), gt.guia == null ? '—' : pc(gt.guia),
                !gt.real || gt.guia == null ? '—' : gt.real >= gt.guia - 2 ? 'Dentro do guia' : 'Abaixo do guia']] : [];
            return { resumo: [['Lotes', lotes.length]], cab: ['Lote', 'Linhagem', 'Idade', { t: 'Aves vivas', num: 1 }, { t: 'Postura média', num: 1 }, { t: 'Guia', num: 1 }, 'Situação'],
                linhas: linhaGranja.concat(lotes.map(function (l) {
                    var c = db.coletas.filter(function (x) { return String(x.lote) === String(l.lote) && noPer(f, x.data); });
                    var dias = {}; c.forEach(function (x) { dias[x.data] = 1; });
                    var nd = Object.keys(dias).length, v = D.avesVivas(db, l), t = c.reduce(function (s, x) { return s + D.totalColeta(x); }, 0);
                    var real = nd && v ? t / nd / v * 100 : 0, sem = D.idade(l), g = D.posturaGuia(db, l, sem);
                    return [h(l.lote), h(l.linhagem), sem + ' sem', fmt(v), real ? real.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—', g == null ? '—' : g.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%',
                        !real || g == null ? '—' : real >= g - 2 ? 'Dentro do guia' : 'Abaixo do guia'];
                })) };
        } },
        peso: { aba: 'granja', grupo: 'Lotes e bem-estar', desc: 'Peso médio de cada pesagem comparado com a curva de peso do guia, com a uniformidade', nome: 'Peso semanal × guia', gerar: function (db, f) {
            var ps = db.pesagens.filter(function (p) { return noPer(f, p.data) && doLote(f, p.lote); }).sort(function (a, b) { return String(a.lote).localeCompare(String(b.lote)) || String(a.data).localeCompare(String(b.data)); });
            var av = ps.map(function (p) { return D.avaliarPesagem(db, p); });
            var abaixo = av.filter(function (a) { return a.situacao === 'abaixo'; }).length, comGuia = av.filter(function (a) { return a.guia != null; }).length;
            var unif = ps.filter(function (p) { return n(p.uniformidade) > 0; });
            return { resumo: [['Pesagens', fmt(ps.length)], ['Abaixo do guia (mais de 5%)', comGuia ? abaixo + ' de ' + comGuia : 'sem curva'], ['Uniformidade média', unif.length ? Math.round(unif.reduce(function (s, p) { return s + n(p.uniformidade); }, 0) / unif.length) + '%' : '—']],
                cab: ['Data', 'Lote', 'Idade', { t: 'Peso médio (g)', num: 1 }, { t: 'Guia (g)', num: 1 }, { t: 'Diferença (g)', num: 1 }, { t: 'Aves', num: 1 }, 'Uniformidade', 'Observação'],
                linhas: ps.map(function (p, i) { var a = av[i]; return [D.br(p.data), h(D.nomeLote(db, p.lote)), a.semana == null ? '—' : a.semana + ' sem.', fmt(p.peso_medio), a.guia == null ? '—' : fmt(Math.round(a.guia)),
                    a.guia == null ? '—' : (a.dif > 0 ? '+' : '') + fmt(Math.round(a.dif)), fmt(p.aves_pesadas), p.uniformidade ? p.uniformidade + '%' : '—', h(p.observacao)]; }) };
        } },
        mortalidade: { aba: 'granja', grupo: 'Lotes e bem-estar', desc: 'Mortes e abates com motivo e observação', nome: 'Mortalidade e abate', gerar: function (db, f) {
            var r = db.mortalidade.filter(function (x) { return noPer(f, x.data) && doLote(f, x.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
            return { resumo: [['Lançamentos', r.length], ['Mortes', fmt(r.reduce(function (s, x) { return s + n(x.mortes); }, 0))], ['Abates', fmt(r.reduce(function (s, x) { return s + n(x.abate); }, 0))]],
                cab: ['Data', 'Lote', { t: 'Mortes', num: 1 }, { t: 'Abate', num: 1 }, 'Motivo', { t: 'Observação', quebra: 1 }, 'Lançado por'],
                linhas: r.map(function (x) { return [D.br(x.data), h(x.lote), fmt(x.mortes), fmt(x.abate), h(x.motivo), h(x.observacao), h(x.lancado_por)]; }) };
        } },
        saida: { aba: 'granja', grupo: 'Produção da granja', desc: 'Boletins enviados ao beneficiamento', nome: 'Saída de ovos', gerar: function (db, f) {
            var r = D.saidas(db).filter(function (x) { return noPer(f, x.data) && doLote(f, x.lote); });
            return { resumo: [['Ovos enviados', fmt(r.reduce(function (s, x) { return s + D.totalSaida(x); }, 0))]],
                cab: ['Postura', 'Lote', { t: 'Bons', num: 1 }, { t: 'Trincados', num: 1 }, { t: 'Def./sujos', num: 1 }, { t: 'Total', num: 1 }, 'Origem', 'Coletado / ajustado por'],
                linhas: r.map(function (x) { return [D.br(x.data), h(x.lote), fmt(x.bons), fmt(x.trincados), fmt(x.def_sujos), fmt(D.totalSaida(x)), x.automatica ? 'Automática (coletas)' : 'Ajustada', h(x.responsavel)]; }) };
        } },

        /* =====================================================
           2. BENEFICIAMENTO
           ===================================================== */
        conferencia: { aba: 'benef', grupo: 'Produção', desc: 'Recebido × embalado × perdas de cada lote', nome: 'Conferência dos 100% por lote', gerar: function (db, f) {
            var r = db.recebimentos.filter(function (x) { return noPer(f, x.data_postura) && doLote(f, x.lote_granja); });
            return { resumo: [['Lotes', r.length]], cab: ['Lote', 'Postura', { t: 'Bons recebidos', num: 1 }, { t: 'Produzido', num: 1 }, { t: 'Perdas receb.', num: 1 }, { t: 'Perdas benef.', num: 1 }, { t: 'Sobra', num: 1 }, { t: 'Total', num: 1 }, 'Situação'],
                linhas: r.map(function (x) {
                    var p = db.producoes.find(function (y) { return y.lote_receb === x.lote_receb; });
                    if (!p) return [h(x.lote_receb), D.br(x.data_postura), fmt(x.bom), '—', fmt(D.perdaRecebimento(x)), '—', '—', '—', 'Sem produção'];
                    var c = D.conferencia(x, p);
                    return [h(x.lote_receb), D.br(x.data_postura), fmt(c.recebido), fmt(c.embalados), fmt(c.perdaRec), fmt(c.perdaBen), fmt(c.sobra), fmt(c.total), c.diferenca ? 'Diferença' : 'Fecha 100%'];
                }) };
        } },
        perdas: { aba: 'benef', grupo: 'Produção', pac: D.PAC.perdas, desc: 'PAC 11 · Perdas no recebimento e na máquina, lote a lote', nome: 'Perdas do entreposto', gerar: function (db, f) {
            var r = db.recebimentos.filter(function (x) { return noPer(f, x.data_postura); }).sort(function (a, b) { return String(a.data_postura).localeCompare(String(b.data_postura)); });
            var tot = { rec: 0, perdaRec: 0, trinc: 0, def: 0, sujo: 0, queb: 0, sobra: 0 };
            var linhas = r.map(function (x) {
                var p = db.producoes.find(function (y) { return y.lote_receb === x.lote_receb; }) || {};
                var rec = D.totalRecebido(x), pr = D.perdaRecebimento(x), pb = n(p.trincado) + n(p.defeito) + n(p.sujo) + n(p.quebrado);
                tot.rec += rec; tot.perdaRec += pr; tot.trinc += n(p.trincado); tot.def += n(p.defeito); tot.sujo += n(p.sujo); tot.queb += n(p.quebrado); tot.sobra += n(p.sobra);
                return [h(x.lote_receb), D.br(x.data_postura), fmt(rec), fmt(pr), p.id ? fmt(p.trincado) : '—', p.id ? fmt(p.defeito) : '—', p.id ? fmt(p.sujo) : '—', p.id ? fmt(p.quebrado) : '—', p.id ? fmt(p.sobra) : '—',
                    '<b>' + fmt(pr + pb) + '</b>', UI.pct(pr + pb, rec)];
            });
            var todas = tot.perdaRec + tot.trinc + tot.def + tot.sujo + tot.queb;
            return { resumo: [['Recebido', fmt(tot.rec)], ['Perdas no recebimento', fmt(tot.perdaRec)], ['Perdas na máquina', fmt(tot.trinc + tot.def + tot.sujo + tot.queb)], ['Quebrados (sucção)', fmt(tot.queb)], ['Perda total', fmt(todas) + ' · ' + UI.pct(todas, tot.rec)]],
                cab: ['Lote', 'Postura', { t: 'Recebido', num: 1 }, { t: 'Perda receb.', num: 1 }, { t: 'Trinc.', num: 1 }, { t: 'Defeito', num: 1 }, { t: 'Sujo', num: 1 }, { t: 'Quebrado', num: 1 }, { t: 'Sobra', num: 1 }, { t: 'Perda total', num: 1 }, { t: '%', num: 1 }],
                linhas: linhas };
        } },
        recebimentos: { aba: 'benef', grupo: 'Produção', pac: D.PAC['b-recebimento'], desc: 'PAC 11 · Lotes recebidos da granja, com a conferência', nome: 'Recebimento de ovos', gerar: function (db, f) {
            var r = db.recebimentos.filter(function (x) { return noPer(f, x.data_postura); }).sort(function (a, b) { return String(a.data_postura).localeCompare(String(b.data_postura)); });
            return { resumo: [['Lotes', r.length], ['Ovos recebidos', fmt(r.reduce(function (t, x) { return t + D.totalRecebido(x); }, 0))]],
                cab: ['Lote', 'Postura', { t: 'Bom', num: 1 }, { t: 'Trincado', num: 1 }, { t: 'Defeito', num: 1 }, { t: 'Sujo', num: 1 }, { t: 'Total', num: 1 }, 'Recebido por'],
                linhas: r.map(function (x) { return [h(x.lote_receb), D.br(x.data_postura), fmt(x.bom), fmt(x.trincado), fmt(x.defeito), fmt(x.sujo), fmt(D.totalRecebido(x)), h(x.lancado_por || '')]; }) };
        } },
        producao: { aba: 'benef', grupo: 'Produção', pac: D.PAC['b-beneficiamento'], desc: 'PAC 11 · Pentes e dúzias produzidos e embalagens usadas', nome: 'Produção do entreposto', gerar: function (db, f) {
            var p = db.producoes.filter(function (x) { return noPer(f, x.data); });
            return { resumo: [['Ovos embalados', fmt(p.reduce(function (s, x) { return s + D.embalados(x); }, 0))]],
                cab: ['Lote', 'Data'].concat(D.MAQUINA.map(function (m) { return { t: m.nome, num: 1 }; })).concat([{ t: 'Ovos embalados', num: 1 }, { t: 'Embalagens usadas', quebra: 1 }]),
                linhas: p.map(function (x) {
                    var u = D.embalagensUsadas(db, [x]);
                    return [h(x.lote_receb), D.br(x.data)].concat(D.MAQUINA.map(function (m) { return fmt(x[m.chave]); }))
                        .concat([fmt(D.embalados(x)), h(D.TIPOS_EMBALAGEM.filter(function (t) { return n(u[t.chave]); }).map(function (t) { return t.nome + ' ' + fmt(u[t.chave]); }).join(' · '))]);
                }) };
        } },
        estoque: { aba: 'benef', grupo: 'Embalagens e estoque', desc: 'Produto pronto para entregar, por lote e validade', nome: 'Pronto para entregar', gerar: function (db) {
            var e = D.estoque(db).filter(function (x) { return D.MAQUINA.some(function (m) { return n(x.qtd[m.chave]) > 0; }); });
            return { resumo: [['Lotes com saldo', e.length]], cab: ['Lote', 'Postura', 'Validade'].concat(D.MAQUINA.map(function (m) { return { t: m.nome, num: 1 }; })),
                linhas: e.map(function (x) { return [h(x.lote), D.br(x.data), D.br(D.validade(x.data, db))].concat(D.MAQUINA.map(function (m) { return fmt(x.qtd[m.chave]); })); }) };
        } },
        compras: { aba: 'benef', grupo: 'Embalagens e estoque', pac: D.PAC['b-embalagens'], desc: 'PAC 16 · Compras por nota fiscal e saldo de cada lote', nome: 'Lote de embalagens (compras e notas)', gerar: function (db, f) {
            var r = db.embalagens.filter(function (x) { return noPer(f, x.data_compra); });
            return { resumo: [['Compras', r.length]], cab: ['Nota fiscal', 'Data', 'Embalagem', 'Lote', { t: 'Quantidade', num: 1 }, { t: 'Saldo', num: 1 }, 'Fornecedor'],
                linhas: r.map(function (x) { return [h(x.nota_fiscal), D.br(x.data_compra), h(D.nomeTipoEmbalagem(x.tipo)), h(x.lote), fmt(x.comprado), fmt(D.saldoEmbalagem(db, x).saldo), h(x.fornecedor)]; }) };
        } },
        estoqueemb: { aba: 'benef', grupo: 'Embalagens e estoque', pac: D.PAC['estoque-embalagens'], desc: 'PAC 16 · Saldo de cada tipo de embalagem e aviso de compra', nome: 'Estoque de embalagens', gerar: function (db) {
            var linhas = D.TIPOS_EMBALAGEM.map(function (t) {
                var compras = db.embalagens.filter(function (x) { return x.tipo === t.chave; });
                var saldo = compras.reduce(function (s, x) { return s + D.saldoEmbalagem(db, x).saldo; }, 0);
                var comprado = compras.reduce(function (s, x) { return s + n(x.comprado); }, 0), usado = comprado - saldo;
                var aviso = compras.length ? n(compras[compras.length - 1].aviso_minimo || 200) : 200;
                return [h(t.nome), fmt(comprado), fmt(usado), '<b>' + fmt(saldo) + '</b>', fmt(aviso), !compras.length ? 'Sem compra' : saldo <= aviso ? 'Comprar' : 'Ok'];
            });
            return { resumo: [['Tipos', D.TIPOS_EMBALAGEM.length]], cab: ['Embalagem', { t: 'Comprado', num: 1 }, { t: 'Usado', num: 1 }, { t: 'Saldo', num: 1 }, { t: 'Avisar em', num: 1 }, 'Situação'], linhas: linhas };
        } },
        romaneios: { aba: 'benef', grupo: 'Vendas e entregas', pac: D.PAC['b-romaneio'], desc: 'PAC 16 · Produtos, lotes e validade de cada pedido', nome: 'Romaneio de entregas', gerar: function (db, f) {
            var linhas = [];
            db.pedidos.filter(function (p) { return noPer(f, p.entrega || p.data_pedido); }).forEach(function (p) {
                var lotes = D.lerJSON(p.lotes, {});
                Object.keys(lotes).forEach(function (prod) { lotes[prod].forEach(function (l) {
                    var e = D.estoque(db).find(function (x) { return x.lote === l[0]; }) || db.recebimentos.find(function (x) { return x.lote_receb === l[0]; });
                    var data = e ? (e.data || e.data_postura) : '';
                    linhas.push(['#' + p.numero, D.br(p.entrega), h(p.cliente), h(prod), fmt(l[1]), h(l[0]), D.br(D.validade(data, db)), h(p.situacao)]);
                }); });
            });
            return { resumo: [['Linhas', linhas.length]], cab: ['Pedido', 'Entrega', 'Cliente', 'Produto', { t: 'Qtde', num: 1 }, 'Lote', 'Validade', 'Situação'], linhas: linhas };
        } },
        compracliente: { aba: 'benef', grupo: 'Vendas e entregas', desc: 'Quanto cada cliente comprou de cada produto', nome: 'Compras por cliente', gerar: function (db, f) {
            var pedidos = db.pedidos.filter(function (p) { return noPer(f, p.data_pedido); });
            var linhas = db.clientes.map(function (c) {
                var q = db.produtos.map(function (pr) { return pedidos.filter(function (p) { return p.cliente === c.nome; }).reduce(function (s, p) { return s + n(D.lerJSON(p.itens, {})[pr.nome]); }, 0); });
                return [h(c.nome)].concat(q.map(fmt)).concat([fmt(q.reduce(function (s, x) { return s + x; }, 0))]);
            }).filter(function (l) { return l[l.length - 1] !== '0'; });
            return { resumo: [['Clientes que compraram', linhas.length]], cab: ['Cliente'].concat(db.produtos.map(function (p) { return { t: p.curto || p.nome, num: 1 }; })).concat([{ t: 'Total', num: 1 }]), linhas: linhas };
        } },
        clientes: { aba: 'benef', grupo: 'Vendas e entregas', desc: 'Lista de clientes com contato e vendedor', nome: 'Cadastro de clientes', gerar: function (db) {
            return { resumo: [['Clientes', db.clientes.length]], cab: ['Código', 'Nome', 'CNPJ', 'Cidade', 'Telefone', 'Vendedor'],
                linhas: db.clientes.map(function (c) { return [c.codigo, c.nome, c.cnpj, c.cidade, c.telefone, c.vendedor].map(h); }) };
        } },
        produtos: { aba: 'benef', grupo: 'Vendas e entregas', desc: 'Lista de produtos com código de barras e ovos por embalagem', nome: 'Cadastro de produtos', gerar: function (db) {
            return { resumo: [['Produtos', db.produtos.length]], cab: ['Nome', 'Nome público', 'Código de barras', { t: 'Ovos/embalagem', num: 1 }, { t: 'Estoque mínimo', num: 1 }, 'Sai da máquina como'],
                linhas: db.produtos.map(function (p) { return [h(p.nome), h(p.curto), h(p.codigo_barras), fmt(p.ovos), fmt(p.estoque_minimo), h(p.maquina)]; }) };
        } },

        /* =====================================================
           3. COLABORADORAS (só administrador)
           ===================================================== */
        checks: { aba: 'colab', grupo: 'Checklist do dia', desc: 'Todos os checklists com C, NC e itens não conformes', nome: 'Checklists do período', gerar: function (db, f) { return relCheck(db, f, false); } },
        nc: { aba: 'colab', grupo: 'Checklist do dia', desc: 'Só os checklists com algum item não conforme', nome: 'Não conformidades', gerar: function (db, f) { return relCheck(db, f, true); } },
        porcolab: { aba: 'colab', grupo: 'Coletas', desc: 'Dias, coletas, ovos e perda de cada colaboradora', nome: 'Coleta por colaboradora', gerar: function (db, f) {
            var g = {};
            db.coletas.filter(function (c) { return noPer(f, c.data) && doLote(f, c.lote); }).forEach(function (c) {
                var x = g[c.coletado_por] || (g[c.coletado_por] = { coletas: 0, total: 0, bons: 0, dias: {} });
                x.coletas++; x.total += D.totalColeta(c); x.bons += n(c.bons); x.dias[c.data] = 1;
            });
            var nomes = Object.keys(g).sort();
            return { resumo: [['Colaboradoras', nomes.length]], cab: ['Coletado por', { t: 'Dias', num: 1 }, { t: 'Coletas', num: 1 }, { t: 'Ovos', num: 1 }, { t: 'Bons', num: 1 }, { t: 'Perda %', num: 1 }],
                linhas: nomes.map(function (k) { var x = g[k]; return [h(k), Object.keys(x.dias).length, x.coletas, fmt(x.total), fmt(x.bons), UI.pct(x.total - x.bons, x.total)]; }) };
        } },

        /* =====================================================
           4. REGISTRO DE ALTERAÇÕES
           ===================================================== */
        registro: { aba: 'registro', grupo: 'Registro', desc: 'Todos os lançamentos e alterações com dia, hora e quem fez', nome: 'Quem mexeu em quê', gerar: function (db, f) {
            var r = db.alteracoes.filter(function (a) { return noPer(f, a.data); });
            return { resumo: [['Alterações', r.length]], cab: ['Dia', 'Hora', 'Sistema', 'Quem', { t: 'O que mudou', quebra: 1 }],
                linhas: r.map(function (a) { return [D.br(a.data), h(a.hora), h(a.sistema), h(a.quem), h(a.o_que)]; }) };
        } }
    };

    function relCheck(db, f, soNC) {
        var r = db.checklist_colab.filter(function (c) { return noPer(f, c.data) && doLote(f, c.lote) && (!soNC || n(c.nc) > 0); })
            .sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
        return { resumo: [['Checklists', r.length], ['Conformes (C)', fmt(r.reduce(function (s, c) { return s + n(c.c); }, 0))], ['Não conformes (NC)', fmt(r.reduce(function (s, c) { return s + n(c.nc); }, 0))]],
            cab: ['Data', 'Lote', 'Tipo', 'Colaboradora', { t: 'C', num: 1 }, { t: 'NC', num: 1 }, { t: 'Itens não conformes', quebra: 1 }, 'Situação'],
            linhas: r.map(function (c) {
                var itens = D.itensDoChecklist(db, c);   // a lista que valia no dia daquele checklist
                var nc = D.lerJSON(c.respostas, []).map(function (x, i) { return x === 'NC' ? (i + 1) + '. ' + (itens[i] || 'item ' + (i + 1)) : null; }).filter(Boolean);
                return [D.br(c.data), h(c.lote), c.tipo === 'geral' ? 'Serviços gerais' : 'Lote', h(c.colaboradora), fmt(c.c), fmt(c.nc), h(nc.join(' · ')) || '—', n(c.nc) ? 'Requer atenção' : 'Conforme'];
            }) };
    }


    /* =====================================================
       5. BUSCA GERAL (barra do topo)
       ===================================================== */
    function busca(db, termo) {
        var t = termo.toLowerCase(), achou = [], eu = Sistema.usuario();
        /* só mostra o que a pessoa pode abrir */
        var olha = function (tipo, link, texto) { if (texto.toLowerCase().indexOf(t) >= 0 && D.podeVer(eu, link.split('?')[0])) achou.push([tipo, '<a href="#' + link + '">' + h(texto) + ' →</a>']); };
        db.lotes.forEach(function (l) { olha('Lote das aves', 'g-lotes', 'Lote ' + l.lote + ' · ' + l.linhagem); });
        db.recebimentos.forEach(function (r) { olha('Lote recebido', 'b-recebimento', r.lote_receb + ' · postura ' + D.br(r.data_postura)); });
        db.pedidos.forEach(function (p) { olha('Pedido', 'b-romaneio?n=' + p.numero, '#' + p.numero + ' · ' + p.cliente + ' · ' + p.situacao); });
        db.clientes.forEach(function (c) { olha('Cliente', 'clientes', c.codigo + ' · ' + c.nome + ' · ' + (c.cnpj || '')); });
        db.produtos.forEach(function (p) { olha('Produto', 'produtos', p.nome + ' · ' + p.codigo_barras); });
        return achou;
    }


    /* Tela própria da busca (não é a de relatórios) */
    Sistema.tela('busca', { desenhar: function (el, db) {
        var m = /q=([^&]*)/.exec(location.hash), termo = m ? decodeURIComponent(m[1]).trim() : '';
        var campo = document.getElementById('busca-geral'); if (campo && !campo.value) campo.value = termo;
        var curta = termo.length < 2, r = curta ? [] : busca(db, termo);
        var tipos = r.map(function (x) { return x[0]; }).filter(function (t, i, a) { return a.indexOf(t) === i; });
        el.innerHTML = '<div class="cabecalho"><div><h1>Resultado da busca</h1><p>' + (curta ? 'Digite pelo menos 2 letras na busca do topo.' : r.length + ' resultado(s) para “' + h(termo) + '”' +
                (tipos.length ? ' · ' + tipos.map(function (t) { return t + ' ' + r.filter(function (x) { return x[0] === t; }).length; }).join(' · ') : '')) + '</p></div>' +
                '<button class="btn alt" type="button" data-limpar-busca>Limpar busca</button></div>' +
            '<div class="card">' + UI.tabela(['Tipo', 'Encontrado (clique para abrir)'], r, curta ? 'Digite pelo menos 2 letras.' : 'Nada encontrado. Procure por número do lote, do pedido, nome do cliente ou do produto.') + '</div>';
        UI.ligar(el, '[data-limpar-busca]', 'click', function () { var c = document.getElementById('busca-geral'); if (c) c.value = ''; location.hash = 'painel'; });
    } });

    /* =====================================================
       6. TELA
       ===================================================== */
    Sistema.tela('relatorios', { desenhar: function (el, db) {
        var admin = Sistema.usuario().perfil === 'Administrador';
        var m = /busca=([^&]+)/.exec(location.hash);
        if (m) { location.replace('#busca?q=' + m[1]); return; }   // endereço antigo da busca
        var abaUrl = /aba=(\w+)/.exec(location.hash);
        if (abaUrl) { estado.aba = abaUrl[1]; history.replaceState(null, '', '#relatorios'); }
        var abas = [['granja', 'Granja'], ['benef', 'Beneficiamento'], ['colab', 'Colaboradoras']].concat(admin ? [['registro', 'Registro de alterações']] : []);
        if (!abas.some(function (a) { return a[0] === estado.aba; })) estado.aba = 'granja';
        var daAba = Object.keys(RELS).filter(function (k) { return RELS[k].aba === estado.aba; });
        if (daAba.indexOf(estado.rel) < 0) estado.rel = daAba[0];
        var grupos = daAba.map(function (k) { return RELS[k].grupo; }).filter(function (g, i, a) { return a.indexOf(g) === i; });

        var f = { de: estado.periodo.de, ate: estado.periodo.ate, lote: estado.lote };
        var rel = RELS[estado.rel], d = rel.gerar(db, f);
        var folha = UI.cabecalhoFolha(rel.nome, 'Período: ' + D.br(f.de) + ' a ' + D.br(f.ate) + (f.lote !== 'todos' ? ' · Lote ' + f.lote : '') + ' · Emitido por ' + Sistema.usuario().nome, rel.pac) +
            '<table><tr>' + d.resumo.map(function (x) { return '<th>' + h(x[0]) + '</th>'; }).join('') + '</tr><tr>' + d.resumo.map(function (x) { return '<td><b>' + x[1] + '</b></td>'; }).join('') + '</tr></table>' +
            UI.tabela(d.cab, d.linhas, 'Nenhum lançamento neste período.').replace('class="tabela"', '') +
            (estado.aba === 'colab' ? '<div class="assinaturas"><div><span></span>Responsável pelo lote</div><div><span></span>Conferido pela gestão</div></div>' : '');

        el.innerHTML = '<div class="cabecalho"><div><h1>Relatórios</h1><p>Escolha um relatório para ver como fica, pronto para imprimir.</p></div></div>' +
            '<div class="abas nao-imprimir">' + abas.map(function (a) { return '<button class="' + (estado.aba === a[0] ? 'ativo' : '') + '" data-aba="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>' +
            /* 1º escolhe o relatório (separado por assunto) */
            '<div class="card nao-imprimir"><h2>1 · Escolha o relatório</h2><div class="rel-grupos">' + grupos.map(function (g) {
                return '<section class="rel-grupo"><h3>' + h(g) + '</h3>' + daAba.filter(function (k) { return RELS[k].grupo === g; }).map(function (k) {
                    var on = k === estado.rel;
                    return '<button class="rel-botao' + (on ? ' ativo' : '') + '" data-rel="' + k + '" aria-pressed="' + on + '"><b>' + h(RELS[k].nome) + '</b><span>' + h(RELS[k].desc) + '</span></button>';
                }).join('') + '</section>';
            }).join('') + '</div></div>' +
            /* 2º o período e o lote */
            '<div class="card nao-imprimir"><h2>2 · Período e lote</h2>' + UI.periodoHTML(estado.periodo).replace('<div class="card nao-imprimir">', '<div>').replace(/<\/div>$/, '') +
                '<label style="max-width:320px;margin-top:12px">Lote<select data-lote><option value="todos">Todos os lotes</option>' +
                D.lotesAtivos(db).map(function (l) { return '<option value="' + h(l.lote) + '"' + (estado.lote === String(l.lote) ? ' selected' : '') + '>' + h(D.nomeLote(db, l.lote)) + '</option>'; }).join('') + '</select></label></div></div>' +
            '<div class="card"><h2 class="nao-imprimir">3 · ' + h(rel.nome) + '</h2><div class="folha" data-folha>' + folha + '</div>' +
            '<div class="acoes"><button class="btn" data-imprimir>Imprimir</button><button class="btn alt" data-imprimir>Salvar em PDF</button><button class="btn alt" data-csv>Baixar CSV</button></div>' +
            '<p class="nota">Em “Imprimir”, escolha “Salvar como PDF” no destino para gerar o arquivo.</p></div>';

        UI.ligarPeriodo(el, estado.periodo, Sistema.atualizar);
        UI.ligar(el, '[data-aba]', 'click', function (e, b) { estado.aba = b.dataset.aba; Sistema.atualizar(); });
        UI.ligar(el, '[data-rel]', 'click', function (e, b) { estado.rel = b.dataset.rel; Sistema.atualizar(); });
        UI.ligar(el, '[data-lote]', 'change', function (e, s) { estado.lote = s.value; Sistema.atualizar(); });
        UI.ligar(el, '[data-imprimir]', 'click', function () { UI.imprimirFolha($('[data-folha]', el).innerHTML); });
        UI.ligar(el, '[data-csv]', 'click', function () { UI.baixarCSV('relatorio-' + estado.rel, d.cab, d.linhas); });
    } });
})();
