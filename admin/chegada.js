document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarChegadas();
});

function carregarChegadas() {
  const lista = listarChegadas();
  const tbody = document.getElementById('chegadaBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  lista.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(item.data)}</td>
      <td>${item.produto}</td>
      <td>${item.lote || ''}</td>
      <td>${item.quantidade}</td>
      <td>${item.responsavel || ''}</td>
      <td>
        <button class="edit-btn" type="button" onclick="editarChegada(${item.id})">✏️</button>
        <button class="delete-btn" type="button" onclick="apagarChegada(${item.id})">🗑️</button>
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

document.getElementById('openModalBtn')?.addEventListener('click', () => {
  document.getElementById('editIndex').value = '';
  document.getElementById('cadastroForm')?.reset();
  if (document.getElementById('unidade')) document.getElementById('unidade').value = 'kg';
  document.getElementById('cadastroModal').style.display = 'flex';
});

function editarChegada(id) {
  const item = listarChegadas().find(i => i.id === id);
  if (!item) return;

  document.getElementById('editIndex').value = id;
  document.getElementById('produto').value = item.produto || '';
  document.getElementById('lote').value = (item.lote || '').replace(/^LOT-/, '');
  document.getElementById('responsavel').value = item.responsavel || '';
  if (document.getElementById('dataChegada')) {
    document.getElementById('dataChegada').value = item.data || '';
  }

  if (document.getElementById('quantidadeNum')) {
    const sep = separarQuantidade(item.quantidade);
    document.getElementById('quantidadeNum').value = sep.num;
    document.getElementById('unidade').value = sep.unidade || 'kg';
  }

  document.getElementById('cadastroModal').style.display = 'flex';
}

function apagarChegada(id) {
  if (confirm('Tem certeza que deseja apagar esta chegada?')) {
    if (!verificarBanco()) return;
    db.run(`DELETE FROM chegadas WHERE id = ?`, [id]);
    salvarBanco();
    carregarChegadas();
  }
}

document.getElementById('cadastroForm')?.addEventListener('submit', (e) => {
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
  const responsavel = document.getElementById('responsavel').value.trim();
  const data = document.getElementById('dataChegada')?.value || new Date().toISOString().slice(0, 10);

  if (id === '') {
    const resultado = adicionarChegada(produto, quantidade, lote, responsavel, data);
    if (resultado && resultado.status === 'sucesso') {
      alert('✅ ' + resultado.mensagem);
    } else {
      alert('❌ Erro ao registrar chegada');
    }
  } else {
    if (!verificarBanco()) return;
    db.run(
      `UPDATE chegadas SET produto=?, quantidade=?, lote=?, responsavel=?, data=? WHERE id=?`,
      [produto, quantidade, lote, responsavel, data, id]
    );
    salvarBanco();
  }

  document.getElementById('cadastroModal').style.display = 'none';
  carregarChegadas();
});

document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
  document.getElementById('cadastroModal').style.display = 'none';
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
    const lista = listarChegadas();

    doc.setFontSize(16);
    doc.text('Trattoria Aldini - Historico de Chegadas', 14, 18);
    doc.setFontSize(10);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 26);

    const rows = (lista || []).map(item => [
      formatarData(item.data),
      item.produto || '',
      item.lote || '',
      item.quantidade || '',
      item.responsavel || ''
    ]);

    if (rows.length === 0) {
      doc.text('Nenhum registro encontrado.', 14, 40);
    } else {
      doc.autoTable({
        startY: 32,
        head: [['Data', 'Produto', 'Lote', 'Quantidade', 'Responsavel']],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [183, 48, 43] }
      });
    }

    doc.save('chegadas-trattoria.pdf');
  } catch (erro) {
    console.error(erro);
    alert('❌ Erro ao gerar PDF: ' + erro.message);
  }
});