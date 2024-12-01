const apiUrl = "http://10.0.0.183:3000/products";

// Função para carregar os produtos do estoque
async function fetchProducts() {
  const response = await fetch(apiUrl);
  const products = await response.json();
  const tableBody = document.querySelector("#product-table tbody");
  tableBody.innerHTML = ""; // Limpa a tabela antes de adicionar novos dados

  products.forEach(product => {
    const row = document.createElement("tr");

  // Adiciona uma classe CSS para itens inativos
  if (product.ativo === 0) {
    row.classList.add("inactive-item");
  }

    row.innerHTML = `
      <td>${product.id}</td>
      <td>${product.nome}</td>
      <td>${product.quantidadeInicial}</td>
      <td>${product.quantidadeRetirada}</td>
      <td>${product.quantidadeRestante}</td>
      <td>
        <input type="number" id="new-quantity-${product.id}" value="${product.quantidadeRestante}" min="1" class="imput-alter">
        <button class="btn-update" data-id="${product.id}">Alterar</button>
      </td>
      <td>
        <button class="btn-inactivate" data-id="${product.id}">
          ${product.ativo === true ? "Inativar" : "Ativar"}
        </button>
      </td>
      <td>
        ${product.ativo === false ? "<span class='status-label'>Inativo</span>" : ""}
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Adiciona evento para os botões de alteração de quantidade
  const updateButtons = document.querySelectorAll(".btn-update");
  updateButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
      const itemId = e.target.getAttribute("data-id");
      const newQuantity = document.getElementById(`new-quantity-${itemId}`).value;
  
      // Encontra o produto correspondente para obter as quantidades necessárias
      const product = products.find(p => p.id === parseInt(itemId));
      const quantidadeMinima = product.quantidadeRetirada;
  
      // Valida a quantidade
      if (!newQuantity || isNaN(newQuantity) || newQuantity <= 0 || newQuantity < quantidadeMinima) {
        alert(`A quantidade não pode ser menor do que a quantidade retirada (${product.quantidadeRetirada}).`);
        return;
      }
  
      // Envia a nova quantidade para o backend
      const response = await fetch(`${apiUrl}/alterar/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: newQuantity })
      });
  
      if (response.ok) {
        alert("Quantidade atualizada com sucesso!");
        fetchProducts(); // Recarrega a tabela após alteração
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    });
  });

  // Adiciona evento para os botões de inativar/ativar
  const inactivateButtons = document.querySelectorAll(".btn-inactivate");
  inactivateButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
      const itemId = e.target.getAttribute("data-id");
      if (confirm("Você tem certeza que deseja alterar o status deste produto?")) {
        // Envia uma requisição PATCH para alternar entre ativar e inativar o produto
        const response = await fetch(`${apiUrl}/ativar-inativar/${itemId}`, { method: "PATCH" });

        if (response.ok) {
          alert("Produto alterado com sucesso!");
          fetchProducts(); // Recarrega a tabela após alteração
        } else {
          alert("Erro ao alterar o status do produto.");
        }
      }
    });
  });
}

// Evento para adicionar um novo item
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // Previne o envio padrão do formulário

  // Coleta os dados do formulário
  const nome = document.getElementById("product-name").value;
  const quantidade = document.getElementById("product-quantity").value;

  // Valida a quantidade para garantir que é um número válido
  if (!nome || !quantidade || isNaN(quantidade) || quantidade <= 0) {
    alert("Por favor, insira um nome válido e uma quantidade positiva.");
    return;
  }

  // Envia os dados para a API para adicionar o produto
  await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, quantidade })
  });

  fetchProducts(); // Recarrega a tabela após adição
});

// Carrega os produtos na página ao carregar
fetchProducts();
