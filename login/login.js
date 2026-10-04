document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
  }
});

// Mostrar / Ocultar senha
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
  togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePassword.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      togglePassword.textContent = '👁️';
    }
  });
}

// Login
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const resultado = loginUsuario(username, password);

    if (resultado.status === 'sucesso') {
      errorMessage.style.color = 'green';
      errorMessage.textContent = `✅ Bem-vindo, ${resultado.nome}!`;

      setTimeout(() => {
        if (resultado.tipo === 'admin') {
          // Admin → painel
          localStorage.removeItem('cliente_logado');
          window.location.href = '../admin/admin.html';
        } else {
          // Cliente → área iFood
          localStorage.setItem('cliente_logado', JSON.stringify({
            id: resultado.id,
            nome: resultado.nome,
            email: username,
            telefone: resultado.telefone || '',
            endereco: resultado.endereco || ''
          }));
          window.location.href = '../clientes/Principal.html';
        }
      }, 1000);
    } else {
      errorMessage.style.color = '#b7302b';
      errorMessage.textContent = `❌ ${resultado.mensagem}`;
    }
  });
}

// Botão Cadastrar
const toggleBtn = document.getElementById('toggleBtn');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    window.location.href = 'cadastro.html';
  });
}