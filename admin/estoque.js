document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarEstoque();
});

function carregarEstoque() {
  const lista = listarEstoque();
  const tbody = document.getElementById('estoqueBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const hoje = new Date();

  lista.forEach(item => {
    const validade = item.validade ? new Date(item.validade) : null;
    let status = 'Em dia';
    let statusClass = 'good';
    let icon = '✅';

    if (validade && !isNaN(validade)) {
      const diff = (validade - hoje) / (1000 * 60 * 60 * 24);
      if (diff < 0) {
        status = 'Vencido';
        statusClass = 'expired';
        icon = '❌';
      } else if (diff <= 30) {
        status = 'Quase vencendo';
        statusClass = 'warning';
        icon = '⚠️';
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.fabricante || ''}</td>
      <td>${item.lote || ''}</td>
      <td>${formatarData(item.chegada)}</td>
      <td>${formatarData(item.validade)}</td>
      <td>${item.quantidade}</td>
      <td><span class="status ${statusClass}">${icon} ${status}</span></td>
      <td>
        <button class="edit-btn" type="button" onclick="editarProduto(${item.id})">✏️</button>
        <button class="delete-btn" type="button" onclick="apagarProduto(${item.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return '';
  const parts = String(data).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return data;
}

function separarQuantidade(qtdTexto) {
  const match = String(qtdTexto || '').match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  return {
    num: match ? match[1] : '',
    unidade: match && match[2] ? match[2].trim() : 'kg'
  };
}

function editarProduto(id) {
  const item = listarEstoque().find(i => i.id === id);
  if (!item) return;

  document.getElementById('modalTitulo').textContent = 'Editar Produto';
  document.getElementById('editIndex').value = id;
  document.getElementById('produto').value = item.produto || '';
  document.getElementById('fabricante').value = item.fabricante || '';
  document.getElementById('lote').value = (item.lote || '').replace(/^LOT-/, '');
  document.getElementById('chegada').value = item.chegada || '';
  document.getElementById('validade').value = item.validade || '';

  const sep = separarQuantidade(item.quantidade);
  document.getElementById('quantidadeNum').value = sep.num;
  document.getElementById('unidade').value = sep.unidade || 'kg';

  document.getElementById('produtoModal').style.display = 'flex';
}

function apagarProduto(id) {
  if (confirm('Tem certeza que deseja apagar este produto?')) {
    apagarEstoque(id);
    carregarEstoque();
  }
}

document.getElementById('produtoForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = document.getElementById('editIndex').value;
  const produto = document.getElementById('produto').value.trim();
  const fabricante = document.getElementById('fabricante').value.trim();
  const loteNumero = document.getElementById('lote').value.trim();
  const lote = loteNumero ? `LOT-${loteNumero}` : '';
  const chegada = document.getElementById('chegada').value;
  const validade = document.getElementById('validade').value;
  const num = document.getElementById('quantidadeNum').value;
  const unidade = document.getElementById('unidade').value;
  const quantidade = `${num} ${unidade}`;

  if (id !== '') {
    editarEstoque(id, produto, fabricante, lote, chegada, validade, quantidade);
  }

  document.getElementById('produtoModal').style.display = 'none';
  carregarEstoque();
});

document.getElementById('btnCancelar')?.addEventListener('click', () => {
  document.getElementById('produtoModal').style.display = 'none';
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});