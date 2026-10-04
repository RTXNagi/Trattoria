let clienteLogado = null;
let carrinho = [];
let produtos = [];
let descontoAtivo = 0;
let freteGratis = false;
let ultimoPedidoId = null;
let produtoDetalheAtual = null;
let qtdDetalhe = 1;
/** Pedido Pix aguardando confirmação (ainda não salvo como pago) */
let pedidoPixPendente = null;
/** CEP informado na sacola (quando não há endereço no perfil) */
let cepEntrega = null;
/** Dados retornados pela busca de CEP (ViaCEP) */
let dadosCepAtual = null;

const CHAVE_PIX = 'edgar5roberto5555@gmail.com';
const NOME_RECEBEDOR = 'Trattoria Aldini';
const CIDADE = 'SAO PAULO';
const FRETE_FIXO = 5.13;
const MINIMO_FRETE_GRATIS = 80;
const CARRINHO_KEY = 'trattoria_carrinho';
const MAX_PRODUTOS_SECAO = 5;

const DESCRICOES = {
  1: 'Pizza clássica de calabresa fatiada, cebola e azeitonas. Massa artesanal e queijo mussarela derretido.',
  2: 'Frango desfiado temperado com catupiry cremoso. Uma das favoritas da casa.',
  3: 'Quatro queijos selecionados: mussarela, provolone, gorgonzola e parmesão.',
  4: 'Presunto, ovos, cebola, azeitona, ervilha e mussarela. Sabor completo.',
  5: 'Molho de tomate, mussarela fresca, manjericão e azeite. Simples e deliciosa.',
  6: 'Pepperoni picante com bastante queijo. Ideal para quem gosta de um toque de picância.',
  7: 'Mussarela generosa sobre molho de tomate. O clássico que nunca falha.',
  8: 'Bacon crocante com mussarela. Sabor marcante e irresistível.',
  9: 'Carne seca desfiada, cebola roxa e cream cheese. Especialidade nordestina.',
  10: 'Calabresa, pimenta, ovo e cebola. Receita baiana autêntica.',
  30: 'Chocolate ao leite e morangos frescos. Sobremesa perfeita para dividir.',
  31: 'Nutella generosa com leite ninho. Doce intenso e cremoso.',
  32: 'Goiabada e queijo minas. O clássico Romeu e Julieta em versão pizza.',
  33: 'Banana caramelizada com canela e açúcar. Aconchegante e doce na medida.',
  50: 'Coca-Cola gelada 2 litros. Acompanhamento ideal para a pizza.',
  51: 'Guaraná Antarctica 2 litros. Refrescante e tradicional.',
  52: 'Suco natural de laranja. Feito na hora, sem conservantes.',
  53: 'Água mineral sem gás 500ml. Hidratação pura.',
  70: 'Pizza de calabresa + refrigerante 2L. Combo prático e econômico.',
  71: '2 pizzas grandes + 2 refrigerantes. Perfeito para a família.',
  72: 'Pizza individual + suco. Ideal para as crianças.'
};

const COMBOS = [
  { id: 100, nome: 'Combo Família Promo', preco: 98.90, categoria: 'Combo' },
  { id: 101, nome: '2 Pizzas -20%', preco: 0, categoria: 'Combo', desconto: 0.20 },
  { id: 102, nome: 'Combo Família', preco: 89.00, categoria: 'Combo' },
  { id: 103, nome: 'Combo Doce', preco: 55.00, categoria: 'Combo' },
  { id: 104, nome: 'Frete Grátis', preco: 0, categoria: 'Combo', frete: true },
  { id: 105, nome: 'Combo Kids', preco: 45.00, categoria: 'Combo' }
];

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await abrirBanco();
  if (!ok) {
    alert('Banco não aberto');
    return;
  }

  // Restaura sacola salva (mantém ao ir para login/cadastro)
  restaurarCarrinho();

  const salvo = localStorage.getItem('cliente_logado');
  if (salvo) {
    clienteLogado = JSON.parse(salvo);
    if (clienteLogado.endereco) {
      document.getElementById('textoEndereco').textContent = clienteLogado.endereco;
    } else if (clienteLogado.cep) {
      document.getElementById('textoEndereco').textContent = 'CEP ' + formatarCep(clienteLogado.cep);
      cepEntrega = clienteLogado.cep;
    }
    document.getElementById('authBtns').style.display = 'none';
    document.getElementById('btnPerfil').style.display = 'flex';
  } else {
    document.getElementById('authBtns').style.display = 'flex';
    document.getElementById('btnPerfil').style.display = 'none';
  }

  if (clienteLogado?.freteGratisUsado) {
    freteGratis = false;
  }

  aplicarFotoPerfilNaTela();
  carregarProdutos();
  setupUI();
  setupCarrossel();
  atualizarBarra();
});

function salvarCarrinho() {
  try {
    localStorage.setItem(CARRINHO_KEY, JSON.stringify({
      itens: carrinho,
      descontoAtivo,
      freteGratis
    }));
  } catch (e) {
    console.warn('Não foi possível salvar o carrinho', e);
  }
}

function restaurarCarrinho() {
  try {
    const raw = localStorage.getItem(CARRINHO_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.itens) && data.itens.length) {
      carrinho = data.itens;
      descontoAtivo = data.descontoAtivo || 0;
      freteGratis = !!data.freteGratis;
    }
  } catch (e) {
    console.warn('Erro ao restaurar carrinho', e);
  }
}

function limparCarrinhoSalvo() {
  localStorage.removeItem(CARRINHO_KEY);
}

function irParaLogin() {
  salvarCarrinho();
  window.location.href = '../login/login.html';
}

function irParaCadastro() {
  salvarCarrinho();
  window.location.href = '../login/cadastro.html';
}

