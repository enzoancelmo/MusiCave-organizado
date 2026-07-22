const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const DATABASE_DIR = path.join(__dirname, "..", "database");

const pool = new Pool({
  user: process.env.POSTGRES_USER || "musicave",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "musicave",
  password: process.env.POSTGRES_PASSWORD || "musicave",
  port: Number(process.env.POSTGRES_PORT || 5432),
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(FRONTEND_DIR));

function normalizeRating(value, fallback = 5) {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(10, Math.max(0, number));
}

function normalizeTrack(track = {}, index = 0) {
  const ratings = track.ratings || {};
  const trackNumber = Number(track.trackNumber || track.track_number || index + 1);

  return {
    id: track.id ? String(track.id) : null,
    name: String(track.name || "").trim(),
    trackNumber: Number.isInteger(trackNumber) && trackNumber > 0 ? trackNumber : index + 1,
    ratings: {
      letra: normalizeRating(ratings.letra),
      refrao: normalizeRating(ratings.refrao),
      feat: normalizeRating(ratings.feat),
      beat: normalizeRating(ratings.beat),
      flow: normalizeRating(ratings.flow),
      adlib: normalizeRating(ratings.adlib),
    },
  };
}

function serializeAlbum(row, tracksByAlbumId) {
  return {
    id: String(row.id),
    name: row.name,
    artist: row.artist,
    cover: row.cover || "",
    tierScore: row.tierScore === null ? null : Number(row.tierScore),
    tier: row.tier || null,
    conceptRating: row.conceptRating === null ? 5 : Number(row.conceptRating),
    tracks: tracksByAlbumId.get(String(row.id)) || [],
  };
}

async function ensureDatabase() {
  const schemaPath = path.join(DATABASE_DIR, "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query(schema);
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, database: "offline", error: error.message });
  }
});

app.get("/api/albums", async (req, res) => {
  try {
    const albumsResult = await pool.query(`
      SELECT
        a.id,
        a.title AS name,
        ar.name AS artist,
        a.cover,
        a.tier_score AS "tierScore",
        a.tier,
        a.concept_rating AS "conceptRating"
      FROM albums a
      JOIN artists ar ON ar.id = a.artist_id
      ORDER BY COALESCE(a.tier_score, 0) DESC, a.created_at DESC
    `);

    const albumIds = albumsResult.rows.map((album) => album.id);
    const tracksByAlbumId = new Map();

    if (albumIds.length > 0) {
      const tracksResult = await pool.query(
        `
        SELECT
          t.album_id AS "albumId",
          t.id,
          t.title AS name,
          t.track_number AS "trackNumber",
          COALESCE(r.letra, 5) AS letra,
          COALESCE(r.refrao, 5) AS refrao,
          COALESCE(r.feat, 5) AS feat,
          COALESCE(r.beat, 5) AS beat,
          COALESCE(r.flow, 5) AS flow,
          COALESCE(r.adlib, 5) AS adlib
        FROM tracks t
        LEFT JOIN track_ratings r ON r.track_id = t.id
        WHERE t.album_id = ANY($1::bigint[])
        ORDER BY t.track_number ASC, t.id ASC
        `,
        [albumIds]
      );

      for (const track of tracksResult.rows) {
        const albumId = String(track.albumId);
        const list = tracksByAlbumId.get(albumId) || [];

        list.push({
          id: String(track.id),
          name: track.name,
          trackNumber: Number(track.trackNumber),
          ratings: {
            letra: Number(track.letra),
            refrao: Number(track.refrao),
            feat: Number(track.feat),
            beat: Number(track.beat),
            flow: Number(track.flow),
            adlib: Number(track.adlib),
          },
        });

        tracksByAlbumId.set(albumId, list);
      }
    }

    res.json(albumsResult.rows.map((album) => serializeAlbum(album, tracksByAlbumId)));
  } catch (error) {
    console.error("Erro ao buscar albuns:", error);
    res.status(500).json({ error: "Nao foi possivel carregar os albuns." });
  }
});

