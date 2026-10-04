// Aguarda o carregamento completo
window.addEventListener('load', () => {
  // Inicia a barra de progresso
  const progress = document.querySelector('.progress');
  if (progress) {
    setTimeout(() => {
      progress.style.width = '100%';
    }, 50);
  }

  // Redirecionamento automático após 3.8 segundos
  setTimeout(() => {
    const italia = document.querySelector('.italia');
    if (italia) {
      italia.style.transition = 'opacity 1.0s ease';
      italia.style.opacity = '0';
    }
    
    setTimeout(() => {
      window.location.href = '/Clientes/Principal.html';
    }, 800);
  }, 3800);

  // Botão pular
  const skipBtn = document.getElementById('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const italia = document.querySelector('.italia');
      if (italia) {
        italia.style.transition = 'opacity 0.6s ease';
        italia.style.opacity = '0';
      }
      setTimeout(() => {
        window.location.href = '/Clientes/Principal.html';
      }, 600);
    });
  }
});