function setupUI() {
  document.getElementById('btnEntrar')?.addEventListener('click', irParaLogin);
  document.getElementById('btnCadastrar')?.addEventListener('click', irParaCadastro);

  document.getElementById('btnCarrinhoTopo')?.addEventListener('click', () => {
    if (carrinho.length === 0) {
      alert('Sua sacola está vazia. Adicione itens do cardápio!');
      return;
    }
    abrirDrawer();
  });

  document.querySelectorAll('.cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProdutos(btn.dataset.cat, document.getElementById('busca').value);
    });
  });

  document.getElementById('busca')?.addEventListener('input', (e) => {
    const cat = document.querySelector('.cat.active')?.dataset.cat || 'todos';
    renderProdutos(cat, e.target.value);
  });

  document.getElementById('btnVerSacola')?.addEventListener('click', abrirDrawer);
  document.getElementById('fecharDrawer')?.addEventListener('click', fecharDrawer);
  document.getElementById('overlay')?.addEventListener('click', fecharDrawer);
  const onFinalizar = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    finalizarPedido();
  };
  document.getElementById('btnFinalizar')?.addEventListener('click', onFinalizar);
  document.getElementById('btnPedir')?.addEventListener('click', onFinalizar);

  document.getElementById('chkFreteGratis')?.addEventListener('change', (e) => {
    if (e.target.disabled) return;

    if (e.target.checked) {
      if (!clienteLogado) {
        e.target.checked = false;
        alert('Faça login para usar frete grátis.');
        irParaLogin();
        return;
      }
      if (clienteLogado.freteGratisUsado) {
        e.target.checked = false;
        alert('Você já usou o frete grátis nesta conta (1x por conta).');
        return;
      }
      const sub = calcularSubtotal();
      if (sub < MINIMO_FRETE_GRATIS) {
        e.target.checked = false;
        alert('Frete grátis só para pedidos acima de R$ 80,00.');
        return;
      }
      freteGratis = true;
    } else {
      freteGratis = false;
    }

    salvarCarrinho();
    renderDrawer();
    atualizarBarra();
  });

  document.getElementById('btnEndereco')?.addEventListener('click', abrirPerfil);
  document.getElementById('btnPerfil')?.addEventListener('click', abrirPerfil);
  document.getElementById('cancelPerfil')?.addEventListener('click', () => {
    document.getElementById('modalPerfil').style.display = 'none';
    document.getElementById('formEditar').style.display = 'none';
  });

  document.getElementById('btnEditarPerfil')?.addEventListener('click', () => {
    document.getElementById('formEditar').style.display = 'block';
    document.getElementById('pNome').value = clienteLogado?.nome || '';
    document.getElementById('pTel').value = clienteLogado?.telefone || '';
    document.getElementById('pEnd').value = clienteLogado?.endereco || '';
    document.getElementById('pCep').value = clienteLogado?.cep ? formatarCep(clienteLogado.cep) : '';
  });

  // CEP na sacola
  document.getElementById('btnBuscarCep')?.addEventListener('click', buscarCepPedido);
  document.getElementById('inputCepPedido')?.addEventListener('input', (e) => {
    e.target.value = formatarCep(e.target.value);
    // Se mudar o CEP, esconde detalhes até buscar de novo
    const det = document.getElementById('enderecoDetalhes');
    if (det) det.style.display = 'none';
    dadosCepAtual = null;
  });
  document.getElementById('inputCepPedido')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarCepPedido();
    }
  });
  document.getElementById('btnConfirmarEndereco')?.addEventListener('click', (e) => {
    e.preventDefault();
    confirmarEnderecoCompleto(false);
  });
  document.getElementById('btnConfirmarEnd')?.addEventListener('click', (e) => {
    e.preventDefault();
    confirmarEnderecoCompleto(false);
  });
  document.getElementById('pCep')?.addEventListener('input', (e) => {
    e.target.value = formatarCep(e.target.value);
  });

  document.getElementById('cancelEditar')?.addEventListener('click', () => {
    document.getElementById('formEditar').style.display = 'none';
  });

  document.getElementById('salvarPerfil')?.addEventListener('click', salvarPerfil);

  document.getElementById('btnSairConta')?.addEventListener('click', () => {
    if (confirm('Deseja sair da conta?')) {
      salvarCarrinho();
      localStorage.removeItem('cliente_logado');
      window.location.href = '../login/login.html';
    }
  });

  document.getElementById('btnExcluirConta')?.addEventListener('click', excluirConta);

  document.getElementById('inputFotoPerfil')?.addEventListener('change', onEscolherFoto);
  document.getElementById('btnRemoverFoto')?.addEventListener('click', removerFotoPerfil);

  document.getElementById('cancelSabores')?.addEventListener('click', () => {
    document.getElementById('modalSabores').style.display = 'none';
  });
  document.getElementById('confirmarSabores')?.addEventListener('click', confirmarDoisSabores);
  document.getElementById('sabor1')?.addEventListener('change', atualizarResumoPromo);
  document.getElementById('sabor2')?.addEventListener('change', atualizarResumoPromo);

  document.getElementById('btnCopiarChave')?.addEventListener('click', () => {
    navigator.clipboard.writeText(CHAVE_PIX).then(() => alert('Chave Pix copiada!'));
  });

  document.getElementById('btnCopiarPayload')?.addEventListener('click', () => {
    const t = document.getElementById('pixCopiaCola');
    navigator.clipboard.writeText(t.value).then(() => alert('Código Pix copiado!'));
  });

  document.getElementById('btnPixVerificar')?.addEventListener('click', verificarPagamentoPix);
  document.getElementById('btnPixCancelar')?.addEventListener('click', cancelarPagamentoPix);

  document.getElementById('btnSucessoOk')?.addEventListener('click', () => {
    document.getElementById('modalSucesso').style.display = 'none';
    // Após sucesso (dinheiro/cartão/pix), ir para Meus pedidos
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btnPedidos = document.querySelector('.nav-item[data-page="pedidos"]');
    if (btnPedidos) btnPedidos.classList.add('active');
    document.getElementById('pagePedidos').classList.add('ativa');
    carregarPedidos();
  });

  document.getElementById('fecharModalProduto')?.addEventListener('click', fecharModalProduto);
  document.getElementById('btnVoltarProduto')?.addEventListener('click', fecharModalProduto);
  document.getElementById('btnVoltarFooter')?.addEventListener('click', fecharModalProduto);
  document.getElementById('btnAddDetalhe')?.addEventListener('click', adicionarDoDetalhe);
  document.getElementById('prodQtdMenos')?.addEventListener('click', () => {
    if (qtdDetalhe > 1) {
      qtdDetalhe--;
      atualizarDetalheQtd();
    }
  });
  document.getElementById('prodQtdMais')?.addEventListener('click', () => {
    qtdDetalhe++;
    atualizarDetalheQtd();
  });

  document.getElementById('fecharZoom')?.addEventListener('click', fecharZoom);
  document.getElementById('modalZoom')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalZoom') fecharZoom();
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (page === 'pedidos') {
        document.getElementById('pagePedidos').classList.add('ativa');
        carregarPedidos();
      } else if (page === 'perfil') {
        abrirPerfil();
      } else {
        document.getElementById('pagePedidos').classList.remove('ativa');
      }
    });
  });
}

/* ====================== EXCLUIR CONTA ====================== */
function excluirConta() {
  if (!clienteLogado) return;

  const ok = confirm(
    'Tem certeza que deseja excluir sua conta?\n\n' +
    'Esta ação não pode ser desfeita. Seus dados e histórico de pedidos serão removidos.'
  );
  if (!ok) return;

  const confirmNome = prompt('Digite seu nome para confirmar a exclusão:');
  if (!confirmNome || confirmNome.trim().toLowerCase() !== (clienteLogado.nome || '').toLowerCase()) {
    alert('Nome não confere. Conta não excluída.');
    return;
  }

  try {
    if (clienteLogado.id && typeof verificarBanco === 'function' && verificarBanco()) {
      try {
        db.run(`DELETE FROM clientes WHERE id = ?`, [clienteLogado.id]);
        // Opcional: não apaga pedidos históricos do restaurante, só desassocia
        // db.run(`UPDATE pedidos SET id_cliente = NULL WHERE id_cliente = ?`, [clienteLogado.id]);
        if (typeof salvarBanco === 'function') salvarBanco();
      } catch (e) {
        console.error('Erro ao excluir do banco:', e);
      }
    }
  } catch (e) {
    console.error(e);
  }

  localStorage.removeItem('cliente_logado');
  limparCarrinhoSalvo();
  carrinho = [];
  clienteLogado = null;

  alert('Sua conta foi excluída com sucesso.');
  window.location.href = '../login/login.html';
}

