const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const dbConfig = {
  user: "consulta",
  password: "101010",
  server: "10.0.0.183",
  port: 1433,
  database: "ControleEstoque",
  options: {
    encrypt: true, // Habilita SSL
    enableArithAbort: true,
    trustServerCertificate: true, // Permite certificados autofirmados
  },
};

// Rota para listar produtos
app.get("/products", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT * FROM vw_Estoque");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Rota para adicionar um produto
app.post("/products", async (req, res) => {
  console.log("Dados recebidos:", req.body); // Log dos dados enviados
  const { nome, quantidade } = req.body; // Corrigir nome para 'nome', conforme enviado no corpo

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("nome", sql.VarChar, nome) // Usar 'nome' em vez de 'name'
      .input("quantidade", sql.Int, quantidade)
      .query("INSERT INTO Produtos (nome, quantidade) VALUES (@nome, @quantidade)"); // Corrigir para 'nome' na consulta
    res.status(201).send("Produto adicionado.");
  } catch (err) {
    console.error("Erro no servidor:", err.message); // Log do erro
    res.status(500).send(err.message);
  }
});


// Rota para deletar um produto
app.delete("/products/:id", async (req, res) => {
  const itemId = req.params.id;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("id", sql.Int, itemId)
      .query("DELETE FROM Produtos WHERE id = @id");

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: "Item removido com sucesso!" });
    } else {
      res.status(404).json({ message: "Item não encontrado!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover o item." });
  }
});

// Rota para buscar clientes
app.get("/clientes", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT id, nome, tipoPessoa, documento, documentop FROM Clientes");
    res.json(result.recordset);
  } catch (err) {
    console.error("Erro ao listar clientes:", err.message);
    res.status(500).send("Erro ao listar clientes.");
  }
});

// Rota para registrar pedidos
app.post("/pedidos", async (req, res) => {
  const { clienteId, itens } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Inserir o pedido
    const result = await pool.request()
      .input("clienteId", sql.Int, clienteId)
      .query("INSERT INTO Pedidos (clienteId, dataPedido) OUTPUT Inserted.id VALUES (@clienteId, GETDATE())");

    const pedidoId = result.recordset[0].id;

    // Processar itens do pedido
    for (const item of itens) {
      await pool.request()
        .input("pedidoId", sql.Int, pedidoId)
        .input("produtoId", sql.Int, item.produtoId)
        .input("quantidade", sql.Int, item.quantidade)
        .query("INSERT INTO ItensPedido (pedidoId, produtoId, quantidade) VALUES (@pedidoId, @produtoId, @quantidade)");

      // Atualizar o estoque
      await pool.request()
        .input("produtoId", sql.Int, item.produtoId)
        .input("quantidade", sql.Int, item.quantidade)
        .query("UPDATE Produtos SET quantidadeRetirada = quantidadeRetirada + @quantidade WHERE id = @produtoId");
    }

    res.status(201).json({ message: "Pedido registrado com sucesso!", pedidoId });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Rota para listar todos os pedidos com itens e clientes
app.get("/pedidos", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(`
      SELECT 
          p.id AS PedidoID,
          p.dataPedido AS DataPedido,
          c.nome AS NomeCliente,
          pr.nome AS NomeProduto,
          ip.quantidade AS Quantidade
      FROM 
          Pedidos p
      INNER JOIN 
          Clientes c ON p.clienteId = c.id
      INNER JOIN 
          ItensPedido ip ON p.id = ip.pedidoId
      INNER JOIN 
          Produtos pr ON ip.produtoId = pr.id;
    `);

    res.json(result.recordset); // Envia os pedidos no formato JSON
  } catch (err) {
    console.error("Erro ao listar pedidos:", err.message);
    res.status(500).send("Erro ao listar pedidos.");
  }
});

