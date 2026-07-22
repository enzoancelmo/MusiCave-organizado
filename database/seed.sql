INSERT INTO users (name, email, password_hash)
VALUES (
  'Usuario Teste',
  'teste@musicave.local',
  '$2a$10$J24YV4ry8nf/Xz53IFc.C.RA3e0DfHT27L9Wv.VIc7xd2BprvDn4C'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO artists (name)
VALUES
  ('Daft Punk'),
  ('Travis Scott'),
  ('Kendrick Lamar')
ON CONFLICT DO NOTHING;

WITH artist_ref AS (
  SELECT id, name FROM artists WHERE name IN ('Daft Punk', 'Travis Scott', 'Kendrick Lamar')
),
inserted_albums AS (
  INSERT INTO albums (artist_id, title, release_year, concept_rating, tier_score, tier)
  VALUES
    ((SELECT id FROM artist_ref WHERE name = 'Daft Punk'), 'Discovery', 2001, 9.5, 9.31, 'S'),
    ((SELECT id FROM artist_ref WHERE name = 'Travis Scott'), 'ASTROWORLD', 2018, 8.5, 8.29, 'A'),
    ((SELECT id FROM artist_ref WHERE name = 'Kendrick Lamar'), 'DAMN.', 2017, 9.0, 8.88, 'A')
  ON CONFLICT DO NOTHING
  RETURNING id, title
),
all_albums AS (
  SELECT id, title FROM inserted_albums
  UNION
  SELECT id, title FROM albums WHERE title IN ('Discovery', 'ASTROWORLD', 'DAMN.')
),
tracks_to_insert AS (
  SELECT (SELECT id FROM all_albums WHERE title = 'Discovery') AS album_id, 1 AS track_number, 'One More Time' AS title, 9.5 AS letra, 10.0 AS beat, 9.0 AS flow, 9.5 AS refrao, 8.0 AS feat, 9.0 AS adlib
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'Discovery'), 2, 'Aerodynamic', 8.0, 9.5, 8.5, 8.0, 7.5, 9.0
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'Discovery'), 3, 'Digital Love', 9.0, 9.5, 8.5, 9.5, 8.0, 8.5
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'ASTROWORLD'), 1, 'STARGAZING', 8.0, 9.0, 8.5, 8.0, 7.5, 8.0
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'ASTROWORLD'), 2, 'SICKO MODE', 8.5, 9.5, 9.0, 8.5, 9.0, 8.5
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'ASTROWORLD'), 3, 'STOP TRYING TO BE GOD', 8.0, 8.5, 8.0, 8.5, 8.0, 8.0
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'DAMN.'), 1, 'DNA.', 9.5, 9.0, 9.5, 8.5, 7.5, 8.0
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'DAMN.'), 2, 'HUMBLE.', 8.5, 9.0, 9.0, 9.0, 7.5, 8.0
  UNION ALL SELECT (SELECT id FROM all_albums WHERE title = 'DAMN.'), 3, 'LOVE.', 8.5, 8.5, 8.5, 9.0, 8.0, 8.0
),
inserted_tracks AS (
  INSERT INTO tracks (album_id, track_number, title)
  SELECT album_id, track_number, title
  FROM tracks_to_insert
  ON CONFLICT (album_id, track_number) DO NOTHING
  RETURNING id, album_id, track_number
),
all_tracks AS (
  SELECT id, album_id, track_number FROM inserted_tracks
  UNION
  SELECT t.id, t.album_id, t.track_number
  FROM tracks t
  JOIN all_albums a ON a.id = t.album_id
)
INSERT INTO track_ratings (track_id, letra, beat, flow, refrao, feat, adlib)
SELECT
  all_tracks.id,
  tracks_to_insert.letra,
  tracks_to_insert.beat,
  tracks_to_insert.flow,
  tracks_to_insert.refrao,
  tracks_to_insert.feat,
  tracks_to_insert.adlib
FROM tracks_to_insert
JOIN all_tracks
  ON all_tracks.album_id = tracks_to_insert.album_id
 AND all_tracks.track_number = tracks_to_insert.track_number
ON CONFLICT (track_id)
DO UPDATE SET
  letra = EXCLUDED.letra,
  beat = EXCLUDED.beat,
  flow = EXCLUDED.flow,
  refrao = EXCLUDED.refrao,
  feat = EXCLUDED.feat,
  adlib = EXCLUDED.adlib;

WITH test_user AS (
  SELECT id FROM users WHERE email = 'teste@musicave.local'
),
playlist AS (
  INSERT INTO playlists (user_id, name)
  SELECT id, 'Favoritas do TCC'
  FROM test_user
  WHERE NOT EXISTS (
    SELECT 1
    FROM playlists p
    WHERE p.user_id = (SELECT id FROM test_user)
      AND p.name = 'Favoritas do TCC'
  )
  RETURNING id
),
playlist_ref AS (
  SELECT id FROM playlist
  UNION
  SELECT p.id
  FROM playlists p
  JOIN test_user u ON u.id = p.user_id
  WHERE p.name = 'Favoritas do TCC'
),
favorite_tracks AS (
  SELECT t.id, ROW_NUMBER() OVER (ORDER BY a.title, t.track_number) AS position
  FROM tracks t
  JOIN albums a ON a.id = t.album_id
  WHERE t.title IN ('One More Time', 'SICKO MODE', 'DNA.')
)
INSERT INTO playlist_tracks (playlist_id, track_id, position)
SELECT (SELECT id FROM playlist_ref LIMIT 1), id, position
FROM favorite_tracks
ON CONFLICT (playlist_id, track_id)
DO UPDATE SET position = EXCLUDED.position;