/* ====================== CARROSSEL PROMOÇÕES ====================== */
function setupCarrossel() {
  const carrossel =
    document.getElementById('carrosselPromos') ||
    document.getElementById('carrossel');
  if (!carrossel) return;

  if (!carrossel.querySelector('.promo-card')) {
    const promos = [
      {
        classe: 'vermelho',
        tag: 'COMBO',
        titulo: '2 Pizzas com 20% OFF',
        preco: 'Escolha os sabores',
        small: 'Desconto na hora',
        emoji: '🍕',
        acao: 'abrirComboSabores()'
      },
      {
        classe: 'verde',
        tag: 'FAMÍLIA',
        titulo: 'Combo Família',
        preco: 'R$ 89,00',
        small: 'Pizza + bebida',
        emoji: '👨‍👩‍👧‍👦',
        acao: 'addCombo(2)'
      },
      {
        classe: 'laranja',
        tag: 'DOCE',
        titulo: 'Combo Doce',
        preco: 'R$ 55,00',
        small: 'Sobremesa da casa',
        emoji: '🍫',
        acao: 'addCombo(3)'
      },
      {
        classe: 'azul',
        tag: 'KIDS',
        titulo: 'Combo Kids',
        preco: 'R$ 45,00',
        small: 'Porção infantil',
        emoji: '🎁',
        acao: 'addCombo(5)'
      },
      {
        classe: 'escuro',
        tag: 'PROMO',
        titulo: 'Combo Família Promo',
        preco: 'R$ 98,90',
        small: 'Para compartilhar',
        emoji: '🔥',
        acao: 'addCombo(0)'
      }
    ];

    carrossel.innerHTML = promos.map(p => `
      <div class="promo-card ${p.classe}">
        <span class="promo-tag">${p.tag}</span>
        <div class="promo-textos">
          <h3>${p.titulo}</h3>
          <p class="promo-preco">${p.preco}</p>
          <small>${p.small}</small>
        </div>
        <span class="promo-emoji">${p.emoji}</span>
        <button type="button" class="btn-promo" onclick="${p.acao}">Pegar promo</button>
      </div>
    `).join('');
  }

  ativarArraste(carrossel);

  const cards = carrossel.querySelectorAll('.promo-card');
  const bolinhasBox =
    document.getElementById('promoBolinhas') ||
    document.getElementById('bolinhas');

  if (bolinhasBox && cards.length) {
    bolinhasBox.innerHTML = '';
    cards.forEach((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bolinha' + (i === 0 ? ' ativa' : '');
      b.addEventListener('click', () => {
        card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      });
      bolinhasBox.appendChild(b);
    });

    carrossel.addEventListener('scroll', () => {
      if (!cards[0]) return;
      const cardWidth = cards[0].offsetWidth + 12;
      const index = Math.round(carrossel.scrollLeft / cardWidth);
      bolinhasBox.querySelectorAll('.bolinha').forEach((b, i) => {
        b.classList.toggle('ativa', i === index);
      });
    });
  }

  const btnEsq =
    document.getElementById('promoPrev') ||
    document.getElementById('setaEsq');
  const btnDir =
    document.getElementById('promoNext') ||
    document.getElementById('setaDir');

  btnEsq?.addEventListener('click', () => {
    carrossel.scrollBy({ left: -280, behavior: 'smooth' });
  });
  btnDir?.addEventListener('click', () => {
    carrossel.scrollBy({ left: 280, behavior: 'smooth' });
  });

  if (cards.length > 1) {
    setInterval(() => {
      const maxScroll = carrossel.scrollWidth - carrossel.clientWidth;
      if (carrossel.scrollLeft >= maxScroll - 10) {
        carrossel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carrossel.scrollBy({ left: 280, behavior: 'smooth' });
      }
    }, 4500);
  }
}

function ativarArraste(el) {
  let isDown = false;
  let startX;
  let scrollLeft;

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    el.style.cursor = 'grabbing';
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
}

/* ====================== CEP / ENDEREÇO ====================== */
function formatarCep(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + '-' + d.slice(5);
}

function cepValido(cep) {
  return /^\d{8}$/.test(String(cep || '').replace(/\D/g, ''));
}

function temEnderecoOuCep() {
  if (clienteLogado?.endereco && String(clienteLogado.endereco).trim().length > 5) return true;
  if (cepEntrega && cepValido(cepEntrega) && dadosCepAtual?.confirmado) return true;
  return false;
}

/** Busca CEP na API ViaCEP e abre formulário de endereço */
function elCepStatus() {
  return document.getElementById('txtCepStatus') || document.getElementById('cepStatus');
}
function elRuaPedido() {
  return document.getElementById('inputRuaPedido') || document.getElementById('endRua');
}
function elBairroPedido() {
  return document.getElementById('inputBairroPedido') || document.getElementById('endBairro');
}
function elNumeroPedido() {
  return document.getElementById('inputNumeroPedido') || document.getElementById('endNumero');
}
function elComplPedido() {
  return document.getElementById('inputComplPedido') || document.getElementById('endComp');
}

async function buscarCepPedido() {
  const input = document.getElementById('inputCepPedido');
  const status = elCepStatus();
  const detalhes = document.getElementById('enderecoDetalhes');
  const btn = document.getElementById('btnBuscarCep');
  if (!input) {
    alert('Campo de CEP não encontrado no HTML (id="inputCepPedido").');
    return;
  }

  const raw = input.value.replace(/\D/g, '');
  if (!cepValido(raw)) {
    if (status) {
      status.textContent = 'CEP inválido. Use 8 dígitos (ex: 01310-100).';
      status.className = 'txt-cep-status erro';
    }
    if (detalhes) detalhes.style.display = 'none';
    dadosCepAtual = null;
    cepEntrega = null;
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '...';
  }
  if (status) {
    status.textContent = 'Buscando endereço...';
    status.className = 'txt-cep-status';
  }

  try {
    const resp = await fetch('https://viacep.com.br/ws/' + raw + '/json/');
    if (!resp.ok) throw new Error('Falha na consulta');
    const data = await resp.json();

    if (data.erro) {
      if (status) {
        status.textContent = 'CEP não encontrado. Verifique e tente de novo.';
        status.className = 'txt-cep-status erro';
      }
      if (detalhes) detalhes.style.display = 'none';
      dadosCepAtual = null;
      cepEntrega = null;
      return;
    }

    const logradouro = (data.logradouro || '').trim();
    const bairro = (data.bairro || '').trim();
    const cidade = (data.localidade || '').trim();
    const uf = (data.uf || '').trim();
    const temRua = logradouro.length > 0;
    const temBairro = bairro.length > 0;

    dadosCepAtual = {
      cep: raw,
      logradouro,
      bairro,
      cidade,
      uf,
      temRua,
      temBairro,
      confirmado: false
    };

    const inputRua = elRuaPedido();
    const inputBairro = elBairroPedido();
    const inputNum = elNumeroPedido();
    const inputCompl = elComplPedido();
    const cidadeInfo = document.getElementById('cepCidadeInfo');

    if (cidadeInfo) {
      cidadeInfo.textContent = cidade && uf
        ? '📍 ' + cidade + ' — ' + uf
        : 'Localidade encontrada';
    }

    if (inputRua) {
      inputRua.value = logradouro;
      inputRua.readOnly = temRua;
      inputRua.placeholder = temRua ? 'Nome da rua' : 'Digite o nome da rua';
    }
    if (inputBairro) {
      inputBairro.value = bairro;
      inputBairro.readOnly = temBairro;
      inputBairro.placeholder = temBairro ? 'Bairro' : 'Digite o bairro';
    }
    if (inputNum) {
      inputNum.value = '';
    }
    if (inputCompl) inputCompl.value = '';

    if (detalhes) detalhes.style.display = 'block';

    // Já define CEP encontrado (ainda precisa número/confirm)
    cepEntrega = raw;

    if (status) {
      status.textContent = temRua
        ? 'Rua encontrada! Informe o número e clique em Confirmar endereço.'
        : 'Cidade encontrada. Informe rua, bairro, número e confirme.';
      status.className = 'txt-cep-status ok';
    }

    const footer = document.querySelector('.drawer-scroll') || document.querySelector('.drawer-footer');
    if (footer && detalhes) {
      setTimeout(() => detalhes.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    }
  } catch (e) {
    console.error(e);
    if (status) {
      status.textContent = 'Erro ao buscar CEP. Verifique a conexão e tente de novo.';
      status.className = 'txt-cep-status erro';
    }
    if (detalhes) detalhes.style.display = 'none';
    dadosCepAtual = null;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Buscar';
    }
  }
}

/** Confirma rua + número e libera o frete. silent=true não mostra alert nem re-render agressivo */
function confirmarEnderecoCompleto(silent = false) {
  if (!dadosCepAtual) {
    if (!silent) alert('Busque um CEP primeiro.');
    return false;
  }

  const rua = (elRuaPedido()?.value || dadosCepAtual.logradouro || '').trim();
  let bairro = (elBairroPedido()?.value || '').trim();
  if (!bairro) bairro = String(dadosCepAtual.bairro || '').trim();
  const numero = (elNumeroPedido()?.value || '').trim();
  const compl = (elComplPedido()?.value || '').trim();
  const status = elCepStatus();

  if (!rua) {
    if (!silent) {
      alert('Informe o nome da rua.');
      elRuaPedido()?.focus();
    }
    return false;
  }
  if (!numero) {
    if (!silent) {
      alert('Informe o número da casa ou apartamento.');
      elNumeroPedido()?.focus();
    }
    return false;
  }

  let endereco = rua + ', ' + numero;
  if (compl) endereco += ' — ' + compl;
  if (bairro) endereco += ' — ' + bairro;
  if (dadosCepAtual.cidade) {
    endereco += ' — ' + dadosCepAtual.cidade;
    if (dadosCepAtual.uf) endereco += '/' + dadosCepAtual.uf;
  }
  endereco += ' · CEP ' + formatarCep(dadosCepAtual.cep);

  cepEntrega = dadosCepAtual.cep;
  dadosCepAtual.confirmado = true;
  dadosCepAtual.logradouro = rua;
  dadosCepAtual.bairro = bairro;
  dadosCepAtual.numero = numero;
  dadosCepAtual.complemento = compl;

  if (!clienteLogado) clienteLogado = {};
  clienteLogado.cep = dadosCepAtual.cep;
  clienteLogado.endereco = endereco;
  localStorage.setItem('cliente_logado', JSON.stringify(clienteLogado));

  const txtEnd = document.getElementById('textoEndereco');
  if (txtEnd) txtEnd.textContent = rua + ', ' + numero;

  if (status) {
    status.textContent = 'Endereço confirmado. Frete: R$ 5,13';
    status.className = 'txt-cep-status ok';
  }

  const endView = document.getElementById('perfilEndView');
  if (endView) endView.textContent = '📍 ' + endereco;

  if (!silent) {
    atualizarBarra();
    alert('Endereço salvo:\n' + endereco);
    renderDrawer();
  }
  return true;
}

