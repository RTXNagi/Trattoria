let contratoRenovacaoId = null;
let valorOriginalRenovacao = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarParcerias();
});

function carregarParcerias() {
  if (!verificarBanco()) return;

  let result;
  try {
    result = db.exec(`SELECT * FROM parcerias ORDER BY id DESC`);
  } catch (e) {
    console.error(e);
    alert('Erro ao ler parcerias: ' + e.message);
    return;
  }

  const tbody = document.getElementById('parceriasBody');
  const alertaBox = document.getElementById('alertaVencimento');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!result.length || !result[0].values.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 30px; color: #666;">
          Nenhum contrato cadastrado
        </td>
      </tr>
    `;
    if (alertaBox) alertaBox.style.display = 'none';
    return;
  }

  const hoje = new Date();
  let vencidos = 0;
  let vencendo = 0;

  result[0].values.forEach(row => {
    const item = {
      id: row[0],
      nome: row[1] || '',
      tipo: row[2] || '',
      contato: row[3] || '',
      observacao: row[4] || '',
      inicio: row[5] || '',
      termino: row[6] || '',
      rendimento: row[7] || 0,
      moeda: row[8] || 'R$',
      frequencia: row[9] || 'Mensal'
    };

    const termino = item.termino ? new Date(item.termino) : null;
    let tempoRestante = '-';
    let status = 'Ativo';
    let statusClass = 'ativo';

    if (termino && !isNaN(termino)) {
      const diff = Math.ceil((termino - hoje) / (1000 * 60 * 60 * 24));

      if (diff < 0) {
        status = 'Encerrado';
        statusClass = 'encerrado';
        tempoRestante = `Encerrado há ${Math.abs(diff)} dia(s)`;
        vencidos++;
      } else if (diff === 0) {
        status = 'Vence hoje';
        statusClass = 'vencendo';
        tempoRestante = 'Hoje';
        vencendo++;
      } else if (diff <= 30) {
        status = 'Vencendo';
        statusClass = 'vencendo';
        tempoRestante = `${diff} dia(s)`;
        vencendo++;
      } else {
        tempoRestante = `${diff} dia(s)`;
      }
    }

    const rendimentoTexto = `${item.moeda} ${parseFloat(item.rendimento).toFixed(2).replace('.', ',')} / ${item.frequencia}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.tipo || '-'}</td>
      <td>${formatarData(item.inicio)}</td>
      <td>${formatarData(item.termino)}</td>
      <td>${tempoRestante}</td>
      <td>${rendimentoTexto}</td>
      <td><span class="status ${statusClass}">${status}</span></td>
      <td>
        <button class="edit-btn" type="button" onclick="editarParceria(${item.id})">✏️</button>
        <button class="renew-btn" type="button" onclick="abrirRenovacao(${item.id})">🔄</button>
        <button class="delete-btn" type="button" onclick="apagarParceria(${item.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (alertaBox) {
    if (vencidos > 0 || vencendo > 0) {
      let mensagem = '';
      let classe = '';

      if (vencidos > 0 && vencendo > 0) {
        mensagem = `⚠️ Atenção: ${vencidos} contrato(s) encerrado(s) e ${vencendo} próximo(s) do vencimento!`;
        classe = 'urgente';
      } else if (vencidos > 0) {
        mensagem = `❌ ${vencidos} contrato(s) já encerrado(s). Verifique a renovação.`;
        classe = 'urgente';
      } else {
        mensagem = `⚠️ ${vencendo} contrato(s) vencendo nos próximos 30 dias.`;
        classe = 'aviso';
      }

      alertaBox.className = `alerta-box ${classe}`;
      alertaBox.textContent = mensagem;
      alertaBox.style.display = 'block';
    } else {
      alertaBox.className = 'alerta-box ok';
      alertaBox.textContent = '✅ Todos os contratos estão em dia.';
      alertaBox.style.display = 'block';
    }
  }
}

function formatarData(data) {
  if (!data) return '-';
  if (String(data).includes('-')) {
    const [a, m, d] = String(data).split('-');
    return `${d}/${m}/${a}`;
  }
  return data;
}

// ====================== ABRIR MODAL ADICIONAR ======================
document.getElementById('openModalBtn')?.addEventListener('click', () => {
  document.getElementById('modalTitulo').textContent = 'Adicionar Contrato';
  document.getElementById('editIndex').value = '';
  document.getElementById('parceriaForm').reset();
  document.getElementById('parceriaModal').style.display = 'flex';
});

// ====================== EDITAR ======================
function editarParceria(id) {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM parcerias WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return;

  const row = result[0].values[0];

  document.getElementById('modalTitulo').textContent = 'Editar Contrato';
  document.getElementById('editIndex').value = row[0];
  document.getElementById('nome').value = row[1] || '';
  document.getElementById('tipo').value = row[2] || '';
  document.getElementById('contato').value = row[3] || '';
  document.getElementById('observacao').value = row[4] || '';
  document.getElementById('inicio').value = row[5] || '';
  document.getElementById('termino').value = row[6] || '';
  document.getElementById('rendimento').value = row[7] || '';
  if (document.getElementById('moeda')) document.getElementById('moeda').value = row[8] || 'R$';
  if (document.getElementById('frequencia')) document.getElementById('frequencia').value = row[9] || 'Mensal';

  document.getElementById('parceriaModal').style.display = 'flex';
}

