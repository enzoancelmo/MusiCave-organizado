// ============= CONSTANTES E ESTADO =============

const STORAGE_KEY = 'musicave_data';

const WEIGHTS = {

    letra: 3,

    refrao: 3,

    feat: 2,

    beat: 2,

    flow: 1,

    adlib: 1

};

const LABELS = ['🥇', '🥈', '🥉', '❌'];



let albums = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let currentAlbumId = null;

let albumToDeleteId = null;

let coverBase64 = '';



// ============= DOM ELEMENTS =============

const homeView = document.getElementById('homeView');

const evalView = document.getElementById('evalView');

const albumForm = document.getElementById('albumForm');

const tierListEl = document.getElementById('tierList');

const coverUpload = document.getElementById('coverUpload');

const coverPreview = document.getElementById('coverPreview');

const clearCoverBtn = document.getElementById('clearCover');



// ============= DATA LOGIC =============

function save() {

    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));

}



function calculateScores(album) {

    if (album.tracks.length === 0) return { score: album.conceptRating, tier: 'D' };



    let totalTracksWeightedScore = 0;

    album.tracks.forEach(track => {

        let trackSum = 0;

        let weightSum = 0;

        for (let attr in WEIGHTS) {

            trackSum += track.ratings[attr] * WEIGHTS[attr];

            weightSum += WEIGHTS[attr];

        }

        totalTracksWeightedScore += (trackSum / weightSum);

    });



    const avgTracks = totalTracksWeightedScore / album.tracks.length;

    // Peso: 1 parte conceito, 5 partes faixas

    const finalScore = (album.conceptRating * 1 + avgTracks * 5) / 6;

   

    let tier = 'D';

    if (finalScore >= 9) tier = 'S';

    else if (finalScore >= 7.5) tier = 'A';

    else if (finalScore >= 6) tier = 'B';

    else if (finalScore >= 4) tier = 'C';



    return { score: finalScore, tier };

}



// ============= RENDER FUNCTIONS =============

function renderTierList() {

    const sortedAlbums = [...albums].sort((a, b) => (b.tierScore || 0) - (a.tierScore || 0));

   

    if (albums.length === 0) {

        tierListEl.innerHTML = `

            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">

                <span style="font-size: 4rem; display: block; margin-bottom: 20px;">🎧</span>

                <p>Nenhum álbum adicionado ainda. Comece criando um acima!</p>

            </div>

        `;

        return;

    }



    tierListEl.innerHTML = sortedAlbums.map((album, index) => `

        <div class="glass-card album-card fade-in">

            <span style="color: var(--text-muted); font-weight: 800; font-size: 0.9rem; min-width: 30px;">#${index + 1}</span>

            ${album.cover ?

                `<img src="${album.cover}" class="album-cover" alt="Capa">` :

                `<div class="album-cover" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🎵</div>`

            }

            <div class="album-info">

                <div class="album-name">${album.name}</div>

                <div class="album-artist">${album.artist}</div>

            </div>

            <div style="display: flex; align-items: center; gap: 20px;">

                ${album.tier ? `

                    <div style="text-align: right;">

                        <div class="tier-badge tier-${album.tier.toLowerCase()}">${album.tier}</div>

                        <div style="font-size: 0.75rem; font-weight: 700; margin-top: 4px; color: var(--primary);">${album.tierScore.toFixed(2)}</div>

                    </div>

                ` : '<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">PENDENTE</span>'}

               

                <div style="display: flex; gap: 10px;">

                    <button class="label-btn" onclick="openEvaluation(${album.id})" title="Avaliar">✏️</button>

                    <button class="label-btn" onclick="askDelete(${album.id})" title="Remover" style="color: var(--destructive); border-color: var(--destructive); background: rgba(220, 38, 38, 0.05);">🗑️</button>

                </div>

            </div>

        </div>

    `).join('');

}



