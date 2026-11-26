/* =========================================================
   ERP Ovo Caipira · DADOS DE EXEMPLO (só no modo demonstração)
   ---------------------------------------------------------
   Monta um sítio de exemplo com datas a partir de HOJE, para
   a demonstração sempre parecer atual. Nada disto vai para a
   planilha: quando a planilha estiver ligada (js/config.js),
   este arquivo não é usado.

   OS 4 JEITOS DE COMEÇAR (botão "Demonstração · recomeçar")
   gerar('zerado')    → o sistema do zero: só os 3 logins, nenhum cadastro.
   gerar('cadastros') → os 3 logins + lotes das aves, linhagens, produtos e
                        clientes (sem nenhum lançamento). É o começo padrão.
   gerar('semana')    → cadastros + 7 dias de lançamentos de demonstração.
   gerar('mes')       → cadastros + 30 dias de lançamentos de demonstração.

   OPÇÕES (2º parâmetro, usado pela demonstração online, no Apps Script):
   gerar('semana', { ate: '2026-11-26', diaCompleto: true })
     ate         → o último dia dos dados (passa a ser o "hoje" do gerador).
                   Sem ele, o "hoje" é o dia de hoje do aparelho.
     diaCompleto → o último dia fica COMPLETO: as 7 colaboradoras lançaram
                   todas as coletas, tudo conferido e recebido, beneficiamento
                   feito até o lote do dia, checklist de todos os lotes,
                   tarefas do dia feitas e nenhum lote com pesagem atrasada.
                   Assim o painel do dia não mostra pendência.
                   Sem ele, o dia de hoje fica pela metade (como antes).

   OS 3 LOGINS (senha: passada na apresentação) — cada um pode ser usado por
   várias pessoas ao mesmo tempo, em aparelhos diferentes:
     admin  · Administração          → vê tudo
     granja · Granja e Beneficiamento → granja + beneficiamento
     coleta · Equipe da coleta        → área das colaboradoras, todos os lotes
   As 7 colaboradoras ficam cadastradas em Usuários com os lotes de cada uma,
   sem login próprio: entram pelo "coleta", tocam no nome e veem só os lotes delas.

   Organização deste arquivo:
     1. Logins de demonstração (senha: passada na apresentação)
     2. Cadastros (linhagens, lotes, produtos, clientes)
     3. Granja (coletas, mortalidade, saída, checklist, peso)
     4. Beneficiamento (embalagens, recebimentos, produções)
     5. Pedidos, alertas, tarefas e checklists das colaboradoras
   ========================================================= */
