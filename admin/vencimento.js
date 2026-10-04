document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarVencimentos();
});

function carregarVencimentos() {
  const lista = listarEstoque();
  const tbody = document.getElementById('vencimentoBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const hoje = new Date();

  // Filtra só os que estão vencidos ou quase vencendo (30 dias ou menos)
  const filtrados = lista.filter(item => {
    if (!item.validade) return false;
    const validade = new Date(item.validade);
    const diff = (validade - hoje) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 30px; color: #1f7a3a;">
          ✅ Nenhum produto vencido ou próximo do vencimento
        </td>
      </tr>
    `;
    return;
  }

  // Ordena: vencidos primeiro, depois os que vencem mais cedo
  filtrados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  filtrados.forEach(item => {
    const validade = new Date(item.validade);
    const diff = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

    let status = '';
    let statusClass = '';
    let icon = '';
    let diasTexto = '';

    if (diff < 0) {
      status = 'Vencido';
      statusClass = 'expired';
      icon = '❌';
      diasTexto = `${Math.abs(diff)} dia(s) atrás`;
    } else if (diff === 0) {
      status = 'Vence hoje';
      statusClass = 'expired';
      icon = '❌';
      diasTexto = 'Hoje';
    } else {
      status = 'Quase vencendo';
      statusClass = 'warning';
      icon = '⚠️';
      diasTexto = `Em ${diff} dia(s)`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.lote || '-'}</td>
      <td>${formatarData(item.validade)}</td>
      <td>${item.quantidade}</td>
      <td><span class="status ${statusClass}">${icon} ${status}</span></td>
      <td>${diasTexto}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return '';
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});