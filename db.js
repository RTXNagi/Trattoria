let db = null;
let bancoAberto = false;

async function abrirBanco() {
  try {
    if (typeof initSqlJs === 'undefined') {
      console.error('sql.js não foi carregado');
      alert('❌ Biblioteca sql.js não carregou. Verifique a internet ou o script.');
      return false;
    }

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    const salvo = localStorage.getItem('trattoria_db');

    if (salvo) {
      const dados = new Uint8Array(JSON.parse(salvo));
      db = new SQL.Database(dados);
    } else {
      db = new SQL.Database();
    }

    criarTabelas();
    popularProdutos();
    popularEstoqueInicial();

    // Colunas extras (bancos antigos)
    try { db.run(`ALTER TABLE saidas ADD COLUMN lote TEXT`); } catch (e) {}
    try { db.run(`ALTER TABLE parcerias ADD COLUMN moeda TEXT DEFAULT 'R$'`); } catch (e) {}
    try { db.run(`ALTER TABLE parcerias ADD COLUMN frequencia TEXT DEFAULT 'Mensal'`); } catch (e) {}
    try { db.run(`ALTER TABLE funcionarios ADD COLUMN estrelas INTEGER DEFAULT 3`); } catch (e) {}
    try { db.run(`ALTER TABLE funcionarios ADD COLUMN faltas INTEGER DEFAULT 0`); } catch (e) {}
    try { db.run(`ALTER TABLE funcionarios ADD COLUMN meta INTEGER DEFAULT 0`); } catch (e) {}
    try { db.run(`ALTER TABLE funcionarios ADD COLUMN status TEXT DEFAULT 'Ativo'`); } catch (e) {}
    try { db.run(`ALTER TABLE clientes ADD COLUMN cep TEXT`); } catch (e) {}

    salvarBanco();
    bancoAberto = true;
    console.log('✅ Banco aberto com sucesso');
    return true;
  } catch (e) {
    bancoAberto = false;
    console.error('Erro ao abrir banco:', e);
    alert('❌ Banco não aberto\n\nErro: ' + e.message);
    return false;
  }
}

function salvarBanco() {
  if (!db) return;
  localStorage.setItem('trattoria_db', JSON.stringify(Array.from(db.export())));
}

function verificarBanco() {
  if (!bancoAberto || !db) {
    alert('❌ Banco não aberto');
    return false;
  }
  return true;
}

