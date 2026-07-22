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

module.exports = {
  normalizeRating,
  normalizeTrack,
};
