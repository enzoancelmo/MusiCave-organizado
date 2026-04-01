const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createPool({
  host: "localhost",
  user: "usuario",
  password: "senha",
  database: "banco"
}).promise();


// Rota POST para salvar no banco
app.post("/cadastro", async (req, res) => {
  const { username, email, senha } = req.body;

  try {
    const senha_hash = await bcrypt.hash(senha, 10);

    await db.execute(
      "INSERT INTO usuarios (username, email, senha_hash) VALUES (?, ?, ?)",
      [username, email, senha_hash]
    );

    res.send("Cadastro realizado com sucesso!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao cadastrar");
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});