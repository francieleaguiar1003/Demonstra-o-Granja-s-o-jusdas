/* =========================================================
   ERP Ovo Caipira · CADASTROS
   ---------------------------------------------------------
   Organização deste arquivo:
     1. Clientes (com "Compras": o que cada cliente comprou
        e o que dá para oferecer a mais)
     2. Produtos (com código de barras)
     3. Linhagens (curvas de postura dos guias)
     4. Usuários (quem entra, o que vê e quais lotes)
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, n = UI.n, $ = UI.$;
    var S = 'Cadastros';


    /* =====================================================
       1. CLIENTES
       ===================================================== */
    /* ----- 1a. Compras do cliente -----
       Soma os pedidos do cliente por produto e cruza com o que
       está pronto para entregar (Produção embalada). */
    function prontoPorProduto(db) {
        var porChave = {};
        D.estoque(db).forEach(function (e) { Object.keys(e.qtd).forEach(function (k) { porChave[k] = n(porChave[k]) + Math.max(0, n(e.qtd[k])); }); });
        var out = {};
        db.produtos.forEach(function (p) { out[p.nome] = p.maquina ? n(porChave[p.maquina]) : null; });
        return out;
    }
    function comprasDoCliente(db, cliente) {
        var pedidos = db.pedidos.filter(function (p) { return p.cliente === cliente.nome; })
            .sort(function (a, b) { return String(b.data_pedido).localeCompare(String(a.data_pedido)); });
        var porProduto = {};
        pedidos.forEach(function (p) {
            var itens = D.lerJSON(p.itens, {});
            Object.keys(itens).forEach(function (nome) {
                if (n(itens[nome]) <= 0) return;
                var x = porProduto[nome] || (porProduto[nome] = { nome: nome, entregue: 0, aberto: 0, pedidos: 0, ultima: '' });
                if (p.situacao === 'Entregue') x.entregue += n(itens[nome]); else x.aberto += n(itens[nome]);
                x.pedidos++;
                if (String(p.data_pedido) > x.ultima) x.ultima = p.data_pedido;
            });
        });
        return { pedidos: pedidos, produtos: Object.keys(porProduto).map(function (k) { return porProduto[k]; }).sort(function (a, b) { return (b.entregue + b.aberto) - (a.entregue + a.aberto); }) };
    }
    function janelaCompras(db, cliente) {
        var c = comprasDoCliente(db, cliente), pronto = prontoPorProduto(db);
        var curto = function (nome) { var p = db.produtos.find(function (x) { return x.nome === nome; }); return p && p.curto ? p.curto : nome; };
        var qtdPronto = function (nome) { return pronto[nome] == null ? UI.tag('Fora da máquina', 'neutra') : pronto[nome] > 0 ? UI.tag(fmt(pronto[nome]) + ' prontos', 'ok') : UI.tag('Sem estoque agora', 'atencao'); };
        var ultimo = c.pedidos[0];

        var comprou = c.produtos.map(function (x) {
            return ['<b>' + h(curto(x.nome)) + '</b>', fmt(x.entregue), x.aberto ? UI.tag(fmt(x.aberto) + ' a entregar', 'atencao') : '—', fmt(x.pedidos), D.br(x.ultima), qtdPronto(x.nome)];
        });
        var nomesComprados = c.produtos.map(function (x) { return x.nome; });
        var sugestoes = db.produtos.filter(function (p) { return nomesComprados.indexOf(p.nome) < 0; })
            .sort(function (a, b) { return n(pronto[b.nome]) - n(pronto[a.nome]); })
            .map(function (p) { return ['<b>' + h(p.curto || p.nome) + '</b>', fmt(p.ovos) + ' ovos', qtdPronto(p.nome), 'Nunca comprou'] ; });
        /* também sugere o que ele já comprou mas não veio no último pedido */
        if (ultimo) {
            var noUltimo = Object.keys(D.lerJSON(ultimo.itens, {}));
            c.produtos.filter(function (x) { return noUltimo.indexOf(x.nome) < 0; }).forEach(function (x) {
                var p = db.produtos.find(function (y) { return y.nome === x.nome; }) || {};
                sugestoes.push(['<b>' + h(curto(x.nome)) + '</b>', p.ovos ? fmt(p.ovos) + ' ovos' : '—', qtdPronto(x.nome), 'Já comprou, mas não veio no último pedido']);
            });
        }

        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<div class="janela" style="max-width:860px;width:100%">' +
            '<h2>Compras · ' + h(cliente.nome) + '</h2>' +
            '<p class="nota" style="margin:0 0 16px">' + (c.pedidos.length ? fmt(c.pedidos.length) + ' pedido(s) · último em ' + D.br(ultimo.data_pedido) + ' (' + h(ultimo.situacao) + ')' : 'Este cliente ainda não fez pedidos.') + '</p>' +
            '<h3 class="subtitulo">O que já comprou</h3>' +
            UI.tabela(['Produto', { t: 'Entregue', num: 1 }, 'Em aberto', { t: 'Pedidos', num: 1 }, 'Última vez', 'Pronto para entregar'], comprou, 'Nenhuma compra ainda.') +
            '<h3 class="subtitulo">O que poderia adicionar</h3>' +
            '<p class="nota" style="margin:0 0 8px">Produtos para oferecer no próximo pedido, com o que está pronto agora na Produção embalada.</p>' +
            UI.tabela(['Produto', 'Embalagem', 'Pronto para entregar', 'Por quê'], sugestoes, 'Este cliente já compra todos os produtos cadastrados.') +
            '<div class="acoes"><button class="btn alt" type="button" data-fechar>Fechar</button></div></div>';
        document.body.appendChild(fundo);
        var fechar = function () { fundo.remove(); document.removeEventListener('keydown', esc); };
        var esc = function (e) { if (e.key === 'Escape') fechar(); };
        document.addEventListener('keydown', esc);
        fundo.addEventListener('click', function (e) { if (e.target === fundo || e.target.hasAttribute('data-fechar')) fechar(); });
    }

    function proximoCodigo(db) { return String(Math.max.apply(null, [0].concat(db.clientes.map(function (c) { return n(c.codigo); }))) + 1).padStart(4, '0'); }
    CadastroPadrao('clientes', {
        tabela: 'clientes', sistema: S, titulo: 'Clientes', botaoNovo: '+ Novo cliente', tituloLista: 'Clientes cadastrados',
        sub: 'Cadastro de clientes. Em "Compras" você vê o que cada cliente comprou e o que dá para oferecer a mais.',
        ordenar: function (a, b) { return String(a.codigo).localeCompare(String(b.codigo)); },
        colunas: [{ t: 'Código', v: function (r) { return h(r.codigo); } }, { t: 'Nome', v: function (r) { return '<b>' + h(r.nome) + '</b>'; } },
            { t: 'CPF / CNPJ', v: function (r) { return h(r.cnpj); } }, { t: 'Tipo', v: function (r) { return h(r.tipo || '—'); } }, { t: 'Cidade', v: function (r) { return h(r.cidade); } }, { t: 'Telefone', v: function (r) { return h(r.telefone); } },
            { t: 'Lembrete', quebra: 1, v: function (r) { return r.lembrete ? '<small>' + h(r.lembrete) + '</small>' : '—'; } },
            { t: 'Pedidos', num: 1, v: function (r, db) { return fmt(db.pedidos.filter(function (p) { return p.cliente === r.nome; }).length); } }],
        novo: function (db) { return { codigo: proximoCodigo(db) }; },
        soLer: ['codigo'],   // o código sai sozinho (o próximo número)
        extraFormulario: function () { return '<p class="nota" data-cep-aviso style="grid-column:1/-1;margin:0">Digite o CEP: a rua, o bairro e a cidade vêm sozinhos (depois é só pôr o número).</p>'; },
        /* CEP → rua, bairro e cidade (consulta o ViaCEP, serviço público e gratuito dos Correios) */
        aoAbrir: function (f) {
            var aviso = f.querySelector('[data-cep-aviso]'), ultimo = f.cep.value.replace(/\D/g, '');
            var buscar = async function () {
                var cep = f.cep.value.replace(/\D/g, '');
                if (cep.length !== 8 || cep === ultimo) return;
                ultimo = cep;
                f.cep.value = cep.slice(0, 5) + '-' + cep.slice(5);
                aviso.textContent = 'Buscando o CEP…';
                try {
                    var r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
                    var d = await r.json();
                    if (d.erro) { aviso.textContent = 'CEP não encontrado. Confira os números ou preencha à mão.'; return; }
                    if (d.logradouro) f.endereco.value = d.logradouro + (f.endereco.value.match(/,\s*\d+.*$/) || [', '])[0];
                    if (d.bairro) f.bairro.value = d.bairro;
                    f.cidade.value = d.localidade + '/' + d.uf;
                    aviso.textContent = 'Endereço encontrado. Complete o número em "Rua e número".';
                    f.endereco.focus();
                } catch (e) { aviso.textContent = 'Sem internet para buscar o CEP agora. Preencha à mão.'; }
            };
            /* CPF/CNPJ: confere na hora em que sai do campo */
            var docAviso = document.createElement('small'); docAviso.className = 'nota'; docAviso.style.margin = '2px 0 0';
            f.cnpj.closest('label').appendChild(docAviso);
            var conferirDoc = function () {
                var d = f.cnpj.value.replace(/\D/g, '');
                if (!d) { docAviso.textContent = ''; return; }
                var p = D.problemaDocumento(d);
                docAviso.textContent = p || ('✓ ' + (d.length === 11 ? 'CPF' : 'CNPJ') + ' válido');
                docAviso.style.color = p ? 'var(--er-t)' : 'var(--ok-t)';
            };
            f.cnpj.addEventListener('blur', conferirDoc);
            f.cnpj.addEventListener('input', function () { var d = f.cnpj.value.replace(/\D/g, ''); if (d.length === 11 || d.length === 14) conferirDoc(); else docAviso.textContent = ''; });
            f.cep.setAttribute('inputmode', 'numeric'); f.cep.setAttribute('placeholder', '00000-000');
            f.cep.addEventListener('change', buscar);
            f.cep.addEventListener('input', function () { if (f.cep.value.replace(/\D/g, '').length === 8) buscar(); });
        },
        validar: function (v, db, id) {
            if (db.clientes.some(function (c) { return c.id !== id && c.codigo === v.codigo; })) throw new Error('Já existe um cliente com o código ' + v.codigo + '.');
            var prob = D.problemaDocumento(v.cnpj);
            if (prob) throw new Error(prob);
        },
        descrever: function (v) { return v.nome; },
        podeExcluir: function (id, db) {
            var c = db.clientes.find(function (x) { return x.id === id; });
            return c && db.pedidos.some(function (p) { return p.cliente === c.nome; }) ? 'Este cliente tem pedidos e não pode ser excluído.' : '';
        },
        acoesLinha: function (r) { return '<button class="btn pequeno" data-compras="' + h(r.id) + '">Compras</button>'; },
        ligar: function (el, db) {
            UI.ligar(el, '[data-compras]', 'click', function (e, b) {
                janelaCompras(db, db.clientes.find(function (x) { return x.id === b.dataset.compras; }));
            });
        }
    });


    /* =====================================================
       2. PRODUTOS
       ===================================================== */
    CadastroPadrao('produtos', {
        tabela: 'produtos', sistema: S, titulo: 'Produtos', botaoNovo: '+ Novo produto', tituloLista: 'Produtos cadastrados',
        sub: 'Embalagens vendidas, com código de barras. "Sai da máquina como" liga o produto ao Beneficiamento e ao estoque.',
        ordenar: function (a, b) { return String(a.nome).localeCompare(String(b.nome)); },
        colunas: [{ t: 'Produto', v: function (r) { return '<b>' + h(r.nome) + '</b>'; } }, { t: 'Nome público', v: function (r) { return h(r.curto); } },
            { t: 'Ovos', num: 1, v: function (r) { return fmt(r.ovos); } }, { t: 'Código de barras', v: function (r) { return UI.codigoBarras(r.codigo_barras); } },
            { t: 'Pronto / mínimo', v: function (r, db) {
                var p = D.prontoDoProduto(db, r.nome); if (p == null) return '—';
                return (r.estoque_minimo && p <= n(r.estoque_minimo) ? UI.tag(fmt(p) + ' · abaixo de ' + fmt(r.estoque_minimo), 'erro') : fmt(p) + (r.estoque_minimo ? ' / ' + fmt(r.estoque_minimo) : ''));
            } },
            { t: 'Máquina', v: function (r) { return r.maquina ? UI.tag(r.maquina, 'ok') : UI.tag('Não', 'neutra'); } }],
        extraFormulario: function () { return '<div class="acoes" style="margin:8px 0 0"><button type="button" class="btn alt pequeno" data-gerar-ean>Gerar o 13º número (dígito verificador)</button></div><div data-previa style="margin-top:12px"></div>'; },
        aoAbrir: function (f) {
            /* Digita os 12 primeiros números e o sistema calcula o último */
            $('[data-gerar-ean]', f).addEventListener('click', function () {
                var d = f.codigo_barras.value.replace(/\D/g, '').slice(0, 12), dig = D.digitoEAN(d);
                if (dig == null) { UI.avisar('Digite os 12 primeiros números do código.'); return; }
                f.codigo_barras.value = d.charAt(0) + ' ' + d.slice(1, 7) + ' ' + d.slice(7, 12) + dig;
                f.codigo_barras.dispatchEvent(new Event('input'));
            });
            var previa = function () { $('[data-previa]', f).innerHTML = /^\D*(\d\D*){12,13}$/.test(f.codigo_barras.value) ? UI.codigoBarras(f.codigo_barras.value) : '<span class="nota">Digite os 12 ou 13 números para ver o código de barras.</span>'; };
            f.codigo_barras.addEventListener('input', previa); previa();
        },
        validar: function (v, db, id) {
            var d = String(v.codigo_barras).replace(/\D/g, '');
            if (d.length !== 12 && d.length !== 13) throw new Error('O código de barras precisa ter 12 ou 13 números.');
            if (d.length === 13 && D.digitoEAN(d.slice(0, 12)) !== Number(d[12])) throw new Error('O último número do código de barras não confere (o certo seria ' + D.digitoEAN(d.slice(0, 12)) + '). Use "Gerar o 13º número".');
            if (db.produtos.some(function (p) { return p.id !== id && p.nome === v.nome; })) throw new Error('Já existe um produto com esse nome.');
            if (!v.curto) v.curto = v.nome;
        },
        descrever: function (v) { return v.nome; }
    });


    /* =====================================================
       3. LINHAGENS
       ===================================================== */
    CadastroPadrao('linhagens', {
        tabela: 'linhagens', sistema: 'Granja', titulo: 'Linhagens', botaoNovo: '+ Nova linhagem',
        sub: 'Curvas padrão de postura de cada linhagem (guias de manejo). Formato: semana:% separado por ponto e vírgula, ex.: 19:1,0; 20:14,8',
        ordenar: function (a, b) { return String(a.linhagem).localeCompare(String(b.linhagem)); },
        colunas: [{ t: 'Linhagem', v: function (r) { return '<b>' + h(r.linhagem) + '</b>'; } },
            { t: 'Semanas na curva', v: function (r) { var c = D.lerCurva(r.curva_postura); return c.length ? c[0][0] + ' a ' + c[c.length - 1][0] : '—'; } },
            { t: 'Pico de postura', num: 1, v: function (r) { var c = D.lerCurva(r.curva_postura); return c.length ? Math.max.apply(null, c.map(function (x) { return x[1]; })).toLocaleString('pt-BR') + '%' : '—'; } },
            { t: 'Lotes', num: 1, v: function (r, db) { return fmt(db.lotes.filter(function (l) { return l.linhagem === r.linhagem; }).length); } },
            { t: 'Observação', quebra: 1, v: function (r) { return h(r.observacao); } }],
        validar: function (v, db, id) {
            if (db.linhagens.some(function (l) { return l.id !== id && l.linhagem === v.linhagem; })) throw new Error('Esta linhagem já está cadastrada.');
            ['curva_postura', 'curva_peso'].forEach(function (k) {
                var partes = String(v[k] || '').split(/[;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
                if (partes.length !== D.lerCurva(v[k]).length) throw new Error('Curva com formato errado. Use semana:valor separado por ponto e vírgula (ex.: 19:1; 20:10).');
            });
        },
        descrever: function (v) { return v.linhagem; }
    });


    /* =====================================================
       4. USUÁRIOS (igual à página de cadastro de usuários do sistema antigo)
       Só o administrador entra aqui. Em cima o formulário (novo ou editar),
       com o que a pessoa pode acessar marcado tela por tela, em 3 caixas:
       Granja · Beneficiamento (+ Cadastros) · Colaboradoras da granja.
       Embaixo a lista, com filtro por sistema.
       ===================================================== */
    var filtroUsuarios = 'todos', editandoUsuario = null;

    /* As 3 caixas e as telas de cada uma (as mesmas do menu) */
    function caixasAcesso() {
        /* telas que só o administrador vê não aparecem para marcar */
        var sis = function (id) { return D.SISTEMAS.find(function (s) { return s.id === id; }).telas.filter(function (t) { return D.SO_ADMIN.indexOf(t[0]) < 0; }); };
        return [
            { id: 'granja', nome: 'Granja', sub: 'Lançamentos da granja (lá em cima)', telas: sis('granja'), lotes: true,
                nota: 'Colaboradoras: marque só <b>Entrada dos ovos</b> e <b>Mortalidade e abate</b>.' },
            { id: 'benef', nome: 'Beneficiamento', sub: 'Embalagens até produção embalada', telas: sis('benef'),
                nota: '<b>Pedidos, Romaneio, Cadastros, Relatórios, Alertas e Tarefas</b> são só dos administradores.' },
            { id: 'colab', nome: 'Colaboradoras da granja', sub: 'Página separada · área das colaboradoras', telas: D.TELAS_COLAB,
                nota: '"Trocar senha" fica sempre liberado. A coleta e a mortalidade da página delas usam o acesso de <b>Entrada dos ovos</b> e <b>Mortalidade e abate</b> da Granja.<br><br>' +
                    'Quem tem o perfil <b>Colaboradora</b> entra direto na página das colaboradoras.' }
        ];
    }
    function telasDaCaixa(c) { return c.telas.concat(c.extra ? c.extra.telas : []).map(function (t) { return t[0]; }); }
    function resumoCaixa(u, c, db) {
        var lista = D.acessosDe(u), todas = telasDaCaixa(c).filter(function (t) { return t !== 'usuarios'; });
        if (u.perfil === 'Administrador') return UI.tag('Todas as telas', 'ok') + (c.lotes ? '<br><small class="nota" style="margin:0">Lotes: Todos</small>' : '');
        var tem = todas.filter(function (t) { return lista.indexOf(t) >= 0; });
        if (!tem.length) return '<span class="nota" style="margin:0">Sem acesso</span>';
        var nomes = tem.map(function (t) { var c = D.TELAS_COLAB.find(function (x) { return x[0] === t; }); return c ? c[1] : Sistema.nomeDaTela(t); });
        return UI.tag(tem.length === todas.length ? 'Todas as telas' : tem.length + ' de ' + todas.length + ' telas', tem.length === todas.length ? 'ok' : 'neutra') +
            '<br><small class="nota" style="margin:0">' + (tem.length === todas.length ? '' : h(nomes.join(', '))) + (c.lotes ? (tem.length === todas.length ? '' : ' · ') + 'Lotes: ' + h(u.lotes || 'Todos') : '') + '</small>';
    }

    /* Saiu da tela de usuários (ou apertou Esc): fecha a janela do usuário */
    window.addEventListener('hashchange', function () { if (!/^#usuarios/.test(location.hash)) editandoUsuario = null; });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && editandoUsuario && /^#usuarios/.test(location.hash) && document.querySelector('[data-form-usuario]')) { editandoUsuario = null; Sistema.atualizar(); }
    });

    Sistema.tela('usuarios', { desenhar: function (el, db) {
        /* editandoUsuario: null = janela fechada · 'novo' = novo usuário · id = editando */
        var u = editandoUsuario && editandoUsuario !== 'novo' ? db.usuarios.find(function (x) { return x.id === editandoUsuario; }) : null;
        if (editandoUsuario && editandoUsuario !== 'novo' && !u) editandoUsuario = null;
        var caixas = caixasAcesso();
        var marcadas = u ? D.acessosDe(u) : D.acessosPadrao('Granja e Beneficiamento');
        var lotesMarcados = String((u && u.lotes) || 'Todos').split(',').map(function (x) { return x.trim(); });
        var caixa = function (t) {
            var so = t[0] === 'usuarios';
            return '<label class="marcar acesso-item' + (so ? ' so-admin' : '') + '"><input type="checkbox" data-acesso="' + t[0] + '"' + (marcadas.indexOf(t[0]) >= 0 ? ' checked' : '') + '> ' + h(t[1]) +
                (so ? ' <small>(só Administrador)</small>' : '') + '</label>';
        };
        var htmlCaixas = caixas.map(function (c) {
            return '<div class="acesso-caixa" data-caixa="' + c.id + '"><label class="acesso-topo"><input type="checkbox" data-caixa-toda="' + c.id + '"><span><b>' + h(c.nome) + '</b><small>' + h(c.sub) + '</small></span></label>' +
                '<div class="acesso-itens">' + c.telas.map(caixa).join('') + '</div>' +
                (c.extra ? '<p class="acesso-sub">' + h(c.extra.nome) + '</p><div class="acesso-itens">' + c.extra.telas.map(caixa).join('') + '</div>' : '') +
                (c.nota ? '<p class="nota" style="margin:12px 0 0">' + c.nota + '</p>' : '') +
                (c.lotes ? '<p class="acesso-sub">Lotes das aves</p><label class="marcar acesso-item" style="margin-bottom:8px"><input type="checkbox" data-todos-lotes' + (lotesMarcados[0] === 'Todos' ? ' checked' : '') + '> <b>Todos os lotes</b> (para quem cobre lotes de outras pessoas)</label>' +
                    '<div class="acesso-itens">' + (D.lotesAtivos(db).map(function (l) {
                        return '<label class="marcar acesso-item acesso-lote"><input type="checkbox" data-lote value="' + h(l.lote) + '"' + (lotesMarcados.indexOf(String(l.lote)) >= 0 ? ' checked' : '') + '> Lote ' + h(l.lote) + ' <small>' + h(l.linhagem) + '</small></label>';
                    }).join('') || '<p class="nota" style="margin:0">Nenhum lote de aves cadastrado ainda.</p>') + '</div>' : '') + '</div>';
        }).join('');

        /* Lista */
        var lista = db.usuarios.slice().sort(function (a, b) { return String(a.perfil).localeCompare(String(b.perfil)) || String(a.nome).localeCompare(String(b.nome)); });
        var temCaixa = function (x, c) { return x.perfil === 'Administrador' || telasDaCaixa(c).some(function (t) { return D.acessosDe(x).indexOf(t) >= 0; }); };
        var filtros = [['todos', 'Todos']].concat(caixas.map(function (c) { return [c.id, c.nome]; }));
        var conta = function (f) { return lista.filter(function (x) { return f === 'todos' || temCaixa(x, caixas.find(function (c) { return c.id === f; })); }).length; };
        var linhas = lista.filter(function (x) { return filtroUsuarios === 'todos' || temCaixa(x, caixas.find(function (c) { return c.id === filtroUsuarios; })); }).map(function (x) {
            return [h(x.nome), x.usuario ? h(x.usuario) : '<small class="nota" style="margin:0">sem login · entra pelo <b>coleta</b></small>', h(x.perfil)].concat(caixas.map(function (c) { return resumoCaixa(x, c, db); })).concat([
                UI.tag(x.situacao, x.situacao === 'Ativo' ? 'ok' : 'erro'),
                '<button class="btn alt pequeno" data-editar="' + h(x.id) + '">Editar</button>']);
        });
        var registro = db.alteracoes.slice(0, 40).map(function (a) { return [D.diaMes(a.data), h(a.hora), h(a.sistema), h(a.quem), h(a.o_que)]; });

        /* O formulário abre numa janela (popup) por cima da lista */
        var janela = !editandoUsuario ? '' : '<div class="janela-fundo"><form class="janela janela-larga" data-form-usuario novalidate>' +
                '<div class="janela-cabeca"><h2>' + (u ? 'Editar usuário · ' + h(u.nome) : 'Novo usuário') + '</h2><button type="button" class="btn alt pequeno" data-cancelar aria-label="Fechar">✕</button></div>' +
                '<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">' +
                    '<label>Nome<input name="nome" value="' + h(u ? u.nome : '') + '"></label>' +
                    '<label>Usuário (login)' + (D.modoDemonstracao() ? ' <small class="nota" style="margin:0">(colaboradora: vazio = entra pelo login coleta)</small>' : '') + '<input name="usuario" autocomplete="off" value="' + h(u ? u.usuario : '') + '"' + (u && u.usuario ? ' readonly' : '') + '></label>' +
                    '<label>' + (u ? 'Nova senha provisória (vazio = não muda)' : 'Senha provisória') + '<span class="senha-olho"><input type="password" name="senha" autocomplete="new-password" minlength="6">' +
                        '<button type="button" class="btn alt pequeno" data-olho>Mostrar</button></span></label>' +
                    '<label>Perfil<select name="perfil">' + ['Administrador', 'Granja e Beneficiamento', 'Colaboradora'].map(function (p) { return '<option' + ((u ? u.perfil : 'Granja e Beneficiamento') === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
                    (u ? '<label>Situação<select name="situacao">' + ['Ativo', 'Bloqueado'].map(function (p) { return '<option' + (u.situacao === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' : '') +
                '</div>' +
                '<h3 class="subtitulo">O que este usuário pode acessar</h3>' +
                '<p class="nota" style="margin:0 0 12px">O Painel aparece para todos. Marque cada sistema separadamente. Ao trocar o perfil, vêm marcadas as telas de costume (dá para mudar). O <b>Administrador</b> vê tudo.</p>' +
                '<div class="acesso-caixas">' + htmlCaixas + '</div>' +
                '<p class="faixa erro" data-msg hidden></p>' +
                '<div class="acoes"><button class="btn" type="submit">Salvar usuário</button><button class="btn alt" type="button" data-marcar="1">Marcar todos</button><button class="btn alt" type="button" data-marcar="0">Desmarcar todos</button>' +
                    (u ? '<button class="btn alt" type="button" data-senha-inicial>Voltar à senha inicial</button>' : '') + '<button class="btn alt" type="button" data-cancelar>Cancelar</button></div></form></div>';

        el.innerHTML = '<div class="cabecalho"><div><h1>Cadastro de usuários</h1><p>Quem acessa o sistema e o que cada um pode ver.</p></div>' +
                '<div class="acoes" style="margin:0"><button class="btn" type="button" data-novo-usuario>+ Novo usuário</button></div></div>' +
            '<div class="card"><div class="card-titulo"><h2>Usuários</h2><div class="chips">' + filtros.map(function (f) {
                return '<button class="chip' + (filtroUsuarios === f[0] ? ' ativo' : '') + '" data-filtro="' + f[0] + '">' + f[1] + ' <b>' + conta(f[0]) + '</b></button>';
            }).join('') + '</div></div>' +
                UI.tabela(['Nome', 'Usuário', 'Perfil'].concat(caixas.map(function (c) { return { t: c.nome, quebra: 1 }; })).concat(['Situação', '']), linhas) + '</div>' +
            '<div class="card"><h2>Registro de lançamentos e alterações (quem mexeu em quê)</h2>' + UI.tabela(['Dia', 'Hora', 'Sistema', 'Quem', { t: 'O que mudou', quebra: 1 }], registro) + '</div>' +
            janela;

        UI.ligar(el, '[data-novo-usuario]', 'click', function () { editandoUsuario = 'novo'; Sistema.atualizar(); });
        UI.ligar(el, '[data-filtro]', 'click', function (e, b) { filtroUsuarios = b.dataset.filtro; Sistema.atualizar(); });
        UI.ligar(el, '[data-editar]', 'click', function (e, b) { editandoUsuario = b.dataset.editar; Sistema.atualizar(); });

        var f = $('[data-form-usuario]', el);
        if (!f) return;   // janela fechada: só a lista
        var primeiro = f.querySelector(u ? 'select[name=perfil]' : 'input[name=nome]'); if (primeiro) primeiro.focus();
        var ajustar = function () {
            var admin = f.perfil.value === 'Administrador';
            UI.$$('[data-acesso]', f).forEach(function (c) { if (admin) c.checked = true; c.disabled = admin || (c.dataset.acesso === 'usuarios'); if (c.dataset.acesso === 'usuarios') c.checked = admin; });
            caixas.forEach(function (c) {
                var cx = UI.$$('[data-caixa="' + c.id + '"] [data-acesso]', f).filter(function (i) { return i.dataset.acesso !== 'usuarios'; });
                var on = cx.filter(function (i) { return i.checked; }).length;
                var topo = $('[data-caixa-toda="' + c.id + '"]', f);
                topo.checked = on === cx.length; topo.indeterminate = on > 0 && on < cx.length; topo.disabled = admin;
                $('[data-caixa="' + c.id + '"]', f).classList.toggle('ativa', on > 0);
            });
            var todos = $('[data-todos-lotes]', f);
            UI.$$('[data-lote]', f).forEach(function (c) { c.disabled = todos.checked || admin; });
        };
        ajustar();
        f.addEventListener('change', function (e) {
            var t = e.target;
            if (t.name === 'perfil') { var p = D.acessosPadrao(t.value); UI.$$('[data-acesso]', f).forEach(function (c) { c.checked = p.indexOf(c.dataset.acesso) >= 0; }); }
            if (t.dataset.caixaToda) UI.$$('[data-caixa="' + t.dataset.caixaToda + '"] [data-acesso]', f).forEach(function (c) { if (c.dataset.acesso !== 'usuarios') c.checked = t.checked; });
            ajustar();
        });
        UI.ligar(f, '[data-marcar]', 'click', function (e, b) { UI.$$('[data-acesso]', f).forEach(function (c) { if (c.dataset.acesso !== 'usuarios') c.checked = b.dataset.marcar === '1'; }); ajustar(); });
        UI.ligar(f, '[data-olho]', 'click', function (e, b) { var ver = f.senha.type === 'password'; f.senha.type = ver ? 'text' : 'password'; b.textContent = ver ? 'Ocultar' : 'Mostrar'; });
        UI.ligar(f, '[data-cancelar]', 'click', function () { editandoUsuario = null; Sistema.atualizar(); });
        /* Esqueceu a senha: só o administrador volta para a senha inicial (a que foi entregue no cadastro) */
        UI.ligar(f, '[data-senha-inicial]', 'click', async function (e, b) {
            if (!confirm('Voltar a senha de ' + u.nome + ' para a senha inicial?')) return;
            b.disabled = true;
            var r = await API.senhaInicial(u.id);
            UI.avisar(r.ok ? 'A senha de ' + u.nome + ' voltou para a senha inicial' : r.erro); b.disabled = false;
            if (r.ok) Sistema.atualizar();
        });
        f.addEventListener('submit', async function (e) {
            e.preventDefault();
            var msg = $('[data-msg]', f), bt = f.querySelector('[type=submit]');
            try {
                var v = { nome: f.nome.value.trim(), usuario: String(f.usuario.value).toLowerCase().replace(/\s+/g, ''), perfil: f.perfil.value, situacao: f.situacao ? f.situacao.value : 'Ativo' };
                if (!v.nome) throw new Error('Informe o nome.');
                /* Demonstração: colaboradora pode ficar sem login próprio (entra pelo login coleta) */
                var semLogin = D.modoDemonstracao() && v.perfil === 'Colaboradora' && !v.usuario;
                if (!v.usuario && !semLogin) throw new Error('Informe o usuário (login).');
                if (v.usuario && db.usuarios.some(function (x) { return x.id !== (u && u.id) && x.usuario === v.usuario; })) throw new Error('Já existe o usuário "' + v.usuario + '".');
                var senha = f.senha.value;
                if (!semLogin && (!u || !u.usuario || senha) && senha.length < 6) throw new Error('A senha provisória precisa ter pelo menos 6 caracteres.');
                if (senha) v.senha = senha;
                var telas = UI.$$('[data-acesso]', f).filter(function (c) { return c.checked && c.dataset.acesso !== 'usuarios'; }).map(function (c) { return c.dataset.acesso; });
                if (v.perfil !== 'Administrador' && !telas.length) throw new Error('Marque pelo menos uma tela que a pessoa pode acessar.');
                v.acessos = v.perfil === 'Administrador' ? 'Todos' : telas.join(', ');
                var lotes = UI.$$('[data-lote]', f).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
                v.lotes = $('[data-todos-lotes]', f).checked || !lotes.length ? 'Todos' : lotes.join(', ');
                if (u && u.id === Sistema.usuario().id && v.perfil !== 'Administrador') throw new Error('Você não pode tirar o seu próprio perfil de Administrador.');
                bt.disabled = true;
                await API.salvar('usuarios', v, u && u.id, 'Acesso', (u ? 'Editou o usuário ' : 'Cadastrou o usuário ') + v.nome + ' · ' + v.perfil);
                editandoUsuario = null; UI.avisar('Usuário salvo'); Sistema.atualizar();
            } catch (err) { msg.textContent = err.message; msg.hidden = false; bt.disabled = false; }
        });
    } });
})();
