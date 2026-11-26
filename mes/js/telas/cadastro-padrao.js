/* =========================================================
   ERP Ovo Caipira · TELA PADRÃO DE CADASTRO
   ---------------------------------------------------------
   Muitas telas são iguais: título, botão "+ Novo", números
   no topo, lista com busca e os botões Editar / Excluir.
   Em vez de repetir, cada uma dessas telas chama:

     CadastroPadrao('g-coletas', {
         tabela: 'coletas', sistema: 'Granja',
         titulo: 'Coletas', sub: 'Uma linha para cada coleta',
         colunas: [ { t: 'Data', v: function (r) { return ... } }, ... ],
         novo: function (db) { return { data: hoje } },   // valores iniciais
         validar: function (valores, db, id) { ... },      // erro = throw new Error('...')
         topo: function (db) { return '<div>...</div>' }   // HTML acima da lista
         classeLinha: function (r, db) { return 'linha-pendente' }   // cor da linha (opcional)
         podeEditar: function (r, db) { return true }   // esconde o Editar de uma linha (opcional)
     });

   Organização deste arquivo:
     1. Desenhar a tela
     2. Abrir o formulário (novo / editar)
     3. Excluir
   ========================================================= */
function CadastroPadrao(id, o) {
    'use strict';
    var $ = UI.$, h = UI.h;
    var busca = '';

    /* ---------- 1. DESENHAR A TELA ---------- */
    function desenhar(el, db) {
        var linhas = (db[o.tabela] || []).filter(function (r) { return !o.filtrar || o.filtrar(r, db); });
        if (o.ordenar) linhas.sort(function (a, b) { return o.ordenar(a, b, db); });
        else linhas.sort(function (a, b) { return String(b.data || b.criado_em || '').localeCompare(String(a.data || a.criado_em || '')); });

        var admin = Sistema.usuario().perfil === 'Administrador';
        var cab = o.colunas.map(function (c) { return { t: c.t, num: c.num, quebra: c.quebra }; }).concat([{ t: '' }]);
        var corpo = linhas.map(function (r) {
            return o.colunas.map(function (c) { return c.v(r, db); }).concat(['<span class="acoes-linha">' +
                (o.acoesLinha ? o.acoesLinha(r, db) : '') +
                (o.semEditar || (o.podeEditar && !o.podeEditar(r, db)) ? '' : '<button class="btn alt pequeno" data-editar="' + h(r.id) + '">Editar</button>') +
                (admin && !o.semExcluir ? '<button class="btn perigo pequeno" data-excluir="' + h(r.id) + '" aria-label="Excluir">✕</button>' : '') + '</span>']);
        });

        el.innerHTML =
            '<div class="cabecalho"><div><h1>' + h(o.titulo) + '</h1>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' +
            '<div class="acoes" style="margin:0">' + (o.botoesTopo ? o.botoesTopo(db) : '') +
            '<button class="btn alt" data-csv>Baixar CSV</button>' +
            (o.semNovo ? '' : '<button class="btn" data-novo>' + h(o.botaoNovo || '+ Novo') + '</button>') + '</div></div>' +
            (o.topo ? o.topo(db) : '') +
            '<div class="card"><div class="card-titulo"><h2>' + h(o.tituloLista || 'Lançamentos') + ' <span class="tag neutra">' + linhas.length + '</span></h2>' +
            '<input type="search" data-busca placeholder="Buscar nesta lista" value="' + h(busca) + '" style="max-width:280px;margin:0"></div>' +
            UI.tabela(cab, corpo, o.vazio, o.classeLinha ? function (i) { return o.classeLinha(linhas[i], db); } : null) + '</div>' +
            (o.rodape ? o.rodape(db) : '');

        /* busca dentro da lista */
        var filtrarLinhas = function () {
            busca = $('[data-busca]', el).value;
            UI.$$('tbody tr', el).forEach(function (tr) { tr.hidden = busca && tr.textContent.toLowerCase().indexOf(busca.toLowerCase()) < 0; });
        };
        $('[data-busca]', el).addEventListener('input', filtrarLinhas);
        if (busca) filtrarLinhas();

        UI.ligar(el, '[data-novo]', 'click', function () { formulario(db, null); });
        UI.ligar(el, '[data-editar]', 'click', function (e, b) { formulario(db, (db[o.tabela] || []).find(function (r) { return r.id === b.dataset.editar; })); });
        UI.ligar(el, '[data-excluir]', 'click', function (e, b) { excluir(b.dataset.excluir); });
        UI.ligar(el, '[data-csv]', 'click', function () { UI.baixarCSV(o.tabela, cab.slice(0, -1), corpo.map(function (l) { return l.slice(0, -1); })); });
        if (o.ligar) o.ligar(el, db);
    }

    /* ---------- 2. FORMULÁRIO (novo / editar) ---------- */
    function formulario(db, linha) {
        UI.abrirJanela({
            tabela: o.tabela,
            titulo: (linha ? 'Editar · ' : 'Novo · ') + o.titulo,
            sub: o.subFormulario,
            campos: o.campos,
            soLer: o.soLer,
            valores: linha || (o.novo ? o.novo(db) : {}),
            extra: o.extraFormulario ? o.extraFormulario(db, linha) : '',
            aoAbrir: o.aoAbrir ? function (form) { o.aoAbrir(form, db, linha); } : null,
            aoSalvar: async function (valores, form) {
                if (o.antesDeSalvar) valores = o.antesDeSalvar(valores, db, linha, form) || valores;
                if (o.validar) o.validar(valores, db, linha ? linha.id : null);
                await API.salvar(o.tabela, valores, linha ? linha.id : null, o.sistema, (linha ? 'Editou ' : 'Lançou ') + o.titulo.toLowerCase() + (o.descrever ? ' · ' + o.descrever(valores, db) : ''));
                UI.avisar(linha ? 'Alteração salva' : 'Salvo');
                Sistema.atualizar();
            }
        });
    }

    /* ---------- 3. EXCLUIR ---------- */
    async function excluir(rid) {
        if (o.podeExcluir) { var motivo = o.podeExcluir(rid, API.dados()); if (motivo) { UI.avisar(motivo); return; } }
        if (!UI.confirmar('Excluir este registro? Isso não pode ser desfeito.')) return;
        try { await API.excluir(o.tabela, rid, o.sistema); UI.avisar('Excluído'); Sistema.atualizar(); }
        catch (err) { UI.avisar(err.message); }
    }

    Sistema.tela(id, { desenhar: desenhar });
    return { formulario: formulario };
}
