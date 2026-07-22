const API_URL = "/api/albums";
const ATTRIBUTE_WEIGHTS = { letra: 3, refrao: 3, feat: 2, beat: 2, flow: 1, adlib: 1 };
const ATTRIBUTE_LABELS = {
  letra: "Letra",
  refrao: "Refrao",
  feat: "Feat",
  beat: "Beat",
  flow: "Flow",
  adlib: "Adlib",
};
const CONCEPT_WEIGHT = 1;
const TRACKS_WEIGHT = 5;

let albums = [];
let currentAlbumId = null;
let coverBase64 = "";

const elements = {};

function initTiersPage() {
  elements.homeView = document.getElementById("homeView");
  elements.evalView = document.getElementById("evalView");
  elements.albumForm = document.getElementById("albumForm");
  elements.tierList = document.getElementById("tierList");
  elements.coverUpload = document.getElementById("coverUpload");
  elements.coverPreview = document.getElementById("coverPreview");
  elements.clearCover = document.getElementById("clearCover");
  elements.calculateBtn = document.getElementById("calculateBtn");
  elements.exportImageBtn = document.getElementById("exportImageBtn");
  elements.conceptSlider = document.getElementById("conceptSlider");
  elements.backBtn = document.getElementById("backBtn");

  if (!elements.albumForm || !elements.tierList) return;

  elements.albumForm.addEventListener("submit", handleAlbumSubmit);
  elements.coverUpload.addEventListener("change", handleCoverUpload);
  elements.clearCover.addEventListener("click", clearCover);
  elements.calculateBtn.addEventListener("click", saveEvaluation);
  elements.exportImageBtn.addEventListener("click", exportReviewImage);
  elements.conceptSlider.addEventListener("input", updateConceptDisplay);
  elements.backBtn.addEventListener("click", backToList);

  loadAlbums();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Erro na requisicao.");
  }

  return data;
}

async function loadAlbums() {
  try {
    albums = await requestJson(API_URL);
    renderTierList();
  } catch (error) {
    console.error(error);
    showToast("Erro de conexao", error.message, "error");
  }
}

async function saveAlbum(album, method = "POST") {
  const url = method === "PUT" ? `${API_URL}/${album.id}` : API_URL;

  return requestJson(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(album),
  });
}

