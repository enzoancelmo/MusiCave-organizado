const pool = require("../db/pool");
const { serializeAlbum, groupTracksByAlbumId } = require("../utils/albums");
const { normalizeRating, normalizeTrack } = require("../utils/ratings");

async function listAlbums(req, res) {
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
    let tracksByAlbumId = new Map();

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

      tracksByAlbumId = groupTracksByAlbumId(tracksResult.rows);
    }

    res.json(albumsResult.rows.map((album) => serializeAlbum(album, tracksByAlbumId)));
  } catch (error) {
    console.error("Erro ao buscar albuns:", error);
    res.status(500).json({ error: "Nao foi possivel carregar os albuns." });
  }
}

async function createAlbum(req, res) {
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
}

async function updateAlbum(req, res) {
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
}

async function deleteAlbum(req, res) {
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
}

module.exports = {
  listAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
};