function atualizarUiCep() {
  const box = document.getElementById('cepBox');
  const input = document.getElementById('inputCepPedido');
  const status = elCepStatus();
  if (!box) return;

  const temEnd = !!(clienteLogado?.endereco && String(clienteLogado.endereco).trim().length > 5);
  if (temEnd && !dadosCepAtual) {
    box.style.display = 'none';
    if (!cepEntrega && clienteLogado.cep) {
      cepEntrega = String(clienteLogado.cep).replace(/\D/g, '');
    }
    return;
  }

  box.style.display = 'block';
  const cepAtual = cepEntrega || (clienteLogado?.cep ? String(clienteLogado.cep).replace(/\D/g, '') : '');
  if (input && cepAtual && !input.value) {
    input.value = formatarCep(cepAtual);
  }
  if (status && !dadosCepAtual) {
    if (cepValido(cepAtual) && clienteLogado?.endereco) {
      status.textContent = 'Endereço: ' + clienteLogado.endereco;
      status.className = 'txt-cep-status ok';
      cepEntrega = cepAtual;
    } else {
      status.textContent = 'Informe o CEP para localizar o endereço e calcular o frete.';
      status.className = 'txt-cep-status';
    }
  }
}

/* ====================== FRETE ====================== */
function calcularSubtotal() {
  let total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  if (descontoAtivo > 0) total = total * (1 - descontoAtivo);
  return total;
}

/** Frete só é cobrado se houver endereço ou CEP; valor fixo R$ 5,13 (ou grátis se elegível) */
function calcularFrete(subtotal) {
  if (!temEnderecoOuCep()) return null; // ainda não definido
  if (freteGratis && subtotal >= MINIMO_FRETE_GRATIS) return 0;
  return FRETE_FIXO;
}

function calcularTotal() {
  const subtotal = calcularSubtotal();
  const frete = calcularFrete(subtotal);
  if (frete === null) return subtotal; // sem frete até ter CEP/endereço
  return subtotal + frete;
}

function atualizarOpcaoFrete() {
  const chk = document.getElementById('chkFreteGratis');
  const txt = document.getElementById('txtFreteGratis');
  if (!chk || !txt) return;

  const subtotal = calcularSubtotal();
  const jaUsou = !!(clienteLogado && clienteLogado.freteGratisUsado);
  const temLocal = temEnderecoOuCep();

  if (!temLocal) {
    chk.disabled = true;
    chk.checked = false;
    freteGratis = false;
    txt.textContent = 'Cadastre endereço ou CEP para liberar frete';
    return;
  }

  if (jaUsou) {
    chk.disabled = true;
    chk.checked = false;
    freteGratis = false;
    txt.textContent = 'Frete grátis já utilizado nesta conta';
    return;
  }

  if (subtotal >= MINIMO_FRETE_GRATIS) {
    chk.disabled = false;
    txt.textContent = 'Ativar frete grátis (pedido acima de R$ 80)';
    freteGratis = chk.checked;
  } else {
    chk.disabled = true;
    chk.checked = false;
    freteGratis = false;
    const falta = (MINIMO_FRETE_GRATIS - subtotal).toFixed(2).replace('.', ',');
    txt.textContent = `Frete grátis a partir de R$ 80 (faltam R$ ${falta})`;
  }
}

function textoFrete() {
  const subtotal = calcularSubtotal();
  const frete = calcularFrete(subtotal);
  if (frete === null) return 'Frete: informe CEP ou endereço';
  if (frete === 0) return 'Frete grátis';
  return 'Frete: R$ ' + FRETE_FIXO.toFixed(2).replace('.', ',');
}

/* ====================== PIX ====================== */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function campo(id, valor) {
  const v = String(valor);
  return id + String(v.length).padStart(2, '0') + v;
}

function gerarPayloadPix(valor) {
  const valorStr = Number(valor).toFixed(2);
  const merchantAccount = campo('00', 'br.gov.bcb.pix') + campo('01', CHAVE_PIX);
  const additionalData = campo('05', '***');

  let payload = '';
  payload += campo('00', '01');
  payload += campo('26', merchantAccount);
  payload += campo('52', '0000');
  payload += campo('53', '986');
  payload += campo('54', valorStr);
  payload += campo('58', 'BR');
  payload += campo('59', NOME_RECEBEDOR.substring(0, 25));
  payload += campo('60', CIDADE.substring(0, 15));
  payload += campo('62', additionalData);
  payload += '6304';
  payload += crc16(payload);
  return payload;
}

function mostrarPix(valor, dadosPendentes) {
  const modal = document.getElementById('modalPix');
  // Se o HTML não tiver o modal Pix, confirma na hora (não quebra o fluxo)
  if (!modal) {
    const ok = confirm(
      'Pagamento Pix — R$ ' + Number(valor).toFixed(2).replace('.', ',') +
      '\n\nChave: ' + CHAVE_PIX +
      '\n\nConfirma que já pagou?'
    );
    if (ok) {
      try {
        const id = salvarPedidoConfirmado(dadosPendentes, 'Pix', 'Pago');
        mostrarSucessoPagamento(id, valor);
      } catch (e) {
        alert('Erro ao salvar pedido: ' + (e.message || e));
      }
    } else {
      alert('Pedido não finalizado. Pague e tente de novo, ou escolha Dinheiro/Cartão.');
    }
    return;
  }

  const payload = gerarPayloadPix(valor);
  const elValor = document.getElementById('pixValor');
  const elChave = document.getElementById('pixChave');
  const elCopia = document.getElementById('pixCopiaCola');
  if (elValor) elValor.textContent = 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
  if (elChave) elChave.textContent = CHAVE_PIX;
  if (elCopia) elCopia.value = payload;

  const qrBox = document.getElementById('pixQr');
  if (qrBox) {
    qrBox.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(qrBox, {
          text: payload,
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        console.warn(e);
      }
    } else {
      const img = document.createElement('img');
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(payload);
      img.alt = 'QR Code Pix';
      qrBox.appendChild(img);
    }
  }

  pedidoPixPendente = dadosPendentes;
  const btn = document.getElementById('btnPixVerificar');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Já paguei';
  }
  const aviso = document.getElementById('pixAviso');
  if (aviso) {
    aviso.textContent = 'O pedido só será confirmado após a verificação do pagamento.';
  }
  modal.style.display = 'flex';
}

/**
 * Verificação de Pix no front-end puro é simulada.
 * Em produção, integre webhook/API do banco ou PSP (Mercado Pago, etc.).
 * Só salva o pedido depois da confirmação.
 */
