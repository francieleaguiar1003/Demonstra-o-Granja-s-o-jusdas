/* =========================================================
   ERP Ovo Caipira · CONFIGURAÇÕES (só o administrador)
   ---------------------------------------------------------
   As listas da granja que antes só mudavam no código. Cada
   bloco grava uma chave na aba Config; enquanto a granja não
   mexer, vale o padrão escrito em js/dominio.js (bloco 1).

   Para abrir uma lista nova: acrescente a chave em
   Dominio.CONFIG_LISTAS e um bloco em BLOCOS, aqui embaixo.

   Organização deste arquivo:
     1. Os blocos (o que aparece na tela)
     2. Desenhar a tela
     3. Salvar e voltar ao padrão
   ========================================================= */
(function () {
    'use strict';
    var D = Dominio, h = UI.h, fmt = UI.fmt, $ = UI.$;
    var S = 'Configurações';


    /* =====================================================
       1. OS BLOCOS
       tipo: 'lista' (um item por linha) · 'numero' · 'texto'
       ===================================================== */
    function textoProtocoloPadrao() {
        return D.PROTOCOLO_VACINAS.map(function (p) { return p[0] + ' - ' + p[1]; }).join('\n');
    }
    var BLOCOS = [
        {
            chave: 'motivos_mortalidade', titulo: 'Motivos de morte', tipo: 'lista', linhas: 9,
            onde: 'Mortalidade e abate · área das colaboradoras',
            ajuda: 'Um motivo por linha, na ordem em que você quer que apareçam. O primeiro da lista já vem marcado para a colaboradora.',
            nota: 'Se você tirar um motivo, os lançamentos antigos continuam com o motivo que foi escolhido no dia — só não aparece mais para escolher.'
        },
        {
            chave: 'checklist_lote', titulo: 'Checklist do lote', tipo: 'lista', linhas: 14,
            onde: 'Checklist do dia · um para cada lote',
            ajuda: 'Uma pergunta por linha. A colaboradora responde Conforme ou Não conforme em cada uma.',
            nota: 'Cada checklist salvo guarda a lista que valia no dia, então mudar aqui não altera o que já foi respondido.'
        },
        {
            chave: 'checklist_geral', titulo: 'Checklist de serviços gerais', tipo: 'lista', linhas: 14,
            onde: 'Checklist do dia · vestiário, sala de coleta e áreas comuns',
            ajuda: 'Uma pergunta por linha, igual ao checklist do lote.',
            nota: 'Cada checklist salvo guarda a lista que valia no dia, então mudar aqui não altera o que já foi respondido.'
        },
        {
            chave: 'semanas_descarte', titulo: 'Semanas até o descarte', tipo: 'numero',
            onde: 'Cadastro do lote · campo "Descarte previsto"',
            ajuda: 'Quantas semanas de vida a ave costuma cumprir até o descarte. O sistema soma esse tempo à data de nascimento do lote (ou à chegada, quando não há nascimento) e sugere a data.',
            nota: 'A data sugerida continua podendo ser mudada à mão em cada lote. Mexer aqui não muda os lotes já cadastrados.'
        },
        {
            chave: 'protocolo_vacinas', titulo: 'Protocolo de vacinas', tipo: 'texto', linhas: 12,
            onde: 'Ficha do lote · vacinas e ficha controle',
            ajuda: 'Uma vacina por linha, no formato <b>idade em dias - nome da vacina</b>. A data prevista de cada lote sai sozinha (nascimento + idade).',
            nota: 'É a mesma lista do botão "Protocolo de vacinas" em Cadastros › Lotes das aves.',
            padrao: textoProtocoloPadrao
        }
    ];
    function padraoDe(b) {
        if (b.padrao) return b.padrao();
        if (b.tipo === 'numero') return String(D.SEMANAS_DESCARTE);
        return (D.CONFIG_LISTAS[b.chave] || []).join('\n');
    }
    function linhaDaConfig(db, chave) { return (db.config || []).find(function (c) { return c.chave === chave; }); }
    /* O que está valendo agora: o que a granja salvou ou, se não salvou nada, o padrão */
    function valorAtual(db, b) {
        var v = D.valorConfig(db, b.chave).trim();
        return v || padraoDe(b);
    }
    function ajustado(db, b) { return !!D.valorConfig(db, b.chave).trim(); }
    function contarItens(texto) {
        return String(texto || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).length;
    }


    /* =====================================================
       2. DESENHAR A TELA
       ===================================================== */
    Sistema.tela('configuracoes', { desenhar: function (el, db) {
        var cartoes = BLOCOS.map(function (b) {
            var valor = valorAtual(db, b), mexido = ajustado(db, b);
            var campo = b.tipo === 'numero'
                ? '<input type="number" min="1" max="300" inputmode="numeric" data-campo="' + b.chave + '" value="' + h(valor) + '" style="max-width:140px">'
                : '<textarea data-campo="' + b.chave + '" rows="' + (b.linhas || 10) + '" style="width:100%;font:inherit">' + h(valor) + '</textarea>';
            return '<div class="card" data-bloco="' + b.chave + '">' +
                '<div class="card-titulo"><h2>' + h(b.titulo) + '</h2>' +
                    (mexido ? UI.tag('Ajustado pela granja', 'ok') : UI.tag('Padrão do sistema', 'neutra')) + '</div>' +
                '<p class="nota" style="margin:0 0 4px"><b>Onde aparece:</b> ' + h(b.onde) + '</p>' +
                '<p class="nota" style="margin:0 0 12px">' + b.ajuda + '</p>' +
                campo +
                '<p class="nota" data-conta="' + b.chave + '" style="margin:6px 0 0"></p>' +
                '<p class="faixa" data-msg="' + b.chave + '" hidden></p>' +
                '<div class="acoes"><button class="btn" data-salvar="' + b.chave + '">Salvar</button>' +
                    (mexido ? '<button class="btn alt" data-padrao="' + b.chave + '">Voltar ao padrão do sistema</button>' : '') + '</div>' +
                '<p class="nota" style="margin:10px 0 0">' + h(b.nota) + '</p>' +
                '</div>';
        }).join('');

        el.innerHTML = '<div class="cabecalho"><div><h1>Configurações</h1>' +
                '<p>As listas que a granja pode mudar sozinha, sem depender de quem fez o sistema.</p></div></div>' +
            '<p class="faixa">Tudo aqui vale para o sistema inteiro e para todo mundo. O que você salvar fica guardado junto com os outros dados; para desfazer, use <b>Voltar ao padrão do sistema</b>.</p>' +
            '<div class="grade">' + cartoes + '</div>';

        /* contagem de itens, ao vivo */
        var contar = function (b) {
            var alvo = $('[data-conta="' + b.chave + '"]', el);
            if (!alvo) return;
            if (b.tipo === 'numero') {
                var v = Number($('[data-campo="' + b.chave + '"]', el).value);
                alvo.textContent = v > 0 ? 'Cerca de ' + (v / 52).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' ano(s) de vida.' : '';
            } else {
                alvo.textContent = contarItens($('[data-campo="' + b.chave + '"]', el).value) + ' ' + (b.tipo === 'lista' ? 'item(ns) na lista' : 'linha(s)');
            }
        };
        BLOCOS.forEach(contar);
        UI.ligar(el, '[data-campo]', 'input', function (e, c) {
            var b = BLOCOS.find(function (x) { return x.chave === c.dataset.campo; });
            if (b) contar(b);
        });

        UI.ligar(el, '[data-salvar]', 'click', function (e, botao) { salvar(db, botao.dataset.salvar, el, botao); });
        UI.ligar(el, '[data-padrao]', 'click', function (e, botao) { voltarAoPadrao(db, botao.dataset.padrao, el); });
    } });


    /* =====================================================
       3. SALVAR E VOLTAR AO PADRÃO
       ===================================================== */
    function avisarNoBloco(el, chave, texto, tipo) {
        var p = $('[data-msg="' + chave + '"]', el);
        p.className = 'faixa ' + (tipo || 'erro');
        p.textContent = texto;
        p.hidden = !texto;
    }

    async function salvar(db, chave, el, botao) {
        var b = BLOCOS.find(function (x) { return x.chave === chave; });
        var texto = String($('[data-campo="' + chave + '"]', el).value || '').trim();
        avisarNoBloco(el, chave, '');

        if (b.tipo === 'numero') {
            var num = Math.round(Number(texto.replace(',', '.')));
            if (!(num > 0 && num <= 300)) { avisarNoBloco(el, chave, 'Informe um número de semanas entre 1 e 300.'); return; }
            texto = String(num);
        } else {
            var itens = texto.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
            if (!itens.length) { avisarNoBloco(el, chave, 'A lista não pode ficar vazia. Para voltar à lista original, use "Voltar ao padrão do sistema".'); return; }
            var repetidos = itens.filter(function (x, i) { return itens.indexOf(x) !== i; });
            if (repetidos.length) { avisarNoBloco(el, chave, 'Item repetido na lista: "' + repetidos[0] + '".'); return; }
            if (chave === 'protocolo_vacinas') {
                var ruim = itens.filter(function (l) { return !/^\s*\d+\s*[-:–]\s*.+$/.test(l); });
                if (ruim.length) { avisarNoBloco(el, chave, 'Linha fora do formato "idade em dias - vacina": ' + ruim[0]); return; }
            }
            texto = itens.join('\n');
        }

        botao.disabled = true;
        try {
            var atual = linhaDaConfig(db, chave);
            await API.salvar('config', { chave: chave, valor: texto }, atual && atual.id, S, 'Alterou em Configurações: ' + b.titulo.toLowerCase());
            UI.avisar(b.titulo + ' · salvo');
            Sistema.atualizar();
        } catch (err) {
            avisarNoBloco(el, chave, err.message);
            botao.disabled = false;
        }
    }

    async function voltarAoPadrao(db, chave, el) {
        var b = BLOCOS.find(function (x) { return x.chave === chave; });
        if (!UI.confirmar('Voltar "' + b.titulo + '" para a lista original do sistema? O que você tinha ajustado é perdido.')) return;
        var atual = linhaDaConfig(db, chave);
        try {
            if (atual) await API.excluir('config', atual.id, S);
            await API.registrar(S, 'Voltou ao padrão do sistema: ' + b.titulo.toLowerCase());
            UI.avisar(b.titulo + ' · de volta ao padrão');
            Sistema.atualizar();
        } catch (err) { avisarNoBloco(el, chave, err.message); }
    }
})();