app.post("/api/albums", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const artist = String(req.body.artist || "").trim();
  const cover = req.body.cover || "";
  const conceptRating = normalizeRating(req.body.conceptRating);
  const tracks = Array.isArray(req.body.tracks)
    ? req.body.tracks.map((track, index) => normalizeTrack(track, index)).filter((track) => track.name)
    : [];

  if (!name || !artist) {
    return res.status(400).json({ error: "Informe o nome do album e do artista." });
  }

  if (tracks.length === 0) {
    return res.status(400).json({ error: "Informe pelo menos uma faixa." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let artistResult = await client.query(
      "SELECT id FROM artists WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [artist]
    );

    if (artistResult.rows.length === 0) {
      artistResult = await client.query("INSERT INTO artists(name) VALUES ($1) RETURNING id", [artist]);
    }

    const albumResult = await client.query(
      `
      INSERT INTO albums (artist_id, title, cover, concept_rating)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [artistResult.rows[0].id, name, cover, conceptRating]
    );

    const albumId = albumResult.rows[0].id;

    for (const track of tracks) {
      const trackResult = await client.query(
        "INSERT INTO tracks (album_id, track_number, title) VALUES ($1, $2, $3) RETURNING id",
        [albumId, track.trackNumber, track.name]
      );

      await client.query(
        `
        INSERT INTO track_ratings (track_id, letra, beat, flow, refrao, feat, adlib)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          trackResult.rows[0].id,
          track.ratings.letra,
          track.ratings.beat,
          track.ratings.flow,
          track.ratings.refrao,
          track.ratings.feat,
          track.ratings.adlib,
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, albumId: String(albumId) });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(400).json({ error: "Este album ou esta ordem de faixas ja existe no banco." });
    }

    console.error("Erro ao salvar album:", error);
    res.status(500).json({ error: "Nao foi possivel salvar o album." });
  } finally {
    client.release();
  }
});

app.put("/api/albums/:id", async (req, res) => {
  const albumId = req.params.id;
  const tierScore = req.body.tierScore === null ? null : normalizeRating(req.body.tierScore, null);
  const tier = req.body.tier || null;
  const conceptRating = normalizeRating(req.body.conceptRating);
  const tracks = Array.isArray(req.body.tracks)
    ? req.body.tracks.map((track, index) => normalizeTrack(track, index)).filter((track) => track.name)
    : [];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const albumResult = await client.query(
      `
      UPDATE albums
      SET tier_score = $1, tier = $2, concept_rating = $3
      WHERE id = $4
      RETURNING id
      `,
      [tierScore, tier, conceptRating, albumId]
    );

    if (albumResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Album nao encontrado." });
    }

    for (const track of tracks) {
      const trackResult = track.id
        ? await client.query("SELECT id FROM tracks WHERE id = $1 AND album_id = $2", [track.id, albumId])
        : await client.query("SELECT id FROM tracks WHERE title = $1 AND album_id = $2 LIMIT 1", [track.name, albumId]);

      if (trackResult.rows.length === 0) continue;

      await client.query(
        `
        INSERT INTO track_ratings (track_id, letra, beat, flow, refrao, feat, adlib)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (track_id)
        DO UPDATE SET
          letra = EXCLUDED.letra,
          beat = EXCLUDED.beat,
          flow = EXCLUDED.flow,
          refrao = EXCLUDED.refrao,
          feat = EXCLUDED.feat,
          adlib = EXCLUDED.adlib
        `,
        [
          trackResult.rows[0].id,
          track.ratings.letra,
          track.ratings.beat,
          track.ratings.flow,
          track.ratings.refrao,
          track.ratings.feat,
          track.ratings.adlib,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Avaliacao salva com sucesso." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar album:", error);
    res.status(500).json({ error: "Nao foi possivel atualizar o album." });
  } finally {
    client.release();
  }
});

app.delete("/api/albums/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM tracks WHERE album_id = $1", [req.params.id]);
    const result = await client.query("DELETE FROM albums WHERE id = $1", [req.params.id]);
    await client.query("COMMIT");

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Album nao encontrado." });
    }

    res.json({ message: "Album removido com sucesso." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao remover album:", error);
    res.status(500).json({ error: "Nao foi possivel remover o album." });
  } finally {
    client.release();
  }
});

app.post("/api/register", async (req, res) => {
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
});

app.post("/api/login", async (req, res) => {
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

    res.json({
      message: "Login realizado com sucesso.",
      token: crypto.randomBytes(24).toString("hex"),
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
});

app.post("/cadastro", (req, res) => {
  req.url = "/api/register";
  app.handle(req, res);
});

app.post("/login", (req, res) => {
  req.url = "/api/login";
  app.handle(req, res);
});

async function start() {
  try {
    await ensureDatabase();
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`MusiCave rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Nao foi possivel iniciar o MusiCave:", error.message);
    process.exit(1);
  }
}

start();
