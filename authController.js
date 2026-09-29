const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { jwtConfig } = require("../config/env");

async function register(req, res) {
  const name = String(req.body.name || req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || req.body.senha || "");

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ message: "Informe nome, email e senha com pelo menos 8 caracteres." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );

    res.status(201).json({
      message: "Cadastro realizado com sucesso.",
      user: {
        id: String(result.rows[0].id),
        name: result.rows[0].name,
        email: result.rows[0].email,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Este email ja esta cadastrado." });
    }

    console.error("Erro no cadastro:", error);
    res.status(500).json({ message: "Nao foi possivel realizar o cadastro." });
  }
}

async function login(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || req.body.senha || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha sao obrigatorios." });
  }

  try {
    const result = await pool.query("SELECT id, name, email, password_hash FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Email ou senha invalidos." });
    }

    const token = jwt.sign(
      { id: String(user.id), email: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      message: "Login realizado com sucesso.",
      token,
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Nao foi possivel realizar o login." });
  }
}

module.exports = {
  register,
  login,
};