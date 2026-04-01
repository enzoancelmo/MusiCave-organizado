
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = mysql.createPool({
  host: "localhost",    
  user: "root",        
  password: "",     
  database: "musicc"       
}).promise();

app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

app.post("/login", async (req, res) => { 
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios" });
    }

    try {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "E-mail ou senha inválidos" });
        }

        const user = rows[0];

         if (!user.password_hash) {
            return res.status(400).json({ message: "Conta inválida" });
        }

        const senhaValida = await bcrypt.compare(senha, user.password_hash);

        if (!senhaValida) {
            return res.status(400).json({ message: "E-mail ou senha inválidos" });
        }

        res.json({message: "Login realizado com sucesso!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao tentar logar" });
    }
});

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});