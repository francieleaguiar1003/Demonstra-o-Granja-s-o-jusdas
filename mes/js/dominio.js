/* =========================================================
   ERP Ovo Caipira · DOMÍNIO (tabelas, campos e regras)
   ---------------------------------------------------------
   Tudo o que é "regra do negócio" fica aqui, separado das
   telas: quais abas a planilha tem, quais campos cada uma
   guarda e as contas (aves vivas, produção do dia,
   conferência dos 100%, estoque, validade...).

   Organização deste arquivo:
     1. Listas fixas (motivos, nº de coletas, vacinas, PAC, checklists, produtos da máquina)
     2. Curvas de postura das linhagens (guias de manejo)
     3. Tabelas: cada aba da planilha e seus campos
     4. Datas
     5. Granja: lotes, idade, curva, aves vivas, produção do dia
     6. Beneficiamento: recebimento, conferência, embalagens, estoque
     7. Pedidos e romaneio
     8. Acessos: telas de cada sistema e o que cada perfil vê
   ========================================================= */
var Dominio = (function () {
    'use strict';

    /* =====================================================
       1. LISTAS FIXAS
       ===================================================== */

    /* Motivos de morte (lista combinada com o Julio) */
    var MOTIVOS = ['Briga', 'Esmagamento', 'Sufocamento', 'Acidente físico (queda)', 'Cloaca estourada', 'Vermes', 'Descarte final (abate no frigorífico)', 'Outro'];

    /* Descarte previsto: semanas contadas do nascimento */
    var SEMANAS_DESCARTE = 92;

    /* Nº da coleta no dia: sem limite — cada coleta nova recebe o próximo número
       da colaboradora naquele dia (no mínimo 5 por dia, combinado em 18/11) */
    var NUM_COLETAS = [];
    function proximaColeta(db, data, quem) {
        var usados = (db.coletas || []).filter(function (c) { return c.data === data && String(c.coletado_por) === String(quem); }).map(function (c) { return n(c.n_coleta); });
        return String((usados.length ? Math.max.apply(null, usados) : 0) + 1);
    }

    /* Protocolo de vacinas da Ficha Controle de Lotes (idade em DIAS de vida → vacina).
       A data prevista sai sozinha: data de nascimento + idade.
       Pode ser trocado em Cadastros › Lotes das aves › Protocolo de vacinas. */
    var PROTOCOLO_VACINAS = [
        [2, 'Coccidiose'], [2, 'Bronquite'], [7, 'Gumboro forte'], [14, 'Newcastle'], [14, 'Salmonela / Bronquite'],
        [21, 'Gumboro forte'], [28, 'Salmonela'], [30, 'Gumboro forte'], [35, 'Gumboro, Newcastle e Bronquite'],
        [42, 'Bouba'], [42, 'Micoplasma'], [42, 'Coriza'], [66, 'Pasteurelose'], [66, 'Newcastle'], [66, 'Bronquite'],
        [90, 'Coriza'], [90, 'Newcastle'], [90, 'Bronquite'], [90, 'Salmonela'], [90, 'Síndrome da queda de postura']
    ];

    /* PAC – Plano de Autocontrole: código que aparece nas telas e nas folhas impressas */
    var PAC = {
        'b-recebimento': 'PAC 11 · Recebimento de ovos pelo entreposto',
        'b-beneficiamento': 'PAC 11 · Produção do entreposto',
        'perdas': 'PAC 11 · Perdas',
        'b-romaneio': 'PAC 16 · Romaneios',
        'b-embalagens': 'PAC 16 · Lote de embalagens',
        'estoque-embalagens': 'PAC 16 · Estoque de embalagens'
    };

    /* Checklist diário da granja (gestão), um por lote e dia */
    var CHECK_GRANJA = [
        ['cortinas', 'Cortinas limpas'],
        ['tachinhas', 'Tachinhas limpas'],
        ['ninhos', 'Ninhos ok'],
        ['piolho', 'Produto para piolho aplicado'],
        ['passeios', 'Passeios varridos'],
        ['mortalidade_verificada', 'Mortalidade verificada']
    ];

    /* Checklist do dia das colaboradoras: itens do lote */
    var CHECK_LOTE = [
        'Cama do lote está solta, sem pisoamento?',
        'Ninhos limpos e com cama',
        'Há ovos no chão?',
        'Há presença de galinhas mortas?',
        'Bebedouros limpos e completos',
        'Telas limpas',
        'Identificação dos lotes limpa e porta-álcool gel limpo',
        'Há galinhas doentes e tristes?',
        'Comedouros na altura certa',
        'Comedouros limpos sem excesso ou falta de ração',
        'Tampas dos ninhos estão no local correto',
        'Existe cesto no chão, na porta',
        'Existe outro material excedente dentro do lote',
        'Passeio em volta do lote está limpo',
        'Mantém o corredor do seu lote limpo?',
        'Colaboradora usa EPI',
        'Colaboradora tem faltas sem justificativa',
        'O caderno de anotações é organizado',
        'Colaboradora usa uniforme limpo',
        'Colaboradora é assídua com seus horários'
    ];

    /* Checklist do dia das colaboradoras: serviços gerais */
    var CHECK_GERAL = [
        'Vestiário está limpo, roupas ok e móveis limpos',
        'Sala de coleta está limpa',
        'Armários limpos e geladeira limpa na sala de coleta',
        'Banheiro da sala de coleta está limpo',
        'Clorador está com cloro',
        'Corredores estão limpos',
        'Está descendo para o entreposto no horário correto',
        'Há galinhas mortas no CR?',
        'Área externa da sala de coleta está limpa e sem lixo',
        'Lixo está sendo recolhido',
        'Tampas dos ninhos estão no local correto',
        'Planilha de cloro está preenchida',
        'Existe outro material fora do lugar na sala de coleta',
        'Área externa do CR está limpa?',
        'Planilha de controle de mosca está preenchida',
        'Colaboradora usa EPI',
        'Colaboradora tem faltas sem justificativa',
        'Colaboradora tem bom relacionamento com as colegas',
        'Colaboradora usa uniforme sempre limpo?',
        'Colaboradora é assídua com seus horários'
    ];

    /* Produtos que saem da máquina (chave → ovos por embalagem).
       A chave liga Produção, Estoque e Pedidos ao cadastro de Produtos. */
    var MAQUINA = [
        { chave: 'duzia', nome: 'Dúzia', ovos: 12 },
        { chave: 'pente20', nome: 'Pente 20 ovos G', ovos: 20 },
        { chave: 'pente30', nome: 'Pente 30 ovos G', ovos: 30 },
        { chave: 'caipirinho', nome: 'Pente 30 Caipirinho', ovos: 30 }
    ];

    /* Tipos de embalagem comprada. O Pente 30 G e o Caipirinho
       usam a MESMA embalagem (pente30). Caixa de papelão: 30 dúzias, 15 pentes de 20
       ou 10 pentes de 30 (G ou Caipirinho) por caixa (informado pela granja em 25/11/2026). */
    var TIPOS_EMBALAGEM = [
        { chave: 'duzia', nome: 'Dúzia (embalagem de 12)', usa: ['duzia'] },
        { chave: 'pente20', nome: 'Pente 20', usa: ['pente20'] },
        { chave: 'pente30', nome: 'Pente 30 (G e Caipirinho)', usa: ['pente30', 'caipirinho'] },
        { chave: 'caixa', nome: 'Caixa de papelão', usa: [] }
    ];


    /* =====================================================
       2. CURVAS DE POSTURA (% por semana de idade)
       Guias de manejo enviados pelo Bruno em 08/11/2026.
       ===================================================== */
    var CURVAS_GUIAS = {
    /* PCG = Embrapa 051 (poedeira colonial): Tabela 6 do manual da Embrapa, postura ave alojada (%) */
    "PCG": "20:0,52; 21:8,81; 22:30,62; 23:55,35; 24:74,56; 25:84,80; 26:88,85; 27:90,45; 28:90,71; 29:90,35; 30:89,73; 31:89,10; 32:88,48; 33:87,85; 34:87,23; 35:86,61; 36:85,98; 37:85,36; 38:84,74; 39:84,11; 40:83,49; 41:82,87; 42:82,24; 43:81,62; 44:81,00; 45:80,37; 46:79,75; 47:79,12; 48:78,50; 49:77,88; 50:77,25; 51:76,63; 52:76,01; 53:75,38; 54:74,76; 55:74,14; 56:73,51; 57:72,89; 58:72,27; 59:71,64; 60:71,02; 61:70,39; 62:69,77; 63:69,15; 64:68,52; 65:67,90; 66:67,28; 67:66,65; 68:66,03; 69:65,41; 70:64,78; 71:64,16; 72:63,54; 73:62,91; 74:62,29; 75:61,66; 76:61,04; 77:60,42; 78:59,79; 79:59,17; 80:58,55; 81:57,92; 82:57,30; 83:56,68; 84:56,05; 85:55,43; 86:54,81; 87:54,18; 88:53,56; 89:52,93; 90:52,31",
    "Novogen Brown": "19:1,0; 20:14,8; 21:39,0; 22:69,0; 23:87,9; 24:93,0; 25:94,5; 26:95,5; 27:96,2; 28:96,5; 29:96,5; 30:96,5; 31:96,5; 32:96,5; 33:96,5; 34:96,4; 35:96,3; 36:96,2; 37:96,1; 38:96,0; 39:95,8; 40:95,6; 41:95,4; 42:95,2; 43:95,0; 44:94,8; 45:94,5; 46:94,2; 47:93,9; 48:93,6; 49:93,5; 50:93,3; 51:93,1; 52:92,9; 53:92,7; 54:92,5; 55:92,1; 56:91,7; 57:91,1; 58:90,5; 59:90,1; 60:89,6; 61:89,0; 62:88,4; 63:87,9; 64:87,4; 65:86,8; 67:85,8; 68:85,3; 69:84,8; 70:84,3; 71:83,8; 72:83,1; 73:82,3; 74:81,3; 75:80,7; 76:79,9; 77:79,3; 78:78,7; 79:78,0; 80:77,5; 81:76,9; 82:76,3; 83:75,7; 84:74,9; 85:74,2; 86:73,5; 87:72,9; 88:72,1; 89:71,3; 90:70,7",
    "Novogen Tinted": "19:5,0; 20:25,0; 21:55,0; 22:78,0; 23:86,0; 24:91,0; 25:94,0; 26:95,0; 27:95,5; 28:95,5; 29:95,6; 30:95,8; 31:96,1; 32:96,1; 33:96,1; 34:96,0; 35:95,9; 36:95,9; 37:95,8; 38:95,7; 39:95,6; 40:95,5; 41:95,4; 42:95,3; 43:95,2; 44:95,1; 45:95,1; 46:95,1; 47:95,0; 48:94,9; 49:94,6; 50:94,2; 51:93,8; 52:93,5; 53:93,2; 54:92,9; 55:92,6; 56:92,3; 57:92,0; 58:91,6; 59:91,2; 60:91,0; 61:90,6; 62:90,2; 63:89,8; 64:89,3; 65:88,8; 66:88,2; 67:87,8; 68:87,2; 69:86,7; 70:86,3; 71:85,8; 72:85,6; 73:85,0; 74:84,4; 75:83,8; 76:83,2; 77:82,6; 78:82,0; 79:81,4; 80:80,9; 81:80,5; 82:80,1; 83:79,4; 84:78,7; 85:78,0; 86:77,3; 87:76,6; 88:75,9; 89:75,2; 90:74,5; 91:73,8; 92:73,1; 93:72,4; 94:71,7; 95:71,0; 96:70,8; 97:70,2; 98:69,9; 99:69,5; 100:69,0",
    "Novogen Brown Light": "19:1,0; 20:14,8; 21:39,0; 22:68,0; 23:86,3; 24:91,8; 25:93,3; 26:94,3; 27:95,0; 28:95,3; 29:95,3; 30:95,3; 31:95,3; 32:95,3; 33:95,3; 34:95,3; 35:95,3; 36:95,2; 37:95,1; 38:95,0; 39:94,9; 40:94,8; 41:94,7; 42:94,5; 43:94,3; 44:94,1; 45:94,0; 46:93,8; 47:93,7; 48:93,6; 49:93,5; 50:93,4; 51:93,2; 52:92,9; 53:92,6; 54:92,4; 55:92,3; 56:91,9; 57:91,5; 58:91,1; 59:90,7; 60:90,5; 61:90,3; 62:89,9; 63:89,5; 64:89,1; 65:88,6; 66:88,1; 67:87,6; 68:87,1; 69:86,6; 70:86,0; 71:85,7; 72:85,4; 73:84,9; 74:84,4; 75:83,8; 76:83,2; 77:82,6; 78:82,0; 79:81,4; 80:80,8; 81:80,2; 82:79,6; 83:79,0; 84:78,4; 85:77,7; 86:77,0; 87:76,3; 88:75,6; 89:74,9; 90:74,2",
    "HN Brown Nick": "19:9.8; 20:44.7; 21:67.1; 22:80.4; 23:88.4; 24:91.9; 25:93.2; 26:93.8; 27:94.2; 28:94.6; 29:94.8; 30:95.0; 31:95.1; 32:95.2; 33:95.2; 34:95.2; 35:95.1; 36:95.0; 37:94.9; 38:94.8; 39:94.6; 40:94.4; 41:94.2; 42:94.0; 43:93.8; 44:93.6; 45:93.4; 46:93.1; 47:92.8; 48:92.5; 49:92.2; 50:91.8; 51:91.5; 52:91.2; 53:90.7; 54:90.4; 55:90.0; 56:89.6; 57:89.2; 58:88.8; 59:88.3; 60:87.8; 61:87.3; 62:86.8; 63:86.3; 64:85.8; 65:85.3; 66:84.8; 67:84.3; 68:83.8; 69:83.3; 70:82.8; 71:82.3; 72:81.8; 73:81.3; 74:80.8; 75:80.3; 76:79.8; 77:79.3; 78:78.8; 79:78.3; 80:77.8; 81:77.3; 82:76.8; 83:76.3; 84:75.7; 85:75.1; 86:74.5; 87:73.9; 88:73.3; 89:72.7; 90:72.1; 91:71.5; 92:70.9; 93:70.3; 94:69.7; 95:69.1; 96:68.5; 97:67.9; 98:67.3; 99:66.7; 100:66.1",
    "Novogen Color Blue": "21:15,0; 22:38,0; 23:65,0; 24:75,0; 25:85,0; 26:89,0; 27:91,5; 28:91,5; 29:91,5; 30:91,5; 31:91,5; 32:91,4; 33:91,3; 34:91,2; 35:91,1; 36:91,0; 37:90,8; 38:90,6; 39:90,4; 40:90,2; 41:89,9; 42:89,6; 43:89,3; 44:89,0; 45:88,7; 46:88,3; 47:87,9; 48:87,5; 49:87,1; 50:86,6; 51:86,0; 52:85,7; 53:85,6; 54:84,8; 55:84,5; 56:83,6; 57:83,0; 58:82,5; 59:81,7; 60:81,0; 61:80,1; 62:79,5; 63:78,7; 64:77,9; 65:77,1; 66:76,5; 67:75,7; 68:75,1; 69:74,5; 70:73,6; 71:72,5; 72:71,1; 73:70,2; 74:69,5; 75:68,4; 76:67,0; 77:65,9; 78:64,8; 79:63,5; 80:62,6",
    "Embrapa 051": "20:0,52; 21:8,81; 22:30,62; 23:55,35; 24:74,56; 25:84,80; 26:88,85; 27:90,45; 28:90,71; 29:90,35; 30:89,73; 31:89,10; 32:88,48; 33:87,85; 34:87,23; 35:86,61; 36:85,98; 37:85,36; 38:84,74; 39:84,11; 40:83,49; 41:82,87; 42:82,24; 43:81,62; 44:81,00; 45:80,37; 46:79,75; 47:79,12; 48:78,50; 49:77,88; 50:77,25; 51:76,63; 52:76,01; 53:75,38; 54:74,76; 55:74,14; 56:73,51; 57:72,89; 58:72,27; 59:71,64; 60:71,02; 61:70,39; 62:69,77; 63:69,15; 64:68,52; 65:67,90; 66:67,28; 67:66,65; 68:66,03; 69:65,41; 70:64,78; 71:64,16; 72:63,54; 73:62,91; 74:62,29; 75:61,66; 76:61,04; 77:60,42; 78:59,79; 79:59,17; 80:58,55; 81:57,92; 82:57,30; 83:56,68; 84:56,05; 85:55,43; 86:54,81; 87:54,18; 88:53,56; 89:52,93; 90:52,31"
  };


    /* =====================================================
       3. TABELAS
       Cada tabela = uma aba da planilha.
       Campo: { k: chave, r: rótulo, t: tipo, obr: obrigatório,
                op: opções (quando t = 'opcoes') }
       Tipos: texto, longo, numero, data, opcoes, simnao,
              lote (lotes da granja), receb (lotes recebidos),
              cliente, linhagem, motivo, tipoemb
       Toda linha ganha sozinha: id, criado_em,
       lancado_por e alterado_por.
       ===================================================== */
    var TABELAS = {
        /* ---------- Acesso ---------- */
        usuarios: { aba: 'Usuarios', titulo: 'Usuários', campos: [
            { k: 'nome', r: 'Nome', t: 'texto', obr: true },
            { k: 'usuario', r: 'Usuário (login)', t: 'texto', obr: true },
            { k: 'perfil', r: 'Perfil', t: 'opcoes', op: ['Administrador', 'Granja e Beneficiamento', 'Colaboradora'], obr: true },
            { k: 'acessos', r: 'Telas liberadas', t: 'texto' },
            { k: 'lotes', r: 'Lotes liberados', t: 'texto' },
            { k: 'situacao', r: 'Situação', t: 'opcoes', op: ['Ativo', 'Bloqueado'], obr: true }
        ] },

        /* ---------- Granja ---------- */
        lotes: { aba: 'Lotes', titulo: 'Lotes', campos: [
            { k: 'lote', r: 'Lote (número/ano, ex.: 20/2026)', t: 'texto', obr: true },
            { k: 'linhagem', r: 'Linhagem / raça', t: 'linhagem', obr: true },
            { k: 'data_nascimento', r: 'Data de nascimento', t: 'data' },
            { k: 'data_inicio', r: 'Data de chegada (alojamento)', t: 'data', obr: true },
            { k: 'aves_iniciais', r: 'Aves alojadas', t: 'numero', obr: true },
            { k: 'descarte_previsto', r: 'Descarte previsto', t: 'data' },
            { k: 'origem', r: 'Origem', t: 'texto' },
            { k: 'cidade', r: 'Cidade', t: 'texto' },
            { k: 'gta', r: 'GTA', t: 'texto' },
            { k: 'nota_fiscal', r: 'Nota fiscal', t: 'texto' },
            { k: 'data_nota', r: 'Data da nota fiscal', t: 'data' },
            { k: 'ativo', r: 'Ativo', t: 'simnao', obr: true }
        ] },
        linhagens: { aba: 'Linhagens', titulo: 'Linhagens', campos: [
            { k: 'linhagem', r: 'Linhagem', t: 'texto', obr: true },
            { k: 'curva_postura', r: 'Curva de postura (semana:%; ...)', t: 'longo' },
            { k: 'curva_peso', r: 'Curva de peso (semana:g; ...)', t: 'longo' },
            { k: 'observacao', r: 'Observação', t: 'longo' }
        ] },
        coletas: { aba: 'Coletas', titulo: 'Coletas', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'n_coleta', r: 'Nº da coleta no dia', t: 'numero', obr: true },
            { k: 'coletado_por', r: 'Coletado por', t: 'texto', obr: true },
            { k: 'bons', r: 'Ovos bons', t: 'numero' },
            { k: 'trincados', r: 'Ovos trincados', t: 'numero' },
            { k: 'defeituosos', r: 'Ovos defeituosos', t: 'numero' },
            { k: 'sujos', r: 'Ovos sujos', t: 'numero' },
            { k: 'conformidade', r: 'Conformidade', t: 'opcoes', op: ['Conforme', 'Não conforme'] },
            { k: 'observacao', r: 'Observação (o que faltou)', t: 'longo' },
            { k: 'motivo_data', r: 'Motivo de lançar em outro dia (coleta esquecida)', t: 'texto' }
        ] },
        producao: { aba: 'ProducaoDiaria', titulo: 'Produção diária (ovos pequenos e ovos por lote)', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote', t: 'lote', obr: true },
            { k: 'ovos_lote', r: 'Ovos do lote no dia (contagem do fim do dia)', t: 'numero' },
            { k: 'pequenos', r: 'Ovos pequenos', t: 'numero' },
            { k: 'observacao', r: 'Observação', t: 'texto' }
        ] },
        mortalidade: { aba: 'Mortalidade', titulo: 'Mortalidade e abate', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote', t: 'lote', obr: true },
            { k: 'mortes', r: 'Mortes', t: 'numero' },
            { k: 'abate', r: 'Abate', t: 'numero' },
            { k: 'motivo', r: 'Motivo', t: 'motivo', obr: true },
            { k: 'observacao', r: 'Observação', t: 'longo' }
        ] },
        saida: { aba: 'SaidaOvos', titulo: 'Saída de ovos', campos: [
            { k: 'data', r: 'Data de postura', t: 'data', obr: true },
            { k: 'lote', r: 'Lote', t: 'lote', obr: true },
            { k: 'bons', r: 'Ovos bons', t: 'numero' },
            { k: 'trincados', r: 'Ovos trincados', t: 'numero' },
            { k: 'defeituosos', r: 'Ovos defeituosos', t: 'numero' },
            { k: 'sujos', r: 'Ovos sujos', t: 'numero' },
            { k: 'def_sujos', r: 'Defeituosos + sujos (soma)', t: 'numero' },
            { k: 'responsavel', r: 'Responsável', t: 'texto', obr: true }
        ] },
        checklist_granja: { aba: 'ChecklistGranja', titulo: 'Checklist diário', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote', t: 'lote', obr: true }
        ].concat(CHECK_GRANJA.map(function (c) { return { k: c[0], r: c[1], t: 'simnao' }; })).concat([
            { k: 'racao', r: 'Nível da ração', t: 'opcoes', op: ['Ok', 'Baixa', 'Acabou'] },
            { k: 'observacao', r: 'Observação', t: 'texto' }
        ]) },
        pesagens: { aba: 'PesoSemanal', titulo: 'Peso semanal', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote', t: 'lote', obr: true },
            { k: 'peso_medio', r: 'Peso médio (g)', t: 'numero', obr: true },
            { k: 'aves_pesadas', r: 'Aves pesadas', t: 'numero' },
            { k: 'pesos', r: 'Peso de cada ave em gramas (opcional: a média sai sozinha)', t: 'longo' },
            { k: 'uniformidade', r: 'Uniformidade (%)', t: 'numero' },
            { k: 'observacao', r: 'Observação', t: 'texto' }
        ] },
        tarefas: { aba: 'Tarefas', titulo: 'Tarefas', campos: [
            { k: 'descricao', r: 'Descrição (de 10 a 150 letras)', t: 'texto', obr: true },
            { k: 'lote', r: 'Lote (opcional)', t: 'lote' },
            { k: 'dia', r: 'Quando', t: 'opcoes', op: ['Todos os dias', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Data específica'], obr: true },
            { k: 'data_especifica', r: 'Data específica', t: 'data' },
            { k: 'responsavel', r: 'Responsável', t: 'texto', obr: true },
            { k: 'obrigatoria', r: 'Obrigatória', t: 'simnao' },
            { k: 'ativo', r: 'Ativa', t: 'simnao' }
        ] },
        tarefas_feitas: { aba: 'TarefasFeitas', titulo: 'Tarefas feitas', campos: [
            { k: 'tarefa', r: 'Tarefa (id)', t: 'texto', obr: true },
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'feita_por', r: 'Feita por', t: 'texto' },
            { k: 'observacao', r: 'Observação', t: 'longo' }
        ] },
        vacinas: { aba: 'Vacinas', titulo: 'Vacinas aplicadas', campos: [
            { k: 'lote', r: 'Lote', t: 'lote', obr: true },
            { k: 'idade', r: 'Idade (dias)', t: 'numero', obr: true },
            { k: 'vacina', r: 'Vacina', t: 'texto', obr: true },
            { k: 'data_prevista', r: 'Data prevista', t: 'data' },
            { k: 'data_aplicada', r: 'Data aplicada', t: 'data', obr: true },
            { k: 'aplicado_por', r: 'Aplicado por', t: 'texto' },
            { k: 'observacao', r: 'Observação', t: 'texto' }
        ] },
        alertas: { aba: 'Alertas', titulo: 'Alertas', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote (opcional)', t: 'lote' },
            { k: 'gravidade', r: 'Gravidade', t: 'opcoes', op: ['Urgente', 'Atenção'], obr: true },
            { k: 'descricao', r: 'Descrição (de 15 a 300 letras)', t: 'longo', obr: true },
            { k: 'registrado_por', r: 'Registrado por', t: 'texto' },
            { k: 'resolvido', r: 'Resolvido', t: 'simnao' }
        ] },

        /* ---------- Beneficiamento ---------- */
        recebimentos: { aba: 'Recebimentos', titulo: 'Recebimento', campos: [
            { k: 'lote_receb', r: 'Lote (automático)', t: 'texto', obr: true },
            { k: 'data_postura', r: 'Data do lote (postura)', t: 'data', obr: true },
            { k: 'lote_granja', r: 'Lote da granja', t: 'lote' },
            { k: 'bom', r: 'Ovo bom', t: 'numero', obr: true },
            { k: 'trincado', r: 'Ovo trincado', t: 'numero' },
            { k: 'defeito', r: 'Ovo com defeito', t: 'numero' },
            { k: 'sujo', r: 'Ovo sujo', t: 'numero' }
        ] },
        embalagens: { aba: 'Embalagens', titulo: 'Lançamento de embalagens', campos: [
            { k: 'tipo', r: 'Tipo de embalagem', t: 'tipoemb', obr: true },
            { k: 'lote', r: 'Lote (automático)', t: 'texto', obr: true },
            { k: 'nota_fiscal', r: 'Nota fiscal nº', t: 'texto', obr: true },
            { k: 'data_compra', r: 'Data da compra', t: 'data', obr: true },
            { k: 'fornecedor', r: 'Fornecedor', t: 'texto' },
            { k: 'comprado', r: 'Quantidade comprada', t: 'numero', obr: true },
            { k: 'aviso_minimo', r: 'Avisar quando baixar de', t: 'numero' }
        ] },
        producoes: { aba: 'Producoes', titulo: 'Beneficiamento', campos: [
            { k: 'lote_receb', r: 'Lote recebido', t: 'receb', obr: true },
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'duzia', r: 'Dúzia', t: 'numero' },
            { k: 'pente20', r: 'Pente 20 G', t: 'numero' },
            { k: 'pente30', r: 'Pente 30 G', t: 'numero' },
            { k: 'caipirinho', r: 'Pente 30 Caipirinho', t: 'numero' },
            { k: 'trincado', r: 'Trincado', t: 'numero' },
            { k: 'defeito', r: 'Defeito', t: 'numero' },
            { k: 'sujo', r: 'Sujo', t: 'numero' },
            { k: 'quebrado', r: 'Quebrado (sucção da máquina)', t: 'numero' },
            { k: 'sobra', r: 'Sobra', t: 'numero' },
            { k: 'embalagens_usadas', r: 'Embalagens usadas', t: 'texto' },
            { k: 'diferenca', r: 'Diferença na conferência', t: 'texto' }
        ] },
        produtos: { aba: 'Produtos', titulo: 'Produtos', campos: [
            { k: 'nome', r: 'Nome do produto', t: 'texto', obr: true },
            { k: 'curto', r: 'Nome público (o que sai no romaneio)', t: 'texto' },
            { k: 'codigo_barras', r: 'Código de barras (EAN-13)', t: 'texto', obr: true, so: 'digitos' },
            { k: 'ovos', r: 'Ovos por embalagem', t: 'numero', obr: true },
            { k: 'estoque_minimo', r: 'Estoque mínimo (avisa no pedido)', t: 'numero' },
            { k: 'maquina', r: 'Sai da máquina como', t: 'opcoes', op: ['', 'duzia', 'pente20', 'pente30', 'caipirinho'] }
        ] },
        clientes: { aba: 'Clientes', titulo: 'Clientes', campos: [
            { k: 'codigo', r: 'Código (automático)', t: 'texto', obr: true, so: 'digitos' },
            { k: 'nome', r: 'Nome / razão social', t: 'texto', obr: true },
            { k: 'cnpj', r: 'CPF / CNPJ (só números)', t: 'texto', obr: true, so: 'doc' },
            { k: 'tipo', r: 'Tipo de cliente', t: 'opcoes', op: ['', 'Mercado', 'Escola (merenda)', 'Restaurante', 'Padaria', 'Hotel', 'Pessoa física', 'Outro'] },
            { k: 'cep', r: 'CEP', t: 'texto', so: 'cep' },
            { k: 'endereco', r: 'Rua e número', t: 'texto' },
            { k: 'bairro', r: 'Bairro', t: 'texto' },
            { k: 'cidade', r: 'Cidade / Estado', t: 'texto' },
            { k: 'telefone', r: 'Telefone', t: 'texto', so: 'tel' },
            { k: 'email', r: 'E-mail', t: 'texto' },
            { k: 'vendedor', r: 'Vendedor', t: 'texto' },
            { k: 'tel_vendedor', r: 'Telefone do vendedor', t: 'texto', so: 'tel' },
            { k: 'lembrete', r: 'Lembrete (aparece no pedido)', t: 'longo' }
        ] },
        pedidos: { aba: 'Pedidos', titulo: 'Pedidos', campos: [
            { k: 'numero', r: 'Nº', t: 'numero', obr: true },
            { k: 'cliente', r: 'Cliente', t: 'cliente', obr: true },
            { k: 'data_pedido', r: 'Data do pedido', t: 'data', obr: true },
            { k: 'entrega', r: 'Entrega prevista', t: 'data' },
            { k: 'itens', r: 'Itens', t: 'texto' },
            { k: 'observacao', r: 'Observação', t: 'texto' },
            { k: 'situacao', r: 'Situação', t: 'opcoes', op: ['A entregar', 'Entregue'] },
            { k: 'motorista', r: 'Motorista', t: 'texto' },
            { k: 'placa', r: 'Placa', t: 'texto' },
            { k: 'conferido_por', r: 'Conferido por', t: 'texto' },
            { k: 'lotes', r: 'Lotes do romaneio', t: 'texto' },
            { k: 'fechado_em', r: 'Fechado em', t: 'data' },
            { k: 'diferenca', r: 'Diferença no fechamento', t: 'longo' }
        ] },

        /* ---------- Colaboradoras ---------- */
        checklist_colab: { aba: 'ChecklistColab', titulo: 'Checklist das colaboradoras', campos: [
            { k: 'data', r: 'Data', t: 'data', obr: true },
            { k: 'lote', r: 'Lote (vazio = serviços gerais)', t: 'lote' },
            { k: 'tipo', r: 'Tipo', t: 'opcoes', op: ['lote', 'geral'], obr: true },
            { k: 'colaboradora', r: 'Colaboradora', t: 'texto' },
            { k: 'respostas', r: 'Respostas', t: 'texto' },
            { k: 'c', r: 'Conformes', t: 'numero' },
            { k: 'nc', r: 'Não conformes', t: 'numero' },
            { k: 'observacao', r: 'Observação', t: 'texto' }
        ] },

        /* ---------- Sistema ---------- */
        config: { aba: 'Config', titulo: 'Configurações', campos: [
            { k: 'chave', r: 'Chave', t: 'texto', obr: true },
            { k: 'valor', r: 'Valor', t: 'longo' }
        ] },
        alteracoes: { aba: 'Alteracoes', titulo: 'Registro de alterações', campos: [
            { k: 'data', r: 'Dia', t: 'data' },
            { k: 'hora', r: 'Hora', t: 'texto' },
            { k: 'quem', r: 'Quem', t: 'texto' },
            { k: 'sistema', r: 'Sistema', t: 'texto' },
            { k: 'o_que', r: 'O que mudou', t: 'texto' }
        ] }
    };
    var CHAVES = Object.keys(TABELAS);


    /* =====================================================
       4. DATAS (sempre guardadas como "aaaa-mm-dd")
       ===================================================== */
    function iso(d) {
        d = d || new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function hoje() { return iso(new Date()); }
    function somarDias(dataIso, n) {
        var d = new Date(dataIso + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return iso(d);
    }
    function diasEntre(a, b) {
        return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
    }
    /* "aaaa-mm-dd" → "dd/mm/aaaa" */
    function br(dataIso) { return dataIso ? String(dataIso).slice(0, 10).split('-').reverse().join('/') : ''; }
    /* "aaaa-mm-dd" → "dd/mm" */
    function diaMes(dataIso) { return br(dataIso).slice(0, 5); }
    /* Data está entre De e Até? */
    function noPeriodo(dataIso, de, ate) {
        if (!dataIso) return false;
        var d = String(dataIso).slice(0, 10);
        return (!de || d >= de) && (!ate || d <= ate);
    }
    /* Semana (seg a dom) ou mês da data de hoje */
    function periodo(tipo) {
        var h = new Date();
        if (tipo === 'dia') return { de: iso(h), ate: iso(h) };
        if (tipo === 'mes') return { de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
        var seg = new Date(h); seg.setDate(h.getDate() - ((h.getDay() + 6) % 7));
        var dom = new Date(seg); dom.setDate(seg.getDate() + 6);
        return { de: iso(seg), ate: iso(dom) };
    }


    /* =====================================================
       5. GRANJA
       ===================================================== */
    var n = function (v) { return Number(v) || 0; };
    var mesmoLote = function (a, b) { return String(a == null ? '' : a) === String(b == null ? '' : b); };   // '' = granja toda (coleta por dia)

    /* Próximo número de lote da granja: maior + 1 ("03") */
    /* Lote de aves = número + ano de alojamento (ex.: 20/2026). Quando a turma
       é descartada, o mesmo espaço recebe o lote do ano seguinte (20/2027). */
    function proximoLote(db, ano) {
        ano = String(ano || hoje().slice(0, 4));
        var nums = (db.lotes || []).filter(function (l) { return String(l.lote).split('/')[1] === ano; })
            .map(function (l) { return parseInt(String(l.lote).split('/')[0], 10); }).filter(isFinite);
        return String((nums.length ? Math.max.apply(null, nums) : 0) + 1).padStart(2, '0') + '/' + ano;
    }
    function lotesAtivos(db) { return (db.lotes || []).filter(function (l) { return l.ativo !== 'Não'; }); }
    function acharLote(db, lote) { return (db.lotes || []).find(function (l) { return mesmoLote(l.lote, lote); }); }
    function nomeLote(db, lote) {
        if (lote == null || lote === '') return 'Granja toda';           // coletas são por dia, sem lote de galinhas
        var l = acharLote(db, lote);
        return 'Lote ' + lote + (l && l.linhagem ? ' · ' + l.linhagem : '');
    }

    /* Descarte = nascimento + 92 semanas (sem nascimento, conta do alojamento) */
    function descartePrevisto(lote) {
        var base = lote.data_nascimento || lote.data_inicio;
        return base ? somarDias(base, SEMANAS_DESCARTE * 7) : '';
    }

    /* Idade em semanas pela data de nascimento (ou alojamento) */
    function idade(lote, data) {
        var base = lote.data_nascimento || lote.data_inicio;
        data = data || hoje();
        if (!base || data < base) return null;
        return Math.floor(diasEntre(base, data) / 7);
    }

    /* Curva "19:1,0; 20:14,8" → [[19, 1.0], [20, 14.8]] */
    function lerCurva(texto) {
        return String(texto || '').split(/[;\n]+/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) {
            var m = /^(\d{1,3})\s*[:=]\s*(\d+(?:[.,]\d+)?)$/.exec(p);
            return m ? [Number(m[1]), Number(m[2].replace(',', '.'))] : null;
        }).filter(Boolean).sort(function (a, b) { return a[0] - b[0]; });
    }
    /* Valor da curva numa semana (interpola entre os pontos) */
    function valorCurva(pontos, semana) {
        if (!pontos.length || semana == null) return null;
        if (semana < pontos[0][0]) return 0;
        for (var i = pontos.length - 1; i >= 0; i--) {
            if (semana >= pontos[i][0]) {
                var a = pontos[i], b = pontos[i + 1];
                return b ? a[1] + (b[1] - a[1]) * (semana - a[0]) / (b[0] - a[0]) : a[1];
            }
        }
        return null;
    }
    /* % de postura esperado pelo guia da linhagem, na semana do lote */
    function posturaGuia(db, lote, semana) {
        var lin = (db.linhagens || []).find(function (x) { return String(x.linhagem).toLowerCase() === String(lote.linhagem || '').toLowerCase(); });
        var texto = lin && String(lin.curva_postura || '').trim() ? lin.curva_postura : CURVAS_GUIAS[lote.linhagem];   // linhagem sem curva cadastrada: usa a do guia
        return valorCurva(lerCurva(texto), semana);
    }

    /* PESO: curva de peso do guia da linhagem (Cadastros › Linhagens, "semana:gramas; ...") */
    function pesoGuia(db, lote, semana) {
        var lin = (db.linhagens || []).find(function (x) { return String(x.linhagem).toLowerCase() === String(lote.linhagem || '').toLowerCase(); });
        return lin ? valorCurva(lerCurva(lin.curva_peso), semana) : null;
    }
    function temCurvaPeso(db, lote) {
        var lin = (db.linhagens || []).find(function (x) { return String(x.linhagem).toLowerCase() === String(lote.linhagem || '').toLowerCase(); });
        return !!(lin && lerCurva(lin.curva_peso).length);
    }
    /* Uma pesagem comparada com o guia: idade em semanas, peso esperado e a diferença */
    function avaliarPesagem(db, p) {
        var l = acharLote(db, p.lote), sem = l ? idade(l, p.data) : null, guia = l ? pesoGuia(db, l, sem) : null, peso = n(p.peso_medio);
        var dif = guia ? peso - guia : null;
        return { lote: l, semana: sem, guia: guia, dif: dif, pct: guia ? dif / guia * 100 : null,
            situacao: guia == null ? 'sem guia' : Math.abs(dif / guia) <= 0.05 ? 'no guia' : dif < 0 ? 'abaixo' : 'acima' };
    }
    /* Pesos digitados ave por ave ("1450 1520 1490..." ou um por linha) → média, mínimo, máximo,
       uniformidade (% das aves com peso até 10% acima ou abaixo da média) e CV */
    function estatPesos(texto) {
        var v = String(texto || '').split(/[\s;]+|,(?=\s)/).map(function (x) { return Number(String(x).replace(/\./g, '').replace(',', '.')); })
            .filter(function (x) { return x > 0; });
        if (!v.length) return null;
        var media = v.reduce(function (s, x) { return s + x; }, 0) / v.length;
        var dp = Math.sqrt(v.reduce(function (s, x) { return s + (x - media) * (x - media); }, 0) / v.length);
        var dentro = v.filter(function (x) { return Math.abs(x - media) <= media * 0.1; }).length;
        return { qtd: v.length, media: Math.round(media), min: Math.min.apply(null, v), max: Math.max.apply(null, v),
            uniformidade: Math.round(dentro / v.length * 100), cv: media ? Math.round(dp / media * 1000) / 10 : 0, valores: v };
    }
    /* Última pesagem de cada lote ativo e há quantos dias foi */
    var DIAS_PESAGEM = 7;
    function pesagemDosLotes(db) {
        var hj = hoje();
        return lotesAtivos(db).map(function (l) {
            var ps = (db.pesagens || []).filter(function (p) { return String(p.lote) === String(l.lote); }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
            var ult = ps[0] || null, desde = ult ? ult.data : l.data_inicio;
            return { lote: l, ultima: ult, avaliacao: ult ? avaliarPesagem(db, ult) : null, dias: desde && desde <= hj ? diasEntre(desde, hj) : null };
        });
    }

    /* Aves vivas = alojadas − mortes − abates (até a data) */
    function avesVivas(db, lote, ate) {
        var perdas = (db.mortalidade || []).filter(function (r) { return mesmoLote(r.lote, lote.lote) && (!ate || r.data <= ate); })
            .reduce(function (s, r) { return s + n(r.mortes) + n(r.abate); }, 0);
        return n(lote.aves_iniciais) - perdas;
    }

    /* COLETA POR DIA
       A coleta não tem lote de galinhas: todas as coletas do dia formam
       o lote da coleta (ex.: 1811). Por isso a postura do dia é da granja
       toda: ovos do dia ÷ aves vivas de todos os lotes alojados. */
    function lotesNoDia(db, data) {
        return (db.lotes || []).filter(function (l) { return l.ativo !== 'Não' && (!l.data_inicio || l.data_inicio <= data); });
    }
    function avesNoDia(db, lote, data) {
        if (lote != null && lote !== '') { var l = acharLote(db, lote); return l ? avesVivas(db, l, data) : 0; }
        return lotesNoDia(db, data).reduce(function (s, l) { return s + Math.max(0, avesVivas(db, l, data)); }, 0);
    }
    /* Guia do dia: o do lote, ou a média dos guias pesada pelas aves de cada lote */
    function guiaNoDia(db, lote, data) {
        if (lote != null && lote !== '') { var l = acharLote(db, lote); return l ? posturaGuia(db, l, idade(l, data)) : null; }
        var soma = 0, aves = 0;
        lotesNoDia(db, data).forEach(function (l) {
            var g = posturaGuia(db, l, idade(l, data)), v = Math.max(0, avesVivas(db, l, data));
            if (g != null && v) { soma += g * v; aves += v; }
        });
        return aves ? soma / aves : null;
    }
    /* Postura no período: ovos ÷ dias com coleta ÷ aves (lote '' = granja toda) */
    /* Para um lote de aves (não a granja toda), a equipe pode lançar uma vez
       por dia a contagem do lote (Produção diária › Ovos por lote): é o que
       dá a postura de CADA lote, sem a colaboradora escolher lote na coleta. */
    function posturaPeriodo(db, lote, de, ate) {
        var c = (db.coletas || []).filter(function (x) { return mesmoLote(x.lote, lote) && noPeriodo(x.data, de, ate); });
        var porDia = {};
        c.forEach(function (x) { porDia[x.data] = n(porDia[x.data]) + totalColeta(x); });
        var contagem = false;
        if (lote != null && lote !== '') (db.producao || []).forEach(function (p) {
            if (mesmoLote(p.lote, lote) && n(p.ovos_lote) > 0 && noPeriodo(p.data, de, ate)) { porDia[p.data] = n(p.ovos_lote); contagem = true; }
        });
        var nd = Object.keys(porDia).length, t = Object.keys(porDia).reduce(function (s, d) { return s + porDia[d]; }, 0);
        var b = c.reduce(function (s, x) { return s + n(x.bons); }, 0), v = avesNoDia(db, lote, ate);
        return { coletas: c, total: t, bons: contagem ? null : b, dias: nd, aves: v, real: nd && v ? t / nd / v * 100 : 0, guia: guiaNoDia(db, lote, ate), contagem: contagem };
    }
    /* Ovos de cada lote num dia (contagem do fim do dia), se a equipe lançou */
    function ovosPorLote(db, data) {
        var out = {};
        (db.producao || []).forEach(function (p) { if (p.data === data && p.lote && n(p.ovos_lote) > 0) out[p.lote] = n(p.ovos_lote); });
        return out;
    }

    /* VACINAS (Ficha Controle de Lotes)
       Protocolo: uma linha por vacina, "idade em dias - vacina". Fica em
       Config (protocolo_vacinas); se não tiver, usa o da ficha da granja. */
    function protocoloVacinas(db) {
        var cfg = (db.config || []).find(function (c) { return c.chave === 'protocolo_vacinas'; });
        var linhas = cfg && String(cfg.valor || '').trim() ? String(cfg.valor).split(/\n|;/) : null;
        if (!linhas) return PROTOCOLO_VACINAS.map(function (p) { return { idade: p[0], vacina: p[1] }; });
        return linhas.map(function (l) { var m = /^\s*(\d+)\s*[-:–]\s*(.+)$/.exec(l); return m ? { idade: Number(m[1]), vacina: m[2].trim() } : null; })
            .filter(Boolean).sort(function (a, b) { return a.idade - b.idade; });
    }
    function textoProtocolo(db) { return protocoloVacinas(db).map(function (p) { return p.idade + ' - ' + p.vacina; }).join('\n'); }
    /* Vacinas de um lote: data prevista = nascimento + idade; situação pela data de hoje */
    function vacinasDoLote(db, l) {
        var hj = hoje();
        return protocoloVacinas(db).map(function (p) {
            var feita = (db.vacinas || []).find(function (v) { return mesmoLote(v.lote, l.lote) && Number(v.idade) === p.idade && v.vacina === p.vacina; });
            var prevista = l.data_nascimento ? somarDias(l.data_nascimento, p.idade) : '';
            var situacao = feita && feita.data_aplicada ? 'Aplicada' : !prevista ? 'Sem data de nascimento' : prevista < hj ? 'Atrasada' : prevista === hj ? 'Hoje' : 'Prevista';
            return { idade: p.idade, vacina: p.vacina, prevista: prevista, feita: feita || null, situacao: situacao };
        });
    }
    /* Controle de idades: semana 1 = nascimento + 7 dias, até o descarte */
    function controleIdades(l) {
        if (!l.data_nascimento) return [];
        var out = [];
        for (var s = 1; s <= SEMANAS_DESCARTE; s++) out.push({ semana: s, data: somarDias(l.data_nascimento, s * 7) });
        return out;
    }

    /* TAREFAS DO DIA: as que valem para a data, com quem fez */
    var DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    function tarefasDoDia(db, data) {
        var dia = DIAS_SEMANA[new Date(data + 'T12:00:00').getDay()];
        return (db.tarefas || []).filter(function (t) {
            return t.ativo !== 'Não' && (t.dia === 'Todos os dias' || t.dia === dia || (t.dia === 'Data específica' && t.data_especifica === data));
        }).map(function (t) {
            return { tarefa: t, feita: (db.tarefas_feitas || []).find(function (f) { return String(f.tarefa) === String(t.id) && f.data === data; }) || null };
        });
    }

    /* Total de uma coleta */
    function totalColeta(c) { return n(c.bons) + n(c.trincados) + n(c.defeituosos) + n(c.sujos); }

    /* Produção diária = soma das coletas do dia e do lote (não é digitada) */
    function producaoDiaria(db) {
        var grupos = {};
        (db.coletas || []).forEach(function (c) {
            var lote = String(c.lote == null ? '' : c.lote), k = c.data + '|' + lote;
            var g = grupos[k] || (grupos[k] = { data: c.data, lote: lote, coletas: 0, bons: 0, trincados: 0, def_sujos: 0, total: 0, pequenos: 0 });
            g.coletas++;
            g.bons += n(c.bons);
            g.trincados += n(c.trincados);
            g.def_sujos += n(c.defeituosos) + n(c.sujos);
            g.total = g.bons + g.trincados + g.def_sujos;
        });
        (db.producao || []).forEach(function (p) {
            var g = grupos[p.data + '|' + (p.lote == null ? '' : p.lote)];
            if (g) g.pequenos = n(p.pequenos);
        });
        return Object.keys(grupos).map(function (k) { return grupos[k]; })
            .sort(function (a, b) { return b.data.localeCompare(a.data) || a.lote.localeCompare(b.lote); });
    }

    /* Saída de ovos sugerida = produção do dia (soma das coletas) */
    function sugestaoSaida(db, data, lote) {
        var p = producaoDiaria(db).find(function (x) { return x.data === data && mesmoLote(x.lote, lote); });
        return p ? { bons: p.bons, trincados: p.trincados, def_sujos: p.def_sujos } : null;
    }
    function totalSaida(s) { return n(s.bons) + n(s.trincados) + n(s.def_sujos); }

    /* Soma das coletas de um dia e lote, com defeituosos e sujos separados
       (é o que chega ao beneficiamento) */
    function coletasDoDia(db, data, lote) {
        var c = (db.coletas || []).filter(function (x) { return x.data === data && mesmoLote(x.lote, lote); });
        if (!c.length) return null;
        var soma = function (k) { return c.reduce(function (s, x) { return s + n(x[k]); }, 0); };
        var quem = c.map(function (x) { return x.coletado_por; }).filter(function (q, i, a) { return q && a.indexOf(q) === i; });
        return { data: data, lote: String(lote), coletas: c.length, bons: soma('bons'), trincados: soma('trincados'),
            defeituosos: soma('defeituosos'), sujos: soma('sujos'), total: soma('bons') + soma('trincados') + soma('defeituosos') + soma('sujos'), quem: quem };
    }

    /* SAÍDA DE OVOS AUTOMÁTICA
       A saída de cada dia e lote sai sozinha das coletas. Se alguém da
       granja ajustar (aba Saída de ovos), vale o ajuste. */
    function saidaDoDia(db, data, lote) {
        var manual = (db.saida || []).find(function (s) { return s.data === data && mesmoLote(s.lote, lote); });
        if (manual) return Object.assign({ automatica: false }, manual);
        var c = coletasDoDia(db, data, lote);
        if (!c) return null;
        return { data: data, lote: String(lote), bons: c.bons, trincados: c.trincados, defeituosos: c.defeituosos, sujos: c.sujos, def_sujos: c.defeituosos + c.sujos,
            responsavel: c.quem.join(', ') || 'Coletas', automatica: true, coletas: c.coletas, quem: c.quem };
    }
    /* Todas as saídas (automáticas e ajustadas), mais recentes primeiro */
    function saidas(db) {
        var chaves = {};
        (db.coletas || []).forEach(function (c) { chaves[c.data + '|' + (c.lote == null ? '' : c.lote)] = 1; });
        (db.saida || []).forEach(function (s) { chaves[s.data + '|' + s.lote] = 1; });
        return Object.keys(chaves).map(function (k) { var p = k.split('|'); return saidaDoDia(db, p[0], p[1]); }).filter(Boolean)
            .sort(function (a, b) { return String(b.data).localeCompare(String(a.data)) || String(a.lote).localeCompare(String(b.lote)); });
    }
    /* CHEGANDO DA GRANJA
       Na granja cada coleta é separada. Ela só entra no beneficiamento quando
       é conferida e recebida (Conferência dos ovos › Conferir e receber): aí
       é SOMADA ao lote do dia do beneficiamento (número = dia da produção).
       Aqui: as coletas que ainda não foram recebidas, juntas por dia. */
    function ateQuando(r) { return String(r.coletas_ate || r.criado_em || ''); }
    function coletaRecebida(db, c) {
        if (c.recebido_em) return true;
        /* dados antigos (antes de marcar coleta a coleta): o recebimento do dia já cobria a coleta */
        return (db.recebimentos || []).some(function (r) { return r.data_postura === c.data && mesmoLote(r.lote_granja, c.lote) && !r.coletas_ate && String(r.criado_em || '') >= String(c.criado_em || ''); });
    }
    function coletasNaoRecebidas(db) { return (db.coletas || []).filter(function (c) { return !coletaRecebida(db, c); }); }
    function chegandoDaGranja(db) {
        var dias = {};
        coletasNaoRecebidas(db).forEach(function (c) {
            var k = c.data + '|' + (c.lote || '');
            var g = dias[k] || (dias[k] = { data: c.data, lote: String(c.lote || ''), bom: 0, trincado: 0, defeito: 0, sujo: 0, coletas: 0, quem: [], lista: [] });
            g.bom += n(c.bons); g.trincado += n(c.trincados); g.defeito += n(c.defeituosos); g.sujo += n(c.sujos); g.coletas++; g.lista.push(c);
            if (c.coletado_por && g.quem.indexOf(c.coletado_por) < 0) g.quem.push(c.coletado_por);
        });
        return Object.keys(dias).map(function (k) {
            var g = dias[k];
            g.complemento = (db.recebimentos || []).some(function (r) { return r.data_postura === g.data && mesmoLote(r.lote_granja, g.lote); });
            return g;
        }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)) || String(a.lote).localeCompare(String(b.lote)); });
    }

    /* Itens pendentes do checklist diário da granja */
    function checklistPendente(row) {
        var falta = CHECK_GRANJA.filter(function (c) { return row[c[0]] !== 'Sim'; }).map(function (c) { return c[1]; });
        if (row.racao === 'Baixa' || row.racao === 'Acabou') falta.push('Ração ' + row.racao.toLowerCase());
        return falta;
    }


    /* =====================================================
       6. BENEFICIAMENTO
       ===================================================== */

    /* LOTE DA COLETA (nasce na coleta)
       Número do lote de ovos = o dia da postura: 18/11 → 1811.
       Todas as coletas do dia, de todas as colaboradoras, entram
       nele, e o MESMO número segue no Recebimento, Beneficiamento,
       Produção embalada, Pedidos e Romaneio.
       · Coleta lançada depois de o lote ser recebido → 1811-2
       · Mesmo número já usado em outro ano          → 1811/27
       (Coletas antigas que ainda têm lote de galinhas: 01-1811.) */
    function codigoLoteDia(lote, dataIso) {
        var d = (dataIso || hoje()).split('-'), l = String(lote == null ? '' : lote).replace(/\s+/g, '');
        return (l ? l + '-' : '') + d[2] + d[1];
    }
    function proximoLoteReceb(db, dataIso, loteGranja) {
        var recs = db.recebimentos || [];
        var base = codigoLoteDia(loteGranja, dataIso);
        var doBase = function (cod) { cod = String(cod); return cod === base || cod.indexOf(base + '-') === 0; };
        if (recs.some(function (r) { return doBase(r.lote_receb) && r.data_postura !== dataIso; }))
            base += '/' + String(dataIso).slice(2, 4);
        var mesmos = recs.filter(function (r) { return r.data_postura === dataIso && mesmoLote(r.lote_granja, loteGranja); }).length;
        var cod = mesmos ? base + '-' + (mesmos + 1) : base;
        while (recs.some(function (r) { return r.lote_receb === cod; })) cod = base + '-' + (++mesmos + 1);
        return cod;
    }
    /* Para qual lote vai uma coleta nova daquele dia: o lote do dia já recebido
       (é SOMADA nele, mesmo número) ou, se ele já foi beneficiado, um complemento */
    function loteDestino(db, dataIso, loteGranja) {
        var recs = (db.recebimentos || []).filter(function (r) { return r.data_postura === dataIso && mesmoLote(r.lote_granja, loteGranja); })
            .sort(function (a, b) { return String(a.criado_em || '').localeCompare(String(b.criado_em || '')); });
        var ult = recs[recs.length - 1];
        if (ult && !(db.producoes || []).some(function (p) { return p.lote_receb === ult.lote_receb; })) return ult.lote_receb;
        return proximoLoteReceb(db, dataIso, loteGranja);
    }
    /* Número do lote daquele dia: o que já foi recebido, ou o que vai nascer */
    function codigoDoDia(db, dataIso, loteGranja) {
        var r = (db.recebimentos || []).filter(function (x) { return x.data_postura === dataIso && mesmoLote(x.lote_granja, loteGranja); })
            .sort(function (a, b) { return String(a.criado_em || '').localeCompare(String(b.criado_em || '')); })[0];
        return r ? r.lote_receb : proximoLoteReceb(db, dataIso, loteGranja);
    }
    /* Coletas dos últimos 7 dias que ainda não foram conferidas (contador no menu) */
    /* PENDÊNCIAS AUTOMÁTICAS (todo mundo vê: painel, resumos e sininho)
       · coleta não lançada: colaboradora ativa, com lotes, que não lançou nenhuma coleta
         num dia (últimos 7 dias, desde que o sistema começou a ter coletas). Hoje só conta
         depois de HORA_COLETA_HOJE, para dar tempo de lançar a 1ª coleta.
       · conferência: coletas que ainda não foram conferidas e recebidas no beneficiamento.
       quem: só as pendências dessa pessoa (área da colaboradora). */
    var HORA_COLETA_HOJE = 12;
    /* Limite de letras da descrição: alertas/avisos (explicar o problema) e tarefas (título curto) */
    var MIN_DESCRICAO = 15, MAX_DESCRICAO = 300;
    var MIN_TAREFA = 10, MAX_TAREFA = 150;
    function pendencias(db, quem) {
        var out = [], hj = hoje(), coletas = db.coletas || [];
        if (!coletas.length) return out;                                      // sistema ainda não começou
        var inicio = coletas.reduce(function (m, c) { return c.data && c.data < m ? c.data : m; }, hj);
        var de = somarDias(hj, -7) > inicio ? somarDias(hj, -7) : inicio;
        var colabs = (db.usuarios || []).filter(function (u) {
            if (loginCompartilhado(u) && colaboradorasSemLogin(db).length) return false;   // quem conta são as pessoas, não o login
            return u.perfil === 'Colaboradora' && u.situacao === 'Ativo' && String(u.lotes || '').trim() && (!quem || u.nome === quem.nome);
        });
        /* login compartilhado (coleta): basta ter alguma coleta no dia */
        var lancou = function (u, dia) { return coletas.some(function (c) { return c.data === dia && (loginCompartilhado(u) || String(c.coletado_por) === String(u.nome)); }); };
        colabs.forEach(function (u) {
            var cr = u.criado_em ? new Date(u.criado_em) : null, desde = cr && !isNaN(cr) ? iso(cr) : de, faltam = [];
            for (var dia = (desde > de ? desde : de); dia < hj; dia = somarDias(dia, 1)) if (!lancou(u, dia)) faltam.push(dia);
            if (faltam.length) out.push({ tipo: 'coleta', grav: 'erro', quem: u.nome, titulo: (quem ? 'Você não lançou' : u.nome + ' não lançou') + ' coleta',
                texto: 'Dia(s) sem nenhuma coleta: ' + faltam.map(br).join(', ') + '. Um administrador pode lançar a coleta esquecida em Entrada dos ovos.', link: 'g-coletas' });
        });
        if (new Date().getHours() >= HORA_COLETA_HOJE) {
            var semHoje = colabs.filter(function (u) { return !lancou(u, hj); }).map(function (u) { return u.nome; });
            if (semHoje.length) out.push({ tipo: 'coleta', grav: 'atencao', titulo: quem ? 'Você ainda não lançou a coleta de hoje' : 'Hoje, ainda sem coleta',
                texto: quem ? 'Lance assim que terminar de colher.' : semHoje.join(', '), link: 'g-coletas' });
        }
        if (!quem) {
            /* peso semanal atrasado: lote alojado sem pesagem há mais de 7 dias (um aviso só) */
            var atrasados = pesagemDosLotes(db).filter(function (x) { return x.dias != null && x.dias > DIAS_PESAGEM; });
            if (atrasados.length) out.push({ tipo: 'peso', grav: 'atencao', titulo: 'Peso semanal atrasado · ' + atrasados.length + ' lote(s)',
                texto: atrasados.slice(0, 12).map(function (x) { return 'Lote ' + String(x.lote.lote).split('/')[0] + (x.ultima ? ' há ' + x.dias + ' dias' : ' sem pesagem'); }).join(', ') + (atrasados.length > 12 ? '…' : ''), link: 'g-peso' });
            var dias = {};
            coletasNaoRecebidas(db).forEach(function (c) { dias[c.data] = (dias[c.data] || 0) + 1; });
            Object.keys(dias).sort().forEach(function (dia) {
                out.push({ tipo: 'conferencia', grav: dia < hj ? 'erro' : 'atencao', titulo: dia < hj ? 'Conferência atrasada · ' + br(dia) : 'Conferência de hoje',
                    texto: dias[dia] + ' coleta(s) ainda sem conferir e receber no beneficiamento.', link: 'g-conferencia' });
            });
        }
        return out;
    }
    /* Mesmo jeito de mostrar em todo lugar: faixa clicável */
    function pendenciaHTML(p, h, prefixo) {
        return '<a class="aviso ' + p.grav + '" href="' + (prefixo || '#') + p.link + '"><span class="bolinha">' + (p.grav === 'erro' ? '!' : 'i') + '</span><span><b>' + h(p.titulo) + '</b><br>' + h(p.texto) + '</span></a>';
    }
    function coletasSemConferir(db) {
        var de = somarDias(hoje(), -6);
        return (db.coletas || []).filter(function (c) { return c.data >= de && !c.reconferido_por; }).length;
    }
    /* Em qual lote da coleta uma coleta entrou (ou vai entrar) */
    function loteDaColeta(db, c) {
        var recs = (db.recebimentos || []).filter(function (r) { return r.data_postura === c.data && mesmoLote(r.lote_granja, c.lote); })
            .sort(function (a, b) { return String(a.criado_em || '').localeCompare(String(b.criado_em || '')); });
        if (c.lote_receb) return c.lote_receb;                                   // já entrou no lote do beneficiamento
        var r = recs.find(function (x) { return !x.coletas_ate && String(x.criado_em || '') >= String(c.criado_em || ''); });
        return r ? r.lote_receb : loteDestino(db, c.data, c.lote);
    }
    function totalRecebido(r) { return n(r.bom) + n(r.trincado) + n(r.defeito) + n(r.sujo); }
    function perdaRecebimento(r) { return n(r.trincado) + n(r.defeito) + n(r.sujo); }

    /* Saída da granja que corresponde ao recebimento (mesmo lote e data) */
    /* Tudo o que o beneficiamento recebeu de um dia/lote da granja
       (pode ser mais de um recebimento, se uma coleta chegou depois) */
    function recebidoDaGranja(db, data, lote) {
        var recs = (db.recebimentos || []).filter(function (r) { return r.data_postura === data && mesmoLote(r.lote_granja, lote); });
        return recs.length ? recs.reduce(function (t, r) { return t + totalRecebido(r); }, 0) : null;
    }
    function saidaDoRecebimento(db, r) {
        return saidaDoDia(db, r.data_postura, r.lote_granja == null ? '' : r.lote_granja);   // lote '' = coletas do dia
    }

    /* Ovos embalados numa produção */
    var POR_CAIXA = { duzia: 30, pente20: 15, pente30: 10, caipirinho: 10 };
    function caixasUsadas(q) { return Object.keys(POR_CAIXA).reduce(function (t, k) { return t + Math.ceil(n(q[k]) / POR_CAIXA[k]); }, 0); }
    function embalados(p) { return MAQUINA.reduce(function (s, m) { return s + n(p[m.chave]) * m.ovos; }, 0); }

    /* Conferência dos 100%: recebido = embalados + perdas + sobra */
    /* Conferência do beneficiamento: SÓ O OVO BOM recebido é o total disponível
       para produzir. Trincado, defeito e sujo do recebimento não entram na conta
       (aparecem à parte). Fecha 100% quando embalados + perdas da máquina + sobra = bons. */
    function conferencia(r, p) {
        var recebido = r ? n(r.bom) : 0;
        var perdaRec = r ? perdaRecebimento(r) : 0;
        var emb = embalados(p);
        var perdaBen = n(p.trincado) + n(p.defeito) + n(p.sujo) + n(p.quebrado);   // quebrado = sucção da máquina
        var sobra = n(p.sobra);
        var total = emb + perdaBen + sobra;
        return { recebido: recebido, embalados: emb, perdaRec: perdaRec, perdaBen: perdaBen, sobra: sobra, total: total, diferenca: recebido - total, totalChegou: r ? totalRecebido(r) : 0 };
    }

    /* Embalagens usadas guardadas na produção: { idDaCompra: quantidade } */
    function usadasDaProducao(p) {
        try { return JSON.parse(p.embalagens_usadas || '{}') || {}; } catch (e) { return {}; }
    }
    /* Saldo de um lote de embalagem comprada */
    function saldoEmbalagem(db, compra) {
        var usado = (db.producoes || []).reduce(function (s, p) { return s + n(usadasDaProducao(p)[compra.id]); }, 0);
        return { comprado: n(compra.comprado), usado: usado, saldo: n(compra.comprado) - usado };
    }
    /* Situação: Comprar (vermelho), Atenção (amarelo), Ok (verde) */
    function situacaoEmbalagem(compra, saldo) {
        var aviso = n(compra.aviso_minimo);
        if (saldo <= aviso) return ['Comprar', 'erro'];
        if (saldo <= aviso * 1.5) return ['Atenção', 'atencao'];
        return ['Ok', 'ok'];
    }
    /* Embalagens usadas por tipo numa lista de produções: { duzia: 10, pente30: 7, ... } */
    function embalagensUsadas(db, producoes) {
        var out = {};
        producoes.forEach(function (p) {
            var usadas = usadasDaProducao(p);
            Object.keys(usadas).forEach(function (id) {
                var compra = (db.embalagens || []).find(function (e) { return e.id === id; });
                var tipo = compra ? compra.tipo : 'outra';
                out[tipo] = n(out[tipo]) + n(usadas[id]);
            });
        });
        return out;
    }
    /* Nota fiscal repetida: mesma NF (só os números, sem zeros à esquerda) já lançada.
       ignorarId: o próprio lançamento (edição). mesmaCompra: {data_compra, tipo, fornecedor} — a mesma
       nota pode ter vários tipos de embalagem, desde que seja a mesma compra (mesma data) e outro tipo.
       Fornecedores diferentes podem ter notas com o mesmo número: aí não conta como repetida. */
    function chaveFornecedor(f) { return String(f || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' '); }
    function chaveNF(nf) { var d = String(nf || '').replace(/\D/g, '').replace(/^0+/, ''); return d || String(nf || '').trim().toLowerCase(); }
    function notaRepetida(db, nf, ignorarId, mesmaCompra) {
        var k = chaveNF(nf);
        if (!k) return null;
        return (db.embalagens || []).find(function (e) {
            if (e.id === ignorarId || chaveNF(e.nota_fiscal) !== k) return false;
            if (mesmaCompra && e.data_compra === mesmaCompra.data_compra && e.tipo !== mesmaCompra.tipo) return false;
            var fa = chaveFornecedor(e.fornecedor), fb = chaveFornecedor(mesmaCompra && mesmaCompra.fornecedor);
            if (fa && fb && fa !== fb) return false;
            return true;
        }) || null;
    }
    function proximoLoteEmbalagem(db, tipo) {
        var nums = (db.embalagens || []).filter(function (e) { return e.tipo === tipo; }).map(function (e) { return parseInt(e.lote, 10) || 0; });
        return String((nums.length ? Math.max.apply(null, nums) : 0) + 1).padStart(2, '0');
    }
    function nomeTipoEmbalagem(chave) {
        var t = TIPOS_EMBALAGEM.find(function (x) { return x.chave === chave; });
        return t ? t.nome : chave;
    }

    /* Estoque de produto pronto por lote recebido:
       entra pela Produção e sai pelos pedidos Entregues (romaneio fechado) */
    function estoque(db) {
        var porLote = {};
        (db.producoes || []).forEach(function (p) {
            var r = (db.recebimentos || []).find(function (x) { return x.lote_receb === p.lote_receb; });
            var e = porLote[p.lote_receb] || (porLote[p.lote_receb] = { lote: p.lote_receb, data: r ? r.data_postura : p.data, qtd: {} });
            MAQUINA.forEach(function (m) { e.qtd[m.chave] = n(e.qtd[m.chave]) + n(p[m.chave]); });
        });
        (db.pedidos || []).filter(function (p) { return p.situacao === 'Entregue'; }).forEach(function (p) {
            var lotes = lerJSON(p.lotes, {});
            Object.keys(lotes).forEach(function (produto) {
                var chave = chaveDoProduto(db, produto);
                (lotes[produto] || []).forEach(function (par) {
                    if (porLote[par[0]] && chave) porLote[par[0]].qtd[chave] -= n(par[1]);
                });
            });
        });
        return Object.keys(porLote).map(function (k) { return porLote[k]; }).sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
    }

    /* Validade = data do lote (postura) + dias de validade (30 ou 31, em Romaneio › Configurações) */
    function diasValidade(db) {
        var c = db && (db.config || []).find(function (x) { return x.chave === 'validade_dias'; });
        return c && n(c.valor) ? n(c.valor) : 30;
    }
    function validade(dataIso, db) { return dataIso ? somarDias(dataIso, diasValidade(db)) : ''; }

    /* Pronto para entregar de um produto (soma dos lotes com saldo) */
    function prontoDoProduto(db, nome) {
        var ch = chaveDoProduto(db, nome);
        return ch ? estoque(db).reduce(function (s, e) { return s + Math.max(0, n(e.qtd[ch])); }, 0) : null;
    }

    /* Código de barras EAN-13: calcula o 13º número (dígito verificador) */
    function digitoEAN(doze) {
        var d = String(doze).replace(/\D/g, '');
        if (d.length !== 12) return null;
        var s = 0;
        for (var i = 0; i < 12; i++) s += Number(d[i]) * (i % 2 ? 3 : 1);
        return (10 - s % 10) % 10;
    }
    /* CPF (11) ou CNPJ (14) com dígitos conferidos */
    /* Por que o CPF/CNPJ não passou (mensagem clara para quem digitou) */
    function problemaDocumento(doc) {
        var d = String(doc || '').replace(/\D/g, '');
        if (!d) return 'Informe o CPF ou o CNPJ.';
        if (d.length !== 11 && d.length !== 14) return 'O CPF tem 11 números e o CNPJ tem 14. Você digitou ' + d.length + '.';
        if (documentoValido(d)) return '';
        return (d.length === 11 ? 'CPF' : 'CNPJ') + ' inválido: os números não conferem com os dígitos verificadores (os 2 últimos). Confira se digitou certo; não é só a quantidade de números.';
    }
    function documentoValido(doc) {
        var d = String(doc || '').replace(/\D/g, '');
        if (/^(\d)\1+$/.test(d)) return false;
        var dv = function (base, pesos) { var s = 0; for (var i = 0; i < pesos.length; i++) s += Number(base[i]) * pesos[i]; var r = s % 11; return r < 2 ? 0 : 11 - r; };
        if (d.length === 11) {
            var c1 = dv(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]); var c2 = dv(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
            return c1 === Number(d[9]) && c2 === Number(d[10]);
        }
        if (d.length === 14) {
            var j1 = dv(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]); var j2 = dv(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
            return j1 === Number(d[12]) && j2 === Number(d[13]);
        }
        return false;
    }


    /* =====================================================
       7. PEDIDOS E ROMANEIO
       ===================================================== */
    function lerJSON(texto, padrao) {
        if (texto && typeof texto === 'object') return texto;
        try { return JSON.parse(texto || '') || padrao; } catch (e) { return padrao; }
    }
    function chaveDoProduto(db, nomeProduto) {
        var p = (db.produtos || []).find(function (x) { return x.nome === nomeProduto; });
        return p && p.maquina ? p.maquina : '';
    }
    function proximoPedido(db) {
        return Math.max.apply(null, [0].concat((db.pedidos || []).map(function (p) { return n(p.numero); }))) + 1;
    }
    /* "100 Dúzia · 40 Pente 20 G" */
    function textoItens(db, pedido) {
        var itens = lerJSON(pedido.itens, {});
        return Object.keys(itens).filter(function (k) { return n(itens[k]) > 0; }).map(function (k) {
            var p = (db.produtos || []).find(function (x) { return x.nome === k; });
            return itens[k] + ' ' + (p && p.curto ? p.curto : k);
        }).join(' · ');
    }


    /* =====================================================
       8. ACESSOS
       Três perfis:
         - Administrador: tudo.
         - Granja e Beneficiamento: a equipe vê os dois sistemas
           juntos (granja + beneficiamento + cadastros + relatórios),
           menos Usuários e os relatórios das colaboradoras.
         - Colaboradora: sempre vai para a área dela.
       "acessos" guarda "Todos" (ou uma lista de ids de tela).
       ===================================================== */
    var SISTEMAS = [
        /* Parte própria de ALERTAS e TAREFAS: só os administradores (no alto do menu, à mão) */
        { id: 'alertas', nome: 'ALERTAS', cor: '#c0392b', soAdmin: true, telas: [
            ['g-alertas', 'Alertas'], ['g-tarefas', 'Tarefas']
        ] },
        { id: 'granja', nome: 'GRANJA', cor: '#5c7a2e', telas: [
            ['g-resumo', 'Resumo da granja'], ['g-producao', 'Produção diária'], ['g-mortalidade', 'Mortalidade e abate'],
            ['g-peso', 'Peso semanal'],
            /* no fim, na ordem do ovo: entra → é conferido → sai para o beneficiamento */
            ['g-coletas', 'Entrada dos ovos'], ['g-conferencia', 'Conferência dos ovos'], ['g-saida', 'Saída de ovos']
        ] },
        { id: 'benef', nome: 'BENEFICIAMENTO', cor: '#9a4a1c', telas: [
            ['b-embalagens', 'Lançamento de embalagens'], ['b-resumo', 'Resumo do beneficiamento'], ['b-recebimento', 'Recebimento'],
            ['b-beneficiamento', 'Beneficiamento'], ['b-estoque', 'Produção embalada'], ['b-pedidos', 'Pedidos'], ['b-romaneio', 'Romaneio']
        ] },
        { id: 'cad', nome: 'CADASTROS', cor: '#b4b0c4', telas: [
            ['g-lotes', 'Lotes das aves'], ['clientes', 'Clientes'], ['produtos', 'Produtos'], ['linhagens', 'Linhagens'], ['usuarios', 'Usuários']
        ] }
    ];
    var TELAS_SOLTAS = [['painel', 'Painel'], ['relatorios', 'Relatórios']];

    /* Telas da área das colaboradoras (página separada). Coleta e mortalidade
       da área delas usam o acesso de "Entrada dos ovos" e "Mortalidade e abate". */
    var TELAS_COLAB = [['c-resumo', 'Resumo das colaboradoras'], ['c-checklist', 'Checklist']];   // Avisos (c-avisos): só administradores

    /* ACESSOS POR TELA
       Cada usuário guarda a lista das telas marcadas (ex.: "g-coletas, g-mortalidade, c-resumo").
       Usuário antigo com "Todos" ou vazio = as telas de costume do perfil (abaixo).
       O que vem marcado ao escolher o perfil: */
    /* Só o administrador: usuários, alertas, tarefas, avisos, pedidos, romaneio, cadastros e relatórios */
    var SO_ADMIN = ['usuarios', 'g-tarefas', 'g-alertas', 'c-avisos', 'b-pedidos', 'b-romaneio', 'g-lotes', 'clientes', 'produtos', 'linhagens', 'relatorios'];
    function acessosPadrao(perfil) {
        if (perfil === 'Colaboradora') return ['g-coletas', 'g-mortalidade', 'c-resumo', 'c-checklist'];
        var todas = [];
        SISTEMAS.forEach(function (s) { if (!s.soAdmin) s.telas.forEach(function (t) { if (SO_ADMIN.indexOf(t[0]) < 0) todas.push(t[0]); }); });
        todas.push('relatorios');
        if (perfil === 'Administrador') return todas.concat(TELAS_COLAB.map(function (t) { return t[0]; }));
        /* equipe (de baixo): tudo, menos mortalidade (só as colaboradoras) e Usuários */
        return todas.filter(function (t) { return t !== 'g-mortalidade' && t !== 'usuarios'; });
    }
    function acessosDe(usuario) {
        if (!usuario) return [];
        var a = String(usuario.acessos || '').trim();
        if (!a || a === 'Todos') return acessosPadrao(usuario.perfil);   // usuário antigo (sem lista ou "Todos"): o padrão do perfil
        return a.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    function podeVer(usuario, tela) {
        if (!usuario) return false;
        if (usuario.perfil === 'Administrador') return true;
        if (SO_ADMIN.indexOf(tela) >= 0) return false;    // telas só do administrador (lista SO_ADMIN)
        if (tela === 'painel' || tela === 'busca') return true;   // painel e busca: todo mundo
        return acessosDe(usuario).indexOf(tela) >= 0;
    }
    /* Lotes que a pessoa pode ver ('Todos' ou lista) */
    /* LOGIN COMPARTILHADO (SÓ NA DEMONSTRAÇÃO): colaboradora com "Todos os lotes" (o login "coleta").
       Várias pessoas usam o mesmo login ao mesmo tempo; por isso, na coleta e no
       checklist, cada uma escreve o próprio nome. */
    /* MODO DEMONSTRAÇÃO: a demonstração local (navegador, API.demo) OU a demonstração
       online (planilha do Google, CONFIG.DEMO_ONLINE). Liga os 3 logins, a escolha da
       colaboradora no login "coleta" e as colaboradoras sem login próprio. */
    function modoDemonstracao() {
        return !!((typeof API !== 'undefined' && API.demo) || (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.DEMO_ONLINE));
    }
    var soDemo = modoDemonstracao;
    function loginCompartilhado(u) { return soDemo() && !!u && u.perfil === 'Colaboradora' && String(u.lotes || 'Todos').trim() === 'Todos'; }
    /* Colaboradoras sem login próprio (só na demonstração): cadastradas em Usuários, com os
       lotes delas, mas entram pelo login compartilhado "coleta" e escolhem o nome. */
    function colaboradorasSemLogin(db) {
        if (!soDemo()) return [];
        return (db.usuarios || []).filter(function (u) { return u.perfil === 'Colaboradora' && u.situacao === 'Ativo' && !String(u.usuario || '').trim(); })
            .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); });
    }
    /* Nomes de quem colhe: colaboradoras com login próprio + nomes já usados nas coletas */
    function nomesQueColhem(db) {
        var nomes = {}, comp = {};
        (db.usuarios || []).forEach(function (u) { if (loginCompartilhado(u)) comp[u.nome] = 1; else if (u.perfil === 'Colaboradora' && u.situacao === 'Ativo') nomes[u.nome] = 1; });
        if (soDemo()) (db.coletas || []).forEach(function (c) { if (c.coletado_por && !comp[c.coletado_por]) nomes[c.coletado_por] = 1; });
        return Object.keys(nomes).sort(function (a, b) { return a.localeCompare(b); });
    }
    function lotesDoUsuario(db, usuario) {
        var l = String((usuario && usuario.lotes) || 'Todos');
        var lista = l.split(',').map(function (x) { return x.trim(); });
        return lotesAtivos(db).filter(function (x) { return l === 'Todos' || lista.indexOf(String(x.lote)) >= 0; });
    }

    return {
        MOTIVOS: MOTIVOS, SEMANAS_DESCARTE: SEMANAS_DESCARTE, CHECK_GRANJA: CHECK_GRANJA, CHECK_LOTE: CHECK_LOTE, CHECK_GERAL: CHECK_GERAL,
        MAQUINA: MAQUINA, TIPOS_EMBALAGEM: TIPOS_EMBALAGEM, CURVAS_GUIAS: CURVAS_GUIAS, TABELAS: TABELAS, CHAVES: CHAVES,
        SISTEMAS: SISTEMAS, TELAS_SOLTAS: TELAS_SOLTAS, TELAS_COLAB: TELAS_COLAB, acessosPadrao: acessosPadrao, acessosDe: acessosDe,
        SO_ADMIN: SO_ADMIN, notaRepetida: notaRepetida,
        pesoGuia: pesoGuia, temCurvaPeso: temCurvaPeso, avaliarPesagem: avaliarPesagem, estatPesos: estatPesos, pesagemDosLotes: pesagemDosLotes, DIAS_PESAGEM: DIAS_PESAGEM, idadeSemanas: idade, MIN_DESCRICAO: MIN_DESCRICAO, MAX_DESCRICAO: MAX_DESCRICAO, MIN_TAREFA: MIN_TAREFA, MAX_TAREFA: MAX_TAREFA,
        pendencias: pendencias, pendenciaHTML: pendenciaHTML, HORA_COLETA_HOJE: HORA_COLETA_HOJE,
        iso: iso, hoje: hoje, somarDias: somarDias, diasEntre: diasEntre, br: br, diaMes: diaMes, noPeriodo: noPeriodo, periodo: periodo,
        proximoLote: proximoLote, lotesAtivos: lotesAtivos, acharLote: acharLote, nomeLote: nomeLote, descartePrevisto: descartePrevisto,
        idade: idade, lerCurva: lerCurva, valorCurva: valorCurva, posturaGuia: posturaGuia, avesVivas: avesVivas, totalColeta: totalColeta,
        producaoDiaria: producaoDiaria, sugestaoSaida: sugestaoSaida, totalSaida: totalSaida, coletasDoDia: coletasDoDia, saidaDoDia: saidaDoDia, saidas: saidas, chegandoDaGranja: chegandoDaGranja, checklistPendente: checklistPendente,
        proximoLoteReceb: proximoLoteReceb, codigoLoteDia: codigoLoteDia, loteDaColeta: loteDaColeta, loteDestino: loteDestino, coletaRecebida: coletaRecebida, coletasNaoRecebidas: coletasNaoRecebidas, coletasSemConferir: coletasSemConferir, codigoDoDia: codigoDoDia, avesNoDia: avesNoDia, guiaNoDia: guiaNoDia, posturaPeriodo: posturaPeriodo, lotesNoDia: lotesNoDia, totalRecebido: totalRecebido, perdaRecebimento: perdaRecebimento, saidaDoRecebimento: saidaDoRecebimento, recebidoDaGranja: recebidoDaGranja,
        embalados: embalados, conferencia: conferencia, usadasDaProducao: usadasDaProducao, saldoEmbalagem: saldoEmbalagem,
        situacaoEmbalagem: situacaoEmbalagem, embalagensUsadas: embalagensUsadas, proximoLoteEmbalagem: proximoLoteEmbalagem, nomeTipoEmbalagem: nomeTipoEmbalagem,
        estoque: estoque, caixasUsadas: caixasUsadas, POR_CAIXA: POR_CAIXA, validade: validade, diasValidade: diasValidade, prontoDoProduto: prontoDoProduto, digitoEAN: digitoEAN, documentoValido: documentoValido, problemaDocumento: problemaDocumento, lerJSON: lerJSON, chaveDoProduto: chaveDoProduto, proximoPedido: proximoPedido, textoItens: textoItens,
        modoDemonstracao: modoDemonstracao, podeVer: podeVer, lotesDoUsuario: lotesDoUsuario, loginCompartilhado: loginCompartilhado, nomesQueColhem: nomesQueColhem, colaboradorasSemLogin: colaboradorasSemLogin,
        NUM_COLETAS: NUM_COLETAS, proximaColeta: proximaColeta, PROTOCOLO_VACINAS: PROTOCOLO_VACINAS, PAC: PAC, ovosPorLote: ovosPorLote,
        protocoloVacinas: protocoloVacinas, textoProtocolo: textoProtocolo, vacinasDoLote: vacinasDoLote, controleIdades: controleIdades, tarefasDoDia: tarefasDoDia
    };
})();
