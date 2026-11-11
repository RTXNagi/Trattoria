document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('❌ Banco não aberto');
    return;
  }
  carregarProdutosVendidos();
  
  document.getElementById('filtroCategoria')?.addEventListener('change', carregarProdutosVendidos);
  document.getElementById('btnAtualizar')?.addEventListener('click', () => {
    carregarProdutosVendidos();
    alert('🔄 Lista de produtos mais vendidos atualizada!');
  });
});

function carregarProdutosVendidos() {
  if (!verificarBanco()) return;

  const filtro = document.getElementById('filtroCategoria')?.value || 'todos';

  // Consulta interligando a tabela de produtos com a contagem real na tabela de itens_pedido
  let query = `
    SELECT 
      p.id, 
      p.nome, 
      p.preco, 
      p.categoria, 
      COALESCE(SUM(i.quantidade), 0) as total_vendido,
      COALESCE(SUM(i.quantidade * i.preco_unitario), 0) as faturamento
    FROM produtos p
    LEFT JOIN itens_pedido i ON p.id = i.id_produto
  `;

  if (filtro !== 'todos') {
    query += ` WHERE p.categoria = '${filtro}' `;
  }

  query += ` GROUP BY p.id ORDER BY total_vendido DESC, faturamento DESC`;

  const tbody = document.getElementById('produtosVendidosBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  let result;
  try {
    result = db.exec(query);
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Erro ao carregar os dados.</td></tr>';
    return;
  }

  if (!result.length || !result[0].values.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 30px; color: #666;">
          Nenhum produto cadastrado nesta categoria.
        </td>
      </tr>
    `;
    return;
  }

  let rank = 1;
  result[0].values.forEach(row => {
    const item = {
      id: row[0],
      nome: row[1],
      preco: parseFloat(row[2]) || 0,
      categoria: row[3] || 'Pizza',
      totalVendido: row[4] || 0,
      faturamento: parseFloat(row[5]) || 0
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${rank}</strong></td>
      <td><strong>${item.nome}</strong></td>
      <td><span style="padding: 4px 8px; border-radius: 4px; background: #f0e0c0; font-size: 13px; font-weight: 600;">${item.categoria}</span></td>
      <td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td>
      <td><strong style="color: #b7302b; font-size: 16px;">${item.totalVendido} un.</strong></td>
      <td><strong style="color: #1f7a3a;">R$ ${item.faturamento.toFixed(2).replace('.', ',')}</strong></td>
    `;
    tbody.appendChild(tr);
    rank++;
  });
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (confirm('Deseja realmente sair?')) {
     window.location.href = '../login/auth.html';
  }
});
