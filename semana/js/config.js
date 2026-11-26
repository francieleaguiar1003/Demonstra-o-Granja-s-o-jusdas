/* =========================================================
   ERP Ovo Caipira · CONFIGURAÇÃO
   ---------------------------------------------------------
   O único arquivo que precisa mudar para ligar a planilha.

   API_URL vazio  → MODO DEMONSTRAÇÃO
                    Tudo funciona no navegador, com dados de
                    exemplo e os logins de demonstração
                    (senha: demo123). Nada vai para o Google.

   API_URL cheio  → MODO PLANILHA
                    Cole aqui a URL do App da Web do Google
                    Apps Script (termina em /exec). O login,
                    as leituras e as gravações passam a ser
                    feitos na planilha do Google.
   ========================================================= */
window.CONFIG = {

    /* 1. Endereço do Apps Script (vazio = demonstração) */
    API_URL: '',

    /* 2. Nome que aparece nas telas e nas folhas impressas */
    EMPRESA: 'Ovo Caipira',
    SITIO: 'Sítio São Judas Tadeu',

    /* 3. Horas que o login fica válido sem precisar entrar de novo */
    HORAS_SESSAO: 8,

    /* 4. Demonstração online (o build preenche nos 3 sites online):
          DEMO_ONLINE: true  → demonstração ligada a uma planilha de demonstração
          VERSAO_DEMO        → 'cadastros' | 'semana' | 'mes' (também é o prefixo
                               das chaves do aparelho, porque os 3 sites dividem o endereço) */
    DEMO_ONLINE: true,
    VERSAO_DEMO: 'semana'
};