// ====================== APAGAR ======================
function apagarParceria(id) {
  if (confirm('Tem certeza que deseja apagar este contrato?')) {
    if (!verificarBanco()) return;
    db.run(`DELETE FROM parcerias WHERE id = ?`, [id]);
    salvarBanco();
    carregarParcerias();
  }
}

// ====================== SALVAR ======================
document.getElementById('parceriaForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  try {
    const id = document.getElementById('editIndex').value;
    const nome = document.getElementById('nome').value.trim();
    const tipo = document.getElementById('tipo').value;
    const contato = document.getElementById('contato').value.trim();
    const observacao = document.getElementById('observacao').value.trim();
    const inicio = document.getElementById('inicio').value;
    const termino = document.getElementById('termino').value;
    const rendimento = parseFloat(document.getElementById('rendimento').value) || 0;
    const moeda = document.getElementById('moeda')?.value || 'R$';
    const frequencia = document.getElementById('frequencia')?.value || 'Mensal';

    if (!nome || !tipo || !inicio || !termino) {
      alert('❌ Preencha os campos obrigatórios');
      return;
    }

    if (!verificarBanco()) return;

    if (id === '') {
      db.run(
        `INSERT INTO parcerias (nome, tipo, contato, observacao, inicio, termino, rendimento, moeda, frequencia)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [nome, tipo, contato, observacao, inicio, termino, rendimento, moeda, frequencia]
      );
      alert('✅ Contrato adicionado com sucesso!');
    } else {
      db.run(
        `UPDATE parcerias SET nome=?, tipo=?, contato=?, observacao=?, inicio=?, termino=?, rendimento=?, moeda=?, frequencia=? WHERE id=?`,
        [nome, tipo, contato, observacao, inicio, termino, rendimento, moeda, frequencia, id]
      );
      alert('✅ Contrato atualizado!');
    }

    salvarBanco();
    document.getElementById('parceriaModal').style.display = 'none';
    carregarParcerias();

  } catch (erro) {
    console.error(erro);
    alert('❌ Erro ao salvar: ' + erro.message + '\n\nTente limpar o banco no Console (F12).');
  }
});

document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
  document.getElementById('parceriaModal').style.display = 'none';
});

// ====================== RENOVAR ======================
function abrirRenovacao(id) {
  if (!verificarBanco()) return;

  const result = db.exec(`SELECT * FROM parcerias WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) return;

  const row = result[0].values[0];
  contratoRenovacaoId = row[0];
  valorOriginalRenovacao = parseFloat(row[7]) || 0;
  const moeda = row[8] || 'R$';

  document.getElementById('renovarInfo').textContent =
    `Contrato: ${row[1]} | Valor atual: ${moeda} ${valorOriginalRenovacao.toFixed(2)}`;

  document.getElementById('novoValor').value = valorOriginalRenovacao;
  document.getElementById('renovarModal').style.display = 'flex';
}

document.getElementById('confirmarRenovarBtn')?.addEventListener('click', () => {
  try {
    const novoValor = parseFloat(document.getElementById('novoValor').value) || 0;

    if (novoValor <= 0) {
      alert('❌ Digite um valor válido');
      return;
    }

    let chanceDe1 = 0.5;
    if (valorOriginalRenovacao > 0) {
      const razao = novoValor / valorOriginalRenovacao;
      chanceDe1 = Math.min(0.95, Math.max(0.05, razao * 0.5));
    }

    const sorteio = Math.random() < chanceDe1 ? 1 : 2;

    if (sorteio === 1) {
      const result = db.exec(`SELECT termino FROM parcerias WHERE id = ?`, [contratoRenovacaoId]);
      let novoTermino = new Date();

      if (result.length && result[0].values.length && result[0].values[0][0]) {
        novoTermino = new Date(result[0].values[0][0]);
        if (isNaN(novoTermino)) novoTermino = new Date();
      }

      // Se já venceu, renova a partir de hoje
      if (novoTermino < new Date()) novoTermino = new Date();

      novoTermino.setFullYear(novoTermino.getFullYear() + 1);
      const terminoStr = novoTermino.toISOString().slice(0, 10);

      db.run(
        `UPDATE parcerias SET rendimento = ?, termino = ? WHERE id = ?`,
        [novoValor, terminoStr, contratoRenovacaoId]
      );
      salvarBanco();

      alert(`🎉 Sorteio: 1\n\nContrato ACEITO e renovado!\nNovo valor: ${novoValor}\nNovo término: ${terminoStr.split('-').reverse().join('/')}`);
    } else {
      alert(`😢 Sorteio: 2\n\nRenovação RECUSADA pelo parceiro.\nTente um valor diferente.`);
    }

    document.getElementById('renovarModal').style.display = 'none';
    carregarParcerias();
  } catch (erro) {
    console.error(erro);
    alert('❌ Erro na renovação: ' + erro.message);
  }
});

document.getElementById('cancelRenovarBtn')?.addEventListener('click', () => {
  document.getElementById('renovarModal').style.display = 'none';
});

// ====================== LOGOUT ======================
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
    window.location.href = '../login/login.html';
  }
});