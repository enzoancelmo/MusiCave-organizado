/* ==========================================================================
   MUSICAVE SERVER - NODE.JS + EXPRESS (DATABASE INTEGRATED)
   Motor do TCC: Gerencia usuários, coleção de álbuns e avaliações no Docker.
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importa a conexão com o Postgres
const app = express();
const PORT = 3000;

// Configurações de Permissão e Limite de Dados
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============= CONEXÃO COM O BANCO (DOCKER) =============
const pool = new Pool({
    user: 'musicave',
    host: 'localhost',
    database: 'musicave',
    password: 'musicave',
    port: 5432,
});

// Teste de conexão inicial
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error("❌ Erro ao conectar no Postgres (Docker):", err.message);
    else console.log("🐘 Conectado ao PostgreSQL no Docker com sucesso!");
});

// ==========================================================================
// ROTAS DA API (Sincronizadas com o Tiers.html)
// ==========================================================================

// 1. [GET] Buscar todos os álbuns (Busca no Banco Real)
app.get('/api/albums', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM albums ORDER BY created_at DESC');
        console.log("🔍 [DB] Enviando coleção do banco para o site...");
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. [POST] Salvar um novo álbum
app.post('/api/albums', async (req, res) => {
    const { id, name, artist, cover, tracks } = req.body;
    
    if (!name || !artist) {
        return res.status(400).json({ error: "Nome e Artista são obrigatórios!" });
    }

    try {
        // Insere o álbum no banco (usando as colunas do schema dos seus parceiros)
        const query = 'INSERT INTO albums (id, title, artist_id, cover, tracks_data) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        // Nota: 'tracks_data' é onde salvaremos o JSON das faixas por enquanto
        const values = [id, name, artist, cover, JSON.stringify(tracks)];
        
        await pool.query(query, values);
        console.log(`➕ [DB] Novo álbum imortalizado: ${name}`);
        res.status(201).json({ message: "Salvo no Banco!", album: name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar no banco!" });
    }
});

// 3. [PUT] Atualizar notas de um álbum (Calcular & Salvar)
app.put('/api/albums/:id', async (req, res) => {
    const { id } = req.params;
    const { tierScore, tier, tracks, conceptRating } = req.body;

    try {
        const query = `
            UPDATE albums 
            SET tier_score = $1, tier = $2, tracks_data = $3, concept_rating = $4 
            WHERE id = $5`;
        const values = [tierScore, tier, JSON.stringify(tracks), conceptRating, id];
        
        await pool.query(query, values);
        console.log(`💾 [DB] Notas sincronizadas no banco para o ID: ${id}`);
        res.status(200).json({ message: "Avaliação salva permanentemente!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar banco." });
    }
});

// 4. [DELETE] Remover álbum
app.delete('/api/albums/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM albums WHERE id = $1', [id]);
        console.log(`🗑️ [DB] Álbum removido do banco: ${id}`);
        res.status(200).json({ message: "Removido!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao deletar." });
    }
});

// ==========================================================================
// ROTAS DE USUÁRIO (LOGIN E CADASTRO - NOVO!)
// ==========================================================================

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name',
            [name, email, password]
        );
        console.log(`👤 Usuário criado: ${name}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: "Email já existe!" });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, name FROM users WHERE email = $1 AND password_hash = $2',
            [email, password]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: "Credenciais incorretas" });
        }
    } catch (err) {
        res.status(500).json({ error: "Erro no login" });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
    console.log(`
    ====================================================
    🦇 MUSICAVE SERVER IS RUNNING (WITH DOCKER DB)!
    🚀 URL: http://localhost:${PORT}
    📡 Pronto para receber dados e imortalizar no banco.
    ====================================================
    `);
});