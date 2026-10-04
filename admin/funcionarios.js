let promoId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarFuncionarios();
});

function carregarFuncionarios() {
  if (!verificarBanco()) return;

  let result;
  try {
    result = db.exec(`SELECT * FROM funcionarios ORDER BY id DESC`);
  } catch (e) {
    console.error(e);
    alert('Erro ao ler funcionários. Limpe o banco no Console (F12).');
    return;
  }

  const tbody = document.getElementById('funcionariosBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!result.length || !result[0].values.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 30px; color: #666;">
          Nenhum funcionário cadastrado
        </td>
      </tr>
    `;
    return;
  }

  result[0].values.forEach(row => {
    const item = {
      id: row[0],
      nome: row[1] || '',
      cargo: row[2] || '',
      telefone: row[3] || '',
      salario: row[4] || 0,
      data_admissao: row[5] || '',
      estrelas: row[6] != null ? row[6] : 3,
      faltas: row[7] != null ? row[7] : 0,
      meta: row[8] != null ? row[8] : 0,
      status: row[9] || 'Ativo'
    };

    const estrelasNum = Math.min(5, Math.max(1, parseInt(item.estrelas) || 3));
    const estrelasTexto = '⭐'.repeat(estrelasNum);
    const salarioTexto = `R$ ${parseFloat(item.salario).toFixed(2).replace('.', ',')}`;
    const statusClass = item.status === 'Demitido' ? 'demitido' : 'ativo';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.cargo}</td>
      <td>${item.telefone || '-'}</td>
      <td>${salarioTexto}</td>
      <td class="estrelas">${estrelasTexto}</td>
      <td>${item.faltas}</td>
      <td>${item.meta}%</td>
      <td><span class="status ${statusClass}">${item.status}</span></td>
      <td>
        <button class="edit-btn" type="button" onclick="editarFuncionario(${item.id})">✏️</button>
        <button class="promo-btn" type="button" onclick="abrirPromocao(${item.id})">⬆️</button>
        <button class="fire-btn" type="button" onclick="demitirFuncionario(${item.id})">🚪</button>
        <button class="delete-btn" type="button" onclick="apagarFuncionario(${item.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ====================== ADICIONAR ======================
document.getElementById('openModalBtn')?.addEventListener('click', () => {
  document.getElementById('modalTitulo').textContent = 'Adicionar Funcionário';
  document.getElementById('editIndex').value = '';
  document.getElementById('funcForm').reset();

  // Esconde estrelas, faltas e meta
  const extras = document.getElementById('camposExtras');
  if (extras) extras.style.display = 'none';

  document.getElementById('funcModal').style.display = 'flex';
});

// ====================== EDITAR ======================
function editarFuncionario(id) {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM funcionarios WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return;

  const row = result[0].values[0];

  document.getElementById('modalTitulo').textContent = 'Editar Funcionário';
  document.getElementById('editIndex').value = row[0];
  document.getElementById('nome').value = row[1] || '';
  document.getElementById('cargo').value = row[2] || '';
  document.getElementById('telefone').value = row[3] || '';
  document.getElementById('salario').value = row[4] || '';
  document.getElementById('data_admissao').value = row[5] || '';

  // Mostra e preenche estrelas, faltas e meta
  const extras = document.getElementById('camposExtras');
  if (extras) extras.style.display = 'block';

  document.getElementById('estrelas').value = row[6] != null ? row[6] : '3';
  document.getElementById('faltas').value = row[7] != null ? row[7] : '0';
  document.getElementById('meta').value = row[8] != null ? row[8] : '0';

  document.getElementById('funcModal').style.display = 'flex';
}

// ====================== SALVAR ======================
document.getElementById('funcForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  try {
    const id = document.getElementById('editIndex').value;
    const nome = document.getElementById('nome').value.trim();
    const cargo = document.getElementById('cargo').value;
    const telefone = document.getElementById('telefone').value.trim();
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const data_admissao = document.getElementById('data_admissao').value;

    if (!nome || !cargo) {
      alert('❌ Preencha nome e cargo');
      return;
    }

    if (!verificarBanco()) return;

    if (id === '') {
      // Adicionar: estrelas=3, faltas=0, meta=0 por padrão
      db.run(
        `INSERT INTO funcionarios (nome, cargo, telefone, salario, data_admissao, estrelas, faltas, meta, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [nome, cargo, telefone, salario, data_admissao, 3, 0, 0, 'Ativo']
      );
      alert('✅ Funcionário adicionado!');
    } else {
      // Editar: pega estrelas, faltas e meta
      const estrelas = parseInt(document.getElementById('estrelas').value) || 3;
      const faltas = parseInt(document.getElementById('faltas').value) || 0;
      const meta = parseInt(document.getElementById('meta').value) || 0;

      db.run(
        `UPDATE funcionarios SET nome=?, cargo=?, telefone=?, salario=?, data_admissao=?, estrelas=?, faltas=?, meta=? WHERE id=?`,
        [nome, cargo, telefone, salario, data_admissao, estrelas, faltas, meta, id]
      );
      alert('✅ Funcionário atualizado!');
    }

    salvarBanco();
    document.getElementById('funcModal').style.display = 'none';
    carregarFuncionarios();
  } catch (erro) {
    console.error(erro);
    alert('❌ Erro ao salvar: ' + erro.message + '\n\nLimpe o banco no Console (F12).');
  }
});

document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
  document.getElementById('funcModal').style.display = 'none';
});

// ====================== PROMOÇÃO ======================
function abrirPromocao(id) {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM funcionarios WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return;

  const row = result[0].values[0];
  promoId = row[0];

  document.getElementById('promoInfo').textContent =
    `Funcionário: ${row[1]} | Cargo atual: ${row[2]} | Salário: R$ ${parseFloat(row[4] || 0).toFixed(2)}`;

  document.getElementById('novoCargo').value = row[2] || '';
  document.getElementById('novoSalario').value = row[4] || 0;
  document.getElementById('promoModal').style.display = 'flex';
}

document.getElementById('confirmPromoBtn')?.addEventListener('click', () => {
  const novoCargo = document.getElementById('novoCargo').value;
  const novoSalario = parseFloat(document.getElementById('novoSalario').value) || 0;

  if (!verificarBanco()) return;

  db.run(`UPDATE funcionarios SET cargo = ?, salario = ? WHERE id = ?`, [novoCargo, novoSalario, promoId]);
  salvarBanco();

  alert('🎉 Funcionário promovido!');
  document.getElementById('promoModal').style.display = 'none';
  carregarFuncionarios();
});

document.getElementById('cancelPromoBtn')?.addEventListener('click', () => {
  document.getElementById('promoModal').style.display = 'none';
});

// ====================== DEMISSÃO ======================
function demitirFuncionario(id) {
  if (!confirm('Tem certeza que deseja demitir este funcionário?')) return;
  if (!verificarBanco()) return;

  db.run(`UPDATE funcionarios SET status = 'Demitido' WHERE id = ?`, [id]);
  salvarBanco();
  alert('🚪 Funcionário demitido.');
  carregarFuncionarios();
}

// ====================== APAGAR ======================
function apagarFuncionario(id) {
  if (!confirm('Tem certeza que deseja apagar este registro?')) return;
  if (!verificarBanco()) return;

  db.run(`DELETE FROM funcionarios WHERE id = ?`, [id]);
  salvarBanco();
  carregarFuncionarios();
}

// ====================== LOGOUT ======================
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});