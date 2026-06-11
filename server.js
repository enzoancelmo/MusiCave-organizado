/* 
npm i pg cors  express  bcrypt usaaaa issoooo
==========================================================================
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

        const result = await pool.query(`
            SELECT
                a.id,
                a.title AS name,
                ar.name AS artist,
                a.cover,
                a.tier_score AS "tierScore",
                a.tier,
                a.concept_rating AS "conceptRating"
            FROM albums a
            JOIN artists ar
                ON ar.id = a.artist_id
            ORDER BY a.created_at DESC
        `);

        res.status(200).json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });
    }
});

// 2. [POST] Salvar um novo álbum
app.post('/api/albums', async (req, res) => {

    const {
        name,
        artist,
        cover,
        tracks,
        conceptRating
    } = req.body;

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        let artistResult = await client.query(
            'SELECT id FROM artists WHERE name = $1',
            [artist]
        );

        let artistId;

        if (artistResult.rows.length === 0) {

            artistResult = await client.query(
                `
                INSERT INTO artists(name)
                VALUES ($1)
                RETURNING id
                `,
                [artist]
            );

            artistId = artistResult.rows[0].id;

        } else {

            artistId = artistResult.rows[0].id;
        }

        const albumResult = await client.query(
            `
            INSERT INTO albums
            (
                artist_id,
                title,
                cover,
                concept_rating
            )
            VALUES ($1,$2,$3,$4)
            RETURNING id
            `,
            [
                artistId,
                name,
                cover,
                conceptRating || 5
            ]
        );

        const albumId = albumResult.rows[0].id;

        for (const track of tracks) {

            const trackResult = await client.query(
                `
                INSERT INTO tracks
                (
                    album_id,
                    title
                )
                VALUES ($1,$2)
                RETURNING id
                `,
                [
                    albumId,
                    track.name
                ]
            );

            const trackId = trackResult.rows[0].id;

            await client.query(
                `
                INSERT INTO track_ratings
                (
                    track_id,
                    letra,
                    beat,
                    flow,
                    refrao,
                    feat,
                    adlib
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                `,
                [
                    trackId,
                    track.ratings.letra,
                    track.ratings.beat,
                    track.ratings.flow,
                    track.ratings.refrao,
                    track.ratings.feat,
                    track.ratings.adlib
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            albumId
        });

    } catch (err) {

        await client.query('ROLLBACK');

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    } finally {

        client.release();
    }
});

// 3. [PUT] Atualizar notas de um álbum (Calcular & Salvar)
app.put('/api/albums/:id', async (req, res) => {

    const { id } = req.params;

    const {
        tierScore,
        tier,
        conceptRating,
        tracks
    } = req.body;

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        await client.query(
            `
            UPDATE albums
            SET
                tier_score = $1,
                tier = $2,
                concept_rating = $3
            WHERE id = $4
            `,
            [
                tierScore,
                tier,
                conceptRating,
                id
            ]
        );

        for (const track of tracks) {

            const trackResult = await client.query(
                `
                SELECT id
                FROM tracks
                WHERE album_id = $1
                AND title = $2
                `,
                [
                    id,
                    track.name
                ]
            );

            if (trackResult.rows.length === 0) {
                continue;
            }

            const trackId = trackResult.rows[0].id;

            await client.query(
                `
                UPDATE track_ratings
                SET
                    letra = $1,
                    beat = $2,
                    flow = $3,
                    refrao = $4,
                    feat = $5,
                    adlib = $6
                WHERE track_id = $7
                `,
                [
                    track.ratings.letra,
                    track.ratings.beat,
                    track.ratings.flow,
                    track.ratings.refrao,
                    track.ratings.feat,
                    track.ratings.adlib,
                    trackId
                ]
            );
        }

        await client.query('COMMIT');

        console.log(`💾 [DB] Álbum ${id} atualizado`);

        res.status(200).json({
            message: "Avaliação salva permanentemente!"
        });

    } catch (err) {

        await client.query('ROLLBACK');

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    } finally {

        client.release();
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