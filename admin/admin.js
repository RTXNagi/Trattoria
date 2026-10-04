const logoutBtn = document.getElementById('logoutBtn');
const modal = document.getElementById('logoutModal');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');

logoutBtn.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

confirmBtn.addEventListener('click', () => {
  window.location.href = "../login/login.html";
});
