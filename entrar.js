const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");

const SECRET_KEY = "3981289d18s98y2e98y2e9y19ye3y93y7d"; // Use algo complexo

const app = express();
const PORT = 3001;
const USERS_FILE = path.join(__dirname, "data", "users.json");

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


  // CONEXAO COM O BANCO
  // Se o PostgreSQL existir, ele usa o banco.
  //Se nao existir, ele salva os usuarios em data/users.json.
  
const db = new Pool({
  user: "musicave",
  host: "localhost",
  database: "musicave",
  password: "musicave",
  port: 5432,
});

let usarArquivoLocal = false;

async function garantirArquivoUsuarios() {
  const pasta = path.dirname(USERS_FILE);
  await fs.mkdir(pasta, { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}

async function lerUsuarios() {
  await garantirArquivoUsuarios();
  const conteudo = await fs.readFile(USERS_FILE, "utf8");
  return JSON.parse(conteudo);
}

async function salvarUsuarios(usuarios) {
  await garantirArquivoUsuarios();
  await fs.writeFile(USERS_FILE, JSON.stringify(usuarios, null, 2), "utf8");
}

async function iniciarAutenticacao() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        recovery_token TEXT,
        recovery_requested_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_token TEXT");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_requested_at TIMESTAMPTZ");

    console.log("Autenticacao conectada ao PostgreSQL.");
  } catch (error) {
    usarArquivoLocal = true;
    await garantirArquivoUsuarios();
    console.log("PostgreSQL nao encontrado. Usando data/users.json.");
  }
}


 // ROTA TESTE
  
app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});


  // CADASTRO
  // Recebe username, email e senha.
   //Verifica se o usuario ja existe.
   //Criptografa a senha com bcrypt.
 
app.post("/cadastro", async (req, res) => {
  const { username, email, senha } = req.body;

  if (!username || !email || !senha) {
    return res.status(400).json({ message: "Preencha todos os campos" });
  }

  try {
    const emailLimpo = email.trim().toLowerCase();

    if (usarArquivoLocal) {
      const usuarios = await lerUsuarios();
      const usuarioExistente = usuarios.find((usuario) => usuario.email === emailLimpo);

      if (usuarioExistente) {
        return res.status(400).json({ message: "Usuario ja existe" });
      }

      const senha_hash = await bcrypt.hash(senha, 10);

      usuarios.push({
        id: Date.now(),
        name: username,
        email: emailLimpo,
        password_hash: senha_hash,
      });

      await salvarUsuarios(usuarios);
      return res.status(201).json({ message: "Cadastro realizado com sucesso!" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [emailLimpo]
    );

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Usuario ja existe" });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
      [username, emailLimpo, senha_hash]
    );

    res.status(201).json({ message: "Cadastro realizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao cadastrar" });
  }
});


   //LOGIN
   //Recebe email e senha.
   //Busca o usuario e compara a senha digitada com a senha criptografada.
  
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: "E-mail e senha sao obrigatorios" });
  }

  try {
    const emailLimpo = email.trim().toLowerCase();
    let user = null;

    if (usarArquivoLocal) {
      const usuarios = await lerUsuarios();
      user = usuarios.find((usuario) => usuario.email === emailLimpo) || null;
    } else {
      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [emailLimpo]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    }

    if (!user) {
      return res.status(400).json({ message: "E-mail ou senha invalidos" });
    }

    const senhaValida = await bcrypt.compare(senha, user.password_hash);

    if (!senhaValida) {
      return res.status(400).json({ message: "E-mail ou senha invalidos" });
    }
    if (!senhaValida) {
      return res.status(400).json({ message: "E-mail ou senha invalidos" });
    }

    // --- NOVO: GERANDO O TOKEN ---
    const token = Buffer.from(`${user.id}:${user.email}:${SECRET_KEY}`).toString("base64");
    res.json({
      message: "Login realizado com sucesso!",
      token: token, // Envia o token para o front-end
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao tentar logar" });
  }
});



iniciarAutenticacao().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor de login rodando em http://localhost:${PORT}`);
  });
});