function calculateTrackScore(track) {
  const ratings = track.ratings || {};
  const totalWeight = Object.values(ATTRIBUTE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const weightedSum = Object.entries(ATTRIBUTE_WEIGHTS).reduce((sum, [attribute, weight]) => {
    return sum + Number(ratings[attribute] || 0) * weight;
  }, 0);

  return weightedSum / totalWeight;
}

function calculateTierScore(album) {
  if (!album.tracks || album.tracks.length === 0) return Number(album.conceptRating || 5);

  const trackScores = album.tracks.map(calculateTrackScore);
  const avgTrackScore = trackScores.reduce((sum, score) => sum + score, 0) / trackScores.length;
  const totalWeight = CONCEPT_WEIGHT + TRACKS_WEIGHT;
  const score = (Number(album.conceptRating || 5) * CONCEPT_WEIGHT + avgTrackScore * TRACKS_WEIGHT) / totalWeight;

  return Math.round(score * 100) / 100;
}

function getTierFromScore(score) {
  if (score >= 9) return "S";
  if (score >= 7.5) return "A";
  if (score >= 6) return "B";
  if (score >= 4) return "C";
  return "D";
}

function getTierClass(tier) {
  return `tier-${String(tier || "d").toLowerCase()}`;
}

function getNoteColorClass(value) {
  const score = Number(value || 0);
  if (score >= 9) return "note-s";
  if (score >= 7.5) return "note-a";
  if (score >= 6) return "note-b";
  if (score >= 4) return "note-c";
  return "note-d";
}

function renderTierList() {
  const sortedAlbums = [...albums].sort((a, b) => Number(b.tierScore || 0) - Number(a.tierScore || 0));

  if (sortedAlbums.length === 0) {
    elements.tierList.innerHTML = '<div class="glass-card empty-state"><h3>Nenhum album ainda</h3></div>';
    return;
  }

  elements.tierList.innerHTML = sortedAlbums
    .map((album, index) => {
      const cover = album.cover
        ? `<img src="${escapeAttr(album.cover)}" class="album-cover" alt="Capa de ${escapeAttr(album.name)}">`
        : '<div class="album-cover-placeholder">♪</div>';
      const tier = album.tier
        ? `<div class="tier-badge ${getTierClass(album.tier)}">${escapeHtml(album.tier)}</div>`
        : '<span class="not-rated">Pendente</span>';

      return `
        <div class="glass-card album-card fade-in">
          <span class="album-rank">#${index + 1}</span>
          ${cover}
          <div class="album-info">
            <div class="album-name">${escapeHtml(album.name)}</div>
            <div class="album-artist">${escapeHtml(album.artist)}</div>
          </div>
          <div class="album-actions">
            ${tier}
            <button class="btn-login compact-btn" type="button" onclick="openEvaluation('${escapeAttr(album.id)}')">Avaliar</button>
            <button class="btn-contact danger-btn" type="button" onclick="openDeleteModal('${escapeAttr(album.id)}')">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEvaluation() {
  const album = getCurrentAlbum();
  if (!album) return;

  document.getElementById("evalAlbumName").textContent = album.name;
  document.getElementById("evalArtistName").textContent = album.artist;
  document.getElementById("evalCover").src = album.cover || "";

  const conceptValue = Number(album.conceptRating || 5);
  elements.conceptSlider.value = conceptValue;
  setConceptValue(conceptValue);

  const tracksEl = document.getElementById("tracksEvaluation");

  tracksEl.innerHTML = album.tracks
    .map((track, index) => {
      const trackScore = calculateTrackScore(track);

      return `
        <div class="track-card">
          <div class="track-card-header">
            <div class="track-name"><strong>${track.trackNumber || index + 1}. ${escapeHtml(track.name)}</strong></div>
            <span id="trackScore_${index}" class="note-indicator ${getNoteColorClass(trackScore)}">
              Nota: ${trackScore.toFixed(1)}
            </span>
          </div>
          <div class="track-ratings-grid">
            ${Object.keys(ATTRIBUTE_WEIGHTS)
              .map((attribute) => {
                const value = Number(track.ratings[attribute] || 5);

                return `
                  <div class="input-group">
                    <div class="rating-label-row">
                      <label>${ATTRIBUTE_LABELS[attribute]}</label>
                      <span class="note-indicator ${getNoteColorClass(value)}" id="val_${index}_${attribute}">
                        ${value.toFixed(1)}
                      </span>
                    </div>
                    <input type="range" min="0" max="10" step="0.5" value="${value}"
                      oninput="updateLiveRating(this, ${index}, '${attribute}')">
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

async function handleAlbumSubmit(event) {
  event.preventDefault();

  const trackNames = document
    .getElementById("tracklist")
    .value.split("\n")
    .map((track) => track.trim())
    .filter(Boolean);

  const album = {
    name: document.getElementById("albumName").value.trim(),
    artist: document.getElementById("artistName").value.trim(),
    cover: coverBase64,
    tracks: trackNames.map((name, index) => ({
      name,
      trackNumber: index + 1,
      ratings: { letra: 5, refrao: 5, feat: 5, beat: 5, flow: 5, adlib: 5 },
    })),
    conceptRating: 5,
    tierScore: null,
    tier: null,
  };

  try {
    await saveAlbum(album);
    elements.albumForm.reset();
    clearCover();
    await loadAlbums();
    showToast("Album adicionado", "A colecao foi atualizada.");
  } catch (error) {
    console.error(error);
    showToast("Erro ao salvar", error.message, "error");
  }
}

function handleCoverUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    coverBase64 = reader.result;
    elements.coverPreview.src = coverBase64;
    elements.coverPreview.classList.remove("hidden");
    elements.clearCover.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function clearCover() {
  coverBase64 = "";
  elements.coverUpload.value = "";
  elements.coverPreview.src = "";
  elements.coverPreview.classList.add("hidden");
  elements.clearCover.classList.add("hidden");
}

async function saveEvaluation() {
  const album = getCurrentAlbum();
  if (!album) return;

  album.conceptRating = Number(elements.conceptSlider.value);
  album.tierScore = calculateTierScore(album);
  album.tier = getTierFromScore(album.tierScore);

  try {
    await saveAlbum(album, "PUT");
    showToast(`Nota: ${album.tierScore.toFixed(2)}`, `Album classificado como Tier ${album.tier}.`);
  } catch (error) {
    console.error(error);
    showToast("Erro ao salvar", error.message, "error");
  }
}

async function exportReviewImage() {
  const album = getCurrentAlbum();
  if (!album) return;

  document.getElementById("storyAlbumName").textContent = album.name;
  document.getElementById("storyArtistName").textContent = album.artist;
  document.getElementById("storyCover").src = album.cover || "";
  document.getElementById("storyScore").textContent = album.tierScore ? Number(album.tierScore).toFixed(2) : "N/A";

  const tierBadge = document.getElementById("storyTierBadge");
  tierBadge.textContent = album.tier || "?";
  tierBadge.className = `tier-badge ${getTierClass(album.tier)}`;

  const topTracks = [...album.tracks]
    .map((track) => ({ name: track.name, score: calculateTrackScore(track) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  document.getElementById("storyFaixas").innerHTML = topTracks
    .map(
      (track, index) => `
        <div class="story-track-row">
          <span><strong>${index + 1}.</strong> ${escapeHtml(track.name)}</span>
          <span>${track.score.toFixed(1)}</span>
        </div>
      `
    )
    .join("");

  const storyEl = document.getElementById("storyContainer");
  storyEl.classList.remove("hidden");

  try {
    if (!window.html2canvas) throw new Error("Biblioteca de exportacao nao carregada.");

    const canvas = await window.html2canvas(storyEl, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: "#0d0a14",
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 1);
    link.download = `MusiCave_${sanitizeFileName(album.name)}.jpg`;
    link.click();
  } catch (error) {
    console.error(error);
    showToast("Erro ao gerar imagem", error.message, "error");
  } finally {
    storyEl.classList.add("hidden");
  }
}

function updateConceptDisplay(event) {
  setConceptValue(Number(event.target.value));
}

function setConceptValue(value) {
  const display = document.getElementById("conceptValue");
  display.textContent = value.toFixed(1);
  display.className = `slider-value note-indicator ${getNoteColorClass(value)}`;
}

function backToList() {
  elements.homeView.classList.remove("hidden");
  elements.evalView.classList.add("hidden");
  loadAlbums();
}

function getCurrentAlbum() {
  return albums.find((album) => String(album.id) === String(currentAlbumId));
}

function showToast(title, message) {
  alert(`${title}: ${message}`);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function sanitizeFileName(text) {
  return String(text || "album").replace(/[<>:"/\\|?*]+/g, "_").trim();
}

window.openEvaluation = function openEvaluation(id) {
  currentAlbumId = String(id);
  elements.homeView.classList.add("hidden");
  elements.evalView.classList.remove("hidden");
  renderEvaluation();
};

window.openDeleteModal = async function openDeleteModal(id) {
  const album = albums.find((item) => String(item.id) === String(id));
  if (!album) return;

  const confirmed = confirm(`Remover "${album.name}" da colecao?`);
  if (!confirmed) return;

  try {
    await requestJson(`${API_URL}/${album.id}`, { method: "DELETE" });
    albums = albums.filter((item) => String(item.id) !== String(album.id));
    renderTierList();
    showToast("Album removido", "A colecao foi atualizada.");
  } catch (error) {
    console.error(error);
    showToast("Erro ao remover", error.message, "error");
  }
};

window.updateLiveRating = function updateLiveRating(input, trackIndex, attribute) {
  const album = getCurrentAlbum();
  if (!album || !album.tracks[trackIndex]) return;

  const value = Number(input.value);
  album.tracks[trackIndex].ratings[attribute] = value;

  const indicator = document.getElementById(`val_${trackIndex}_${attribute}`);
  indicator.textContent = value.toFixed(1);
  indicator.className = `note-indicator ${getNoteColorClass(value)}`;

  const trackScore = calculateTrackScore(album.tracks[trackIndex]);
  const trackIndicator = document.getElementById(`trackScore_${trackIndex}`);
  trackIndicator.textContent = `Nota: ${trackScore.toFixed(1)}`;
  trackIndicator.className = `note-indicator ${getNoteColorClass(trackScore)}`;
};

document.addEventListener("DOMContentLoaded", initTiersPage);
