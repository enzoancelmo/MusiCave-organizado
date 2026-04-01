const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path'); // <--- ESTA LINHA ESTAVA FALTANDO!

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "minha_chave_ultra_secreta_123";

// Banco de dados temporário (em memória)
const usuarios = []; 

// ROTA PARA SERVIR O HTML (Faz o localhost:3000 abrir o site)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Permite que o servidor use arquivos estáticos da pasta
app.use(express.static(__dirname));

// ROTA DE CADASTRO
app.post('/cadastro', async (req, res) => {
    const { email, senha } = req.body;
    const usuarioExiste = usuarios.find(u => u.email === email);
    
    if (usuarioExiste) return res.status(400).json({ message: "E-mail já cadastrado!" });

    const senhaHash = await bcrypt.hash(senha, 10);
    usuarios.push({ email, senhaHash });
    
    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
});

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    const usuario = usuarios.find(u => u.email === email);

    if (!usuario) return res.status(401).json({ message: "Usuário não encontrado!" });

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) return res.status(401).json({ message: "Senha incorreta!" });

    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ auth: true, token });
});

// MIDDLEWARE DE VERIFICAÇÃO
function verificarJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: "Token não fornecido." });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).json({ message: "Token inválido ou expirado." });
        req.userEmail = decoded.email;
        next();
    });
}

// ROTA PROTEGIDA
app.get('/perfil', verificarJWT, (req, res) => {
    res.json({ message: `Bem-vindo, ${req.userEmail}!` });
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));  