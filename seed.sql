INSERT INTO artists (name)
SELECT 'Daft Punk'
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name='Daft Punk');