async function verificarPagamentoPix() {
  if (!pedidoPixPendente) {
    alert('Nenhum pagamento Pix pendente.');
    return;
  }

  const btn = document.getElementById('btnPixVerificar');
  const aviso = document.getElementById('pixAviso');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Verificando...';
  }
  if (aviso) aviso.textContent = 'Consultando status do pagamento...';

  await new Promise(r => setTimeout(r, 1800));

  const pago = confirm(
    'Consulta ao Pix concluída.\n\n' +
    'Confirma que o pagamento de R$ ' +
    Number(pedidoPixPendente.total).toFixed(2).replace('.', ',') +
    ' foi realizado no app do banco?\n\n' +
    '(Em produção isso seria automático via webhook do banco.)'
  );

  if (!pago) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Verificar pagamento';
    }
    if (aviso) aviso.textContent = 'Pagamento ainda não confirmado. Tente novamente após pagar no banco.';
    return;
  }

  try {
    await salvarPedidoConfirmado(pedidoPixPendente, 'Pix', 'Pago');
    const id = ultimoPedidoId;
    const total = pedidoPixPendente.total;
    pedidoPixPendente = null;
    const mPix = document.getElementById('modalPix');
    if (mPix) mPix.style.display = 'none';
    mostrarSucessoPagamento(id, total);
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar pedido: ' + e.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Verificar pagamento';
    }
  }
}

function cancelarPagamentoPix() {
  if (!confirm('Cancelar o pagamento Pix? O pedido não será registrado.')) return;
  pedidoPixPendente = null;
  const mPix = document.getElementById('modalPix');
  if (mPix) mPix.style.display = 'none';
}

function mostrarSucessoPagamento(idPedido, valor) {
  const txtPedido =
    document.getElementById('sucessoPedidoId') ||
    document.getElementById('sucessoPedido');
  const txtValor = document.getElementById('sucessoValor');
  const txtMsg =
    document.getElementById('sucessoMsg') ||
    document.getElementById('sucessoSub');
  const modal = document.getElementById('modalSucesso');

  if (txtPedido) txtPedido.textContent = 'Pedido #' + (idPedido || '—');
  if (txtValor) txtValor.textContent = 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
  if (txtMsg) txtMsg.textContent = 'Seu pedido foi registrado e já estamos preparando.';
  if (modal) modal.style.display = 'flex';
}

/* ====================== FOTO DE PERFIL ====================== */
function aplicarFotoPerfilNaTela() {
  const foto = clienteLogado?.foto || null;

  const imgTopo = document.getElementById('fotoPerfilTopo');
  const iconeTopo = document.getElementById('iconePerfilPadrao');
  const imgModal = document.getElementById('fotoPerfilImg');
  const emojiModal = document.getElementById('fotoPerfilEmoji');
  const btnRemover = document.getElementById('btnRemoverFoto');

  if (foto) {
    if (imgTopo) {
      imgTopo.src = foto;
      imgTopo.style.display = 'block';
    }
    if (iconeTopo) iconeTopo.style.display = 'none';

    if (imgModal) {
      imgModal.src = foto;
      imgModal.style.display = 'block';
    }
    if (emojiModal) emojiModal.style.display = 'none';
    if (btnRemover) btnRemover.style.display = 'inline';
  } else {
    if (imgTopo) {
      imgTopo.src = '';
      imgTopo.style.display = 'none';
    }
    if (iconeTopo) iconeTopo.style.display = 'inline';

    if (imgModal) {
      imgModal.src = '';
      imgModal.style.display = 'none';
    }
    if (emojiModal) emojiModal.style.display = 'inline';
    if (btnRemover) btnRemover.style.display = 'none';
  }
}

function onEscolherFoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Selecione uma imagem válida.');
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    alert('Imagem muito grande. Use uma foto menor que 1,5 MB.');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 300;
      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > max) {
          h = Math.round(h * max / w);
          w = max;
        }
      } else {
        if (h > max) {
          w = Math.round(w * max / h);
          h = max;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const fotoFinal = canvas.toDataURL('image/jpeg', 0.7);

      if (!clienteLogado) clienteLogado = {};
      clienteLogado.foto = fotoFinal;
      localStorage.setItem('cliente_logado', JSON.stringify(clienteLogado));
      aplicarFotoPerfilNaTela();
      alert('Foto atualizada!');
    };
    img.src = base64;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removerFotoPerfil() {
  if (!clienteLogado) return;
  if (!confirm('Remover a foto de perfil?')) return;

  delete clienteLogado.foto;
  localStorage.setItem('cliente_logado', JSON.stringify(clienteLogado));
  aplicarFotoPerfilNaTela();
}

/* ====================== 2 SABORES (-20%) ====================== */
function abrirEscolhaSabores() {
  const pizzas = produtos.filter(p => p.categoria === 'Pizza');
  if (pizzas.length < 2) {
    alert('Não há pizzas suficientes no cardápio.');
    return;
  }

  const options = pizzas.map(p =>
    `<option value="${p.id}" data-preco="${p.preco}">${p.nome} — R$ ${p.preco.toFixed(2).replace('.', ',')}</option>`
  ).join('');

  document.getElementById('sabor1').innerHTML = options;
  document.getElementById('sabor2').innerHTML = options;
  document.getElementById('sabor2').selectedIndex = 1;

  atualizarResumoPromo();
  document.getElementById('modalSabores').style.display = 'flex';
}

function atualizarResumoPromo() {
  const s1 = document.getElementById('sabor1');
  const s2 = document.getElementById('sabor2');
  if (!s1 || !s2) return;

  const preco1 = parseFloat(s1.options[s1.selectedIndex]?.dataset.preco || 0);
  const preco2 = parseFloat(s2.options[s2.selectedIndex]?.dataset.preco || 0);
  const el = document.getElementById('resumoPromo');
  if (el) {
    el.textContent = 'Total com 20% off: R$ ' + ((preco1 + preco2) * 0.8).toFixed(2).replace('.', ',');
  }
}

function confirmarDoisSabores() {
  const s1 = document.getElementById('sabor1');
  const s2 = document.getElementById('sabor2');
  const p1 = produtos.find(p => p.id === parseInt(s1.value));
  const p2 = produtos.find(p => p.id === parseInt(s2.value));

  if (!p1 || !p2) {
    alert('Selecione os 2 sabores');
    return;
  }

  const preco = (p1.preco + p2.preco) * 0.8;

  carrinho.push({
    id: 10100 + Date.now() % 10000,
    nome: `2 Pizzas: ${p1.nome} + ${p2.nome}`,
    preco,
    qtd: 1,
    categoria: 'Combo'
  });

  salvarCarrinho();
  atualizarBarra();
  document.getElementById('modalSabores').style.display = 'none';
  alert(
    '✅ Adicionado!\n' +
    p1.nome + ' + ' + p2.nome +
    '\nR$ ' + preco.toFixed(2).replace('.', ',') + ' (20% off)'
  );
}

function addCombo(index) {
  if (index === 1) {
    abrirEscolhaSabores();
    return;
  }

  if (index === 4) return;

  const combo = COMBOS[index];
  if (!combo || combo.frete) return;

  if (combo.desconto) descontoAtivo = combo.desconto;

  const existe = carrinho.find(c => c.id === combo.id);
  if (existe) existe.qtd += 1;
  else carrinho.push({ id: combo.id, nome: combo.nome, preco: combo.preco, qtd: 1, categoria: 'Combo' });

  salvarCarrinho();
  atualizarBarra();
}

/* ====================== PRODUTOS ====================== */
function carregarProdutos() {
  if (typeof verificarBanco === 'function' && !verificarBanco()) {
    // continua com fallback
  }

  produtos = [];

  try {
    if (typeof db !== 'undefined' && db) {
      const result = db.exec(`SELECT * FROM produtos ORDER BY vendidos DESC`);
      if (result.length && result[0].values.length) {
        produtos = result[0].values.map(r => ({
          id: r[0],
          nome: r[1],
          preco: parseFloat(r[2]) || 0,
          categoria: r[3] || 'Pizza',
          emoji: r[3] === 'Bebida' ? '🥤' : r[3] === 'Doce' ? '🍫' : r[3] === 'Combo' ? '🎁' : '🍕'
        }));
      }
    }
  } catch (e) {
    console.warn('Erro ao ler produtos do banco', e);
  }

  if (produtos.length === 0) {
    produtos = [
      { id: 1, nome: 'Calabresa', preco: 29.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 2, nome: 'Frango com Catupiry', preco: 34.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 3, nome: '4 Queijos', preco: 36.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 4, nome: 'Portuguesa', preco: 32.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 5, nome: 'Margherita', preco: 28.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 6, nome: 'Pepperoni', preco: 35.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 7, nome: 'Mussarela', preco: 27.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 8, nome: 'Bacon', preco: 33.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 9, nome: 'Carne Seca', preco: 39.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 10, nome: 'Baiana', preco: 34.90, categoria: 'Pizza', emoji: '🍕' },
      { id: 30, nome: 'Chocolate com Morango', preco: 39.90, categoria: 'Doce', emoji: '🍫' },
      { id: 31, nome: 'Nutella com Leite Ninho', preco: 39.90, categoria: 'Doce', emoji: '🍫' },
      { id: 32, nome: 'Romeu e Julieta', preco: 36.90, categoria: 'Doce', emoji: '🍰' },
      { id: 33, nome: 'Banana com Canela', preco: 34.90, categoria: 'Doce', emoji: '🍌' },
      { id: 50, nome: 'Coca-Cola 2L', preco: 12.00, categoria: 'Bebida', emoji: '🥤' },
      { id: 51, nome: 'Guaraná 2L', preco: 11.00, categoria: 'Bebida', emoji: '🥤' },
      { id: 52, nome: 'Suco de Laranja', preco: 10.00, categoria: 'Bebida', emoji: '🧃' },
      { id: 53, nome: 'Água Mineral', preco: 4.00, categoria: 'Bebida', emoji: '💧' },
      { id: 70, nome: 'Combo Calabresa', preco: 52.00, categoria: 'Combo', emoji: '🎁' },
      { id: 71, nome: 'Combo Família', preco: 89.00, categoria: 'Combo', emoji: '🎁' },
      { id: 72, nome: 'Combo Kids', preco: 45.00, categoria: 'Combo', emoji: '🎁' }
    ];
  }

  renderProdutos('todos');
}

function emojiProduto(p) {
  if (p.emoji) return p.emoji;
  if (p.categoria === 'Bebida') return '🥤';
  if (p.categoria === 'Doce') return '🍫';
  if (p.categoria === 'Combo') return '🎁';
  return '🍕';
}

function tituloSecao(cat) {
  if (cat === 'Pizza') return 'Salgadas';
  if (cat === 'Doce') return 'Doces';
  if (cat === 'Bebida') return 'Bebidas';
  if (cat === 'Combo') return 'Combos';
  return cat;
}

function descricaoProduto(p) {
  return DESCRICOES[p.id] || `Delicioso ${p.nome.toLowerCase()} preparado com ingredientes selecionados na Trattoria Aldini.`;
}

function renderProdutos(categoria, busca = '') {
  const container = document.getElementById('listaProdutos');
  if (!container) return;

  let lista = [...produtos];

  if (categoria && categoria !== 'todos') {
    lista = lista.filter(p => p.categoria === categoria);
  }
  if (busca && busca.trim()) {
    const q = busca.toLowerCase();
    lista = lista.filter(p => p.nome.toLowerCase().includes(q));
  }

  // ===== BUSCA: lista vertical =====
  if (busca && busca.trim()) {
    container.innerHTML = `
      <div class="lista-vertical">
        <h2 class="secao-titulo">Resultados</h2>
        ${
          lista.length === 0
            ? '<p style="color:#999;padding:20px 0;">Nenhum item encontrado.</p>'
            : lista.map(p => cardLinha(p)).join('')
        }
      </div>
    `;
    if (typeof ativarExpandirImagens === 'function') ativarExpandirImagens();
    return;
  }

  // ===== TODOS: carrossel horizontal (~5 visíveis + setas) =====
  if (categoria === 'todos') {
    function montarSecaoLinha(titulo, itens, id) {
      if (!itens.length) return '';
      return `
        <div class="secao-bloco">
          <div class="secao-header">
            <h2 class="secao-titulo">${titulo}</h2>
            <div class="secao-setas">
              <button type="button" class="secao-seta" onclick="moverCarrossel('${id}', -1)">‹</button>
              <button type="button" class="secao-seta" onclick="moverCarrossel('${id}', 1)">›</button>
            </div>
          </div>
          <div class="carrossel-produtos carrossel-5" id="${id}">
            ${itens.map(p => cardCirculo(p)).join('')}
          </div>
        </div>`;
    }

    const grupos = {};
    lista.forEach(p => {
      const key = p.categoria || 'Outros';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(p);
    });
    const ordem = ['Pizza', 'Doce', 'Bebida', 'Combo'];
    let html = '';
    let idx = 0;
    ordem.forEach(cat => {
      if (!grupos[cat]?.length) return;
      html += montarSecaoLinha(tituloSecao(cat), grupos[cat], 'carr-prod-' + idx);
      idx++;
    });
    container.innerHTML = html || '<p style="padding:20px;color:#999;">Nenhum produto.</p>';
    document.querySelectorAll('.carrossel-produtos').forEach(el => ativarArraste(el));
    if (typeof ativarExpandirImagens === 'function') ativarExpandirImagens();
    return;
  }

  // ===== CATEGORIA ESPECÍFICA (Salgadas, Doces...): um embaixo do outro =====
  container.innerHTML = `
    <div class="lista-vertical">
      <h2 class="secao-titulo">${tituloSecao(categoria)}</h2>
      ${
        lista.length === 0
          ? '<p style="color:#999;padding:20px 0;">Nenhum item encontrado.</p>'
          : lista.map(p => cardLinha(p)).join('')
      }
    </div>
  `;
  if (typeof ativarExpandirImagens === 'function') ativarExpandirImagens();
}

function moverCarrossel(id, direcao) {
  const el = document.getElementById(id);
  if (!el) return;
  // Avança ~5 cards (uma "página") por clique na seta
  const card = el.querySelector('.produto-circulo');
  const umCard = card ? card.offsetWidth + 14 : 164;
  const passo = umCard * MAX_PRODUTOS_SECAO;
  el.scrollBy({ left: direcao * passo, behavior: 'smooth' });
}

function cardCirculo(p) {
  const preco = p.preco.toFixed(2).replace('.', ',');
  return `
    <button type="button" class="produto-circulo" onclick="abrirDetalheProduto(${p.id})">
      <div class="foto" data-emoji="${emojiProduto(p)}" data-nome="${p.nome}">${emojiProduto(p)}</div>
      <span class="nome">${p.nome}</span>
      <span class="preco"><small>R$</small> ${preco}</span>
    </button>
  `;
}

function cardLinha(p) {
  const preco = p.preco.toFixed(2).replace('.', ',');
  return `
    <button type="button" class="produto-linha" onclick="abrirDetalheProduto(${p.id})">
      <div class="foto-mini" data-emoji="${emojiProduto(p)}" data-nome="${p.nome}">${emojiProduto(p)}</div>
      <div class="info">
        <span class="nome">${p.nome}</span>
        <span class="preco">R$ ${preco}</span>
      </div>
      <span class="btn-add-linha" onclick="event.stopPropagation(); addItem(${p.id})">+</span>
    </button>
  `;
}

/* ====================== DETALHE DO PRODUTO (estilo loja / ML) ====================== */
function atualizarDetalheQtd() {
  const el = document.getElementById('prodQtdValor');
  if (el) el.textContent = qtdDetalhe;
  if (!produtoDetalheAtual) return;

  const totalTxt = 'R$ ' + (produtoDetalheAtual.preco * qtdDetalhe).toFixed(2).replace('.', ',');
  const elTotal = document.getElementById('prodDetalheTotal');
  const elTotalFooter = document.getElementById('prodDetalheTotalFooter');
  if (elTotal) elTotal.textContent = totalTxt;
  if (elTotalFooter) elTotalFooter.textContent = totalTxt;
  const elBtn = document.getElementById('btnAddDetalhe');
  if (elBtn) elBtn.textContent = 'Adicionar à sacola · ' + totalTxt;
}

function abrirDetalheProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;

  produtoDetalheAtual = p;
  qtdDetalhe = 1;

  const foto = document.getElementById('prodDetalheFoto');
  if (foto) {
    foto.textContent = emojiProduto(p);
    foto.dataset.emoji = emojiProduto(p);
    foto.dataset.nome = p.nome;
  }
  const nome = document.getElementById('prodDetalheNome');
  if (nome) nome.textContent = p.nome;
  const cat = document.getElementById('prodDetalheCat');
  if (cat) cat.textContent = tituloSecao(p.categoria);
  const preco = document.getElementById('prodDetalhePreco');
  if (preco) preco.textContent = 'R$ ' + p.preco.toFixed(2).replace('.', ',');

  const descTxt = descricaoProduto(p);
  const desc = document.getElementById('prodDetalheDesc');
  if (desc) desc.textContent = descTxt;

  const lista = document.getElementById('prodDetalheLista');
  if (lista) {
    const bullets = [
      `Categoria: ${tituloSecao(p.categoria)}`,
      'Preparado na hora com ingredientes selecionados',
      'Receita da casa Trattoria Aldini',
      p.categoria === 'Pizza' ? 'Massa artesanal e forno a ponto' :
      p.categoria === 'Bebida' ? 'Servida gelada' :
      p.categoria === 'Doce' ? 'Sobremesa da casa' : 'Combo pensado para dividir'
    ];
    lista.innerHTML = bullets.map(b => `<li>${b}</li>`).join('');
  }

  atualizarDetalheQtd();

  const modal = document.getElementById('modalProduto');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('aberto');
    document.body.style.overflow = 'hidden';
  }
}