// Rota para inativar/ativar um produto (Método PATCH)
app.patch("/products/ativar-inativar/:id", async (req, res) => {
  const productId = req.params.id;
  console.log("ID do Produto:", productId);

  try {
    const pool = await sql.connect(dbConfig);

    // Verificar o status atual do produto
    const result = await pool.request()
      .input("id", sql.Int, productId)
      .query("SELECT ativo FROM Produtos WHERE id = @id");

    const produto = result.recordset[0];
    console.log("Status atual do produto:", produto.ativo); // Log do status atual

    if (produto) {
      // Alterna o valor de 'ativo' (se 1 -> 0, se 0 -> 1)
      const novoStatus = produto.ativo === true ? false : true;
      console.log("Novo status calculado:", novoStatus); // Log do novo status

      // Atualizar o status do produto
      await pool.request()
        .input("id", sql.Int, productId)
        .input("ativo", sql.Int, novoStatus)
        .query("UPDATE Produtos SET ativo = @ativo WHERE id = @id");

      res.status(200).json({ message: novoStatus === 1 ? "Produto ativado com sucesso!" : "Produto inativado com sucesso!" });
    } else {
      res.status(404).json({ message: "Produto não encontrado!" });
    }
  } catch (err) {
    console.error("Erro ao ativar/inativar produto:", err.message);
    res.status(500).send("Erro ao ativar/inativar produto.");
  }
});

// Rota para alterar a quantidade de um produto (Método PATCH)
app.patch("/products/alterar/:id", async (req, res) => {
  const productId = req.params.id;
  const { quantidade } = req.body;

  if (!quantidade || isNaN(quantidade)) {
    return res.status(400).json({ message: "Quantidade inválida." });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Obter a quantidade inicial e a quantidade retirada do produto
    const result = await pool.request()
      .input("id", sql.Int, productId)
      .query("SELECT quantidade, quantidadeRetirada FROM Produtos WHERE id = @id");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    const produto = result.recordset[0];
    const quantidadeMinima = produto.quantidadeRetirada;

    // Verificar se a nova quantidade é válida
    if (quantidade < quantidadeMinima) {
      return res.status(400).json({ message: "A quantidade não pode ser menor do que a quantidade retirada." });
    }

    // Atualiza a quantidade do produto
    await pool.request()
      .input("id", sql.Int, productId)
      .input("quantidade", sql.Int, quantidade)
      .query("UPDATE Produtos SET quantidade = @quantidade WHERE id = @id");

    res.status(200).json({ message: "Quantidade atualizada com sucesso!" });
  } catch (err) {
    console.error("Erro ao alterar quantidade:", err.message);
    res.status(500).send("Erro ao alterar quantidade.");
  }
});

// Rota para cadastrar um cliente
app.post("/clientes", async (req, res) => {
  const { nome, tipoPessoa, documento, documentop } = req.body;

  // Validações básicas dos campos
  if (!nome || typeof tipoPessoa !== "boolean" || (!documento && !documentop)) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const pool = await sql.connect(dbConfig);

    let query = `INSERT INTO Clientes (nome, tipoPessoa, documento, documentop) VALUES (@nome, @tipoPessoa, @documento, @documentop)`;

    // Se for Pessoa Física (tipoPessoa false), utiliza o campo documentop (CPF)
    if (tipoPessoa === false) {
      await pool.request()
        .input("nome", sql.NVarChar(200), nome)
        .input("tipoPessoa", sql.Bit, tipoPessoa)  // Pessoa Física
        .input("documento", sql.Char(14), null)  // Campo CNPJ vazio
        .input("documentop", sql.Char(11), documentop)  // Preenche CPF
        .query(query);
    } else {
      // Se for Pessoa Jurídica (tipoPessoa true), utiliza o campo documento (CNPJ)
      await pool.request()
        .input("nome", sql.NVarChar(200), nome)
        .input("tipoPessoa", sql.Bit, tipoPessoa)  // Pessoa Jurídica
        .input("documento", sql.Char(14), documento)  // Preenche CNPJ
        .input("documentop", sql.Char(11), null)  // Campo CPF vazio
        .query(query);
    }

    res.status(201).json({ message: "Cliente cadastrado com sucesso!" });
  } catch (err) {
    console.error("Erro ao cadastrar cliente:", err.message);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Inicia o servidor
app.listen(3000, () => console.log("Servidor rodando em 10.0.0.183:3000"));
