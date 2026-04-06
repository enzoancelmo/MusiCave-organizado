/* ==========================================================================
   MUSICAVE SERVER - NODE.JS + EXPRESS
   Motor do TCC: Gerencia a coleção de álbuns e as avaliações.
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Configurações de Permissão (CORS) e Limite de Dados (para fotos em Base64)
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* BANCO DE DADOS TEMPORÁRIO (MOCK)
   Os dados ficam salvos aqui enquanto o servidor estiver ligado.
*/
let albums_db = [];

// ==========================================================================
// ROTAS DA API
// ==========================================================================

// 1. [GET] Buscar todos os álbuns
app.get('/api/albums', (req, res) => {
    console.log("🔍 [DB] Enviando coleção para o site...");
    res.status(200).json(albums_db);
});

// 2. [POST] Salvar um novo álbum
app.post('/api/albums', (req, res) => {
    const newAlbum = req.body;
    
    if (!newAlbum.name || !newAlbum.artist) {
        return res.status(400).json({ error: "Nome e Artista são obrigatórios!" });
    }

    console.log(`➕ [DB] Novo álbum cadastrado: ${newAlbum.name}`);
    albums_db.push(newAlbum);
    res.status(201).json({ message: "Álbum salvo com sucesso!", album: newAlbum });
});

// 3. [PUT] Atualizar notas de um álbum (Calcular & Salvar)
app.put('/api/albums/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const index = albums_db.findIndex(a => a.id === id);

    if (index !== -1) {
        albums_db[index] = { ...albums_db[index], ...updatedData };
        console.log(`💾 [DB] Notas sincronizadas para o ID: ${id}`);
        return res.status(200).json({ message: "Avaliação atualizada!" });
    }
    res.status(404).json({ error: "Álbum não encontrado." });
});

// 4. [DELETE] Remover álbum
app.delete('/api/albums/:id', (req, res) => {
    const { id } = req.params;
    albums_db = albums_db.filter(a => a.id !== id);
    console.log(`🗑️ [DB] Álbum removido: ${id}`);
    res.status(200).json({ message: "Removido!" });
});

// INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
    console.log(`
    ====================================================
    🦇 MUSICAVE SERVER IS RUNNING!
    🚀 URL: http://localhost:${PORT}
    📡 Pronto para receber dados do Tiers.html
    ====================================================
    `);
});