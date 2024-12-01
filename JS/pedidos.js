async function carregarPedidos() {
    try {
      const response = await fetch("http://10.0.0.183:3000/pedidos");
      const pedidos = await response.json();
  
      // Agrupar pedidos pelo PedidoID
      const pedidosAgrupados = pedidos.reduce((acc, pedido) => {
        // Se o pedido com o mesmo ID já existir, agrupar os produtos
        if (!acc[pedido.PedidoID]) {
          acc[pedido.PedidoID] = {
            PedidoID: pedido.PedidoID,
            DataPedido: pedido.DataPedido,
            NomeCliente: pedido.NomeCliente,
            Itens: []
          };
        }
        // Adiciona o item ao grupo
        acc[pedido.PedidoID].Itens.push({
          NomeProduto: pedido.NomeProduto,
          Quantidade: pedido.Quantidade
        });
        return acc;
      }, {});
  
      // Convertendo o objeto de grupos para um array
      const pedidosAgrupadosArray = Object.values(pedidosAgrupados);
  
      // Preencher a tabela
      const tabela = document.querySelector("#tabela-pedidos tbody");
      tabela.innerHTML = ""; // Limpa a tabela antes de preencher
  
      pedidosAgrupadosArray.forEach(pedido => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
          <td rowspan="${pedido.Itens.length}">${pedido.PedidoID}</td>
          <td rowspan="${pedido.Itens.length}">${new Date(pedido.DataPedido).toLocaleString("pt-BR")}</td>
          <td rowspan="${pedido.Itens.length}">${pedido.NomeCliente}</td>
          <td>${pedido.Itens[0].NomeProduto}</td>
          <td>${pedido.Itens[0].Quantidade}</td>
        `;
        tabela.appendChild(linha);
  
        // Para cada item do pedido, adicionar uma nova linha
        pedido.Itens.slice(1).forEach(item => {
          const novaLinha = document.createElement("tr");
          novaLinha.innerHTML = `
            <td>${item.NomeProduto}</td>
            <td>${item.Quantidade}</td>
          `;
          tabela.appendChild(novaLinha);
        });
      });
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      alert("Erro ao carregar pedidos. Verifique o console para mais detalhes.");
    }
  }
  
  // Carregar pedidos assim que a página for aberta
  carregarPedidos();
  