CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  recovery_token TEXT,
  recovery_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS albums (
  id BIGSERIAL PRIMARY KEY,
  artist_id BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover TEXT,
  tier_score DECIMAL(4,2),
  tier CHAR(1),
  concept_rating DECIMAL(3,1) NOT NULL DEFAULT 5,
  release_year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id BIGSERIAL PRIMARY KEY,
  album_id BIGINT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INT NOT NULL,
  duration_sec INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS track_ratings (
  track_id BIGINT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  letra DECIMAL(3,1) NOT NULL DEFAULT 5,
  beat DECIMAL(3,1) NOT NULL DEFAULT 5,
  flow DECIMAL(3,1) NOT NULL DEFAULT 5,
  refrao DECIMAL(3,1) NOT NULL DEFAULT 5,
  feat DECIMAL(3,1) NOT NULL DEFAULT 5,
  adlib DECIMAL(3,1) NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS playlists (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id BIGINT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS track_number INT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS duration_sec INT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS tier_score DECIMAL(4,2);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS tier CHAR(1);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS concept_rating DECIMAL(3,1) DEFAULT 5;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS release_year INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_requested_at TIMESTAMPTZ;
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS position INT;

WITH numbered_tracks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY album_id ORDER BY id) AS generated_number
  FROM tracks
  WHERE track_number IS NULL
)
UPDATE tracks t
SET track_number = numbered_tracks.generated_number
FROM numbered_tracks
WHERE t.id = numbered_tracks.id;

ALTER TABLE albums ALTER COLUMN concept_rating SET DEFAULT 5;
UPDATE albums SET concept_rating = 5 WHERE concept_rating IS NULL;
ALTER TABLE albums ALTER COLUMN concept_rating SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN track_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_name_not_blank') THEN
    ALTER TABLE users ADD CONSTRAINT users_name_not_blank CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_not_blank') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_not_blank CHECK (btrim(email) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artists_name_not_blank') THEN
    ALTER TABLE artists ADD CONSTRAINT artists_name_not_blank CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_title_not_blank') THEN
    ALTER TABLE albums ADD CONSTRAINT albums_title_not_blank CHECK (btrim(title) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_concept_rating_range') THEN
    ALTER TABLE albums ADD CONSTRAINT albums_concept_rating_range CHECK (concept_rating BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_tier_score_range') THEN
    ALTER TABLE albums ADD CONSTRAINT albums_tier_score_range CHECK (tier_score IS NULL OR tier_score BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_tier_valid') THEN
    ALTER TABLE albums ADD CONSTRAINT albums_tier_valid CHECK (tier IS NULL OR tier IN ('S', 'A', 'B', 'C', 'D'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_release_year_range') THEN
    ALTER TABLE albums ADD CONSTRAINT albums_release_year_range CHECK (release_year IS NULL OR release_year BETWEEN 1900 AND 2100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_title_not_blank') THEN
    ALTER TABLE tracks ADD CONSTRAINT tracks_title_not_blank CHECK (btrim(title) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_track_number_positive') THEN
    ALTER TABLE tracks ADD CONSTRAINT tracks_track_number_positive CHECK (track_number > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_duration_positive') THEN
    ALTER TABLE tracks ADD CONSTRAINT tracks_duration_positive CHECK (duration_sec IS NULL OR duration_sec > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_letra_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_letra_range CHECK (letra BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_beat_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_beat_range CHECK (beat BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_flow_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_flow_range CHECK (flow BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_refrao_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_refrao_range CHECK (refrao BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_feat_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_feat_range CHECK (feat BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_ratings_adlib_range') THEN
    ALTER TABLE track_ratings ADD CONSTRAINT track_ratings_adlib_range CHECK (adlib BETWEEN 0 AND 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlists_name_not_blank') THEN
    ALTER TABLE playlists ADD CONSTRAINT playlists_name_not_blank CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_tracks_position_positive') THEN
    ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_position_positive CHECK (position IS NULL OR position > 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_lower_email ON users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_artists_lower_name ON artists(LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_albums_artist_lower_title ON albums(artist_id, LOWER(title));
CREATE UNIQUE INDEX IF NOT EXISTS uq_tracks_album_track_number ON tracks(album_id, track_number);
