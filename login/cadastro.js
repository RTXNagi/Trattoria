document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
  }
});

// Mostrar / Ocultar senhas
const toggleSenha = document.getElementById('toggleSenha');
const toggleConfirmarSenha = document.getElementById('toggleConfirmarSenha');
const senhaInput = document.getElementById('senha');
const confirmarSenhaInput = document.getElementById('confirmarSenha');

if (toggleSenha && senhaInput) {
  toggleSenha.addEventListener('click', () => {
    senhaInput.type = senhaInput.type === 'password' ? 'text' : 'password';
    toggleSenha.textContent = senhaInput.type === 'password' ? '👁️' : '🙈';
  });
}

if (toggleConfirmarSenha && confirmarSenhaInput) {
  toggleConfirmarSenha.addEventListener('click', () => {
    confirmarSenhaInput.type = confirmarSenhaInput.type === 'password' ? 'text' : 'password';
    toggleConfirmarSenha.textContent = confirmarSenhaInput.type === 'password' ? '👁️' : '🙈';
  });
}

// Cadastro
const cadastroForm = document.getElementById('cadastroForm');
const errorMessage = document.getElementById('errorMessage');

if (cadastroForm) {
  cadastroForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const confirmar = document.getElementById('confirmarSenha').value.trim();
    const telefone = document.getElementById('telefone')?.value.trim() || '';
    const endereco = document.getElementById('endereco')?.value.trim() || '';

    if (senha !== confirmar) {
      errorMessage.style.color = '#b7302b';
      errorMessage.textContent = '❌ As senhas não coincidem!';
      return;
    }

    const resultado = cadastrarUsuario(nome, email, senha, telefone, endereco);

    if (resultado.status === 'sucesso') {
      errorMessage.style.color = 'green';
      errorMessage.textContent = '✅ ' + resultado.mensagem;

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      errorMessage.style.color = '#b7302b';
      errorMessage.textContent = '❌ ' + resultado.mensagem;
    }
  });
}

// Voltar para Login
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    window.location.href = 'login.html';
  });
}