function renderEvaluation() {

    const album = albums.find(a => a.id === currentAlbumId);

    if (!album) return;



    document.getElementById('evalAlbumName').textContent = album.name;

    document.getElementById('evalArtistName').textContent = album.artist;

   

    const evalImg = document.getElementById('evalCover');

    const placeholder = document.getElementById('evalCoverPlaceholder');



    if (album.cover) {

        evalImg.src = album.cover;

        evalImg.classList.remove('hidden');

        placeholder.classList.add('hidden');

    } else {

        evalImg.classList.add('hidden');

        placeholder.classList.remove('hidden');

    }



    document.getElementById('conceptSlider').value = album.conceptRating;

    document.getElementById('conceptValue').textContent = album.conceptRating.toFixed(1);

    updateSliderGradient(document.getElementById('conceptSlider'));



    const tracksContainer = document.getElementById('tracksEvaluation');

    tracksContainer.innerHTML = album.tracks.map((track, tIdx) => `

        <div class="track-card fade-in" style="animation-delay: ${tIdx * 0.05}s">

            <div class="track-top">

                <span class="track-name">${tIdx + 1}. ${track.name}</span>

                <div class="track-labels">

                    ${LABELS.map(label => `

                        <button class="label-btn ${track.label === label ? 'active' : ''}"

                                onclick="setTrackLabel(${tIdx}, '${label}')">${label}</button>

                    `).join('')}

                </div>

            </div>

            <div class="slider-grid">

                ${Object.keys(WEIGHTS).map(attr => `

                    <div class="slider-group-small">

                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">

                            <label style="font-size: 0.75rem; margin-bottom: 0;">${attr} (×${WEIGHTS[attr]})</label>

                            <span id="val_${tIdx}_${attr}" style="font-weight: 800; font-size: 0.8rem; color: var(--primary);">${track.ratings[attr].toFixed(1)}</span>

                        </div>

                        <input type="range" min="0" max="10" step="0.5" value="${track.ratings[attr]}"

                               oninput="updateTrackRating(${tIdx}, '${attr}', this.value, this)"

                               style="height: 4px;">

                    </div>

                `).join('')}

            </div>

        </div>

    `).join('');



    // Update all gradients

    tracksContainer.querySelectorAll('input[type="range"]').forEach(updateSliderGradient);

}



// ============= EVENT HANDLERS =============



// Upload de Capa

coverUpload.addEventListener('change', (e) => {

    const file = e.target.files[0];

    if (file) {

        const reader = new FileReader();

        reader.onload = (event) => {

            coverBase64 = event.target.result;

            coverPreview.src = coverBase64;

            coverPreview.classList.remove('hidden');

            clearCoverBtn.classList.remove('hidden');

        };

        reader.readAsDataURL(file);

    }

});



clearCoverBtn.addEventListener('click', () => {

    coverBase64 = '';

    coverPreview.classList.add('hidden');

    clearCoverBtn.classList.add('hidden');

    coverUpload.value = '';

});



// Formulário de Álbum

albumForm.addEventListener('submit', (e) => {

    e.preventDefault();

    const name = document.getElementById('albumName').value;

    const artist = document.getElementById('artistName').value;

    const tracklistRaw = document.getElementById('tracklist').value;

    const trackNames = tracklistRaw.split('\n').filter(t => t.trim() !== '');



    if (trackNames.length === 0) {

        showToast("Erro!", "Adicione pelo menos uma música.");

        return;

    }



    const newAlbum = {

        id: Date.now(),

        name,

        artist,

        cover: coverBase64,

        conceptRating: 5.0,

        tier: null,

        tierScore: null,

        tracks: trackNames.map(name => ({

            name: name.trim(),

            label: null,

            ratings: { letra: 5, refrao: 5, feat: 5, beat: 5, flow: 5, adlib: 5 }

        }))

    };



    albums.push(newAlbum);

    save();

   

    // Reset form

    albumForm.reset();

    coverBase64 = '';

    coverPreview.classList.add('hidden');

    clearCoverBtn.classList.add('hidden');

   

    renderTierList();

    showToast("Sucesso!", "Álbum adicionado à coleção.");

});



// Ações de Avaliação

window.updateTrackRating = (tIdx, attr, val, el) => {

    const album = albums.find(a => a.id === currentAlbumId);

    album.tracks[tIdx].ratings[attr] = parseFloat(val);

    document.getElementById(`val_${tIdx}_${attr}`).textContent = parseFloat(val).toFixed(1);

    updateSliderGradient(el);

};



window.setTrackLabel = (tIdx, label) => {

    const album = albums.find(a => a.id === currentAlbumId);

    if (album.tracks[tIdx].label === label) {

        album.tracks[tIdx].label = null;

    } else {

        album.tracks[tIdx].label = label;

    }

    save();

    renderEvaluation();

};



document.getElementById('conceptSlider').addEventListener('input', (e) => {

    const album = albums.find(a => a.id === currentAlbumId);

    album.conceptRating = parseFloat(e.target.value);

    document.getElementById('conceptValue').textContent = album.conceptRating.toFixed(1);

    updateSliderGradient(e.target);

});



window.openEvaluation = (id) => {

    currentAlbumId = id;

    homeView.classList.add('hidden');

    evalView.classList.remove('hidden');

    window.scrollTo(0, 0);

    renderEvaluation();

};



