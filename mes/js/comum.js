/* =========================================================
   ERP Ovo Caipira · PEÇAS COMUNS (usadas por todas as páginas)
   ---------------------------------------------------------
   Organização deste arquivo:
     1.  Atalhos (buscar elemento, números, texto seguro)
     2.  Tema claro / escuro
     3.  Aviso rápido no pé da tela
     4.  Ícones
     5.  Tabela
     6.  Gráfico de barras
     7.  Código de barras EAN-13
     8.  Janela com formulário (novo / editar)
     9.  Período (Hoje / Semana / Mês / De–Até)
     10. Impressão de folhas
     11. Proteção das páginas (precisa estar logado)
     12. Lançamentos guardados no aparelho (sem internet / não aceitos)
     13. Abrir sem internet (liga o sw.js)
   ========================================================= */
var UI = (function () {
    'use strict';
    var D = Dominio;

    /* =====================================================
       1. ATALHOS
       ===================================================== */
    function $(sel, raiz) { return (raiz || document).querySelector(sel); }
    function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
    function n(v) { return Number(v) || 0; }
    /* 1234 → "1.234" */
    function fmt(v) { return n(v).toLocaleString('pt-BR'); }
    /* 0,1234 → "12,3%" */
    function pct(parte, todo) { return todo ? (parte / todo * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—'; }
    /* Protege textos digitados antes de colocar na tela */
    function h(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }
    function tag(texto, tipo) { return '<span class="tag ' + (tipo || 'neutra') + '">' + h(texto) + '</span>'; }
    /* Liga um evento em todos os elementos que batem com o seletor */
    function ligar(raiz, sel, evento, fn) { $$(sel, raiz).forEach(function (el) { el.addEventListener(evento, function (e) { fn(e, el); }); }); }
    function dataExtenso() {
        var t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return t.charAt(0).toUpperCase() + t.slice(1);
    }
    function saudacao() { var hr = new Date().getHours(); return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite'; }


    /* =====================================================
       2. TEMA CLARO / ESCURO (fica salvo no aparelho)
       ===================================================== */
    var TEMA = ((window.API && API.PREFIXO) || '') + 'tema';   // demonstração online: um tema por site
    function aplicarTema() {
        try { if (localStorage.getItem(TEMA) === 'escuro') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) { /* sem armazenamento */ }
    }
    function trocarTema() {
        var raiz = document.documentElement;
        var escuro = raiz.getAttribute('data-theme') === 'dark';
        if (escuro) raiz.removeAttribute('data-theme'); else raiz.setAttribute('data-theme', 'dark');
        try { localStorage.setItem(TEMA, escuro ? 'claro' : 'escuro'); } catch (e) { /* sem armazenamento */ }
    }
    aplicarTema();


    /* =====================================================
       3. AVISO RÁPIDO
       ===================================================== */
    function avisar(msg) {
        var a = $('#aviso-rapido');
        if (!a) { a = document.createElement('div'); a.id = 'aviso-rapido'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
        /* se o lançamento acabou de ficar guardado (rede instável), mostra isso no lugar do "salvo" */
        var guardado = window.API && API.acabouDeGuardar ? API.acabouDeGuardar() : '';
        a.textContent = guardado || msg;
        a.classList.toggle('guardado', !!guardado);
        a.classList.add('visivel');
        clearTimeout(a.timer);
        a.timer = setTimeout(function () { a.classList.remove('visivel'); }, guardado ? 9000 : 2800);
    }


    /* =====================================================
       4. ÍCONES (traço simples, cor do texto)
       ===================================================== */
    var ICONES = {
        painel: 'M2.5 2.5h4.5v5h-4.5zM9 2.5h4.5v3H9zM9 7.5h4.5v6H9zM2.5 9.5h4.5v4h-4.5z',
        relatorio: 'M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5',
        sair: 'M6.5 2.5H3.3a.8.8 0 0 0-.8.8v9.4c0 .4.4.8.8.8h3.2M10.5 5l3 3-3 3M13.3 8H6.5',
        busca: 'M7 2.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zM10.5 10.5l3 3',
        sino: 'M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.5 14h3',
        menu: 'M2 4h12M2 8h12M2 12h12',
        seta: 'm6 3.5 4.5 4.5L6 12.5',
        chave: 'M5.3 13.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM7.3 8.7l6-6M11.3 4.7l1.6 1.6M9.8 6.2l1.2 1.2',
        pessoas: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.8 13.5c.4-2.4 2.1-4 4.2-4s3.8 1.6 4.2 4M11 7.2a2 2 0 1 0 0-4M12.3 9.6c1.2.5 2 1.8 2.2 3.4',
        olho: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z'
    };
    function icone(nome) {
        return '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="' + ICONES[nome] + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    var ICONE_TEMA = '<svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1a7 7 0 0 1 0 14z" fill="currentColor"/></svg>';


    /* =====================================================
       5. TABELA
       cab:    ['Lote', {t: 'Bons', num: true}, ...]
       linhas: [['01', 240], ...]  (células já em HTML)
       ===================================================== */
    function tabela(cab, linhas, vazio, classeLinha) {
        var c = cab.map(function (x) { return typeof x === 'string' ? { t: x } : x; });
        var topo = c.map(function (x) { return '<th' + (x.num ? ' class="num"' : '') + '>' + x.t + '</th>'; }).join('');
        var corpo = linhas.length ? linhas.map(function (l, i) {
            return '<tr' + (classeLinha ? ' class="' + (classeLinha(i) || '') + '"' : '') + '>' + l.map(function (v, j) {
                var cls = (c[j] && c[j].num ? 'num' : '') + (c[j] && c[j].quebra ? ' quebra' : '');
                return '<td' + (cls ? ' class="' + cls.trim() + '"' : '') + '>' + (v == null ? '' : v) + '</td>';
            }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + c.length + '" class="vazio">' + (vazio || 'Nenhum registro ainda.') + '</td></tr>';
        return '<div class="rolagem"><table class="tabela"><thead><tr>' + topo + '</tr></thead><tbody>' + corpo + '</tbody></table></div>';
    }


    /* =====================================================
       6. GRÁFICO DE BARRAS
       rotulos: ['Seg', ...]; a: série cinza; b: série laranja (opcional)
       guia: valores de uma linha de referência (opcional)
       ===================================================== */
    function grafico(rotulos, a, b, guia, maximo) {
        var max = maximo || Math.max.apply(null, [1].concat(a, b || [], guia || []));
        if (!rotulos.length || !(Math.max.apply(null, [0].concat(a, b || [])) > 0)) return '<p class="vazio">Sem lançamentos neste período.</p>';
        var alt = function (v) { return Math.max(0, Math.min(100, n(v) / max * 100)) + '%'; };
        var colunas = rotulos.map(function (r, i) {
            var t = h(r) + ': ' + fmt(a[i]) + (b ? ' / ' + fmt(b[i]) : '');
            return '<div class="coluna" title="' + t + '">' +
                '<div class="barra ' + (b ? 'a' : 'so verde') + '" style="height:' + alt(a[i]) + '"></div>' +
                (b ? '<div class="barra" style="height:' + alt(b[i]) + '"></div>' : '') +
                (guia ? '<div class="guia" style="bottom:' + alt(guia[i]) + '"></div>' : '') + '</div>';
        }).join('');
        return '<div class="grafico" role="img" aria-label="Gráfico de barras">' + colunas + '</div>' +
            '<div class="grafico-rotulos">' + rotulos.map(function (r) { return '<span>' + h(r) + '</span>'; }).join('') + '</div>';
    }
    function legenda(itens) {
        return '<p class="legenda">' + itens.map(function (x) { return '<i style="background:' + x[1] + '"></i>' + h(x[0]); }).join('') + '</p>';
    }


    /* =====================================================
       7. CÓDIGO DE BARRAS EAN-13 desenhado em SVG
       ===================================================== */
    function codigoBarras(texto) {
        var d = String(texto || '').replace(/\D/g, '');
        if (d.length === 12) d = '0' + d;
        if (d.length !== 13) return h(texto || '');
        var L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
        var G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
        var R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
        var P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
        var par = P[d[0]], bits = '101', i;
        for (i = 1; i < 7; i++) bits += (par[i - 1] === 'L' ? L : G)[d[i]];
        bits += '01010';
        for (i = 7; i < 13; i++) bits += R[d[i]];
        bits += '101';
        var barras = '', ini = -1;
        for (i = 0; i <= 95; i++) {
            if (bits[i] === '1') { if (ini < 0) ini = i; }
            else if (ini >= 0) {
                var guarda = ini < 3 || ini >= 92 || (ini >= 45 && ini < 50);
                barras += '<rect x="' + (ini + 9) + '" y="2" width="' + (i - ini) + '" height="' + (guarda ? 58 : 52) + '"/>';
                ini = -1;
            }
        }
        return '<svg class="codigo-barras" viewBox="0 0 113 72" role="img" aria-label="Código de barras ' + d + '">' + barras +
            '<g style="font:9px monospace"><text x="1" y="69">' + d[0] + '</text><text x="12" y="69" textLength="42">' + d.slice(1, 7) +
            '</text><text x="59" y="69" textLength="42">' + d.slice(7) + '</text></g></svg>';
    }


    /* =====================================================
       8. JANELA COM FORMULÁRIO
       Monta os campos a partir de Dominio.TABELAS.
       opcoes: { titulo, sub, tabela, valores, campos (lista de chaves, opcional),
                 extra (HTML a mais), aoSalvar(valores) → Promise }
       ===================================================== */
    function opcoesDoCampo(campo, valor) {
        var db = API.dados();
        var lista;
        switch (campo.t) {
            case 'opcoes':   lista = campo.op.map(function (o) { return [o, o || '—']; }); break;
            case 'simnao':   lista = [['Sim', 'Sim'], ['Não', 'Não']]; break;
            case 'motivo':   lista = D.motivos(db).map(function (m) { return [m, m]; }); break;
            case 'tipoemb':  lista = D.TIPOS_EMBALAGEM.map(function (t) { return [t.chave, t.nome]; }); break;
            case 'lote':     lista = [['', campo.obr ? 'Escolha o lote' : 'Granja toda']].concat(D.lotesDoUsuario(db, API.usuario()).map(function (l) { return [l.lote, D.nomeLote(db, l.lote)]; })); break;
            case 'linhagem': lista = (db.linhagens || []).map(function (l) { return [l.linhagem, l.linhagem]; }); break;
            case 'cliente':  lista = (db.clientes || []).map(function (c) { return [c.nome, c.codigo + ' · ' + c.nome]; }); break;
            case 'receb':    lista = (db.recebimentos || []).map(function (r) { return [r.lote_receb, r.lote_receb + ' · ' + D.diaMes(r.data_postura)]; }); break;
            default: return null;
        }
        if (valor && !lista.some(function (o) { return String(o[0]) === String(valor); })) lista.unshift([valor, valor]);
        return lista.map(function (o) { return '<option value="' + h(o[0]) + '"' + (String(o[0]) === String(valor) ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('');
    }
    function campoHTML(campo, valor) {
        var id = 'f-' + campo.k;
        var rot = h(campo.r) + (campo.obr ? ' *' : '');
        var opts = opcoesDoCampo(campo, valor);
        if (opts !== null) return '<label for="' + id + '">' + rot + '<select id="' + id + '" name="' + campo.k + '">' + opts + '</select></label>';
        if (campo.t === 'longo') return '<label for="' + id + '" class="inteiro">' + rot + '<textarea id="' + id + '" name="' + campo.k + '" rows="3">' + h(valor) + '</textarea></label>';
        var tipo = campo.t === 'data' ? 'date' : campo.t === 'numero' ? 'number' : 'text';
        /* campos de número (CPF, CEP, telefone, código): só aceitam números e a pontuação deles */
        var filtro = campo.so ? ' data-filtro="' + campo.so + '" inputmode="' + (campo.so === 'tel' ? 'tel' : 'numeric') + '"' : '';
        return '<label for="' + id + '">' + rot + '<input id="' + id + '" name="' + campo.k + '" type="' + tipo + '"' + (tipo === 'number' ? ' min="0" step="1" inputmode="numeric"' : '') + filtro +
            ' value="' + h(valor) + '"' + (campo.so_ler ? ' readonly' : '') + '></label>';
    }
    function abrirJanela(o) {
        var def = D.TABELAS[o.tabela];
        var campos = def.campos.filter(function (c) { return !o.campos || o.campos.indexOf(c.k) >= 0; });
        var v = o.valores || {};
        var fundo = document.createElement('div');
        fundo.className = 'janela-fundo';
        fundo.innerHTML = '<form class="janela" novalidate><h2>' + h(o.titulo) + '</h2>' + (o.sub ? '<p class="nota" style="margin:0 0 12px">' + h(o.sub) + '</p>' : '') +
            '<div class="form">' + campos.map(function (c) { return campoHTML(Object.assign({}, c, { so_ler: (o.soLer || []).indexOf(c.k) >= 0 }), v[c.k] == null ? '' : v[c.k]); }).join('') + '</div>' +
            (o.extra || '') + '<p class="msg" hidden></p>' +
            '<div class="acoes"><button class="btn" type="submit">Salvar</button><button class="btn alt" type="button" data-fechar>Cancelar</button></div></form>';
        document.body.appendChild(fundo);
        var form = fundo.querySelector('form');
        var fechar = function () { fundo.remove(); };
        fundo.addEventListener('click', function (e) { if (e.target === fundo || e.target.hasAttribute('data-fechar')) fechar(); });
        document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); } });
        if (o.aoAbrir) o.aoAbrir(form);
        var primeiro = form.querySelector('input:not([readonly]), select, textarea');
        if (primeiro) primeiro.focus();
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var valores = {};
            campos.forEach(function (c) {
                var el = form.elements[c.k];
                if (!el) return;
                valores[c.k] = c.t === 'numero' ? (el.value === '' ? 0 : Number(el.value)) : el.value.trim();
            });
            var msg = form.querySelector('.msg');
            var falta = campos.filter(function (c) { return c.obr && (valores[c.k] === '' || valores[c.k] == null); });
            if (falta.length) { msg.textContent = 'Preencha: ' + falta.map(function (c) { return c.r; }).join(', ') + '.'; msg.hidden = false; return; }
            var btn = form.querySelector('[type=submit]');
            btn.disabled = true; btn.textContent = 'Salvando…';
            try {
                await o.aoSalvar(valores, form);
                fechar();
            } catch (err) {
                msg.textContent = err.message || 'Não foi possível salvar.'; msg.hidden = false;
                btn.disabled = false; btn.textContent = 'Salvar';
            }
        });
        return form;
    }
    /* JANELAS COM FORMULÁRIO NÃO FECHAM CLICANDO FORA
       (para ninguém perder o que digitou sem querer). Fecha só no Cancelar, no X ou no Esc.
       Clicando fora, a janela dá uma "tremidinha" para mostrar que continua aberta. */
    document.addEventListener('click', function (e) {
        var f = e.target;
        if (!f.classList || !f.classList.contains('janela-fundo')) return;
        if (!f.querySelector('input:not([type=hidden]):not([readonly]):not([type=checkbox]), textarea, select')) return;
        e.stopImmediatePropagation();
        var j = f.querySelector('.janela');
        if (j) { j.classList.remove('tremer'); void j.offsetWidth; j.classList.add('tremer'); }
    }, true);

    /* Esc fecha a janela de cima quando ela é só de leitura (avisos, notificação, listas) */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var todas = document.querySelectorAll('body > .janela-fundo'), f = todas[todas.length - 1];
        if (f && !f.querySelector('input:not([type=hidden]):not([readonly]):not([type=checkbox]), textarea, select')) f.remove();
    });

    /* O ZERO SOME AO TOCAR NO CAMPO
       Nos campos de número que vêm com 0, ao tocar o 0 some e fica só o que a pessoa
       digitar. Se sair sem digitar nada, o 0 volta (para a conta continuar certa). */
    var ehNumero = function (el) { return el && el.tagName === 'INPUT' && !el.readOnly && !el.disabled && (el.type === 'number' || el.inputMode === 'numeric' && el.dataset.filtro === 'digitos' && !el.name.match(/codigo|cep|cnpj/)); };
    document.addEventListener('focusin', function (e) {
        var el = e.target;
        if (!ehNumero(el) || String(el.value).trim() !== '0') return;
        el.value = ''; el.dataset.eraZero = '1';
    });
    document.addEventListener('focusout', function (e) {
        var el = e.target;
        if (!el || !el.dataset || el.dataset.eraZero !== '1') return;
        delete el.dataset.eraZero;
        if (String(el.value).trim() === '') { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); }
    });

    /* SÓ NÚMEROS
       · campos de número (type=number): bloqueia letras, "e", "+" e "-";
       · campos com data-filtro: tira na hora o que não pode (letras etc.):
         digitos = 0-9 · doc = CPF/CNPJ (0-9 . - /) · cep = 0-9 e - · tel = 0-9 ( ) - + e espaço */
    var PODE = { digitos: /[^0-9]/g, doc: /[^0-9.\-\/]/g, cep: /[^0-9\-]/g, tel: /[^0-9()\-+ ]/g };
    document.addEventListener('keydown', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'INPUT' || el.type !== 'number' || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
        if (!/[0-9]/.test(e.key) && !((e.key === ',' || e.key === '.') && el.step && el.step !== '1')) e.preventDefault();
    }, true);
    document.addEventListener('input', function (e) {
        var el = e.target, so = el && el.dataset && el.dataset.filtro;
        if (!so || !PODE[so]) return;
        var limpo = el.value.replace(PODE[so], '');
        if (limpo !== el.value) { var pos = el.selectionStart - (el.value.length - limpo.length); el.value = limpo; try { el.setSelectionRange(pos, pos); } catch (x) { /* ok */ } }
    }, true);
    document.addEventListener('paste', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'INPUT' || el.type !== 'number') return;
        var txt = (e.clipboardData || window.clipboardData).getData('text');
        if (/[^0-9.,\s]/.test(txt)) { e.preventDefault(); var n = txt.replace(/[^0-9]/g, ''); if (n) el.value = n; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, true);

    /* CONTADOR DE CARACTERES embaixo de um campo de texto (alertas e avisos).
       Mostra "12 de no mínimo 15" em vermelho até chegar no mínimo. */
    function contarCaracteres(campo, min, max) {
        if (!campo) return;
        if (max) campo.maxLength = max;
        var c = document.createElement('small'); c.className = 'nota contador-letras'; c.style.margin = '4px 0 0'; c.style.display = 'block';
        campo.insertAdjacentElement('afterend', c);
        var mostrar = function () {
            var t = campo.value.trim().length, ok = t >= min;
            c.textContent = ok ? t + ' de ' + max + ' caracteres' : t + ' caracteres · mínimo ' + min + ', máximo ' + max;
            c.style.color = ok ? 'var(--ok-t)' : 'var(--er-t)';
        };
        campo.addEventListener('input', mostrar); mostrar();
    }
    function descricaoCurta(texto, min, max) {
        min = min || D.MIN_DESCRICAO; max = max || D.MAX_DESCRICAO;
        var t = String(texto || '').trim().length;
        if (t < min) return 'A descrição precisa ter pelo menos ' + min + ' caracteres (tem ' + t + '). Explique melhor: o quê, onde e em qual lote.';
        if (t > max) return 'A descrição pode ter no máximo ' + max + ' caracteres (tem ' + t + '). Resuma um pouco.';
        return '';
    }

    /* Pergunta simples de confirmação */
    function confirmar(texto) { return window.confirm(texto); }


    /* =====================================================
       9. PERÍODO (Hoje / Semana / Mês / De–Até)
       estado: { tipo: 'sem', de, ate } guardado pela tela
       ===================================================== */
    function periodoHTML(estado, comHoje) {
        var tipos = (comHoje ? [['dia', 'Hoje']] : []).concat([['sem', 'Semana'], ['mes', 'Mês']]);
        return '<div class="card nao-imprimir"><div class="form" style="align-items:end">' +
            '<div><span class="eyebrow" style="letter-spacing:.06em">Período</span><div class="chips" style="margin-top:4px">' +
            tipos.map(function (t) { return '<button type="button" class="chip' + (estado.tipo === t[0] ? ' ativo' : '') + '" data-periodo="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
            '</div></div><label>De<input type="date" data-de value="' + estado.de + '"></label><label>Até<input type="date" data-ate value="' + estado.ate + '"></label>' +
            '<div><button type="button" class="btn" data-aplicar>Aplicar período</button></div></div></div>';
    }
    function ligarPeriodo(raiz, estado, redesenhar) {
        ligar(raiz, '[data-periodo]', 'click', function (e, b) { var p = D.periodo(b.dataset.periodo); estado.tipo = b.dataset.periodo; estado.de = p.de; estado.ate = p.ate; redesenhar(); });
        ligar(raiz, '[data-aplicar]', 'click', function () {
            estado.de = $('[data-de]', raiz).value; estado.ate = $('[data-ate]', raiz).value; estado.tipo = '';
            if (estado.de && estado.ate && estado.de > estado.ate) { avisar('A data "De" não pode ser depois de "Até".'); return; }
            redesenhar();
        });
    }
    function novoPeriodo(tipo) { var p = D.periodo(tipo || 'sem'); return { tipo: tipo || 'sem', de: p.de, ate: p.ate }; }
    /* Divide o período em dias (até 31) ou semanas, para os gráficos */
    function partes(de, ate) {
        var nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        var dias = D.diasEntre(de, ate) + 1, out = [];
        if (!(dias > 0)) return out;
        var passo = dias > 31 ? 7 : 1;
        for (var i = 0, k = 1; i < dias; i += passo, k++) {
            var ini = D.somarDias(de, i), fim = D.somarDias(de, Math.min(i + passo - 1, dias - 1));
            var rot = passo === 7 ? 'Sem ' + k : dias <= 7 ? nomes[new Date(ini + 'T12:00:00').getDay()] : D.diaMes(ini);
            out.push({ rotulo: rot, de: ini, ate: fim });
        }
        return out;
    }


    /* =====================================================
       10. IMPRESSÃO DE FOLHAS
       ===================================================== */
    /* pac (opcional): código do Plano de Autocontrole, ex.: 'PAC 16 · Romaneios' */
    function cabecalhoFolha(titulo, linha, pac) {
        var norma = ((API.dados().config || []).find(function (c) { return c.chave === 'norma_pach'; }) || {}).valor;
        return '<div class="cabeca"><img src="img/logo.png" alt=""><div><h2>' + h(titulo) + ' <span class="tag">' + h(pac ? String(pac).split(' · ')[0] : 'Norma PAC') + '</span></h2>' +
            (pac ? '<div class="miuda"><b>' + h(pac) + '</b> · Plano de Autocontrole</div>' : '') +
            '<div class="miuda">' + h(CONFIG.SITIO) + ' · ' + h(linha || '') + '</div>' +
            (norma ? '<div class="miuda">Norma PAC: ' + h(norma) + '</div>' : '') + '</div></div>';
    }
    /* jeito: '' = folha em pé (retrato) · 'paisagem' = folha deitada */
    function imprimirFolha(html, jeito) {
        var area = $('#area-impressao');
        if (!area) { area = document.createElement('div'); area.id = 'area-impressao'; document.body.appendChild(area); }
        area.innerHTML = '<div class="folha ' + (jeito || '') + '">' + html + '</div>';
        document.body.classList.add('imprimir-folha');
        window.print();
    }
    window.addEventListener('afterprint', function () { document.body.classList.remove('imprimir-folha'); });
    /* Baixa uma tabela em CSV (abre no Excel / Google Planilhas) */
    function baixarCSV(nome, cab, linhas) {
        var limpar = function (v) { return String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&'); };
        var cel = function (v) { return '"' + limpar(v).replace(/^[=+@\-]/, "'$&").replace(/"/g, '""') + '"'; };
        var csv = '﻿' + [cab.map(function (c) { return typeof c === 'string' ? c : c.t; })].concat(linhas).map(function (l) { return l.map(cel).join(';'); }).join('\r\n');
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = nome + '.csv';
        a.click();
    }


    /* =====================================================
       11. PROTEÇÃO DAS PÁGINAS
       Sem login, volta para a entrada (index.html).
       ===================================================== */
    function exigirLogin(paraColaboradora) {
        var u = API.usuario();
        if (!u) { location.replace('index.html'); return null; }
        var ehColab = u.perfil === 'Colaboradora';
        /* Administrador e a equipe (Granja e Beneficiamento) também podem abrir a área das colaboradoras */
        if (!paraColaboradora && ehColab) { location.replace('colaboradora.html'); return null; }
        return u;
    }

    /* =====================================================
       12. LANÇAMENTOS GUARDADOS NO APARELHO
       Selos no topo: "N esperando envio" e "N não aceitos".
       Tocando, abre a lista com o que é cada um.
       ===================================================== */
    function selosFila() {
        var p = API.pendentes(), r = API.recusados().length;
        return (p ? '<button type="button" class="selo-pendente" data-fila>' + p + (p === 1 ? ' lançamento aguardando a rede' : ' lançamentos aguardando a rede') + '</button> ' : '') +
            (r ? '<button type="button" class="selo-pendente recusado" data-fila>' + r + ' não aceito(s) pela planilha</button>' : '');
    }
    function descreverLancamento(x) {
        var d = x.corpo || {}, v = d.dados || {};
        return h(d.descricao || ('Lançamento em ' + d.tabela)) + '<br><small class="nota" style="margin:0">' + (v.data ? 'Dia ' + D.br(v.data) + ' · ' : '') + 'feito em ' + new Date(x.quando || Date.now()).toLocaleString('pt-BR').slice(0, 16) + '</small>';
    }
    function ligarSelosFila(raiz, depois) {
        ligar(raiz, '[data-fila]', 'click', function () {
            var p = JSON.parse(localStorage.getItem(API.CHAVE_FILA) || '[]'), r = API.recusados();
            var fundo = document.createElement('div');
            fundo.className = 'janela-fundo';
            fundo.innerHTML = '<div class="janela" style="max-width:560px"><h2>Lançamentos guardados neste aparelho</h2>' +
                '<h3 class="subtitulo">Aguardando a rede (' + p.length + ')</h3>' +
                (p.length ? '<p class="nota">Não foram lançados devido à instabilidade na rede (ou porque o login venceu). Estão guardados neste aparelho e serão lançados automaticamente quando a internet normalizar e você estiver dentro do sistema.</p>' : '') +
                (p.map(function (x) { return '<div class="item-aviso"><span>' + descreverLancamento(x) + '</span></div>'; }).join('') || '<p class="vazio">Nada esperando.</p>') +
                (r.length ? '<h3 class="subtitulo">Não aceitos pela planilha (' + r.length + ')</h3><p class="nota">Estes não entraram. Veja o motivo e lance de novo, se precisar.</p>' +
                    r.map(function (x) { return '<div class="item-aviso"><span>' + descreverLancamento(x) + '<br><b style="color:var(--er-t)">Motivo: ' + h(x.erro) + '</b></span></div>'; }).join('') : '') +
                '<div class="acoes">' + (p.length ? '<button class="btn" type="button" data-enviar>Tentar enviar agora</button>' : '') +
                (r.length ? '<button class="btn alt" type="button" data-limpar>Já vi os não aceitos</button>' : '') + '<button class="btn alt" type="button" data-fechar>Fechar</button></div></div>';
            document.body.appendChild(fundo);
            fundo.addEventListener('click', async function (e) {
                if (e.target === fundo || e.target.hasAttribute('data-fechar')) { fundo.remove(); return; }
                if (e.target.hasAttribute('data-limpar')) { API.limparRecusados(); fundo.remove(); if (depois) depois(); return; }
                if (e.target.hasAttribute('data-enviar')) {
                    e.target.disabled = true; e.target.textContent = 'Enviando…';
                    var antes = API.pendentes();
                    if (!API.sessao()) { avisar('Entre de novo no sistema para enviar.'); fundo.remove(); return; }
                    await API.enviarFila();
                    var foi = antes - API.pendentes();
                    avisar(foi ? foi + ' lançamento(s) enviado(s)' : 'Ainda sem conexão com a planilha. Tente mais tarde.');
                    fundo.remove();
                    if (foi) { try { await API.carregar(); } catch (err) { /* segue com a cópia */ } }
                    if (depois) depois();
                }
            });
        });
    }

    /* =====================================================
       13. ABRIR SEM INTERNET
       Liga o sw.js, que guarda as páginas no aparelho. Só funciona
       quando o sistema está num endereço https (ou no localhost).
       ===================================================== */
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sem cópia: segue normal */ }); });
    }

    /* Demonstração online: botão para voltar à página que escolhe a versão
       (só cadastros, 1 semana, 1 mês). Cada versão é uma pasta; a página fica uma acima. */
    function seloTrocarVersao() {
        return window.API && API.online ? '<a class="selo-demo" href="../" title="Voltar para escolher outra versão da demonstração">⇄ Trocar versão</a> ' : '';
    }

    return {
        seloTrocarVersao: seloTrocarVersao, selosFila: selosFila, ligarSelosFila: ligarSelosFila, contarCaracteres: contarCaracteres, descricaoCurta: descricaoCurta,
        $: $, $$: $$, n: n, fmt: fmt, pct: pct, h: h, tag: tag, ligar: ligar, dataExtenso: dataExtenso, saudacao: saudacao,
        trocarTema: trocarTema, avisar: avisar, icone: icone, ICONE_TEMA: ICONE_TEMA, tabela: tabela, grafico: grafico, legenda: legenda,
        codigoBarras: codigoBarras, abrirJanela: abrirJanela, confirmar: confirmar, campoHTML: campoHTML,
        periodoHTML: periodoHTML, ligarPeriodo: ligarPeriodo, novoPeriodo: novoPeriodo, partes: partes,
        cabecalhoFolha: cabecalhoFolha, imprimirFolha: imprimirFolha, baixarCSV: baixarCSV, exigirLogin: exigirLogin
    };
})();
