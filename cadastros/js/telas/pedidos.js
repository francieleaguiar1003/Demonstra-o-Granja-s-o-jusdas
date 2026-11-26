/* =========================================================
   ERP Ovo Caipira · PEDIDOS E ROMANEIO
   ---------------------------------------------------------
   Pedido salvo → aparece no Romaneio → escolhe os lotes →
   imprime → "Fechar e dar baixa" tira do estoque.

   Organização deste arquivo:
     1. Pedidos (quadro A entregar · Entregue) + e-mail
     2. Formulário do pedido (cliente + itens, lembrete e estoque)
     3. Romaneio: preenchimento (motorista, placa, lotes do MAIS ANTIGO para o mais novo)
     4. Romaneio: documento para imprimir (PAC 16, folha em pé)
     5. Romaneio: salvar, fechar (pode fechar com diferença) e dar baixa
     6. Norma PAC e dias de validade
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var S = 'Beneficiamento';
    var SITUACAO_TAG = { 'A entregar': 'atencao', 'Entregue': 'ok' };
    /* "Em separação" saiu (a empresa não tem um setor de separação): conta como A entregar */
    var situacaoDe = function (p) { return p.situacao === 'Entregue' ? 'Entregue' : 'A entregar'; };

    /* RESUMO DO ESTOQUE para quem faz o pedido:
       pronto para entregar − já pedido (em aberto) = disponível para vender */
    function resumoEstoque(db, idEditando) {
        var abertos = db.pedidos.filter(function (p) { return p.situacao !== 'Entregue' && p.id !== idEditando; });
        var linhas = db.produtos.map(function (prod) {
            var pronto = D.prontoDoProduto(db, prod.nome);
            var pedido = abertos.reduce(function (s, p) { return s + n(D.lerJSON(p.itens, {})[prod.nome]); }, 0);
            if (pronto == null) return null;
            var livre = pronto - pedido, min = n(prod.estoque_minimo);
            var sit = livre <= 0 ? UI.tag('Sem saldo para vender', 'erro') : min && livre <= min ? UI.tag('Abaixo do mínimo (' + fmt(min) + ')', 'atencao') : UI.tag('Disponível', 'ok');
            return '<div class="estoque-item"><b>' + h(prod.curto || prod.nome) + '</b><span class="estoque-num">' + fmt(Math.max(0, livre)) + '</span><small>pronto ' + fmt(pronto) + ' · já pedido ' + fmt(pedido) + '</small>' + sit + '</div>';
        }).filter(Boolean);
        return '<div class="card"><div class="card-titulo"><h2>Estoque disponível para venda</h2><a class="btn alt pequeno" href="#b-estoque">Ver Produção embalada</a></div>' +
            '<p class="nota" style="margin:0 0 12px">Pronto para entregar menos o que já está pedido e ainda não foi entregue.</p>' +
            (linhas.length ? '<div class="estoque-resumo">' + linhas.join('') + '</div>' : '<p class="vazio">Cadastre os produtos para ver o estoque.</p>') + '</div>';
    }

    /* E-mail do pedido: abre o e-mail do aparelho já preenchido para o cliente */
    function linkEmail(db, p) {
        var c = db.clientes.find(function (x) { return x.nome === p.cliente; }) || {};
        var itens = D.lerJSON(p.itens, {});
        var corpo = 'Olá, ' + p.cliente + '!\n\nSegue o pedido nº ' + p.numero + ' do ' + CONFIG.SITIO + ':\n\n' +
            Object.keys(itens).filter(function (k) { return n(itens[k]) > 0; }).map(function (k) { return '• ' + fmt(itens[k]) + ' × ' + k; }).join('\n') +
            '\n\nEntrega prevista: ' + D.br(p.entrega) + (p.observacao ? '\nObservação: ' + p.observacao : '') + '\n\nObrigado!';
        return 'mailto:' + encodeURIComponent(c.email || '') + '?subject=' + encodeURIComponent('Pedido nº ' + p.numero + ' · ' + CONFIG.SITIO) + '&body=' + encodeURIComponent(corpo);
    }


    /* =====================================================
       1. PEDIDOS
       ===================================================== */
    Sistema.tela('b-pedidos', { desenhar: function (el, db) {
        var pedidos = db.pedidos.slice().sort(function (a, b) { return n(b.numero) - n(a.numero); });
        var admin = Sistema.usuario().perfil === 'Administrador';
        var colunas = ['A entregar', 'Entregue'].map(function (sit) {
            var lista = pedidos.filter(function (p) { return situacaoDe(p) === sit; }).slice(0, sit === 'Entregue' ? 6 : 50);
            return '<section class="quadro-coluna"><h2>' + sit + ' ' + UI.tag(String(pedidos.filter(function (p) { return situacaoDe(p) === sit; }).length), SITUACAO_TAG[sit]) + '</h2>' +
                (lista.map(function (p) {
                    return '<a class="cartao-pedido" style="text-decoration:none" href="#b-romaneio?n=' + p.numero + '"><b>Pedido #' + p.numero + '</b> <span style="display:inline;float:right">entrega ' + D.diaMes(p.entrega) + '</span>' +
                        '<b style="display:block;font-weight:600">' + h(p.cliente) + '</b><span>' + h(D.textoItens(db, p)) + '</span></a>';
                }).join('') || '<p class="vazio">Nenhum.</p>') + '</section>';
        }).join('');
        el.innerHTML = '<div class="cabecalho"><div><h1>Pedidos</h1><p>Cadastre o pedido do cliente. Tudo o que for pedido aparece no Romaneio para separar e imprimir.</p></div>' +
            '<div class="acoes" style="margin:0"><button class="btn" data-novo>+ Novo pedido</button></div></div>' +
            resumoEstoque(db) +
            '<div class="quadro">' + colunas + '</div>' +
            '<div class="card"><h2>Todos os pedidos</h2>' + UI.tabela(['Pedido', 'Cliente', 'Itens', 'Pedido em', 'Entrega', 'Situação', 'Lançado por', ''], pedidos.map(function (p) {
                return ['#' + p.numero, h(p.cliente), h(D.textoItens(db, p)), D.diaMes(p.data_pedido), D.diaMes(p.entrega), UI.tag(situacaoDe(p), SITUACAO_TAG[situacaoDe(p)]) + (p.diferenca ? ' ' + UI.tag('com diferença', 'erro') : ''), '<span class="nota" style="margin:0">' + h(p.lancado_por) + '</span>',
                    '<span class="acoes-linha"><a class="btn pequeno" href="#b-romaneio?n=' + p.numero + '">Romaneio</a><a class="btn alt pequeno" href="' + linkEmail(db, p) + '">E-mail</a>' +
                    (p.situacao !== 'Entregue' ? '<button class="btn alt pequeno" data-editar="' + h(p.id) + '">Editar</button>' : '') +
                    (admin ? '<button class="btn perigo pequeno" data-excluir="' + h(p.id) + '" aria-label="Excluir">✕</button>' : '') + '</span>'];
            }), 'Nenhum pedido lançado.') + '</div>';
        UI.ligar(el, '[data-novo]', 'click', function () { formPedido(db, null); });
        UI.ligar(el, '[data-editar]', 'click', function (e, b) { formPedido(db, db.pedidos.find(function (p) { return p.id === b.dataset.editar; })); });
        UI.ligar(el, '[data-excluir]', 'click', async function (e, b) {
            if (!UI.confirmar('Excluir este pedido?')) return;
            await API.excluir('pedidos', b.dataset.excluir, S); UI.avisar('Pedido excluído'); Sistema.atualizar();
        });
    } });


    /* =====================================================
       2. FORMULÁRIO DO PEDIDO
       Itens = linhas de produto + quantidade (pode adicionar mais).
       ===================================================== */
    function linhaItem(db, produto, qtd) {
        return '<div class="linha-lote"><select data-produto>' + db.produtos.map(function (p) { return '<option' + (p.nome === produto ? ' selected' : '') + '>' + h(p.nome) + '</option>'; }).join('') + '</select>' +
            '<input type="number" min="0" inputmode="numeric" placeholder="Quantidade" data-qtd value="' + (qtd || '') + '">' +
            '<button type="button" class="btn alt" data-remover aria-label="Remover">✕</button><small class="nota" data-estoque style="grid-column:1/-1;margin:0"></small></div>';
    }
    /* Mostra embaixo de cada item quanto tem pronto e avisa abaixo do mínimo */
    /* Disponível para vender = pronto para entregar − o que já está pedido em outros pedidos abertos */
    function disponivel(db, nome, idEditando) {
        var pronto = D.prontoDoProduto(db, nome);
        if (pronto == null) return null;
        var pedido = db.pedidos.filter(function (p) { return p.situacao !== 'Entregue' && p.id !== idEditando; })
            .reduce(function (s, p) { return s + n(D.lerJSON(p.itens, {})[nome]); }, 0);
        return pronto - pedido;
    }
    /* Mostra embaixo de cada item se a quantidade está EXCEDENDO O ESTOQUE disponível.
       Devolve a lista do que excede (para a mensagem ao salvar). */
    function avisarEstoque(db, f, idEditando) {
        var somas = {}, excede = [];
        UI.$$('.linha-lote', f).forEach(function (l) { var nome = $('[data-produto]', l).value; somas[nome] = n(somas[nome]) + n($('[data-qtd]', l).value); });
        UI.$$('.linha-lote', f).forEach(function (l) {
            var nome = $('[data-produto]', l).value, cad = db.produtos.find(function (p) { return p.nome === nome; }) || {};
            var livre = disponivel(db, nome, idEditando), alvo = $('[data-estoque]', l), q = somas[nome];
            if (livre == null) { alvo.innerHTML = ''; return; }
            var passa = q > Math.max(0, livre), baixo = cad.estoque_minimo && livre - q <= n(cad.estoque_minimo);
            if (passa && excede.indexOf(nome) < 0) excede.push(nome);
            alvo.innerHTML = passa ? '<b style="color:var(--er-t)">Excedendo o estoque: pediu ' + fmt(q) + ', disponível ' + fmt(Math.max(0, livre)) + ' (faltam ' + fmt(q - Math.max(0, livre)) + ')</b>'
                : 'Disponível: ' + fmt(livre) + (cad.estoque_minimo ? ' · mínimo ' + fmt(cad.estoque_minimo) : '') + (baixo ? ' · <b style="color:var(--at-t, #9a6b00)">fica abaixo do mínimo</b>' : '');
        });
        var faixa = $('[data-excede]', f);
        if (faixa) faixa.innerHTML = excede.length ? '<p class="faixa erro" style="margin:12px 0 0"><b>Este pedido está excedendo o estoque</b> de ' + excede.map(h).join(', ') + '. Dá para salvar, mas vai faltar produto para entregar.</p>' : '';
        return excede.map(function (nome) { return nome + ': pediu ' + fmt(somas[nome]) + ', disponível ' + fmt(Math.max(0, disponivel(db, nome, idEditando))); });
    }
    function mostrarLembrete(db, f) {
        var c = db.clientes.find(function (x) { return x.nome === f.cliente.value; }) || {};
        $('[data-lembrete]', f).innerHTML = c.lembrete ? '<p class="faixa atencao" style="margin:12px 0 0"><b>Lembrete do cliente:</b> ' + h(c.lembrete) + '</p>' : '';
    }
    function formPedido(db, pedido) {
        if (!db.clientes.length) { UI.avisar('Cadastre um cliente antes de fazer o pedido.'); location.hash = 'clientes'; return; }
        var itens = pedido ? D.lerJSON(pedido.itens, {}) : {};
        var linhas = Object.keys(itens).map(function (k) { return linhaItem(db, k, itens[k]); }).join('') || linhaItem(db, (db.produtos[0] || {}).nome, '');
        UI.abrirJanela({
            tabela: 'pedidos', titulo: pedido ? 'Editar pedido #' + pedido.numero : 'Novo pedido',
            campos: ['numero', 'cliente', 'data_pedido', 'entrega', 'observacao'], soLer: ['numero'],
            valores: pedido || { numero: D.proximoPedido(db), cliente: db.clientes[0].nome, data_pedido: D.hoje(), entrega: D.somarDias(D.hoje(), 1) },
            extra: '<div style="grid-column:1/-1">' + resumoEstoque(db, pedido && pedido.id).replace('<div class="card">', '<div class="card" style="margin:0;box-shadow:none">') + '</div>' +
                '<div data-lembrete style="grid-column:1/-1"></div><div class="bloco-lotes" style="margin-top:16px"><b>Itens do pedido</b><div data-itens>' + linhas + '</div><button type="button" class="btn alt pequeno" data-mais>+ Adicionar item</button><div data-excede></div></div>' +
                '<p class="nota">Ao salvar, o pedido já fica disponível no Romaneio, com os mesmos produtos e quantidades.</p>',
            aoAbrir: function (f) {
                f.addEventListener('click', function (e) {
                    if (e.target.matches('[data-mais]')) $('[data-itens]', f).insertAdjacentHTML('beforeend', linhaItem(db, (db.produtos[0] || {}).nome, ''));
                    if (e.target.matches('[data-remover]')) e.target.parentNode.remove();
                    avisarEstoque(db, f, pedido && pedido.id);
                });
                f.addEventListener('input', function () { avisarEstoque(db, f, pedido && pedido.id); });
                f.addEventListener('change', function (e) { if (e.target.name === 'cliente') mostrarLembrete(db, f); avisarEstoque(db, f, pedido && pedido.id); });
                avisarEstoque(db, f, pedido && pedido.id); mostrarLembrete(db, f);
            },
            aoSalvar: async function (v, f) {
                var lista = {};
                UI.$$('.linha-lote', f).forEach(function (l) { var q = n($('[data-qtd]', l).value); if (q) { var p = $('[data-produto]', l).value; lista[p] = n(lista[p]) + q; } });
                if (!Object.keys(lista).length) throw new Error('Adicione pelo menos um produto com quantidade.');
                var excede = avisarEstoque(db, f, pedido && pedido.id);
                if (excede.length && !confirm('Este pedido está excedendo o estoque disponível:\n\n' + excede.join('\n') + '\n\nSalvar assim mesmo?')) throw new Error('Pedido não salvo: está excedendo o estoque. Ajuste as quantidades.');
                v.itens = JSON.stringify(lista);
                if (!pedido) { v.situacao = 'A entregar'; v.lotes = ''; }
                await API.salvar('pedidos', v, pedido && pedido.id, S, (pedido ? 'Editou o pedido #' : 'Novo pedido #') + v.numero + ' · ' + v.cliente);
                UI.avisar('Pedido #' + v.numero + ' salvo · já está no Romaneio');
                Sistema.atualizar();
            }
        });
    }


    /* =====================================================
       3. ROMANEIO: PREENCHIMENTO
       ===================================================== */
    var rom = null;   // { numero, motorista, placa, conferido_por, lotes: { produto: [[lote, qtd], ...] } }

    /* Lotes com saldo do produto, do MAIS ANTIGO para o mais novo
       (sai primeiro o ovo mais velho: na segunda, sexta → sábado → domingo) */
    function lotesComSaldo(db, produto) {
        var chave = D.chaveDoProduto(db, produto);
        return D.estoque(db).filter(function (e) { return chave && n(e.qtd[chave]) > 0; })
            .sort(function (a, b) { return String(a.data).localeCompare(String(b.data)) || String(a.lote).localeCompare(String(b.lote)); });
    }
    /* Preenche a quantidade do pedido pegando do lote mais antigo e passando para o seguinte */
    function preencherAntigos(db, produto, qtd) {
        var chave = D.chaveDoProduto(db, produto), falta = n(qtd), out = [];
        lotesComSaldo(db, produto).forEach(function (e) {
            if (falta <= 0) return;
            var usa = Math.min(falta, n(e.qtd[chave]));
            out.push([e.lote, usa]); falta -= usa;
        });
        return out;
    }
    function carregarRom(db, numero) {
        var p = db.pedidos.find(function (x) { return String(x.numero) === String(numero); });
        if (!p) { rom = null; return null; }
        if (!rom || String(rom.numero) !== String(p.numero)) {
            var lotes = D.lerJSON(p.lotes, {}), itens = D.lerJSON(p.itens, {});
            Object.keys(itens).forEach(function (prod) {
                if (!lotes[prod]) lotes[prod] = preencherAntigos(db, prod, itens[prod]);
            });
            rom = { numero: p.numero, motorista: p.motorista || '', placa: p.placa || '', conferido_por: p.conferido_por || '', lotes: lotes };
        }
        return p;
    }

    Sistema.tela('b-romaneio', { desenhar: function (el, db) {
        var m = /n=(\d+)/.exec(location.hash);
        var abertos = db.pedidos.filter(function (p) { return p.situacao !== 'Entregue'; }).sort(function (a, b) { return n(a.numero) - n(b.numero); });
        var numero = m ? m[1] : rom ? rom.numero : (abertos[0] || db.pedidos[0] || {}).numero;
        var p = carregarRom(db, numero);
        var norma = ((db.config || []).find(function (c) { return c.chave === 'norma_pach'; }) || {}).valor || '';

        if (!p) {
            el.innerHTML = '<div class="cabecalho"><div><h1>Romaneio de entregas</h1></div></div><div class="card"><p class="vazio">Lance um pedido na tela Pedidos para montar o romaneio.</p></div>';
            return;
        }
        var itens = D.lerJSON(p.itens, {});
        var fechado = p.situacao === 'Entregue';
        var opcoesPedido = db.pedidos.slice().sort(function (a, b) { return n(b.numero) - n(a.numero); }).map(function (x) {
            return '<option value="' + x.numero + '"' + (String(x.numero) === String(p.numero) ? ' selected' : '') + '>#' + x.numero + ' · ' + h(x.cliente) + ' · ' + h(x.situacao) + '</option>';
        }).join('');
        var cliente = db.clientes.find(function (c) { return c.nome === p.cliente; }) || {};

        var blocos = Object.keys(itens).filter(function (k) { return n(itens[k]) > 0; }).map(function (prod) {
            var disponiveis = lotesComSaldo(db, prod);
            var escolhidos = rom.lotes[prod] || [];
            var soma = escolhidos.reduce(function (s, l) { return s + n(l[1]); }, 0);
            var chave = D.chaveDoProduto(db, prod);
            return '<div class="bloco-lotes"><b>' + h(prod) + ' · pedido de ' + fmt(itens[prod]) + '</b>' +
                escolhidos.map(function (l, i) {
                    var opts = disponiveis.map(function (e) { return '<option value="' + h(e.lote) + '"' + (e.lote === l[0] ? ' selected' : '') + '>' + h(e.lote) + ' · postura ' + D.diaMes(e.data) + ' · saldo ' + fmt(e.qtd[chave]) + '</option>'; }).join('');
                    if (l[0] && !disponiveis.some(function (e) { return e.lote === l[0]; })) opts = '<option selected>' + h(l[0]) + '</option>' + opts;
                    return '<div class="linha-lote"><select data-rom-lote="' + h(prod) + '|' + i + '"' + (fechado ? ' disabled' : '') + '>' + opts + '</select>' +
                        '<input type="number" min="0" data-rom-qtd="' + h(prod) + '|' + i + '" value="' + h(l[1]) + '"' + (fechado ? ' disabled' : '') + '>' +
                        (fechado ? '' : '<button class="btn alt" data-rom-remover="' + h(prod) + '|' + i + '" aria-label="Remover">✕</button>') + '</div>';
                }).join('') +
                (!chave ? '<p class="nota">Este produto não sai da máquina: o romaneio sai sem lote.</p>' : !disponiveis.length && !escolhidos.length ? '<p class="nota">Ainda não há este produto no estoque. Salve uma produção no Beneficiamento. O romaneio pode ser impresso com os lotes em branco.</p>' : '') +
                (fechado || !chave ? '' : '<span class="acoes-linha">' + (escolhidos.length >= 6 ? '' : '<button class="btn alt pequeno" data-rom-mais="' + h(prod) + '">+ Adicionar lote</button>') +
                    '<button class="btn alt pequeno" data-rom-antigos="' + h(prod) + '">Refazer pelo mais antigo</button></span>') +
                '<p class="nota" style="color:' + (soma === n(itens[prod]) ? 'var(--ok-t)' : 'var(--er-t)') + '">' + (soma === n(itens[prod]) ? 'Soma dos lotes confere com o pedido' : 'Soma dos lotes: ' + fmt(soma) + ' de ' + fmt(itens[prod])) + '</p></div>';
        }).join('');

        el.innerHTML = '<div class="cabecalho"><div><h1>Romaneio de entregas</h1><p>Escolha o pedido: o romaneio sai só com os produtos e códigos daquele pedido.</p></div>' +
            '<div class="acoes" style="margin:0"><a class="btn alt" href="#b-pedidos">← Pedidos</a></div></div>' +
            '<div class="lado-a-lado"><div class="estreito">' +
                '<div class="card nao-imprimir"><label>Pedido<select data-escolher-pedido>' + opcoesPedido + '</select></label>' +
                '<p class="nota">' + h(p.cliente) + ' · cód. ' + h(cliente.codigo || '—') + ' · entrega ' + D.br(p.entrega) + (p.observacao ? ' · Obs.: ' + h(p.observacao) : '') + ' · ' + UI.tag(situacaoDe(p), SITUACAO_TAG[situacaoDe(p)]) + '</p>' +
                '<div class="form" style="margin-top:12px">' +
                    '<label>Motorista<input data-rom="motorista" value="' + h(rom.motorista) + '"' + (fechado ? ' disabled' : '') + '></label>' +
                    '<label>Placa do veículo<input data-rom="placa" value="' + h(rom.placa) + '"' + (fechado ? ' disabled' : '') + '></label>' +
                    '<label>Conferido por<input data-rom="conferido_por" value="' + h(rom.conferido_por) + '"' + (fechado ? ' disabled' : '') + '></label></div>' +
                '<h2 style="margin:16px 0 8px">Lotes de cada produto</h2>' + blocos +
                (fechado ? '<p class="faixa ' + (p.diferenca ? 'atencao' : 'ok') + '">Pedido fechado em ' + D.br(p.fechado_em) + '. A baixa no estoque já foi feita.' + (p.diferenca ? '<br><b>Fechado com diferença:</b> ' + h(p.diferenca) : '') + '</p>' :
                    '<div class="acoes"><button class="btn alt" data-rom-salvar>Salvar preenchimento</button><button class="btn" data-rom-fechar>Fechar e dar baixa</button></div>') + '</div>' +
                '<div class="card nao-imprimir"><h2>Norma PAC</h2><label>Texto que sai no romaneio e nos relatórios<input data-norma value="' + h(norma) + '"></label><div class="acoes"><button class="btn alt" data-salvar-norma>Atualizar</button></div>' +
                    '<label style="margin-top:12px">Validade do ovo (dias a partir da postura)<select data-validade>' + [30, 31].map(function (d) { return '<option' + (D.diasValidade(db) === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
                    '<div class="acoes"><button class="btn alt" data-salvar-validade>Salvar validade</button></div></div>' +
            '</div><div class="largo"><div class="card-titulo"><h2>Documento do romaneio (é isto que sai na impressão)</h2><span class="acoes-linha"><a class="btn alt" href="' + linkEmail(db, p) + '">Enviar por e-mail</a><button class="btn" data-rom-imprimir>Imprimir romaneio</button></span></div>' +
            '<div class="folha romaneio-folha" data-folha></div><p class="nota">Os lotes vêm do <b>mais antigo</b> para o mais novo. Validade = data do lote + ' + D.diasValidade(db) + ' dias. Até 6 lotes por produto.</p></div></div>';

        desenharFolha(el, db, p, norma);

        /* --- eventos --- */
        var par = function (txt) { var x = txt.split('|'); return [x[0], Number(x[1])]; };
        UI.ligar(el, '[data-escolher-pedido]', 'change', function (e, s) { location.hash = 'b-romaneio?n=' + s.value; });
        UI.ligar(el, '[data-rom]', 'input', function (e, i) { rom[i.dataset.rom] = i.value; desenharFolha(el, db, p, norma); });
        UI.ligar(el, '[data-rom-lote]', 'change', function (e, s) { var k = par(s.dataset.romLote); rom.lotes[k[0]][k[1]][0] = s.value; desenharFolha(el, db, p, norma); });
        UI.ligar(el, '[data-rom-qtd]', 'change', function (e, i) { var k = par(i.dataset.romQtd); rom.lotes[k[0]][k[1]][1] = n(i.value); Sistema.atualizar(); });
        UI.ligar(el, '[data-rom-remover]', 'click', function (e, b) { var k = par(b.dataset.romRemover); rom.lotes[k[0]].splice(k[1], 1); Sistema.atualizar(); });
        UI.ligar(el, '[data-rom-mais]', 'click', function (e, b) {
            var prod = b.dataset.romMais, usados = (rom.lotes[prod] || []).map(function (x) { return x[0]; });
            var l = lotesComSaldo(db, prod).find(function (e) { return usados.indexOf(e.lote) < 0; });
            (rom.lotes[prod] = rom.lotes[prod] || []).push([l ? l.lote : '', 0]); Sistema.atualizar();
        });
        UI.ligar(el, '[data-rom-antigos]', 'click', function (e, b) { var prod = b.dataset.romAntigos; rom.lotes[prod] = preencherAntigos(db, prod, itens[prod]); Sistema.atualizar(); });
        UI.ligar(el, '[data-salvar-validade]', 'click', async function () {
            var atual = (db.config || []).find(function (c) { return c.chave === 'validade_dias'; }), dias = $('[data-validade]', el).value;
            await API.salvar('config', { chave: 'validade_dias', valor: dias }, atual && atual.id, S, 'Validade do ovo: ' + dias + ' dias');
            UI.avisar('Validade: ' + dias + ' dias a partir da postura'); Sistema.atualizar();
        });
        UI.ligar(el, '[data-rom-imprimir]', 'click', function () { UI.imprimirFolha($('[data-folha]', el).innerHTML, 'romaneio-folha'); API.registrar(S, 'Imprimiu o romaneio do pedido #' + p.numero); });
        UI.ligar(el, '[data-rom-salvar]', 'click', function () { salvarRom(p, false); });
        UI.ligar(el, '[data-rom-fechar]', 'click', function () { fecharRom(db, p); });
        UI.ligar(el, '[data-salvar-norma]', 'click', function () { salvarNorma(db, $('[data-norma]', el).value); });
    } });


    /* =====================================================
       4. ROMANEIO: DOCUMENTO PARA IMPRIMIR
       ===================================================== */
    function desenharFolha(el, db, p, norma) {
        var itens = D.lerJSON(p.itens, {});
        var cliente = db.clientes.find(function (c) { return c.nome === p.cliente; }) || {};
        var linhas = Object.keys(itens).filter(function (k) { return n(itens[k]) > 0; }).map(function (prod) {
            var cad = db.produtos.find(function (x) { return x.nome === prod; }) || {};
            var lotes = (rom.lotes[prod] || []).filter(function (l) { return l[0]; });
            var qtd = Math.max(1, lotes.length);
            var html = '';
            for (var i = 0; i < qtd; i++) {
                var l = lotes[i];
                var est = l && D.estoque(db).find(function (e) { return e.lote === l[0]; });
                html += '<tr>' + (i === 0 ? '<td rowspan="' + qtd + '"><b>' + fmt(itens[prod]) + '</b></td><td rowspan="' + qtd + '">' + h(prod) + '</td><td rowspan="' + qtd + '">' + UI.codigoBarras(cad.codigo_barras) + '</td>' : '') +
                    (l ? '<td>' + h(l[0]) + '</td><td>' + fmt(l[1]) + '</td><td>' + (est ? D.br(D.validade(est.data, db)) : '') + '</td>' : '<td class="vazio"></td><td class="vazio"></td><td class="vazio"></td>') + '</tr>';
            }
            return html;
        }).join('');
        $('[data-folha]', el).innerHTML =
            '<div class="cabeca"><img src="img/logo.png" alt="Logo Ovo Caipira"><div><h2>Romaneio de Entregas <span class="tag">PAC 16</span></h2><div class="miuda">' + h(CONFIG.SITIO) + ' · ' + h(D.PAC['b-romaneio']) + ' · Plano de Autocontrole</div></div></div>' +
            '<table><tr><th>Data da entrega</th><th>Cliente</th><th>Cód. cliente</th><th>Pedido</th></tr><tr><td>' + D.br(p.entrega) + '</td><td>' + h(p.cliente) + '</td><td>' + h(cliente.codigo || '') + '</td><td>' + p.numero + '</td></tr></table>' +
            '<table><tr><th>Motorista</th><th>Placa do veículo</th><th>Conferido por</th></tr><tr><td class="vazio">' + h(rom.motorista) + '</td><td class="vazio">' + h(rom.placa) + '</td><td class="vazio">' + h(rom.conferido_por) + '</td></tr></table>' +
            '<table><tr><th>Qtde</th><th>Produto</th><th>Cód. de barras</th><th>Lote</th><th>Qtde lote</th><th>Validade</th></tr>' + linhas + '</table>' +
            (p.observacao ? '<p class="rodape"><b>Observação do pedido:</b> ' + h(p.observacao) + '</p>' : '') +
            (p.diferenca ? '<p class="rodape"><b>Fechado com diferença:</b> ' + h(p.diferenca) + '</p>' : '') +
            '<p class="rodape"><b>Norma PAC:</b> ' + (norma ? h(norma) : '________________') + '</p>' +
            /* Espaço para preencher à caneta depois (a nota fiscal sai em outro sistema) */
            '<div class="a-caneta"><div><span>Nº da nota fiscal</span><i></i></div><div><span>Data da nota</span><i></i></div><div><span>Controle interno</span><i></i></div>' +
            '<div><span>Conferido na saída por</span><i></i></div><div><span>Recebido por (cliente)</span><i></i></div><div><span>Data e hora da entrega</span><i></i></div>' +
            '<div class="largo-caneta"><span>Observações da entrega</span><i></i><i></i><i></i></div></div>';
    }


    /* =====================================================
       5. ROMANEIO: SALVAR, FECHAR E DAR BAIXA
       ===================================================== */
    async function salvarRom(p, fechar, diferenca) {
        var v = { motorista: rom.motorista, placa: rom.placa, conferido_por: rom.conferido_por, lotes: JSON.stringify(rom.lotes) };
        if (fechar) { v.situacao = 'Entregue'; v.fechado_em = D.hoje(); v.diferenca = diferenca || ''; }
        else if (p.situacao !== 'Entregue') v.situacao = 'A entregar';
        await API.salvar('pedidos', v, p.id, S, (fechar ? 'Fechou o pedido #' : 'Preencheu o romaneio do pedido #') + p.numero + (fechar ? ' e deu baixa no estoque' + (diferenca ? ' (com diferença: ' + diferenca + ')' : '') : ''));
        UI.avisar(fechar ? 'Pedido #' + p.numero + ' fechado e baixa feita no estoque' : 'Romaneio do pedido #' + p.numero + ' salvo');
        Sistema.atualizar();
    }
    function fecharRom(db, p) {
        var itens = D.lerJSON(p.itens, {});
        var est = D.estoque(db), difs = [];
        for (var prod in itens) {
            if (!n(itens[prod]) || !D.chaveDoProduto(db, prod)) continue;
            var lotes = (rom.lotes[prod] || []).filter(function (l) { return l[0]; });
            var soma = lotes.reduce(function (s, l) { return s + n(l[1]); }, 0);
            if (soma !== n(itens[prod])) difs.push(prod + ': ' + fmt(soma) + ' de ' + fmt(itens[prod]));
            var chave = D.chaveDoProduto(db, prod);
            for (var i = 0; i < lotes.length; i++) {
                var e = est.find(function (x) { return x.lote === lotes[i][0]; });
                var saldo = e ? n(e.qtd[chave]) : 0;
                if (n(lotes[i][1]) > saldo) { UI.avisar('O lote ' + lotes[i][0] + ' só tem ' + saldo + ' de ' + prod + ' no estoque.'); return; }
            }
        }
        /* Contagem não bateu: dá para fechar mesmo assim, deixando a diferença registrada */
        var diferenca = '';
        if (difs.length) {
            if (!UI.confirmar('A soma dos lotes não bate com o pedido:\n' + difs.join('\n') + '\n\nFechar mesmo assim? A diferença fica registrada no pedido e no romaneio.')) return;
            var motivo = window.prompt('Motivo da diferença (ex.: faltou produto, cliente pediu menos):', '') || '';
            diferenca = difs.join(' · ') + (motivo.trim() ? ' · Motivo: ' + motivo.trim() : '');
        } else if (!UI.confirmar('Fechar o pedido #' + p.numero + ' e tirar os produtos do estoque?')) return;
        salvarRom(p, true, diferenca);
    }


    /* =====================================================
       6. NORMA PAC (sai no romaneio e nos relatórios)
       ===================================================== */
    async function salvarNorma(db, texto) {
        var atual = (db.config || []).find(function (c) { return c.chave === 'norma_pach'; });
        await API.salvar('config', { chave: 'norma_pach', valor: texto.trim() }, atual && atual.id, S, 'Atualizou a norma PAC');
        UI.avisar('Norma PAC atualizada em todos os locais');
        Sistema.atualizar();
    }
    window.salvarNormaPach = salvarNorma;
})();