document.getElementById('backBtn').addEventListener('click', () => {

    homeView.classList.remove('hidden');

    evalView.classList.add('hidden');

    renderTierList();

});



document.getElementById('calculateBtn').addEventListener('click', () => {

    const album = albums.find(a => a.id === currentAlbumId);

    const result = calculateScores(album);

   

    album.tierScore = result.score;

    album.tier = result.tier;

   

    save();

    showToast("Calculado!", `Nota: ${result.score.toFixed(2)} | Tier: ${result.tier}`);

    renderEvaluation();

});



document.getElementById('saveNotesBtn').addEventListener('click', () => {

    save();

    showToast("Salvo!", "Suas avaliações foram salvas.");

});



// ============= PDF EXPORT (CORRIGIDO) =============

document.getElementById('exportPdfBtn').addEventListener('click', () => {

    const album = albums.find(a => a.id === currentAlbumId);

    if (!album) return;



    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();



    // Dark Background

    doc.setFillColor(13, 10, 20);

    doc.rect(0, 0, 210, 297, 'F');



    // Header - REMOVIDO EMOJI PARA EVITAR Ø>Ý‡

    doc.setTextColor(147, 51, 234);

    doc.setFontSize(22);

    doc.setFont("helvetica", "bold");

    doc.text("MusiCave Review", 105, 20, { align: 'center' });



    let currentY = 40;



    // Album Image

    if (album.cover) {

        try {

            doc.addImage(album.cover, 'JPEG', 20, currentY, 40, 40);

        } catch (e) {

            console.error("Erro ao adicionar imagem ao PDF", e);

        }

    }



    // Info Text

    const textX = album.cover ? 70 : 20;

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(18);

    doc.text(album.name, textX, currentY + 10);

   

    doc.setFontSize(14);

    doc.setTextColor(168, 155, 184);

    doc.text(album.artist, textX, currentY + 18);



    doc.setFontSize(16);

    doc.setTextColor(147, 51, 234);

    const scoreText = album.tierScore ? album.tierScore.toFixed(2) : "N/A";

    const tierText = album.tier ? album.tier : "-";

    doc.text(`Nota Final: ${scoreText} [Tier ${tierText}]`, textX, currentY + 30);



    currentY = Math.max(currentY + 55, 90);



    // Track Table - ARREDONDAMENTO APLICADO

    const tableBody = album.tracks.map((t, i) => {

        let labelDesc = "";

        if (t.label === '🥇') labelDesc = "(Gold) ";

        if (t.label === '🥈') labelDesc = "(Silver) ";

        if (t.label === '🥉') labelDesc = "(Bronze) ";

        if (t.label === '❌') labelDesc = "(Skip) ";



        // Média da faixa arredondada para 2 casas

        const tSum = Object.values(t.ratings).reduce((a, b) => a + b, 0);

        const tAvg = (tSum / 6).toFixed(2);



        return [

            i + 1,

            labelDesc + t.name,

            t.ratings.letra.toFixed(1),

            t.ratings.beat.toFixed(1),

            t.ratings.flow.toFixed(1),

            tAvg

        ];

    });



    doc.autoTable({

        startY: currentY,

        head: [['#', 'Faixa', 'Letra', 'Beat', 'Flow', 'Média']],

        body: tableBody,

        theme: 'grid',

        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },

        styles: { fillColor: [26, 21, 37], textColor: [240, 240, 240], lineColor: [45, 38, 64] },

        alternateRowStyles: { fillColor: [30, 25, 41] },

        margin: { left: 20, right: 20 }

    });



    doc.save(`Review_${album.name.replace(/\s+/g, '_')}.pdf`);

});



// ============= UTILS =============

function updateSliderGradient(slider) {

    const val = (slider.value - slider.min) / (slider.max - slider.min) * 100;

    slider.style.backgroundSize = val + '% 100%';

}



function showToast(title, message) {

    const toast = document.getElementById('toast');

    document.getElementById('toastTitle').textContent = title;

    document.getElementById('toastMessage').textContent = message;

    toast.classList.remove('hidden');

    setTimeout(() => toast.classList.add('hidden'), 3000);

}



window.askDelete = (id) => {

    albumToDeleteId = id;

    document.getElementById('deleteModal').classList.remove('hidden');

};



document.getElementById('confirmDelete').addEventListener('click', () => {

    albums = albums.filter(a => a.id !== albumToDeleteId);

    save();

    renderTierList();

    document.getElementById('deleteModal').classList.add('hidden');

    showToast("Removido", "Álbum excluído com sucesso.");

});



document.getElementById('cancelDelete').addEventListener('click', () => {

    document.getElementById('deleteModal').classList.add('hidden');

});



// Init

renderTierList();