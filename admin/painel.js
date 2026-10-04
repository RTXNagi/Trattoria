// Selecionando elementos
const logoutBtn = document.getElementById('logoutBtn');
const modal = document.getElementById('logoutModal');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');

// Abrir o modal ao clicar em "Sair"
logoutBtn.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

// Fechar o modal ao clicar em "Cancelar"
cancelBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// Confirmar logout
confirmBtn.addEventListener('click', () => {
  // Aqui você pode adicionar lógica adicional se quiser (ex: limpar dados)
  window.location.href = "../login/login.html";
});

// Fechar modal ao pressionar ESC
document.addEventListener('keydown', (e) => {
  if (e.key === "Escape" && !modal.classList.contains('hidden')) {
    modal.classList.add('hidden');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});