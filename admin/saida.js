document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarSaidas();
});

function carregarSaidas() {
  const lista = listarSaidas();
  const tbody = document.getElementById('saidaBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  lista.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(item.data)}</td>
      <td>${item.produto}</td>
      <td>${item.lote || '-'}</td>
      <td>${item.quantidade}</td>
      <td>${item.motivo || ''}</td>
      <td>${item.responsavel || ''}</td>
      <td>
        <button class="edit-btn" type="button" onclick="editarSaida(${item.id})">✏️</button>
        <button class="delete-btn" type="button" onclick="apagarSaida(${item.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return '';
  if (String(data).includes('-')) {
    const [a, m, d] = String(data).split('-');
    return `${d}/${m}/${a}`;
  }
  return data;
}

function separarQuantidade(qtdTexto) {
  const match = String(qtdTexto || '').match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  return {
    num: match ? match[1] : '',
    unidade: match && match[2] ? match[2].trim() : 'kg'
  };
}

function preencherSelectProdutos() {
  const select = document.getElementById('produto');
  if (!select) return;

  const lista = listarEstoque();
  select.innerHTML = '<option value="">Selecione um produto</option>';

  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item.produto;
    option.textContent = `${item.produto} (${item.quantidade})`;
    select.appendChild(option);
  });
}

document.getElementById('openModalBtn')?.addEventListener('click', () => {
  document.getElementById('editIndex').value = '';
  document.getElementById('saidaForm')?.reset();
  if (document.getElementById('unidade')) document.getElementById('unidade').value = 'kg';
  preencherSelectProdutos();
  document.getElementById('saidaModal').style.display = 'flex';
});

function editarSaida(id) {
  const item = listarSaidas().find(i => i.id === id);
  if (!item) return;

  preencherSelectProdutos();

  document.getElementById('editIndex').value = id;
  document.getElementById('produto').value = item.produto || '';
  document.getElementById('motivo').value = item.motivo || '';
  document.getElementById('responsavel').value = item.responsavel || '';
  document.getElementById('lote').value = (item.lote || '').replace(/^LOT-/, '');

  if (document.getElementById('quantidadeNum')) {
    const sep = separarQuantidade(item.quantidade);
    document.getElementById('quantidadeNum').value = sep.num;
    document.getElementById('unidade').value = sep.unidade || 'kg';
  }

  if (document.getElementById('dataSaida')) {
    document.getElementById('dataSaida').value = item.data || '';
  }

  document.getElementById('saidaModal').style.display = 'flex';
}

function apagarSaida(id) {
  if (confirm('Tem certeza que deseja apagar esta saída?')) {
    if (!verificarBanco()) return;
    db.run(`DELETE FROM saidas WHERE id = ?`, [id]);
    salvarBanco();
    carregarSaidas();
  }
}

document.getElementById('saidaForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = document.getElementById('editIndex')?.value || '';
  const produto = document.getElementById('produto').value.trim();

  let quantidade = '';
  if (document.getElementById('quantidadeNum')) {
    const num = document.getElementById('quantidadeNum').value;
    const unidade = document.getElementById('unidade').value;
    quantidade = `${num} ${unidade}`;
  } else {
    quantidade = document.getElementById('quantidade')?.value.trim() || '';
  }

  const loteNumero = document.getElementById('lote')?.value.trim() || '';
  const lote = loteNumero ? `LOT-${loteNumero}` : '';
  const motivo = document.getElementById('motivo').value.trim();
  const responsavel = document.getElementById('responsavel').value.trim();
  const data = document.getElementById('dataSaida')?.value || new Date().toISOString().slice(0, 10);

  if (!produto) {
    alert('❌ Selecione um produto');
    return;
  }

  if (id === '') {
    const resultado = adicionarSaida(produto, quantidade, lote, motivo, responsavel, data);
    if (resultado && resultado.status === 'sucesso') {
      alert('✅ ' + resultado.mensagem);
    } else {
      alert('❌ Erro ao registrar saída');
    }
  } else {
    if (!verificarBanco()) return;
    db.run(
      `UPDATE saidas SET produto=?, quantidade=?, lote=?, motivo=?, responsavel=?, data=? WHERE id=?`,
      [produto, quantidade, lote, motivo, responsavel, data, id]
    );
    salvarBanco();
  }

  document.getElementById('saidaModal').style.display = 'none';
  carregarSaidas();
});

document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
  document.getElementById('saidaModal').style.display = 'none';
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});

// ====================== PDF ======================
document.getElementById('btnPdf')?.addEventListener('click', () => {
  try {
    if (typeof window.jspdf === 'undefined') {
      alert('❌ Biblioteca PDF não carregou. Verifique a internet.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lista = listarSaidas();

    doc.setFontSize(16);
    doc.text('Trattoria Aldini - Historico de Saidas', 14, 18);
    doc.setFontSize(10);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 26);

    const rows = (lista || []).map(item => [
      formatarData(item.data),
      item.produto || '',
      item.lote || '-',
      item.quantidade || '',
      item.motivo || '',
      item.responsavel || ''
    ]);

    if (rows.length === 0) {
      doc.text('Nenhum registro encontrado.', 14, 40);
    } else {
      doc.autoTable({
        startY: 32,
        head: [['Data', 'Produto', 'Lote', 'Quantidade', 'Motivo', 'Responsavel']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [183, 48, 43] }
      });
    }

    doc.save('saidas-trattoria.pdf');
  } catch (erro) {
    console.error(erro);
    alert('❌ Erro ao gerar PDF: ' + erro.message);
  }
});