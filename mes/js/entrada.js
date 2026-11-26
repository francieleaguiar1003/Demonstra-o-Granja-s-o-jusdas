/* =========================================================
   ERP Ovo Caipira · ENTRADA (login)
   ---------------------------------------------------------
   Organização deste arquivo:
     1. Se já entrou nesta aba, vai direto
     2. Tema e mostrar senha
     3. Entrar
     4. Esqueci minha senha
     5. Logins de demonstração (online e local)
   ========================================================= */
(function () {
    'use strict';
    var $ = UI.$;

    /* Para onde cada perfil vai depois de entrar */
    function destino(u) { return u.perfil === 'Colaboradora' ? 'colaboradora.html' : 'sistema.html'; }


    /* ---------- 1. Já entrou nesta aba? Vai direto ---------- */
    var jaLogado = API.usuario();
    if (jaLogado) { location.replace(destino(jaLogado)); return; }


    /* ---------- 2. Tema e mostrar senha ---------- */
    $('#botao-tema').innerHTML = UI.ICONE_TEMA;
    $('#botao-tema').addEventListener('click', UI.trocarTema);
    $('#ver-senha').addEventListener('change', function () { $('#login-senha').type = this.checked ? 'text' : 'password'; });


    /* ---------- 3. Entrar ---------- */
    $('#form-entrar').addEventListener('submit', async function (e) {
        e.preventDefault();
        var erro = $('#login-erro');
        var botao = this.querySelector('[type=submit]');
        erro.hidden = true;
        botao.disabled = true; botao.textContent = 'Entrando…';
        var r = await API.entrar($('#login-usuario').value, $('#login-senha').value);
        if (!r.ok) {
            erro.textContent = r.erro || 'Usuário ou senha incorretos.';
            erro.hidden = false;
            botao.disabled = false; botao.textContent = 'Entrar';
            return;
        }
        location.replace(destino(r.usuario));
    });


    /* Voltou para cá porque o login venceu: avisa que nada se perdeu */
    if (/venceu=1/.test(location.search)) {
        var aviso = $('#login-erro');
        aviso.textContent = 'O seu login venceu. Entre de novo' + (API.pendentes() ? ': ' + API.pendentes() + ' lançamento(s) guardado(s) neste aparelho serão enviados.' : '.');
        aviso.hidden = false; aviso.style.background = 'var(--at-f)'; aviso.style.color = 'var(--texto)';
    }

    /* ---------- 4. Esqueci minha senha ---------- */
    $('#link-esqueci').addEventListener('click', function () {
        $('#esqueci').hidden = !$('#esqueci').hidden;
        $('#esqueci-usuario').value = $('#login-usuario').value;
    });
    $('#botao-restaurar').addEventListener('click', async function () {
        var msg = $('#esqueci-msg');
        if (!$('#esqueci-usuario').value.trim()) { msg.textContent = 'Digite o seu usuário.'; return; }
        var r = await API.pedirSenha($('#esqueci-usuario').value);
        msg.textContent = r.ok
            ? 'Pedido enviado. Um administrador vai voltar a sua senha para a senha inicial. Depois é só entrar com ela e trocar.'
            : (r.erro || 'Não foi possível enviar o pedido.');
    });


    /* ---------- 5. Logins de demonstração ----------
       Demonstração ONLINE (planilha de demonstração): mostra os 3 logins e onde
       cada um pertence, com o selo da versão. NÃO mostra senha (quem passa é a
       Franciele) e os dados ficam na planilha, não no navegador. */
    if (API.online && typeof DadosExemplo !== 'undefined') {
        $('#demo-logins').innerHTML = '<div class="demo-logins"><span class="selo-demo">' + UI.h(API.nomeDemo) + '</span> ' + UI.seloTrocarVersao() +
            '<div class="logins-demo" style="margin-top:var(--esp-2)">' + DadosExemplo.LOGINS.map(function (x) {
                return '<button type="button" class="login-demo" data-login="' + x[0] + '"><b>' + x[0] + '</b><small>' + x[3] + '</small></button>';
            }).join('') + '</div>' +
            '<p class="nota" style="margin-top:var(--esp-2)">Toque num login para preencher e digite a senha. Cada login pode ser usado por várias pessoas ao mesmo tempo.</p></div>';
        UI.ligar(document, '[data-login]', 'click', function (e, b) {
            $('#login-usuario').value = b.dataset.login;
            $('#login-senha').value = '';
            $('#login-senha').focus();
        });
    }
    /* Demonstração LOCAL (sem planilha): os 3 logins e a senha de todos. */
    if (API.demo && typeof DadosExemplo !== 'undefined') {
        /* Os 3 logins, cada um dizendo onde pertence. Cada login pode ser
           usado por várias pessoas ao mesmo tempo, em aparelhos diferentes. */
        $('#demo-logins').innerHTML = '<div class="demo-logins"><b>Demonstração</b> · senha de todos: <b>' + DadosExemplo.SENHA + '</b>' +
            '<div class="logins-demo">' + DadosExemplo.LOGINS.map(function (x) {
                return '<button type="button" class="login-demo" data-login="' + x[0] + '"><b>' + x[0] + '</b><small>' + x[3] + '</small></button>';
            }).join('') + '</div>' +
            '<p class="nota" style="margin-top:var(--esp-2)">Toque num login para preencher. Cada login pode ser usado por várias pessoas ao mesmo tempo. Os dados ficam só neste navegador.</p></div>';
        UI.ligar(document, '[data-login]', 'click', function (e, b) {
            $('#login-usuario').value = b.dataset.login;
            $('#login-senha').value = DadosExemplo.SENHA;
            $('#login-senha').focus();
        });
    }
})();
