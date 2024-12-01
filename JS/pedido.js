const clienteUrl = "http://10.0.0.183:3000/clientes";
const estoqueUrl = "http://10.0.0.183:3000/products";
const pedidoUrl = "http://10.0.0.183:3000/pedidos";

// Carrega os clientes na página
async function carregarClientes() {
  const response = await fetch(clienteUrl);
  const clientes = await response.json();
  const select = document.getElementById("cliente");
  clientes.forEach(cliente => {
    const option = document.createElement("option");
    option.value = cliente.id;
    option.textContent = cliente.nome;
    select.appendChild(option);
  });
}

// Carrega os produtos disponíveis no estoque
async function carregarEstoque() {
  const response = await fetch(estoqueUrl);
  const produtos = await response.json();
  const tbody = document.querySelector("#estoque tbody");
  tbody.innerHTML = "";

  // Filtrar apenas os produtos ativos
  const produtosAtivos = produtos.filter(produto => produto.ativo === true);

  produtosAtivos.forEach(produto => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${produto.id}</td>
      <td>${produto.nome}</td>
      <td>${produto.quantidadeRestante}</td>
      <td><input type="number" data-id="${produto.id}" data-restante="${produto.quantidadeRestante}" min="0" max="${produto.quantidadeRestante}"></td>
    `;
    tbody.appendChild(row);
  });
}

// Evento de envio do formulário de pedido
document.getElementById("pedido-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const clienteId = document.getElementById("cliente").value;
  const inputs = document.querySelectorAll("#estoque input[type='number']");
  
  // Mapeia os itens do pedido
  const itens = Array.from(inputs).map(input => ({
    produtoId: parseInt(input.getAttribute("data-id")),
    quantidade: parseInt(input.value) || 0,
    quantidadeRestante: parseInt(input.getAttribute("data-restante"))
  })).filter(item => item.quantidade > 0); // Considera apenas itens com quantidade maior que 0

  // Valida se a quantidade solicitada está dentro do limite restante
  for (const item of itens) {
    if (item.quantidade > item.quantidadeRestante) {
      alert(`Erro: A quantidade para retirar do produto ID ${item.produtoId} excede o estoque restante.`);
      return; // Interrompe o processo
    }
  }

  // Envia os dados ao backend
  try {
    const response = await fetch(pedidoUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, itens })
    });

    if (response.ok) {
      alert("Pedido registrado com sucesso!");
      document.getElementById("pedido-form").reset();
      carregarEstoque(); // Atualiza a lista de estoque após registrar o pedido
    } else {
      alert("Erro ao registrar o pedido.");
    }
  } catch (error) {
    console.error("Erro ao registrar o pedido:", error);
    alert("Erro ao registrar o pedido.");
  }
});

// Inicializa a página
carregarClientes();
carregarEstoque();
