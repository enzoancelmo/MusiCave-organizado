/* ==========================================================================
   MUSICAVE - JAVASCRIPT PRINCIPAL (FRONT-END)
   Responsável pela lógica de avaliação, cálculos de Tier e conexão com Node.js.
   ========================================================================== */

// ============= CONSTANTES DE CONFIGURAÇÃO =============
const API_URL = 'http://localhost:3000/api/albums';
const ATTRIBUTE_WEIGHTS = { letra: 3, refrao: 3, feat: 2, beat: 2, flow: 1, adlib: 1 };
const CONCEPT_WEIGHT = 1;
const TRACKS_WEIGHT = 5;

const ATTRIBUTE_LABELS = {
    letra: 'Letra',
    refrao: 'Refrão',
    feat: 'Feat',
    beat: 'Beat',
    flow: 'Flow',
    adlib: 'Adlib'
};

// ============= ESTADO DA APLICAÇÃO =============
let albums = [];
let currentAlbumId = null;
let albumToDelete = null;
let coverBase64 = '';

// ============= ELEMENTOS DO DOM =============
const homeView = document.getElementById('homeView');
const evalView = document.getElementById('evalView');
const albumForm = document.getElementById('albumForm');
const tierListEl = document.getElementById('tierList');
const coverUpload = document.getElementById('coverUpload');
const coverPreview = document.getElementById('coverPreview');
const clearCoverBtn = document.getElementById('clearCover');
const deleteModal = document.getElementById('deleteModal');
const toastEl = document.getElementById('toast');

// ============= CONEXÃO COM O SERVIDOR (NODE.JS) =============

async function loadAlbums() {
    try {
        const response = await fetch(API_URL);
        albums = await response.json();
        renderTierList();
    } catch (error) {
        console.error("Erro ao carregar álbuns:", error);
        showToast('Erro de Conexão', 'Não foi possível conectar ao servidor Node.', 'error');
    }
}

async function syncWithServer(album, method = 'POST') {
    const url = method === 'PUT' ? `${API_URL}/${album.id}` : API_URL;
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(album)
        });
        return await response.json();
    } catch (error) {
        console.error("Erro na sincronização:", error);
        showToast('Erro', 'Falha ao salvar no banco de dados.', 'error');
    }
}

// ============= LÓGICA DE CÁLCULOS =============

function calculateTrackScore(track) {
    const { ratings } = track;
    const totalWeight = Object.values(ATTRIBUTE_WEIGHTS).reduce((a, b) => a + b, 0);
    const weightedSum =
        ratings.letra * ATTRIBUTE_WEIGHTS.letra +
        ratings.refrao * ATTRIBUTE_WEIGHTS.refrao +
        ratings.feat * ATTRIBUTE_WEIGHTS.feat +
        ratings.beat * ATTRIBUTE_WEIGHTS.beat +
        ratings.flow * ATTRIBUTE_WEIGHTS.flow +
        ratings.adlib * ATTRIBUTE_WEIGHTS.adlib;
    return weightedSum / totalWeight;
}

function calculateTierScore(album) {
    if (album.tracks.length === 0) return album.conceptRating;
    const trackScores = album.tracks.map(calculateTrackScore);
    const avgTrackScore = trackScores.reduce((a, b) => a + b, 0) / trackScores.length;
    const totalWeight = CONCEPT_WEIGHT + TRACKS_WEIGHT;
    return Math.round(((album.conceptRating * CONCEPT_WEIGHT + avgTrackScore * TRACKS_WEIGHT) / totalWeight) * 100) / 100;
}

function getTierFromScore(score) {
    if (score >= 9) return 'S';
    if (score >= 7.5) return 'A';
    if (score >= 6) return 'B';
    if (score >= 4) return 'C';
    return 'D';
}

function getTierClass(tier) {
    return `tier-${tier.toLowerCase()}`;
}