function fecharModalProduto() {
  const modal = document.getElementById('modalProduto');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('aberto');
  }
  document.body.style.overflow = '';
  produtoDetalheAtual = null;
}

function adicionarDoDetalhe() {
  if (!produtoDetalheAtual) return;
  const p = produtoDetalheAtual;
  const existe = carrinho.find(c => c.id === p.id);
  if (existe) {
    existe.qtd += qtdDetalhe;
  } else {
    carrinho.push({ ...p, qtd: qtdDetalhe });
  }
  salvarCarrinho();
  atualizarBarra();
  fecharModalProduto();
  // Feedback leve (sem alert)
  const barra = document.getElementById('barraCarrinho');
  if (barra) {
    barra.style.display = 'flex';
    barra.classList.add('pulse-add');
    setTimeout(() => barra.classList.remove('pulse-add'), 600);
  }
}

function addItem(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  const existe = carrinho.find(c => c.id === id);
  if (existe) existe.qtd++;
  else carrinho.push({ ...p, qtd: 1 });
  salvarCarrinho();
  atualizarBarra();
}

/* ====================== EXPANDIR IMAGEM (hover / long press) ====================== */
function ativarExpandirImagens() {
  document.querySelectorAll('.foto, .foto-mini, .prod-detalhe-foto').forEach(el => {
    if (el.dataset.zoomReady) return;
    el.dataset.zoomReady = '1';

    // Desktop: hover
    el.addEventListener('mouseenter', () => {
      el.classList.add('expandido');
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('expandido');
    });

    // Clique longo / toque longo para zoom completo
    let pressTimer = null;
    const startPress = (e) => {
      pressTimer = setTimeout(() => {
        const emoji = el.dataset.emoji || el.textContent.trim();
        const nome = el.dataset.nome || '';
        abrirZoom(emoji, nome);
      }, 450);
    };
    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);
    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchend', cancelPress);
    el.addEventListener('touchcancel', cancelPress);

    // Duplo clique / double tap também abre zoom
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const emoji = el.dataset.emoji || el.textContent.trim();
      const nome = el.dataset.nome || '';
      abrirZoom(emoji, nome);
    });
  });
}

function abrirZoom(emoji, nome) {
  document.getElementById('zoomEmoji').textContent = emoji || '🍕';
  document.getElementById('zoomNome').textContent = nome || '';
  document.getElementById('modalZoom').style.display = 'flex';
}

function fecharZoom() {
  document.getElementById('modalZoom').style.display = 'none';
}

function mudarQtd(id, delta) {
  const item = carrinho.find(c => c.id === id);
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) carrinho = carrinho.filter(c => c.id !== id);
  salvarCarrinho();
  atualizarBarra();
  renderDrawer();
}

function atualizarBarra() {
  const barra = document.getElementById('barraCarrinho');
  const badge = document.getElementById('badgeCarrinho');
  const totalQtd = carrinho.reduce((s, i) => s + i.qtd, 0);
  const total = calcularTotal();

  // Badge no topo
  if (badge) {
    if (totalQtd > 0) {
      badge.style.display = 'flex';
      badge.textContent = totalQtd > 99 ? '99+' : String(totalQtd);
    } else {
      badge.style.display = 'none';
    }
  }

  if (totalQtd === 0) {
    if (barra) barra.style.display = 'none';
    freteGratis = false;
    const chk = document.getElementById('chkFreteGratis');
    if (chk) chk.checked = false;
    return;
  }

  if (barra) {
    barra.style.display = 'flex';
    document.getElementById('qtdItens').textContent = totalQtd + (totalQtd === 1 ? ' item' : ' itens');
    document.getElementById('totalBarra').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
  }
}

function abrirDrawer() {
  renderDrawer();
  document.getElementById('drawer')?.classList.add('aberto');
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'block';
}

