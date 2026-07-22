SELECT
  'users' AS table_name,
  COUNT(*) AS total
FROM users
UNION ALL
SELECT 'artists', COUNT(*) FROM artists
UNION ALL
SELECT 'albums', COUNT(*) FROM albums
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'track_ratings', COUNT(*) FROM track_ratings
UNION ALL
SELECT 'playlists', COUNT(*) FROM playlists
UNION ALL
SELECT 'playlist_tracks', COUNT(*) FROM playlist_tracks;

SELECT
  ar.name AS artist,
  a.title AS album,
  a.tier,
  a.tier_score,
  a.concept_rating,
  COUNT(t.id) AS tracks
FROM albums a
JOIN artists ar ON ar.id = a.artist_id
LEFT JOIN tracks t ON t.album_id = a.id
GROUP BY ar.name, a.title, a.tier, a.tier_score, a.concept_rating
ORDER BY a.tier_score DESC;

SELECT
  ar.name AS artist,
  a.title AS album,
  t.track_number,
  t.title AS track,
  r.letra,
  r.beat,
  r.flow,
  r.refrao,
  r.feat,
  r.adlib
FROM tracks t
JOIN albums a ON a.id = t.album_id
JOIN artists ar ON ar.id = a.artist_id
JOIN track_ratings r ON r.track_id = t.id
ORDER BY ar.name, a.title, t.track_number;

SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'users',
  'artists',
  'albums',
  'tracks',
  'track_ratings',
  'playlists',
  'playlist_tracks'
)
ORDER BY table_name, constraint_name;

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'artists',
    'albums',
    'tracks',
    'track_ratings',
    'playlists',
    'playlist_tracks'
  )
ORDER BY tablename, indexname;
