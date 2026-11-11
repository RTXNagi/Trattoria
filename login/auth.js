(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function setMsg(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.style.color = ok ? 'green' : '#b7302b';
    el.textContent = text || '';
  }

  function initLucide() {
    try {
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (e) {}
  }

  function salvarSessao(user) {
    localStorage.setItem('cliente_logado', JSON.stringify(user));
  }

  /* Entra direto na conta recém-criada (sem passar pela tela de login) */
  function loginAutomatico(email, senha) {
    if (typeof loginUsuario !== 'function') return null;
    try {
      var r = loginUsuario(email, senha);
      if (r && r.status === 'sucesso') {
        var user = {
          id: r.id,
          nome: r.nome || email,
          email: r.email || email,
          tipo: r.tipo || 'cliente',
          telefone: r.telefone || '',
          endereco: r.endereco || '',
          cep: r.cep || ''
        };
        salvarSessao(user);
        return user;
      }
    } catch (e) {}
    return null;
  }

  function irAposLogin(user) {
    setTimeout(function () {
      if (user && user.tipo === 'admin') {
        window.location.href = '../admin/admin.html';
      } else {
        window.location.href = '../Clientes/Principal.html';
      }
    }, 700);
  }

  /* ===== Abas Entrar / Cadastrar ===== */
  function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
        if (name === 'login') $('loginForm').classList.add('active');
        else $('registerForm').classList.add('active');
      });
    });
    if (window.location.hash === '#cadastro') {
      document.querySelector('.tab[data-tab="cadastro"]')?.click();
    }
  }

  /* ===== Mostrar / ocultar senha ===== */
  function initTogglePassword() {
    document.querySelectorAll('.toggle-password').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-target');
        var input = id ? $(id) : btn.parentElement.querySelector('input');
        if (!input) return;
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.innerHTML = showing
          ? '<i data-lucide="eye"></i>'
          : '<i data-lucide="eye-off"></i>';
        initLucide();
      });
    });
  }

  /* ===== Outros (abre / fecha) ===== */
  function initOutros() {
    var btn = $('outrosBtn');
    var box = $('socialOutros');
    if (!btn || !box) return;
    btn.addEventListener('click', function () {
      var open = box.classList.toggle('open');
      btn.classList.toggle('open', open);
    });
  }

  /* ===== Sociais: presentes, mas em breve ===== */
  function initSocial() {
    document.querySelectorAll('.social-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var nome = btn.getAttribute('data-provider') || 'essa opção';
        nome = nome.charAt(0).toUpperCase() + nome.slice(1);
        alert(
          nome + ' em breve!\n\n' +
          'Por enquanto use email e senha.\n' +
          'Admin: admin / 123456'
        );
      });
    });
  }

  /* ===== Login ===== */
  function initLogin() {
    var form = $('loginForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = ($('username')?.value || '').trim();
      var password = ($('password')?.value || '').trim();

      if (!username || !password) {
        setMsg('loginError', '❌ Preencha usuário e senha.');
        return;
      }

      if (username.toLowerCase() === 'admin' && password === '123456') {
        var admin = { id: 0, nome: 'Administrador', email: 'admin', tipo: 'admin' };
        salvarSessao(admin);
        setMsg('loginError', '✅ Bem-vindo, Administrador!', true);
        irAposLogin(admin);
        return;
      }

      if (typeof loginUsuario === 'function') {
        try {
          var r = loginUsuario(username, password);
          if (r && r.status === 'sucesso') {
            var user = {
              id: r.id,
              nome: r.nome || username,
              email: r.email || username,
              tipo: r.tipo || 'cliente',
              telefone: r.telefone || '',
              endereco: r.endereco || '',
              cep: r.cep || ''
            };
            salvarSessao(user);
            setMsg('loginError', '✅ Bem-vindo, ' + user.nome + '!', true);
            irAposLogin(user);
            return;
          }
          setMsg('loginError', '❌ ' + ((r && r.mensagem) || 'Usuário ou senha incorretos!'));
          return;
        } catch (err) {
          setMsg('loginError', '❌ Erro: ' + (err.message || err));
          return;
        }
      }

      setMsg('loginError', '❌ Usuário ou senha incorretos! (admin / 123456)');
    });
  }

  /* ===== Cadastro ===== */
  function initRegister() {
    var form = $('registerForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = ($('regName')?.value || '').trim();
      var email = ($('regEmail')?.value || '').trim();
      var tel = ($('regTel')?.value || '').trim();
      var senha = ($('regPass')?.value || '').trim();
      var conf = ($('regPassConfirm')?.value || '').trim();

      if (!nome || !email || !senha) {
        setMsg('registerError', '❌ Preencha os campos obrigatórios.');
        return;
      }
      if (senha !== conf) {
        setMsg('registerError', '❌ As senhas não coincidem!');
        return;
      }

      if (typeof cadastrarUsuario === 'function') {
        try {
          var r = cadastrarUsuario(nome, email, senha, tel, '');
          if (r && r.status === 'sucesso') {
            var logado = loginAutomatico(email, senha);
            if (logado) {
              setMsg('registerError', '✅ Conta criada! Entrando...', true);
              irAposLogin(logado);
              return;
            }
            setMsg('registerError', '✅ ' + (r.mensagem || 'Conta criada!'), true);
            setTimeout(function () {
              document.querySelector('.tab[data-tab="login"]')?.click();
              setMsg('loginError', '✅ Conta criada. Faça login.', true);
            }, 900);
            return;
          }
          setMsg('registerError', '❌ ' + ((r && r.mensagem) || 'Não foi possível cadastrar.'));
          return;
        } catch (err) {
          setMsg('registerError', '❌ Erro: ' + (err.message || err));
          return;
        }
      }

      try {
        var lista = JSON.parse(localStorage.getItem('trattoria_clientes') || '[]');
        if (lista.some(function (c) {
          return String(c.email).toLowerCase() === email.toLowerCase();
        })) {
          setMsg('registerError', '❌ Este email já está cadastrado.');
          return;
        }
        var novo = { id: Date.now(), nome: nome, email: email, senha: senha, telefone: tel };
        lista.push(novo);
        localStorage.setItem('trattoria_clientes', JSON.stringify(lista));
        var userNovo = { id: novo.id, nome: nome, email: email, tipo: 'cliente', telefone: tel, endereco: '', cep: '' };
        salvarSessao(userNovo);
        setMsg('registerError', '✅ Conta criada! Entrando...', true);
        irAposLogin(userNovo);
      } catch (err) {
        setMsg('registerError', '❌ Erro ao salvar cadastro.');
      }
    });
  }

  async function initBanco() {
    if (typeof abrirBanco !== 'function') return;
    try { await abrirBanco(); } catch (e) { console.warn(e); }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    initLucide();
    initTabs();
    initTogglePassword();
    initOutros();
    initSocial();
    initLogin();
    initRegister();
    await initBanco();
    setTimeout(initLucide, 250);
  });
})();
