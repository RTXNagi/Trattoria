// Destino após o splash (ajuste se a pasta for outra)
const DESTINO = '../Clientes/Principal.html';

function irParaApp() {
  const italia = document.querySelector('.italia');
  if (italia) {
    italia.style.transition = 'opacity 0.6s ease';
    italia.style.opacity = '0';
  }
  setTimeout(() => {
    window.location.href = DESTINO;
  }, 600);
}

window.addEventListener('load', () => {
  const progress = document.querySelector('.progress');
  if (progress) {
    setTimeout(() => {
      progress.style.width = '100%';
    }, 50);
  }

  setTimeout(() => {
    const italia = document.querySelector('.italia');
    if (italia) {
      italia.style.transition = 'opacity 1s ease';
      italia.style.opacity = '0';
    }
    setTimeout(() => {
      window.location.href = DESTINO;
    }, 800);
  }, 3800);

  const skipBtn = document.getElementById('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', irParaApp);
  }
});
