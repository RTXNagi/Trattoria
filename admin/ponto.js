document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarPontos();
});

function carregarPontos() {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM pontos ORDER BY id DESC`);
  const tbody = document.getElementById('pontoBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!result.length) return;

  result[0].values.forEach(row => {
    const item = {
      id: row[0],
      funcionario: row[1],
      data: row[2],
      entrada: row[3],
      saida: row[4]
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.funcionario}</td>
      <td>${formatarData(item.data)}</td>
      <td>${item.entrada || '-'}</td>
      <td>${item.saida || '-'}</td>
      <td>
        <button class="edit-btn" type="button" onclick="editarPonto(${item.id})">✏️</button>
        <button class="delete-btn" type="button" onclick="apagarPonto(${item.id})">🗑️</button>
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

document.getElementById('openModalBtn')?.addEventListener('click', () => {
  document.getElementById('modalTitulo').textContent = 'Registrar Ponto';
  document.getElementById('editIndex').value = '';
  document.getElementById('pontoForm').reset();
  document.getElementById('pontoModal').style.display = 'flex';
});

function editarPonto(id) {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM pontos WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return;

  const row = result[0].values[0];

  document.getElementById('modalTitulo').textContent = 'Editar Ponto';
  document.getElementById('editIndex').value = row[0];
  document.getElementById('funcionario').value = row[1] || '';
  document.getElementById('data').value = row[2] || '';
  document.getElementById('entrada').value = row[3] || '';
  document.getElementById('saida').value = row[4] || '';

  document.getElementById('pontoModal').style.display = 'flex';
}

function apagarPonto(id) {
  if (confirm('Tem certeza que deseja apagar este registro de ponto?')) {
    if (!verificarBanco()) return;
    db.run(`DELETE FROM pontos WHERE id = ?`, [id]);
    salvarBanco();
    carregarPontos();
  }
}

document.getElementById('pontoForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = document.getElementById('editIndex').value;
  const funcionario = document.getElementById('funcionario').value.trim();
  const data = document.getElementById('data').value;
  const entrada = document.getElementById('entrada').value;
  const saida = document.getElementById('saida').value;

  if (!verificarBanco()) return;

  if (id === '') {
    db.run(
      `INSERT INTO pontos (funcionario, data, entrada, saida) VALUES (?,?,?,?)`,
      [funcionario, data, entrada, saida]
    );
  } else {
    db.run(
      `UPDATE pontos SET funcionario=?, data=?, entrada=?, saida=? WHERE id=?`,
      [funcionario, data, entrada, saida, id]
    );
  }

  salvarBanco();
  document.getElementById('pontoModal').style.display = 'none';
  carregarPontos();
});

document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
  document.getElementById('pontoModal').style.display = 'none';
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

    if (!verificarBanco()) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const result = db.exec(`SELECT * FROM pontos ORDER BY id DESC`);
    const lista = result.length
      ? result[0].values.map(row => ({
          funcionario: row[1] || '',
          data: row[2] || '',
          entrada: row[3] || '-',
          saida: row[4] || '-'
        }))
      : [];

    doc.setFontSize(16);
    doc.text('Trattoria Aldini - Controle de Ponto', 14, 18);
    doc.setFontSize(10);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 26);

    const rows = lista.map(item => [
      item.funcionario,
      formatarData(item.data),
      item.entrada,
      item.saida
    ]);

    if (rows.length === 0) {
      doc.text('Nenhum registro encontrado.', 14, 40);
    } else {
      doc.autoTable({
        startY: 32,
        head: [['Funcionario', 'Data', 'Entrada', 'Saida']],
        body: rows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [183, 48, 43] }
      });
    }

    doc.save('ponto-trattoria.pdf');
  } catch (erro) {
    console.error(erro);
    alert('❌ Erro ao gerar PDF: ' + erro.message);
  }
});