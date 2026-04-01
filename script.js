document.getElementById("goHome").addEventListener("click", () => {
  window.location.href = "/";
});

// ============= CONFIGURAÇÕES E ESTADO =============
const STORAGE_KEY = 'musicave_albums';
const ATTRIBUTE_WEIGHTS = { letra: 3, refrao: 3, feat: 2, beat: 2, flow: 1, adlib: 1 };
const CONCEPT_WEIGHT = 1;
const TRACKS_WEIGHT = 5;

let albums = [];
let currentAlbumId = null;
let albumToDelete = null;
let coverBase64 = '';

// Elementos
const homeView = document.getElementById('homeView');
const evalView = document.getElementById('evalView');
const albumForm = document.getElementById('albumForm');
const tierListEl = document.getElementById('tierList');
const coverPreview = document.getElementById('coverPreview');
const previewPlaceholder = document.getElementById('previewPlaceholder');

// ============= FUNÇÕES DE CARGA =============
function loadAlbums() {
    const data = localStorage.getItem(STORAGE_KEY);
    albums = data ? JSON.parse(data) : [];
}

function saveAlbums() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
}

// ============= LOGICA DE CALCULO =============
function calculateTrackScore(track) {
    const totalWeight = Object.values(ATTRIBUTE_WEIGHTS).reduce((a, b) => a + b, 0);
    const s = track.ratings;
    const weightedSum = (s.letra * 3) + (s.refrao * 3) + (s.feat * 2) + (s.beat * 2) + (s.flow * 1) + (s.adlib * 1);
    return weightedSum / totalWeight;
}

function calculateTierScore(album) {
    if (album.tracks.length === 0) return album.conceptRating;
    const avgTrackScore = album.tracks.reduce((acc, t) => acc + calculateTrackScore(t), 0) / album.tracks.length;
    return ((album.conceptRating * CONCEPT_WEIGHT) + (avgTrackScore * TRACKS_WEIGHT)) / (CONCEPT_WEIGHT + TRACKS_WEIGHT);
}

function getTier(score) {
    if (score >= 9) return 'S';
    if (score >= 7.5) return 'A';
    if (score >= 6) return 'B';
    if (score >= 4) return 'C';
    return 'D';
}

// ============= RENDERIZAÇÃO =============
function renderTierList() {
    if (albums.length === 0) {
        tierListEl.innerHTML = '<p style="text-align:center; color:#444;">Nenhum álbum adicionado ainda.</p>';
        return;
    }
    
    // Ordenar por nota
    const sorted = [...albums].sort((a,b) => (b.tierScore || 0) - (a.tierScore || 0));

    tierListEl.innerHTML = sorted.map((album, idx) => `
        <div class="album-card fade-in">
            <span class="album-rank">#${idx + 1}</span>
            <img src="${album.cover || 'placeholder.jpg'}" class="album-cover" onerror="this.src='https://via.placeholder.com/60/111/fff?text=🎵'">
            <div class="album-info">
                <div class="album-name">${album.name}</div>
                <div class="album-artist">${album.artist}</div>
            </div>
            <div class="album-actions">
                ${album.tier ? `<div class="tier-badge tier-${album.tier.toLowerCase()}">${album.tier}</div>` : '<span style="color:#444; font-size:0.8rem">Pendente</span>'}
                <button class="btn-nav" style="padding: 5px 12px; font-size:0.7rem" onclick="openEvaluation('${album.id}')">EDITAR</button>
                <button class="btn-danger" onclick="openDeleteModal('${album.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderEvaluation() {
    const album = albums.find(a => a.id === currentAlbumId);
    if (!album) return;

    document.getElementById('evalAlbumName').textContent = album.name;
    document.getElementById('evalArtistName').textContent = album.artist;
    document.getElementById('evalCover').src = album.cover || '';
    document.getElementById('conceptSlider').value = album.conceptRating;
    document.getElementById('conceptValue').textContent = album.conceptRating.toFixed(1);

    const tracksEl = document.getElementById('tracksEvaluation');
    tracksEl.innerHTML = album.tracks.map((track, idx) => `
        <div class="glass-card" style="margin-top: 1rem; padding: 1.5rem;">
            <div style="font-weight:bold; margin-bottom:1rem">#${idx+1} - ${track.name}</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                ${Object.keys(ATTRIBUTE_WEIGHTS).map(attr => `
                    <div class="input-group">
                        <label>${attr} (v:${ATTRIBUTE_WEIGHTS[attr]})</label>
                        <input type="range" min="0" max="10" step="0.5" value="${track.ratings[attr]}" 
                               oninput="updateRating(${idx}, '${attr}', this.value)">
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ============= EVENTOS =============
window.updateRating = (trackIdx, attr, val) => {
    const album = albums.find(a => a.id === currentAlbumId);
    album.tracks[trackIdx].ratings[attr] = parseFloat(val);
};

window.openEvaluation = (id) => {
    currentAlbumId = id;
    homeView.classList.add('hidden');
    evalView.classList.remove('hidden');
    renderEvaluation();
};

window.openDeleteModal = (id) => {
    albumToDelete = id;
    document.getElementById('deleteModal').classList.remove('hidden');
};

document.getElementById('cancelDelete').onclick = () => {
    document.getElementById('deleteModal').classList.add('hidden');
};

document.getElementById('confirmDelete').onclick = () => {
    albums = albums.filter(a => a.id !== albumToDelete);
    saveAlbums();
    renderTierList();
    document.getElementById('deleteModal').classList.add('hidden');
};

document.getElementById('coverUpload').onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        coverBase64 = reader.result;
        coverPreview.src = coverBase64;
        coverPreview.classList.remove('hidden');
        previewPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
};

albumForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('albumName').value;
    const artist = document.getElementById('artistName').value;
    const tracksText = document.getElementById('tracklist').value;
    
    if(!name || !artist) return;

    const tracks = tracksText.split('\n').filter(t => t.trim()).map(t => ({
        name: t.trim(),
        ratings: { letra: 5, refrao: 5, feat: 5, beat: 5, flow: 5, adlib: 5 }
    }));

    const newAlbum = {
        id: Date.now().toString(),
        name, artist, tracks,
        cover: coverBase64,
        conceptRating: 5,
        tierScore: 0,
        tier: ''
    };

    albums.push(newAlbum);
    saveAlbums();
    renderTierList();
    albumForm.reset();
    coverPreview.classList.add('hidden');
    previewPlaceholder.classList.remove('hidden');
};

document.getElementById('calculateBtn').onclick = () => {
    const album = albums.find(a => a.id === currentAlbumId);
    album.conceptRating = parseFloat(document.getElementById('conceptSlider').value);
    album.tierScore = calculateTierScore(album);
    album.tier = getTier(album.tierScore);
    saveAlbums();
    alert(`Nota Final: ${album.tierScore.toFixed(2)} - Tier ${album.tier}`);
    homeView.classList.remove('hidden');
    evalView.classList.add('hidden');
    renderTierList();
};

document.getElementById('backBtn').onclick = () => {
    homeView.classList.remove('hidden');
    evalView.classList.add('hidden');
};

// Iniciar
loadAlbums();
renderTierList();