function criarTabelas() {
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      telefone TEXT,
      endereco TEXT,
      cep TEXT
    );

    CREATE TABLE IF NOT EXISTS estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto TEXT NOT NULL,
      fabricante TEXT,
      lote TEXT,
      chegada TEXT,
      validade TEXT,
      quantidade TEXT
    );

    CREATE TABLE IF NOT EXISTS chegadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto TEXT,
      quantidade TEXT,
      lote TEXT,
      responsavel TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS saidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto TEXT,
      quantidade TEXT,
      lote TEXT,
      motivo TEXT,
      responsavel TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      cargo TEXT,
      telefone TEXT,
      salario REAL,
      data_admissao TEXT,
      estrelas INTEGER DEFAULT 3,
      faltas INTEGER DEFAULT 0,
      meta INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Ativo'
    );

    CREATE TABLE IF NOT EXISTS pontos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario TEXT,
      data TEXT,
      entrada TEXT,
      saida TEXT
    );

    CREATE TABLE IF NOT EXISTS parcerias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      tipo TEXT,
      contato TEXT,
      observacao TEXT,
      inicio TEXT,
      termino TEXT,
      rendimento REAL DEFAULT 0,
      moeda TEXT DEFAULT 'R$',
      frequencia TEXT DEFAULT 'Mensal'
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT,
      nota INTEGER,
      comentario TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      preco REAL,
      categoria TEXT,
      vendidos INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente INTEGER,
      total REAL,
      status TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_pedido INTEGER,
      forma TEXT,
      valor REAL,
      status TEXT
    );
  `);
}

// ====================== CARDÁPIO COMPLETO ======================
function popularProdutos() {
  const check = db.exec(`SELECT COUNT(*) FROM produtos`);
  const qtd = check.length ? check[0].values[0][0] : 0;
  if (qtd >= 30) return;

  db.run(`DELETE FROM produtos`);

  const lista = [
    [1,  'Calabresa',              29.90, 'Pizza', 120],
    [2,  'Frango com Catupiry',    34.90, 'Pizza', 110],
    [3,  '4 Queijos',              36.90, 'Pizza', 95],
    [4,  'Portuguesa',             32.90, 'Pizza', 90],
    [5,  'Margherita',             28.90, 'Pizza', 80],
    [6,  'Pepperoni',              35.90, 'Pizza', 85],
    [7,  'Mussarela',              27.90, 'Pizza', 100],
    [8,  'Bacon',                  33.90, 'Pizza', 70],
    [9,  'Atum',                   34.90, 'Pizza', 40],
    [10, 'Carne Seca',             39.90, 'Pizza', 55],
    [11, 'Lombo Canadense',        36.90, 'Pizza', 45],
    [12, 'Palmito',                35.90, 'Pizza', 35],
    [13, 'Vegetariana',            33.90, 'Pizza', 30],
    [14, 'Calabresa Acebolada',    31.90, 'Pizza', 60],
    [15, 'Frango com Cheddar',     35.90, 'Pizza', 65],
    [16, 'Baiana',                 34.90, 'Pizza', 50],
    [17, 'Napolitana',             32.90, 'Pizza', 42],
    [18, 'Alho e Óleo',            28.90, 'Pizza', 38],
    [19, 'Strogonoff de Carne',    39.90, 'Pizza', 48],
    [20, 'Strogonoff de Frango',   37.90, 'Pizza', 52],

    [30, 'Chocolate com Morango',  39.90, 'Doce', 70],
    [31, 'Nutella com Leite Ninho',39.90, 'Doce', 75],
    [32, 'Romeu e Julieta',        36.90, 'Doce', 40],
    [33, 'Banana com Canela',      34.90, 'Doce', 35],
    [34, 'Chocolate Belga',        38.90, 'Doce', 45],
    [35, 'Prestígio',              37.90, 'Doce', 38],
    [36, "M&M's",                  39.90, 'Doce', 42],
    [37, 'Oreo',                   39.90, 'Doce', 50],
    [38, 'Doce de Leite',          35.90, 'Doce', 33],
    [39, 'Morango com Chantilly',  38.90, 'Doce', 36],

    [50, 'Coca-Cola 2L',           12.00, 'Bebida', 200],
    [51, 'Coca-Cola Lata',          6.00, 'Bebida', 150],
    [52, 'Guaraná Antarctica 2L',  11.00, 'Bebida', 140],
    [53, 'Guaraná Lata',            5.50, 'Bebida', 120],
    [54, 'Fanta Laranja 2L',       10.00, 'Bebida', 80],
    [55, 'Sprite 2L',              10.00, 'Bebida', 70],
    [56, 'Suco de Laranja 500ml',  10.00, 'Bebida', 60],
    [57, 'Suco de Limão 500ml',    10.00, 'Bebida', 55],
    [58, 'Suco de Uva 500ml',      11.00, 'Bebida', 50],
    [59, 'Água Mineral 500ml',      4.00, 'Bebida', 100],
    [60, 'Água com Gás 500ml',      4.50, 'Bebida', 40],
    [61, 'Cerveja Long Neck',       9.90, 'Bebida', 90],
    [62, 'Energético Lata',        12.00, 'Bebida', 45],

    [70, 'Combo Calabresa',        52.00, 'Combo', 40],
    [71, 'Combo Família',          89.00, 'Combo', 55],
    [72, 'Combo Casal',            69.90, 'Combo', 35],
    [73, 'Combo Doce',             55.00, 'Combo', 25],
    [74, 'Combo Kids',             45.00, 'Combo', 20]
  ];

  lista.forEach(p => {
    db.run(
      `INSERT OR REPLACE INTO produtos (id, nome, preco, categoria, vendidos) VALUES (?,?,?,?,?)`,
      p
    );
  });

  salvarBanco();
}

function popularEstoqueInicial() {
  const check = db.exec(`SELECT COUNT(*) FROM estoque`);
  const qtd = check.length ? check[0].values[0][0] : 0;
  if (qtd > 0) return;

  db.run(`INSERT INTO estoque (produto, fabricante, lote, chegada, validade, quantidade) VALUES
    ('Massa de Pizza', 'Massa Italia', 'LOT-4582', '2026-07-05', '2026-08-12', '45 kg'),
    ('Molho de Tomate', 'Tomato Prime', 'LOT-3921', '2026-07-04', '2027-01-10', '28 L'),
    ('Queijo Mussarela', 'Queijaria SP', 'LOT-7845', '2026-07-03', '2026-07-20', '12 kg'),
    ('Calabresa', 'Frigorífico Bovino', 'LOT-1123', '2026-07-06', '2026-08-15', '8 kg'),
    ('Pepperoni', 'Importados Italia', 'LOT-6654', '2026-07-02', '2026-08-05', '5 kg')
  `);
}

// ====================== LOGIN (ignora maiúscula/minúscula) ======================
function loginUsuario(email, senha) {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };

  const loginNorm = String(email || '').trim().toLowerCase();
  const senhaStr = String(senha || '').trim();

  // Admin
  if (
    (loginNorm === 'admin' || loginNorm === 'admin@trattoria.com') &&
    senhaStr === '123456'
  ) {
    return { status: 'sucesso', tipo: 'admin', nome: 'Administrador' };
  }

  // Clientes: compara email e nome em minúsculo
  const r = db.exec(`SELECT * FROM clientes`);
  if (!r.length) {
    return { status: 'erro', mensagem: 'Email ou senha incorretos' };
  }

  for (const row of r[0].values) {
    const id = row[0];
    const nome = row[1] || '';
    const mail = String(row[2] || '').toLowerCase();
    const pass = String(row[3] || '');
    const tel = row[4] || '';
    const end = row[5] || '';
    const cep = row[6] || '';

    const bateEmail = mail === loginNorm;
    const bateNome = nome.toLowerCase() === loginNorm;

    if ((bateEmail || bateNome) && pass === senhaStr) {
      return {
        status: 'sucesso',
        tipo: 'cliente',
        id,
        nome,
        email: row[2],
        telefone: tel,
        endereco: end,
        cep
      };
    }
  }

  return { status: 'erro', mensagem: 'Email ou senha incorretos' };
}

// ====================== CADASTRO ======================
function cadastrarUsuario(nome, email, senha, telefone = '', endereco = '', cep = '') {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };
  try {
    const emailNorm = String(email || '').trim();
    db.run(
      `INSERT INTO clientes (nome, email, senha, telefone, endereco, cep) VALUES (?,?,?,?,?,?)`,
      [nome, emailNorm, senha, telefone, endereco, cep]
    );
    salvarBanco();
    return { status: 'sucesso', mensagem: 'Cadastro realizado!' };
  } catch {
    return { status: 'erro', mensagem: 'Email já cadastrado' };
  }
}

// ====================== CLIENTES (ADM + excluir conta) ======================
function listarClientes() {
  if (!verificarBanco()) return [];
  const r = db.exec(`SELECT id, nome, email, telefone, endereco, cep FROM clientes ORDER BY id DESC`);
  if (!r.length) return [];
  return r[0].values.map(row => ({
    id: row[0],
    nome: row[1],
    email: row[2],
    telefone: row[3] || '',
    endereco: row[4] || '',
    cep: row[5] || ''
  }));
}

function excluirContaCliente(id) {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };
  try {
    db.run(`DELETE FROM clientes WHERE id = ?`, [id]);
    salvarBanco();
    return { status: 'sucesso', mensagem: 'Conta excluída' };
  } catch (e) {
    return { status: 'erro', mensagem: e.message };
  }
}

function atualizarCliente(id, nome, telefone, endereco, cep) {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };
  try {
    db.run(
      `UPDATE clientes SET nome=?, telefone=?, endereco=?, cep=? WHERE id=?`,
      [nome, telefone, endereco, cep, id]
    );
    salvarBanco();
    return { status: 'sucesso' };
  } catch (e) {
    return { status: 'erro', mensagem: e.message };
  }
}

// ====================== ESTOQUE ======================
function listarEstoque() {
  if (!verificarBanco()) return [];
  const r = db.exec(`SELECT * FROM estoque ORDER BY id`);
  if (!r.length) return [];
  return r[0].values.map(row => ({
    id: row[0],
    produto: row[1],
    fabricante: row[2],
    lote: row[3],
    chegada: row[4],
    validade: row[5],
    quantidade: row[6]
  }));
}

function adicionarEstoque(produto, fabricante, lote, chegada, validade, quantidade) {
  if (!verificarBanco()) return;
  db.run(
    `INSERT INTO estoque (produto, fabricante, lote, chegada, validade, quantidade) VALUES (?,?,?,?,?,?)`,
    [produto, fabricante, lote, chegada, validade, quantidade]
  );
  salvarBanco();
}

function editarEstoque(id, produto, fabricante, lote, chegada, validade, quantidade) {
  if (!verificarBanco()) return;
  db.run(
    `UPDATE estoque SET produto=?, fabricante=?, lote=?, chegada=?, validade=?, quantidade=? WHERE id=?`,
    [produto, fabricante, lote, chegada, validade, quantidade, id]
  );
  salvarBanco();
}

function apagarEstoque(id) {
  if (!verificarBanco()) return;
  db.run(`DELETE FROM estoque WHERE id = ?`, [id]);
  salvarBanco();
}

// ====================== CHEGADA ======================
function listarChegadas() {
  if (!verificarBanco()) return [];
  const r = db.exec(`SELECT * FROM chegadas ORDER BY id DESC`);
  if (!r.length) return [];
  return r[0].values.map(row => ({
    id: row[0],
    produto: row[1],
    quantidade: row[2],
    lote: row[3],
    responsavel: row[4],
    data: row[5]
  }));
}

function adicionarChegada(produto, quantidade, lote, responsavel, data) {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };

  db.run(
    `INSERT INTO chegadas (produto, quantidade, lote, responsavel, data) VALUES (?,?,?,?,?)`,
    [produto, quantidade, lote, responsavel, data]
  );

  const result = db.exec(`SELECT id, quantidade FROM estoque WHERE produto = ?`, [produto]);

  if (result.length > 0 && result[0].values.length > 0) {
    const id = result[0].values[0][0];
    const qtdAtualTexto = result[0].values[0][1];
    const match = String(qtdAtualTexto).match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const numeroAtual = match ? parseFloat(match[1]) : 0;
    const unidade = match ? match[2] : '';
    const qtdChegada = parseFloat(quantidade) || 0;
    const novaQtd = numeroAtual + qtdChegada;
    const novaQuantidadeTexto = unidade ? `${novaQtd} ${unidade}` : `${novaQtd}`;
    db.run(`UPDATE estoque SET quantidade = ? WHERE id = ?`, [novaQuantidadeTexto, id]);
  } else {
    db.run(
      `INSERT INTO estoque (produto, fabricante, lote, chegada, validade, quantidade) VALUES (?,?,?,?,?,?)`,
      [produto, '', lote, data, '', quantidade]
    );
  }

  salvarBanco();
  return { status: 'sucesso', mensagem: 'Chegada registrada e estoque atualizado!' };
}

// ====================== SAÍDA ======================
function listarSaidas() {
  if (!verificarBanco()) return [];
  const r = db.exec(`SELECT * FROM saidas ORDER BY id DESC`);
  if (!r.length) return [];
  return r[0].values.map(row => ({
    id: row[0],
    produto: row[1],
    quantidade: row[2],
    lote: row[3],
    motivo: row[4],
    responsavel: row[5],
    data: row[6]
  }));
}

function adicionarSaida(produto, quantidade, lote, motivo, responsavel, data) {
  if (!verificarBanco()) return { status: 'erro', mensagem: 'Banco não aberto' };

  db.run(
    `INSERT INTO saidas (produto, quantidade, lote, motivo, responsavel, data) VALUES (?,?,?,?,?,?)`,
    [produto, quantidade, lote, motivo, responsavel, data]
  );

  const result = db.exec(`SELECT id, quantidade FROM estoque WHERE produto = ?`, [produto]);

  if (result.length > 0 && result[0].values.length > 0) {
    const id = result[0].values[0][0];
    const qtdAtualTexto = result[0].values[0][1];
    const match = String(qtdAtualTexto).match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const numeroAtual = match ? parseFloat(match[1]) : 0;
    const unidade = match ? match[2] : '';
    const qtdSaida = parseFloat(quantidade) || 0;
    let novaQtd = numeroAtual - qtdSaida;
    if (novaQtd < 0) novaQtd = 0;
    const novaQuantidadeTexto = unidade ? `${novaQtd} ${unidade}` : `${novaQtd}`;
    db.run(`UPDATE estoque SET quantidade = ? WHERE id = ?`, [novaQuantidadeTexto, id]);
  }

  salvarBanco();
  return { status: 'sucesso', mensagem: 'Saída registrada e estoque atualizado!' };
}

// ====================== PRODUTOS (cardápio) ======================
function listarProdutos() {
  if (!verificarBanco()) return [];
  const r = db.exec(`SELECT * FROM produtos ORDER BY categoria, nome`);
  if (!r.length) return [];
  return r[0].values.map(row => ({
    id: row[0],
    nome: row[1],
    preco: row[2],
    categoria: row[3],
    vendidos: row[4]
  }));
}