function fecharDrawer() {
  document.getElementById('drawer')?.classList.remove('aberto');
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderDrawer() {
  const body = document.getElementById('drawerBody');
  const subtotal = calcularSubtotal();
  const frete = calcularFrete(subtotal);
  const total = frete === null ? subtotal : subtotal + frete;
  const premioBox = document.getElementById('premioBox');

  atualizarUiCep();
  atualizarOpcaoFrete();

  if (carrinho.length === 0) {
    body.innerHTML = '<p style="text-align:center;color:#999;padding:30px 0;">Sacola vazia</p>';
  } else {
    const freteTxt = frete === null
      ? '—'
      : (frete === 0 ? 'Grátis' : 'R$ ' + frete.toFixed(2).replace('.', ','));
    body.innerHTML = carrinho.map(item => `
      <div class="item-sacola">
        <div>
          <div class="nome">${item.nome}</div>
          <small>R$ ${item.preco.toFixed(2).replace('.', ',')}</small>
        </div>
        <div class="ctrl">
          <button type="button" onclick="mudarQtd(${item.id}, -1)">−</button>
          <span>${item.qtd}</span>
          <button type="button" onclick="mudarQtd(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('') + `
      <div class="item-sacola" style="border-bottom:none;margin-top:8px;">
        <div class="nome">Subtotal</div>
        <strong>R$ ${subtotal.toFixed(2).replace('.', ',')}</strong>
      </div>
      <div class="item-sacola" style="border-bottom:none;">
        <div class="nome">${textoFrete()}</div>
        <strong>${freteTxt}</strong>
      </div>
    `;
  }

  if (descontoAtivo > 0 || freteGratis) {
    premioBox.style.display = 'block';
    const msgs = [];
    if (descontoAtivo > 0) msgs.push((descontoAtivo * 100) + '% off');
    if (freteGratis) msgs.push('Frete grátis');
    premioBox.textContent = '🎁 ' + msgs.join(' · ');
  } else {
    premioBox.style.display = 'none';
  }

  document.getElementById('totalDrawer').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function finalizarPedido() {
  try {
    if (carrinho.length === 0) {
      alert('Sacola vazia');
      return;
    }
    if (!clienteLogado || !clienteLogado.id) {
      alert('Faça login ou cadastre-se para finalizar o pedido.');
      irParaLogin();
      return;
    }
    if (typeof verificarBanco === 'function' && !verificarBanco()) {
      alert('Banco não aberto. Recarregue a página.');
      return;
    }

    // Confirma endereço em silêncio se já tiver rua + número
    if (!temEnderecoOuCep() && dadosCepAtual && !dadosCepAtual.confirmado) {
      const num = (elNumeroPedido()?.value || '').trim();
      const rua = (elRuaPedido()?.value || dadosCepAtual.logradouro || '').trim();
      if (rua && num) {
        confirmarEnderecoCompleto(true);
      }
    }

    if (!temEnderecoOuCep()) {
      alert('Busque o CEP, preencha o número e clique em "Confirmar endereço".');
      document.getElementById('inputCepPedido')?.focus();
      return;
    }

    const subtotal = calcularSubtotal();

    if (freteGratis && subtotal < MINIMO_FRETE_GRATIS) {
      freteGratis = false;
      const chk = document.getElementById('chkFreteGratis');
      if (chk) chk.checked = false;
    }

    const frete = calcularFrete(subtotal);
    if (frete === null) {
      alert('Informe o CEP ou endereço para calcular o frete.');
      return;
    }

    const total = subtotal + frete;
    const selectPag = document.getElementById('pagamento');
    const forma = (selectPag?.value || 'Pix').trim();
    const obs = document.getElementById('obs')?.value.trim() || '';
    const data = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const idCliente = clienteLogado?.id || null;

    const dados = {
      idCliente,
      total,
      subtotal,
      frete,
      forma,
      obs,
      data,
      itens: carrinho.map(i => ({ ...i })),
      usarFreteGratis: freteGratis && frete === 0
    };

    // Pix
    if (forma === 'Pix') {
      fecharDrawer();
      setTimeout(() => mostrarPix(total, dados), 50);
      return;
    }

    // Dinheiro / Cartão
    const idPedido = salvarPedidoConfirmado(dados, forma, 'Aguardando');
    if (!idPedido) {
      alert('Não foi possível registrar o pedido. Tente de novo.');
      return;
    }
    mostrarSucessoPagamento(idPedido, total);
  } catch (e) {
    console.error('finalizarPedido', e);
    alert('Erro ao finalizar: ' + (e.message || e));
  }
}

/** Persiste pedido + pagamento e limpa a sacola */
function salvarPedidoConfirmado(dados, forma, statusPagamento) {
  const { idCliente, total, data, usarFreteGratis, itens } = dados;

  if (usarFreteGratis && clienteLogado && !clienteLogado.freteGratisUsado) {
    clienteLogado.freteGratisUsado = true;
    localStorage.setItem('cliente_logado', JSON.stringify(clienteLogado));
  }

  try {
    db.run(
      `INSERT INTO pedidos (id_cliente, total, status, data) VALUES (?,?,?,?)`,
      [idCliente, total, 'Pendente', data]
    );
  } catch (e) {
    db.run(
      `INSERT INTO pedidos (id_cliente, data_pedido, status, total) VALUES (?,?,?,?)`,
      [idCliente, data, 'Pendente', total]
    );
  }

  const last = db.exec(`SELECT last_insert_rowid()`);
  const idPedido = last[0].values[0][0];

  try {
    db.run(
      `INSERT INTO pagamentos (id_pedido, forma, valor, status) VALUES (?,?,?,?)`,
      [idPedido, forma, total, statusPagamento]
    );
  } catch (e) {
    try {
      db.run(
        `INSERT INTO pagamentos (id_pedido, forma_pagamento, valor, status) VALUES (?,?,?,?)`,
        [idPedido, forma, total, statusPagamento]
      );
    } catch (e2) {
      console.warn('Pagamento não gravado:', e2);
    }
  }

  if (itens && itens.length) {
    itens.forEach(item => {
      try {
        db.run(
          `INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario) VALUES (?,?,?,?)`,
          [idPedido, item.id || null, item.qtd || 1, item.preco || 0]
        );
      } catch (e) { /* schema diferente */ }
    });
  }

  if (typeof salvarBanco === 'function') salvarBanco();

  ultimoPedidoId = idPedido;

  carrinho = [];
  descontoAtivo = 0;
  freteGratis = false;
  limparCarrinhoSalvo();

  const chk = document.getElementById('chkFreteGratis');
  if (chk) {
    chk.checked = false;
    chk.disabled = true;
  }

  atualizarBarra();
  fecharDrawer();
  const obsEl = document.getElementById('obs');
  if (obsEl) obsEl.value = '';

  return idPedido;
}

function carregarPedidos() {
  const box = document.getElementById('listaPedidos');
  if (typeof verificarBanco === 'function' && !verificarBanco()) return;

  if (!clienteLogado) {
    box.innerHTML = '<p style="color:#666;">Faça login para ver seus pedidos.</p>';
    return;
  }

  let result;
  try {
    result = db.exec(`SELECT * FROM pedidos WHERE id_cliente = ? ORDER BY id DESC`, [clienteLogado.id]);
  } catch {
    box.innerHTML = '<p style="color:#999;">Nenhum pedido ainda.</p>';
    return;
  }

  if (!result.length || !result[0].values.length) {
    box.innerHTML = '<p style="color:#999;">Nenhum pedido ainda.</p>';
    return;
  }

  box.innerHTML = result[0].values.map(row => `
    <div class="pedido-card">
      <div class="topo">
        <strong>Pedido #${row[0]}</strong>
        <span class="badge ${(row[3] || 'pendente').toLowerCase()}">${row[3] || 'Pendente'}</span>
      </div>
      <p style="font-size:13px;color:#666;">${formatarData(row[4])}</p>
      <p style="margin-top:6px;font-weight:600;">R$ ${parseFloat(row[2]).toFixed(2).replace('.', ',')}</p>
    </div>
  `).join('');
}

function formatarData(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString('pt-BR'); }
  catch { return d; }
}

function abrirPerfil() {
  if (!clienteLogado) {
    alert('Faça login ou cadastre-se para acessar o perfil.');
    irParaLogin();
    return;
  }

  document.getElementById('perfilNomeView').textContent = clienteLogado.nome || 'Cliente';
  document.getElementById('perfilTelView').textContent = clienteLogado.telefone
    ? '📞 ' + clienteLogado.telefone
    : 'Telefone não informado';
  document.getElementById('perfilEndView').textContent = clienteLogado.endereco
    ? '📍 ' + clienteLogado.endereco
    : 'Endereço não informado';

  document.getElementById('formEditar').style.display = 'none';
  aplicarFotoPerfilNaTela();
  document.getElementById('modalPerfil').style.display = 'flex';
}

function salvarPerfil() {
  const nome = document.getElementById('pNome').value.trim();
  const tel = document.getElementById('pTel').value.trim();
  const end = document.getElementById('pEnd').value.trim();
  const cepRaw = (document.getElementById('pCep')?.value || '').replace(/\D/g, '');

  if (!nome) {
    alert('Informe o nome');
    return;
  }

  if (cepRaw && !cepValido(cepRaw)) {
    alert('CEP inválido. Use 8 dígitos.');
    return;
  }

  if (!clienteLogado) clienteLogado = {};
  clienteLogado.nome = nome;
  clienteLogado.telefone = tel;
  clienteLogado.endereco = end;
  if (cepRaw) {
    clienteLogado.cep = cepRaw;
    cepEntrega = cepRaw;
  }

  if (clienteLogado.id && typeof verificarBanco === 'function' && verificarBanco()) {
    try {
      db.run(
        `UPDATE clientes SET nome=?, telefone=?, endereco=? WHERE id=?`,
        [nome, tel, end, clienteLogado.id]
      );
      if (typeof salvarBanco === 'function') salvarBanco();
    } catch (e) {
      console.error(e);
    }
  }

  localStorage.setItem('cliente_logado', JSON.stringify(clienteLogado));
  if (end) {
    document.getElementById('textoEndereco').textContent = end;
  } else if (cepRaw) {
    document.getElementById('textoEndereco').textContent = 'CEP ' + formatarCep(cepRaw);
  } else {
    document.getElementById('textoEndereco').textContent = 'Definir endereço';
  }
  document.getElementById('perfilNomeView').textContent = nome;
  document.getElementById('perfilTelView').textContent = tel ? '📞 ' + tel : 'Telefone não informado';
  document.getElementById('perfilEndView').textContent = end
    ? '📍 ' + end + (cepRaw ? ' · CEP ' + formatarCep(cepRaw) : '')
    : (cepRaw ? 'CEP ' + formatarCep(cepRaw) : 'Endereço não informado');
  document.getElementById('formEditar').style.display = 'none';
  alert('Dados salvos!');
}