
(function () {
  'use strict';

  function setError(msg, ok) {
    const el = document.getElementById('errorMessage');
    if (!el) return;
    el.style.color = ok ? 'green' : '#b7302b';
    el.textContent = msg || '';
  }

  function initTogglePassword() {
    const btn = document.getElementById('togglePassword');
    const input = document.getElementById('password');
    if (!btn || !input) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';

      // Lucide
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        btn.innerHTML = isText
          ? '<i data-lucide="eye"></i>'
          : '<i data-lucide="eye-off"></i>';
        lucide.createIcons();
      } else {
        // fallback sem Lucide
        btn.textContent = isText ? '👁' : '🙈';
      }
    });
  }

  function initLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function salvarSessao(user) {
    localStorage.setItem('cliente_logado', JSON.stringify(user));
  }

  function irPara(destino) {
    setTimeout(function () {
      window.location.href = destino;
    }, 700);
  }

  function tentarLoginBanco(username, password) {
    // Função do db.js, se existir
    if (typeof loginUsuario === 'function') {
      try {
        return loginUsuario(username, password);
      } catch (err) {
        console.error('loginUsuario erro:', err);
        return { status: 'erro', mensagem: 'Erro no banco: ' + (err.message || err) };
      }
    }

    // Fallback: procura em localStorage de clientes cadastrados
    try {
      const lista = JSON.parse(localStorage.getItem('trattoria_clientes') || '[]');
      const user = lista.find(function (c) {
        const email = String(c.email || '').toLowerCase();
        const nome = String(c.nome || '').toLowerCase();
        const u = username.toLowerCase();
        return (email === u || nome === u) && String(c.senha) === String(password);
      });
      if (user) {
        return {
          status: 'sucesso',
          id: user.id || Date.now(),
          nome: user.nome,
          email: user.email,
          tipo: 'cliente',
          telefone: user.telefone || '',
          endereco: user.endereco || '',
          cep: user.cep || ''
        };
      }
    } catch (e) {
      console.warn(e);
    }

    return { status: 'erro', mensagem: 'Usuário ou senha incorretos!' };
  }

  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const username = (document.getElementById('username')?.value || '').trim();
      const password = (document.getElementById('password')?.value || '').trim();

      if (!username || !password) {
        setError('❌ Preencha usuário e senha.');
        return;
      }

      // ===== ADMIN =====
      if (username.toLowerCase() === 'admin' && password === '123456') {
        salvarSessao({
          id: 0,
          nome: 'Administrador',
          email: 'admin',
          tipo: 'admin'
        });
        setError('✅ Bem-vindo, Administrador!', true);
        irPara('../admin/admin.html');
        return;
      }

      // ===== CLIENTE / BANCO =====
      const resultado = tentarLoginBanco(username, password);

      if (resultado && resultado.status === 'sucesso') {
        const user = {
          id: resultado.id,
          nome: resultado.nome || username,
          email: resultado.email || username,
          tipo: resultado.tipo || 'cliente',
          telefone: resultado.telefone || '',
          endereco: resultado.endereco || '',
          cep: resultado.cep || ''
        };
        salvarSessao(user);
        setError('✅ Bem-vindo, ' + user.nome + '!', true);

        if (user.tipo === 'admin') {
          irPara('../admin/admin.html');
        } else {
          irPara('../Clientes/Principal.html');
        }
        return;
      }

      setError('❌ ' + (resultado?.mensagem || 'Usuário ou senha incorretos!'));
    });
  }

  function initCadastroBtn() {
    const btn = document.getElementById('toggleBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.location.href = 'cadastro.html';
    });
  }

  async function initBanco() {
    if (typeof abrirBanco !== 'function') return;
    try {
      const ok = await abrirBanco();
      if (!ok) {
        console.warn('Banco não abriu — login admin ainda funciona.');
      }
    } catch (e) {
      console.warn('Erro ao abrir banco:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    initLucide();
    initTogglePassword();
    initCadastroBtn();
    initLoginForm();
    await initBanco();
    // redesenha ícones depois de tudo
    setTimeout(initLucide, 200);
  });
})();