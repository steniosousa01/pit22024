document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.querySelector("#clientes-table tbody");
  const formCliente = document.querySelector("#form-cliente");
  const tipoPessoaSelect = document.querySelector("#tipoPessoa");
  const documentoInput = document.querySelector("#documento");
  const documentopInput = document.querySelector("#documentop");

  // Função para carregar clientes na tabela
  const carregarClientes = async () => {
    try {
      const response = await fetch("http://10.0.0.183:3000/clientes");
      if (!response.ok) {
        throw new Error("Erro ao buscar clientes.");
      }

      const clientes = await response.json();

      // Limpa a tabela antes de recarregar
      tableBody.innerHTML = "";

      // Adiciona os clientes à tabela
      clientes.forEach((cliente) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${cliente.id}</td>
          <td>${cliente.nome}</td>
          <td>${cliente.tipoPessoa ? "Pessoa Jurídica" : "Pessoa Física"}</td>
          <td>${cliente.tipoPessoa ? cliente.documento : cliente.documentop}</td>
        `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error("Erro ao carregar clientes:", error.message);
      tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar clientes.</td></tr>`;
    }
  };

  // Ajustar os campos de documento conforme o tipo de pessoa
  tipoPessoaSelect.addEventListener("change", () => {
    const tipoPessoa = tipoPessoaSelect.value;

    if (tipoPessoa === "false") {
      // Pessoa Física (CPF): Exibe o campo documentop
      documentoInput.disabled = true; // Desabilita o campo documento
      documentopInput.disabled = false; // Habilita o campo documentop
      documentoInput.value = ""; // Limpa o campo documento
      documentopInput.value = ""; // Limpa o campo documentop
      documentoInput.placeholder = "CNPJ (14 dígitos)";
      documentopInput.placeholder = "CPF (11 dígitos)";
    } else {
      // Pessoa Jurídica (CNPJ): Exibe o campo documento
      documentoInput.disabled = false; // Habilita o campo documento
      documentopInput.disabled = true; // Desabilita o campo documentop
      documentoInput.value = ""; // Limpa o campo documento
      documentopInput.value = ""; // Limpa o campo documentop
      documentoInput.placeholder = "CNPJ (14 dígitos)";
      documentopInput.placeholder = "CPF (11 dígitos)";
    }
  });

  // Carregar clientes ao carregar a página
  carregarClientes();

  // Evento para cadastrar novo cliente
  formCliente.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita o recarregamento da página

    // Coleta os dados do formulário
    const nome = document.querySelector("#nome").value;
    const tipoPessoa = tipoPessoaSelect.value === "true"; // Converte para boolean
    let documento = documentoInput.value.trim();
    let documentop = documentopInput.value.trim();

    // Ajusta os campos conforme o tipo de pessoa
    if (!tipoPessoa) {
      // Pessoa Física, usa documentop
      documento = null; // Nulo
      // Validação do CPF
      if (documentop.length !== 11) {
        alert("CPF deve ter exatamente 11 dígitos.");
        return;
      }
    } else {
      // Pessoa Jurídica, usa documento
      documentop = null; // Nulo
      // Validação do CNPJ
      if (documento.length !== 14) {
        alert("CNPJ deve ter exatamente 14 dígitos.");
        return;
      }
    }

    try {
      // Envia os dados para o backend, verificando qual campo (documento ou documentop) é utilizado
      const response = await fetch("http://10.0.0.183:3000/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          tipoPessoa,
          documento: tipoPessoa ? documento : null,  // Envia o CNPJ no campo de documento
          documentop: tipoPessoa ? null : documentop, // Envia o CPF no campo documentop
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao cadastrar cliente.");
      }

      alert("Cliente cadastrado com sucesso!");

      // Limpa o formulário após o cadastro
      formCliente.reset();
      tipoPessoaSelect.value = "false"; // Define "Pessoa Física" como padrão
      documentoInput.disabled = true;
      documentopInput.disabled = false;

      // Recarrega a lista de clientes
      carregarClientes();
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error.message);
      alert("Erro ao cadastrar cliente.");
    }
  });
});