var DadosExemplo = (function () {
    'use strict';
    var D = Dominio;
    var MODO_INICIAL = 'cadastros';   // como a demonstração começa na 1ª vez que abre

    /* OS 3 LOGINS DA DEMONSTRAÇÃO: [login, nome, perfil, onde pertence] */
    var LOGINS = [
        ['admin', 'Administração', 'Administrador', 'Administração · vê tudo (pedidos, cadastros, relatórios)'],
        ['granja', 'Granja e Beneficiamento', 'Granja e Beneficiamento', 'Granja e beneficiamento · conferência, embalagem'],
        ['coleta', 'Equipe da coleta', 'Colaboradora', 'Colaboradoras · coleta, mortalidade e checklist']
    ];
    /* Quem colhe e os lotes que cada uma cuida (lista enviada em 19/11/2026).
       Usado só para os lançamentos de demonstração (nome em "Coletado por"). */
    var COLABORADORAS = [
        ['Ronilda', [10, 12, 14, 15]], ['Ana Cristina', [13, 17, 18, 21]], ['Beatriz', [22, 23, 24]],
        ['Sarah', [11, 16, 19, 20]], ['Esther', [6, 7, 9]], ['Lurdinha', [1, 2, 8]], ['Gisele', [3, 4, 5]]
    ];
    var ADM = 'Administração', EQUIPE = 'Granja e Beneficiamento', COLETA = 'Equipe da coleta';
    var T = 'Novogen Tinted', B = 'Novogen Brown', P = 'PCG';
    var LOTES = [P, P, P, P, T, B, T, B, T, B, B, T, T, P, P, T, T, B, T, T, T, P, B, B];   // linhagem dos lotes 1 a 24
    var n = function (v) { var x = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : 0; };

    /* modo: 'zerado' · 'cadastros' · 'semana' · 'mes' (sem modo = MODO_INICIAL)
       opcoes: { ate: 'aaaa-mm-dd', diaCompleto: true } (ver o cabeçalho) */
    function gerar(modo, opcoes) {
        modo = { zerado: 1, cadastros: 1, semana: 1, mes: 1 }[modo] ? modo : MODO_INICIAL;
        opcoes = opcoes || {};
        var HOJE = opcoes.ate || D.hoje();                             // o "hoje" do gerador
        var COMPLETO = !!opcoes.diaCompleto;                           // o último dia sem nenhuma pendência
        /* hora "agora" do gerador: com 'ate', o fim da tarde do último dia (horário de Brasília) */
        var AGORA = opcoes.ate ? new Date(HOJE + 'T17:30:00-03:00').toISOString() : new Date().toISOString();
        var DIAS = modo === 'mes' ? 30 : modo === 'semana' ? 7 : 0;   // dias de lançamentos de demonstração
        var PRIMEIRO = -(DIAS - 1);                                    // 1º dia (hoje = 0)
        var db = {};
        D.CHAVES.forEach(function (k) { db[k] = []; });
        var seq = 0;
        var dia = function (offset) { return D.somarDias(HOJE, offset); };
        var add = function (tabela, linha, quem) {
            linha.id = 'ex-' + (++seq);
            linha.criado_em = AGORA;
            linha.lancado_por = quem || 'Exemplo';
            linha.alterado_por = '';
            db[tabela].push(linha);
            return linha;
        };

        /* =====================================================
           1. OS 3 LOGINS (senha de todos na demonstração: demo123)
           ===================================================== */
        var cod = function (num) { return String(num).padStart(2, '0') + '/2026'; };
        LOGINS.forEach(function (x) {
            add('usuarios', { nome: x[1], usuario: x[0], perfil: x[2], acessos: x[2] === 'Administrador' ? 'Todos' : '', lotes: 'Todos', situacao: 'Ativo' });
        });
        if (modo === 'zerado') return db;   // do zero: só os logins
        /* As colaboradoras com os lotes de cada uma, SEM login próprio: entram pelo
           login "coleta", escolhem o nome e veem só os lotes delas. */
        COLABORADORAS.forEach(function (c) {
            add('usuarios', { nome: c[0], usuario: '', perfil: 'Colaboradora', acessos: '', lotes: c[1].map(cod).join(', '), situacao: 'Ativo' });
        });

        /* =====================================================
           2. CADASTROS
           ===================================================== */
        /* Linhagens usadas nos lotes da granja (PCG ainda sem curva do guia) */
        /* Curvas de PESO de EXEMPLO (só na demonstração, para ver a comparação funcionando).
           Na planilha de verdade, cadastrar a curva do guia que o Bruno mandar. */
        var PESO_EXEMPLO = {
            'Novogen Tinted': '18:1450; 20:1580; 22:1680; 25:1760; 30:1820; 40:1880; 50:1920; 60:1950; 70:1970; 80:1990',
            'Novogen Brown': '18:1500; 20:1620; 22:1720; 25:1800; 30:1860; 40:1920; 50:1960; 60:1990; 70:2010; 80:2030',
            'PCG': '18:1650; 20:1780; 22:1880; 25:1980; 30:2060; 40:2150; 50:2200; 60:2240; 70:2260; 80:2280'
        };
        ['Novogen Tinted', 'Novogen Brown', 'PCG'].forEach(function (nome) {
            add('linhagens', { linhagem: nome, curva_postura: D.CURVAS_GUIAS[nome] || '', curva_peso: PESO_EXEMPLO[nome],
                observacao: nome === 'PCG' ? 'PCG = Embrapa 051: curva de postura da Tabela 6 do manual da Embrapa (o guia de manejo da PCG ainda não saiu).'
                    : 'Curva do guia de manejo da linhagem (enviado pelo Bruno em 08/11/2026).' });
        });
        [['Dúzia', 'Dúzia', '6 02883 31774 1', 12, 'duzia'], ['Pente 20 ovos G', 'Pente 20 G', '0 619205 766132', 20, 'pente20'],
         ['Pente 30 ovos G', 'Pente 30 G', '6 02883 31773 4', 30, 'pente30'], ['Pente 30 Caipirinho', 'Pente 30 Caipirinho', '0 619205 766101', 30, 'caipirinho']
        ].forEach(function (p) { add('produtos', { nome: p[0], curto: p[1], codigo_barras: p[2], ovos: p[3], maquina: p[4] }); });
        add('config', { chave: 'norma_pach', valor: 'PERDAS PAC 11' });   // Norma PAC (já vem cadastrada)

        /* Os 24 lotes das aves: número e linhagem reais (a tabela da granja).
           PARA TESTE (só na demonstração): galinhas (de 400 a 600 por lote), nascimento e
           chegada de mentira, para a postura, as aves vivas e as vacinas já calcularem.
           Na planilha de verdade, preencher em Cadastros › Lotes das aves. */
        LOTES.forEach(function (lin, i) {
            var num = i + 1, nasc = -230 + (i % 6) * 7, cheg = nasc + 120;
            var lote = { lote: cod(num), linhagem: lin, aves_iniciais: 400 + (i % 5) * 50, data_nascimento: dia(nasc), data_inicio: dia(cheg),
                origem: 'Teste', cidade: '', gta: '', nota_fiscal: '', ativo: 'Sim' };
            lote.descarte_previsto = lote.data_nascimento ? D.descartePrevisto(lote) : '';
            add('lotes', lote, ADM);
        });

        /* Clientes de exemplo */
        {
            /* CPF/CNPJ com os dígitos certos (gerados aqui só para o exemplo) */
            var dv = function (base, pesos) { var s = 0; for (var i = 0; i < pesos.length; i++) s += Number(base[i]) * pesos[i]; var r = s % 11; return r < 2 ? 0 : 11 - r; };
            var cnpj = function (b) { var d1 = dv(b, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); var d2 = dv(b + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); var x = b + d1 + d2; return x.slice(0, 2) + '.' + x.slice(2, 5) + '.' + x.slice(5, 8) + '/' + x.slice(8, 12) + '-' + x.slice(12); };
            var cpf = function (b) { var d1 = dv(b, [10, 9, 8, 7, 6, 5, 4, 3, 2]); var d2 = dv(b + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]); var x = b + d1 + d2; return x.slice(0, 3) + '.' + x.slice(3, 6) + '.' + x.slice(6, 9) + '-' + x.slice(9); };
            [['0001', 'Mercado Exemplo Ltda', cnpj('112223330001'), 'Mercado', 'Rua das Flores, 120', 'Centro', 'Sempre pede pente 30 na segunda-feira.'],
             ['0002', 'Escola Estadual Exemplo', cnpj('445556660001'), 'Escola (merenda)', 'Av. Brasil, 1500', 'Fabrício', 'Merenda: entregar até as 9h. Pedido toda quinta.'],
             ['0003', 'Padaria Exemplo', cnpj('778889990001'), 'Padaria', 'Rua XV de Novembro, 45', 'Abadia', ''],
             ['0004', 'Restaurante Exemplo', cnpj('223334440001'), 'Restaurante', 'Rua Tiradentes, 300', 'São Benedito', 'Gosta de ovo caipirinha para o café da manhã.'],
             ['0005', 'Maria (cliente exemplo)', cpf('123456789'), 'Pessoa física', 'Rua Goiás, 18', 'Mercês', '']
            ].forEach(function (c) {
                add('clientes', { codigo: c[0], nome: c[1], cnpj: c[2], tipo: c[3], cep: '38010-000', endereco: c[4], bairro: c[5], cidade: 'Uberaba/MG',
                    telefone: '(34) 3333-' + c[0], email: '', vendedor: ADM, tel_vendedor: '', lembrete: c[6] }, ADM);
            });
        }

        /* Só cadastros: para aqui. Daqui para baixo são os lançamentos (1 semana ou 1 mês). */
        if (!DIAS) return db;

        /* =====================================================
           2b. LOTES DAS AVES, VACINAS, CLIENTES E PRODUTOS
           ===================================================== */
        db.produtos.forEach(function (p, i) { p.estoque_minimo = [20, 5, 10, 5][i]; });
        /* vacinas: todas aplicadas, menos a última do lote 21 (para mostrar "atrasada" piscando) */
        db.lotes.forEach(function (l) {
            D.protocoloVacinas(db).forEach(function (v, i, todas) {
                if (l.lote === cod(21) && i === todas.length - 1) return;
                add('vacinas', { lote: l.lote, idade: v.idade, vacina: v.vacina, data_prevista: D.somarDias(l.data_nascimento, v.idade), data_aplicada: D.somarDias(l.data_nascimento, v.idade), aplicado_por: ADM, observacao: '' }, ADM);
            });
        });
        /* =====================================================
           3. GRANJA: coletas por dia (cada coleta separada), conferência
              e ovos por lote no fim do dia — os últimos DIAS dias
           ===================================================== */
        var equipe = EQUIPE;
        var agoraIso = AGORA;
        function fmtC(b, t, df, s2) { return b + ' bons / ' + t + ' trinc. / ' + df + ' def. / ' + s2 + ' sujos = ' + (b + t + df + s2); }
        for (var d = PRIMEIRO; d <= 0; d++) {
            COLABORADORAS.forEach(function (col, ci) {
                /* 2 coletas por dia; cada colaboradora com uma postura diferente (para o gráfico ter verde, amarelo e vermelho) */
                var avesDela = col[1].reduce(function (t, num) { var l = db.lotes.find(function (x) { return x.lote === cod(num); }); return t + (l ? n(l.aves_iniciais) : 400); }, 0);
                var porColeta = Math.round(avesDela * [0.97, 0.91, 0.82, 0.95, 0.88, 0.93, 0.78][ci] / 2);
                [1, 2].forEach(function (nc) {
                    if (d === 0 && !COMPLETO && (nc === 2 || ci > 3)) return;          // hoje: só a 1ª coleta das 4 primeiras (completo: todas)
                    var v = (d * 7 + ci * 5 + nc * 3) % 11, total = porColeta + v - 5;
                    var tr = 3 + (v % 3), df = 1 + (v % 2), sj = 2 + (v % 3);
                    var c = { data: dia(d), lote: '', n_coleta: String(nc), coletado_por: col[0], bons: total - tr - df - sj, trincados: tr, defeituosos: df, sujos: sj,
                        conformidade: d === -2 && ci === 3 && nc === 1 ? 'Não conforme' : 'Conforme', observacao: d === -2 && ci === 3 && nc === 1 ? 'Ninho 4 do lote 16/2026 sem cama: trocar a maravalha.' : '' };
                    if (d === -3 && ci === 1 && nc === 1) { c.contagem_original = fmtC(c.bons + 6, tr, df, sj); c.recontado_por = equipe + ' · ' + D.br(dia(-3)); c.motivo_recontagem = 'Contagem não bateu na sala de coleta'; }
                    if (d < 0 || ci < 2 || COMPLETO) { c.reconferido_por = equipe + ' · ' + D.br(dia(d)); c.recebido_em = agoraIso; c.lote_receb = D.codigoLoteDia('', dia(d)); }
                    add('coletas', c, COLETA);
                });
            });
        }
        /* Ovos por lote (contagem do fim do dia): o total de cada colaboradora dividido nos lotes dela */
        for (d = PRIMEIRO; d <= (COMPLETO ? 0 : -1); d++) {
            COLABORADORAS.forEach(function (col) {
                var tot = db.coletas.filter(function (c) { return c.data === dia(d) && c.coletado_por === col[0]; }).reduce(function (s2, c) { return s2 + D.totalColeta(c); }, 0);
                /* divide o total dela entre os lotes dela, pelo número de aves de cada lote */
                var avesL = col[1].map(function (num) { var l = db.lotes.find(function (x) { return x.lote === cod(num); }); return l ? n(l.aves_iniciais) : 400; });
                var somaA = avesL.reduce(function (t, a) { return t + a; }, 0), usados = 0;
                col[1].forEach(function (num, k) {
                    var q = k === col[1].length - 1 ? tot - usados : Math.round(tot * avesL[k] / somaA); usados += q;
                    add('producao', { data: dia(d), lote: cod(num), ovos_lote: q, pequenos: 0, observacao: '' }, equipe);
                });
            });
            add('producao', { data: dia(d), lote: '', ovos_lote: '', pequenos: 20 + (d % 3 + 3) % 3 * 4, observacao: '' }, equipe);
        }
        [[-27, cod(3), 1, 0, 'Prolapso', '', 'Gisele'], [-22, cod(19), 2, 0, 'Calor', 'Dia muito quente: reforçar a água.', 'Sarah'], [-16, cod(23), 0, 1, 'Ave doente', 'Ave separada e abatida.', 'Beatriz'],
         [-9, cod(10), 2, 0, 'Esmagamento', 'Aves amontoadas no canto do galpão.', 'Ronilda'], [-5, cod(16), 1, 0, 'Briga', '', 'Sarah'],
         [-2, cod(17), 0, 1, 'Cloaca estourada', 'Ave separada e abatida.', 'Ana Cristina'], [-1, cod(7), 1, 0, 'Sufocamento', '', 'Esther']].forEach(function (m) {
            if (m[0] < PRIMEIRO) return;
            add('mortalidade', { data: dia(m[0]), lote: m[1], mortes: m[2], abate: m[3], motivo: m[4], observacao: m[5] + (m[5] ? ' ' : '') + '(encontrado por ' + m[6] + ')' }, COLETA);
        });
        /* pesagens semanais (últimas 6 semanas) de todos os lotes, perto do guia; o lote 05 fica abaixo
           e o 22 está atrasado (sem pesar há 2 semanas). Na última do lote 10, os pesos ave por ave. */
        db.lotes.forEach(function (l, i) {
            [-28, -21, -14, -7, 0].forEach(function (d0, k) {
                if (l.lote === cod(22) && d0 > -14 && !COMPLETO) return;          // lote 22: pesagem atrasada (completo: em dia)
                if (d0 - (i % 3) < PRIMEIRO) return;                              // só dentro do período
                var data = dia(d0 - (i % 3)), sem = D.idadeSemanas(l, data), g = D.pesoGuia(db, l, sem) || 1800;
                var fator = l.lote === cod(5) ? 0.9 : 0.97 + ((i * 7 + k * 3) % 7) / 100, peso = Math.round(g * fator);
                var p = { data: data, lote: l.lote, peso_medio: peso, aves_pesadas: 30, observacao: l.lote === cod(5) && d0 === 0 ? 'Aves leves: conferir ração e bebedouros.' : '' };
                if (l.lote === cod(10) && d0 === 0) {
                    var pesos = []; for (var a = 0; a < 30; a++) pesos.push(Math.round(peso * (0.86 + ((a * 37) % 29) / 100)));
                    var e = D.estatPesos(pesos.join(' ')); p.pesos = e.valores.join(' '); p.peso_medio = e.media; p.uniformidade = e.uniformidade;
                }
                add('pesagens', p, EQUIPE);
            });
        });

        /* =====================================================
           4. BENEFICIAMENTO: lote do dia (número = dia), produção só com os bons
           ===================================================== */
        var compra = {
            duzia: add('embalagens', { tipo: 'duzia', lote: '03', nota_fiscal: '001245', data_compra: dia(PRIMEIRO - 6), fornecedor: 'Embalagens Exemplo', comprado: 30000, aviso_minimo: 200 }),
            pente20: add('embalagens', { tipo: 'pente20', lote: '01', nota_fiscal: '001246', data_compra: dia(PRIMEIRO - 6), fornecedor: 'Embalagens Exemplo', comprado: 3000, aviso_minimo: 200 }),
            pente30: add('embalagens', { tipo: 'pente30', lote: '02', nota_fiscal: '001247', data_compra: dia(PRIMEIRO - 6), fornecedor: 'Embalagens Exemplo', comprado: 15000, aviso_minimo: 200 }),
            caixa: add('embalagens', { tipo: 'caixa', lote: '01', nota_fiscal: '001248', data_compra: dia(PRIMEIRO - 6), fornecedor: 'Embalagens Exemplo', comprado: 5000, aviso_minimo: 200 })
        };
        for (d = PRIMEIRO; d <= 0; d++) {
            var recebidas = db.coletas.filter(function (c) { return c.data === dia(d) && c.recebido_em; });
            var soma = function (k) { return recebidas.reduce(function (s, c) { return s + n(c[k]); }, 0); };
            var rec = add('recebimentos', { lote_receb: D.codigoLoteDia('', dia(d)), data_postura: dia(d), lote_granja: '', bom: soma('bons'), trincado: soma('trincados'),
                defeito: soma('defeituosos'), sujo: soma('sujos'), coletas_ate: agoraIso }, equipe);
            if (d >= -1 && !COMPLETO) continue;                                     // ontem e hoje ainda esperam o beneficiamento (completo: feito até hoje)
            var bom = n(rec.bom), perdas = { trincado: 3, defeito: 2, sujo: 2, quebrado: 1 };
            var resto = bom - 8;
            var p = { lote_receb: rec.lote_receb, data: dia(Math.min(d + 1, 0)), trincado: 3, defeito: 2, sujo: 2, quebrado: 1,
                duzia: Math.floor(resto * 0.35 / 12), pente20: Math.floor(resto * 0.1 / 20), pente30: Math.floor(resto * 0.4 / 30), caipirinho: Math.floor(resto * 0.1 / 30) };
            p.sobra = resto - D.embalados(p);
            var usadas = {};
            usadas[compra.duzia.id] = p.duzia; usadas[compra.pente20.id] = p.pente20;
            usadas[compra.pente30.id] = p.pente30 + p.caipirinho; usadas[compra.caixa.id] = D.caixasUsadas(p);
            p.embalagens_usadas = JSON.stringify(usadas);
            add('producoes', p, equipe);
        }

        /* =====================================================
           5. PEDIDOS (do lote mais antigo primeiro), ALERTAS, TAREFAS E CHECKLISTS
           ===================================================== */
        var L = function (d) { return D.codigoLoteDia('', dia(d)); };
        /* Entregues: um a cada 2 dias (semana) ou 3 dias (mês), cada um com o lote de 3 dias antes */
        var CLI = ['Mercado Exemplo Ltda', 'Escola Estadual Exemplo', 'Padaria Exemplo', 'Restaurante Exemplo', 'Maria (cliente exemplo)'];
        var ITENS = [{ 'Pente 30 ovos G': 40, 'Dúzia': 100 }, { 'Dúzia': 200 }, { 'Pente 30 ovos G': 30, 'Pente 30 Caipirinho': 10 }, { 'Pente 30 Caipirinho': 15, 'Dúzia': 60 }, { 'Dúzia': 5 }];
        var num = 0, passo = DIAS > 10 ? 3 : 2, difFeita = false;
        for (var e = (DIAS > 10 ? -26 : -3); e <= -1; e += passo) {
            var ci2 = num % CLI.length, itens = ITENS[ci2], lotesP = {}, dif = '';
            Object.keys(itens).forEach(function (k) { lotesP[k] = [[L(e - 3), itens[k]]]; });
            if (ci2 === 1 && !difFeita) { difFeita = true; lotesP['Dúzia'] = [[L(e - 3), 198]]; dif = 'Dúzia: 198 de 200 · Motivo: 2 dúzias quebraram no transporte'; }
            add('pedidos', { numero: ++num, cliente: CLI[ci2], data_pedido: dia(e - 1), entrega: dia(e), itens: JSON.stringify(itens),
                observacao: ci2 === 1 ? 'Merenda' : '', situacao: 'Entregue', motorista: 'João (exemplo)', placa: 'ABC-1D23', conferido_por: ADM,
                lotes: JSON.stringify(lotesP), fechado_em: dia(e), diferenca: dif }, ADM);
        }
        /* A entregar: um com o romaneio já separado e dois novos */
        add('pedidos', { numero: ++num, cliente: 'Padaria Exemplo', data_pedido: dia(-1), entrega: dia(1), itens: JSON.stringify({ 'Pente 30 ovos G': 30, 'Pente 30 Caipirinho': 10 }),
            observacao: 'Entregar pela manhã', situacao: 'A entregar', motorista: '', placa: '', conferido_por: '',
            lotes: JSON.stringify({ 'Pente 30 ovos G': [[L(-3), 30]], 'Pente 30 Caipirinho': [[L(-3), 10]] }), fechado_em: '' }, ADM);
        add('pedidos', { numero: ++num, cliente: 'Restaurante Exemplo', data_pedido: dia(0), entrega: dia(2), itens: JSON.stringify({ 'Pente 30 Caipirinho': 15, 'Dúzia': 60 }),
            observacao: '', situacao: 'A entregar', motorista: '', placa: '', conferido_por: '', lotes: '', fechado_em: '' }, ADM);
        add('pedidos', { numero: ++num, cliente: 'Escola Estadual Exemplo', data_pedido: dia(0), entrega: dia(3), itens: JSON.stringify({ 'Dúzia': 200, 'Pente 20 ovos G': 20 }),
            observacao: 'Merenda', situacao: 'A entregar', motorista: '', placa: '', conferido_por: '', lotes: '', fechado_em: '' }, ADM);

        add('alertas', { data: dia(0), lote: cod(9), gravidade: 'Urgente', descricao: 'Bebedouro do lote 09/2026 vazando: chamar manutenção.', registrado_por: ADM, resolvido: 'Não' }, ADM);
        add('alertas', { data: dia(-4), lote: cod(10), gravidade: 'Atenção', descricao: 'Ração acabando no silo 1 do galpão.', registrado_por: ADM, resolvido: 'Sim' }, ADM);
        var t1 = add('tarefas', { descricao: 'Conferir a ração dos silos', lote: '', dia: 'Todos os dias', data_especifica: '', responsavel: ADM, obrigatoria: 'Sim', ativo: 'Sim' }, ADM);
        var t2 = add('tarefas', { descricao: 'Dar vitamina na água', lote: cod(10), dia: 'Todos os dias', data_especifica: '', responsavel: ADM, obrigatoria: 'Não', ativo: 'Sim' }, ADM);
        add('tarefas', { descricao: 'Aplicar produto para piolho', lote: '', dia: 'Data específica', data_especifica: dia(3), responsavel: ADM, obrigatoria: 'Sim', ativo: 'Sim' }, ADM);
        for (d = PRIMEIRO; d <= 0; d++) add('tarefas_feitas', { tarefa: t1.id, data: dia(d), feita_por: ADM, observacao: d === 0 ? 'Silo 1 cheio, silo 2 pela metade.' : '' }, ADM);
        if (COMPLETO) add('tarefas_feitas', { tarefa: t2.id, data: dia(0), feita_por: ADM, observacao: '' }, ADM);   // completo: as tarefas do dia feitas

        /* checklist das colaboradoras: cada uma faz o dos lotes dela, todo dia (+ serviços gerais).
           Hoje: só Ronilda e Ana Cristina já fizeram (completo: todas). */
        var resp = function (nc) { return JSON.stringify(D.CHECK_LOTE.map(function (_, i) { return i < 20 - nc ? 'C' : 'NC'; })); };
        for (d = PRIMEIRO; d <= 0; d++) {
            COLABORADORAS.forEach(function (col, ci) {
                if (d === 0 && ci > 1 && !COMPLETO) return;
                col[1].forEach(function (num, k) {
                    var nc = d === -3 && ci === 0 && k === 0 ? 2 : 0;
                    add('checklist_colab', { data: dia(d), lote: cod(num), tipo: 'lote', colaboradora: col[0], respostas: resp(nc), c: 20 - nc, nc: nc, observacao: nc ? 'Cortina rasgada no lado sul.' : '' }, COLETA);
                });
            });
            if (d < 0 || COMPLETO) add('checklist_colab', { data: dia(d), lote: '', tipo: 'geral', colaboradora: 'Lurdinha', respostas: resp(1), c: 19, nc: 1, observacao: '' }, COLETA);
        }
        add('config', { chave: 'validade_dias', valor: '30' });
        add('alteracoes', { data: dia(0), hora: '08:40', quem: COLETA + ' · Ronilda', sistema: 'Colaboradoras', o_que: 'Lançou coleta nº 1 · lote da coleta ' + L(0) });
        add('alteracoes', { data: dia(0), hora: '10:05', quem: equipe, sistema: 'Granja', o_que: 'Conferiu e recebeu 2 coleta(s) no lote ' + L(0) });
        add('alteracoes', { data: dia(-1), hora: '16:30', quem: ADM, sistema: 'Beneficiamento', o_que: 'Preencheu o romaneio do pedido #' + (num - 2) });
        return db;
    }

    return { gerar: gerar, SENHA: '', LOGINS: LOGINS, MODO_INICIAL: MODO_INICIAL };
})();
