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

function groupTracksByAlbumId(rows) {
  const tracksByAlbumId = new Map();

  for (const track of rows) {
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

  return tracksByAlbumId;
}

module.exports = {
  serializeAlbum,
  groupTracksByAlbumId,
};
