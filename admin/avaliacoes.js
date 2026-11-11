document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarAvaliacoes();
});

function carregarAvaliacoes() {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM avaliacoes ORDER BY id DESC`);
  const tbody = document.getElementById('avaliacoesBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!result.length || !result[0].values.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 30px; color: #666;">
          Nenhuma avaliação registrada ainda.
        </td>
      </tr>
    `;
    return;
  }

  result[0].values.forEach(row => {
    const item = {
      id: row[0],
      cliente: row[1] || 'Anônimo',
      nota: row[2] || 5,
      comentario: row[3] || '',
      data: row[4] || ''
    };

    const estrelasTexto = '⭐'.repeat(Math.min(5, Math.max(1, item.nota)));

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.cliente}</td>
      <td class="estrelas">${estrelasTexto} (${item.nota})</td>
      <td>${item.comentario}</td>
      <td>${formatarData(item.data)}</td>
      <td>
        <button class="delete-btn" type="button" onclick="apagarAvaliacao(${item.id})">🗑️ Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return '-';
  if (String(data).includes('-')) {
    const [a, m, d] = String(data).split(' ')[0].split('-');
    return `${d}/${m}/${a}`;
  }
  return data;
}

function apagarAvaliacao(id) {
  if (confirm('Tem certeza que deseja excluir esta avaliação?')) {
    if (!verificarBanco()) return;
    db.run(`DELETE FROM avaliacoes WHERE id = ?`, [id]);
    salvarBanco();
    carregarAvaliacoes();
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
   window.location.href = '../login/auth.html';
  }
});
