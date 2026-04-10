-- musicc/db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artists (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS albums (
  id          BIGSERIAL PRIMARY KEY,
  artist_id   BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  release_year INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id          BIGSERIAL PRIMARY KEY,
  album_id    BIGINT REFERENCES albums(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  duration_sec INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlists (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id BIGINT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    BIGINT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);
-- Adicionando suporte para avaliações e capas no banco, gobbo, ou xavier, quando forem fazer prestem atenção e testem, voces subiram no git sem tabela de nota nem tabela de tier, como um sistema de tier funciona sem a tabela de tier? é um milagre?
ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS tier_score DECIMAL(4,2);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS tier CHAR(1);

-- Tabela para salvar as notas detalhadas de cada faixa
CREATE TABLE IF NOT EXISTS track_ratings (
    track_id BIGINT REFERENCES tracks(id) ON DELETE CASCADE,
    letra DECIMAL(3,1),
    beat DECIMAL(3,1),
    flow DECIMAL(3,1),
    refrao DECIMAL(3,1),
    feat DECIMAL(3,1),
    adlib DECIMAL(3,1),
    PRIMARY KEY (track_id)
);