function getNoteColorClass(val) {
    if (val >= 9) return 'note-s';
    if (val >= 7.5) return 'note-a';
    if (val >= 6) return 'note-b';
    if (val >= 4) return 'note-c';
    return 'note-d';
}

// ============= FUNÇÕES DE RENDERIZAÇÃO =============

function renderTierList() {
    const sorted = [...albums].sort((a, b) => (b.tierScore || 0) - (a.tierScore || 0));

    if (albums.length === 0) {
        tierListEl.innerHTML = `<div class="glass-card empty-state"><h3>Nenhum álbum ainda</h3></div>`;
        return;
    }

    tierListEl.innerHTML = sorted.map((album, index) => `
        <div class="glass-card album-card fade-in">
            <span class="album-rank">#${index + 1}</span>
            ${album.cover ? `<img src="${album.cover}" class="album-cover">` : `<div class="album-cover-placeholder">🎵</div>`}
            <div class="album-info">
                <div class="album-name">${escapeHtml(album.name)}</div>
                <div class="album-artist">${escapeHtml(album.artist)}</div>
            </div>
            <div class="album-actions">
                ${album.tier ? `<div class="tier-badge ${getTierClass(album.tier)}">${album.tier}</div>` : `<span class="not-rated">Pendente</span>`}
                <button class="btn-login" style="padding: 5px 10px;" onclick="openEvaluation('${album.id}')">✏️ Avaliar</button>
                <button class="btn-contact" style="background:#cc0000; min-width:40px;" onclick="openDeleteModal('${album.id}')">🗑️</button>
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
    
    const conceptVal = album.conceptRating;
    document.getElementById('conceptSlider').value = conceptVal;
    const conceptDisplay = document.getElementById('conceptValue');
    conceptDisplay.textContent = conceptVal.toFixed(1);
    conceptDisplay.className = `slider-value note-indicator ${getNoteColorClass(conceptVal)}`;

    const tracksEl = document.getElementById('tracksEvaluation');
    tracksEl.innerHTML = album.tracks.map((track, idx) => {
        const trackScore = calculateTrackScore(track);
        return `
        <div class="track-card" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #333;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div class="track-name"><strong>${idx + 1}. ${escapeHtml(track.name)}</strong></div>
                <span id="trackScore_${idx}" class="note-indicator ${getNoteColorClass(trackScore)}" style="font-size: 1rem;">
                    Nota: ${trackScore.toFixed(1)}
                </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                ${Object.keys(ATTRIBUTE_WEIGHTS).map(attr => {
                    const val = track.ratings[attr];
                    return `
                    <div class="input-group">
                        <div style="display: flex; justify-content: space-between;">
                            <label>${ATTRIBUTE_LABELS[attr]}</label>
                            <span class="note-indicator ${getNoteColorClass(val)}" id="val_${idx}_${attr}">${val.toFixed(1)}</span>
                        </div>
                        <input type="range" min="0" max="10" step="0.5" value="${val}" 
                            oninput="updateLiveRating(this, ${idx}, '${attr}')">
                    </div>
                `}).join('')}
            </div>
        </div>
    `}).join('');
}

window.updateLiveRating = function(el, tIdx, attr) {
    const val = parseFloat(el.value);
    const album = albums.find(a => a.id === currentAlbumId);
    if (!album) return;

    album.tracks[tIdx].ratings[attr] = val;

    const indicator = document.getElementById(`val_${tIdx}_${attr}`);
    indicator.textContent = val.toFixed(1);
    indicator.className = `note-indicator ${getNoteColorClass(val)}`;

    const trackScore = calculateTrackScore(album.tracks[tIdx]);
    const trackIndicator = document.getElementById(`trackScore_${tIdx}`);
    trackIndicator.textContent = `Nota: ${trackScore.toFixed(1)}`;
    trackIndicator.className = `note-indicator ${getNoteColorClass(trackScore)}`;
};

// ============= EVENTOS E INTERAÇÕES =============

albumForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const album = {
        id: crypto.randomUUID(),
        name: document.getElementById('albumName').value,
        artist: document.getElementById('artistName').value,
        cover: coverBase64,
        tracks: document.getElementById('tracklist').value.split('\n').filter(t => t.trim() !== "").map(t => ({
            name: t,
            ratings: { letra: 5, refrao: 5, feat: 5, beat: 5, flow: 5, adlib: 5 }
        })),
        conceptRating: 5,
        tierScore: null,
        tier: null
    };

    await syncWithServer(album, 'POST');
    loadAlbums();
    albumForm.reset();
    coverPreview.classList.add('hidden');
    coverBase64 = '';
});

window.openEvaluation = (id) => {
    currentAlbumId = id;
    homeView.classList.add('hidden');
    evalView.classList.remove('hidden');
    renderEvaluation();
};

document.getElementById('calculateBtn').addEventListener('click', async () => {
    const album = albums.find(a => a.id === currentAlbumId);
    if (album) {
        album.conceptRating = parseFloat(document.getElementById('conceptSlider').value);
        album.tierScore = calculateTierScore(album);
        album.tier = getTierFromScore(album.tierScore);
        await syncWithServer(album, 'PUT');
        showToast(`Nota: ${album.tierScore.toFixed(2)}`, `Álbum classificado como Tier ${album.tier}!`);
    }
});

// NOVA FUNÇÃO DE STORY (SUBSTITUI O PDF ANTIGO)
document.getElementById('exportPdfBtn').addEventListener('click', async function() {
    const album = albums.find(a => a.id === currentAlbumId);
    if (!album) return;

    // 1. Prepara o molde
    document.getElementById('storyAlbumName').textContent = album.name;
    document.getElementById('storyArtistName').textContent = album.artist;
    document.getElementById('storyCover').src = album.cover || '';
    
    const scoreVal = album.tierScore ? album.tierScore.toFixed(2) : 'N/A';
    document.getElementById('storyScore').textContent = scoreVal;
    
    const tierBadge = document.getElementById('storyTierBadge');
    tierBadge.textContent = album.tier || '?';
    tierBadge.className = `tier-badge ${getTierClass(album.tier || 'd')}`;

    const faixasContainer = document.getElementById('storyFaixas');
    const faixasComScore = album.tracks.map(t => ({
        name: t.name,
        score: calculateTrackScore(t)
    })).sort((a,b) => b.score - a.score).slice(0, 5);

    faixasContainer.innerHTML = faixasComScore.map((t, i) => `
        <div style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">
            <span style="color: #b112f1; font-weight: 800;">${i+1}.</span> ${t.name}
            <span style="float: right; color: #888;">${t.score.toFixed(1)}</span>
        </div>
    `).join('');

    const storyEl = document.getElementById('storyContainer');
    storyEl.classList.remove('hidden');

    try {
        const canvas = await html2canvas(storyEl, {
            useCORS: true,
            allowTaint: true,
            scale: 2,
            backgroundColor: "#0d0a14"
        });
        
        const imageBase64 = canvas.toDataURL("image/jpeg", 1.0);
        const link = document.createElement('a');
        link.href = imageBase64;
        link.download = `MusiCave_${album.name}.jpg`;
        link.click();
    } catch (error) {
        console.error(error);
        alert("Erro ao gerar imagem");
    } finally {
        storyEl.classList.add('hidden');
    }
});

document.getElementById('conceptSlider').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const display = document.getElementById('conceptValue');
    display.textContent = val.toFixed(1);
    display.className = `slider-value note-indicator ${getNoteColorClass(val)}`;
});

document.getElementById('backBtn').addEventListener('click', () => {
    homeView.classList.remove('hidden');
    evalView.classList.add('hidden');
    loadAlbums();
});

// ============= UTILITÁRIOS =============
function showToast(title, message, type = 'success') {
    alert(`${title}: ${message}`); 
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

coverUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
        coverBase64 = reader.result;
        coverPreview.src = coverBase64;
        coverPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

loadAlbums();