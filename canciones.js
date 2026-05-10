const STORAGE_KEY = "setlist_app_songs";

const songsListEl = document.getElementById("songs-list");
const songSearchInput = document.getElementById("song-search");

const songViewer = document.getElementById("song-viewer");
const songViewerEmpty = document.getElementById("song-viewer-empty");

const songTools = document.getElementById("song-tools");

const editSongBtn = document.getElementById("edit-song-btn");
const deleteSongBtn = document.getElementById("delete-song-btn");

const songEditForm = document.getElementById("song-edit-form");

const editSongTitleInput = document.getElementById("edit-song-title");
const editSongArtistInput = document.getElementById("edit-song-artist");
const editSongPdfInput = document.getElementById("edit-song-pdf");
const editSongDurationInput = document.getElementById("edit-song-duration");

const cancelEditBtn = document.getElementById("cancel-edit-btn");



let songs = [];
let filteredSongs = [];
let selectedSongId = null;

init();

function init() {
  songs = getSongsData().sort(compareSongsByArtistThenTitle);
  filteredSongs = [...songs];

  songSearchInput.addEventListener("input", handleSearch);

  editSongBtn.addEventListener("click", openEditForm);
  deleteSongBtn.addEventListener("click", handleDeleteSong);

  cancelEditBtn.addEventListener("click", closeEditForm);

  songEditForm.addEventListener("submit", handleSaveEdit);

  renderSongsList();
  renderSelectedSong();
}

/* =========================
   STORAGE
========================= */

function loadSongs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Error al cargar canciones:", error);
    return [];
  }
}

function saveSongs(nextSongs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSongs));
  } catch (error) {
    console.error("Error al guardar canciones:", error);
    alert("No se pudieron guardar los cambios.");
  }
}

/* =========================
   ORDEN Y FILTRO
========================= */

function compareSongsByArtistThenTitle(a, b) {
  const artistA = (a.artist || "").trim().toLocaleLowerCase("es");
  const artistB = (b.artist || "").trim().toLocaleLowerCase("es");

  if (artistA < artistB) return -1;
  if (artistA > artistB) return 1;

  const titleA = (a.title || "").trim().toLocaleLowerCase("es");
  const titleB = (b.title || "").trim().toLocaleLowerCase("es");

  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;

  return 0;
}

function handleSearch() {
  filteredSongs = applyCurrentFilter();

  if (!filteredSongs.some(song => song.id === selectedSongId)) {
    selectedSongId = null;
    closeEditForm();
  }

  renderSongsList();
  renderSelectedSong();
}

function applyCurrentFilter() {
  const term = songSearchInput.value.trim().toLocaleLowerCase("es");

  return songs.filter(song => {
    const artist = (song.artist || "").toLocaleLowerCase("es");
    const title = (song.title || "").toLocaleLowerCase("es");

    return artist.includes(term) || title.includes(term);
  });
}

function groupSongsByArtist(songList) {
  const groupsMap = new Map();

  songList.forEach(song => {
    const artistName =
      (song.artist || "Sin artista").trim() || "Sin artista";

    if (!groupsMap.has(artistName)) {
      groupsMap.set(artistName, []);
    }

    groupsMap.get(artistName).push(song);
  });

  return [...groupsMap.entries()]
    .sort((a, b) =>
      a[0].localeCompare(b[0], "es", { sensitivity: "base" })
    )
    .map(([artist, artistSongs]) => ({
      artist,
      songs: [...artistSongs].sort(compareSongsByArtistThenTitle)
    }));
}

/* =========================
   LISTA
========================= */

function renderSongsList() {
  songsListEl.innerHTML = "";

  if (filteredSongs.length === 0) {
    songsListEl.innerHTML =
      `<div class="songs-empty-state">No hay canciones guardadas.</div>`;

    return;
  }

  const groupedSongs = groupSongsByArtist(filteredSongs);

  const hasSearch = songSearchInput.value.trim() !== "";

  groupedSongs.forEach(group => {
    const details = document.createElement("details");

    details.className = "song-artist-group";

    if (
      hasSearch ||
      group.songs.some(song => song.id === selectedSongId)
    ) {
      details.open = true;
    }

    const summary = document.createElement("summary");

    summary.className = "song-artist-summary";
    summary.textContent = group.artist;

    details.appendChild(summary);

    const songsWrapper = document.createElement("div");

    songsWrapper.className = "song-artist-songs";

    group.songs.forEach(song => {
      const item = document.createElement("button");

      item.type = "button";
      item.className = "song-list-item";

      if (song.id === selectedSongId) {
        item.classList.add("active");
      }

      item.innerHTML = `
        <div class="song-list-title">
          ${escapeHtml(song.title || "Sin título")}
        </div>
      `;

      item.addEventListener("click", () => {
        selectedSongId = song.id;

        closeEditForm();

        renderSongsList();
        renderSelectedSong();
      });

      songsWrapper.appendChild(item);
    });

    details.appendChild(songsWrapper);

    songsListEl.appendChild(details);
  });
}

/* =========================
   VISOR
========================= */

function renderSelectedSong() {
  const song = songs.find(item => item.id === selectedSongId);

  if (!song) {
    songViewer.classList.add("hidden");

    songViewerEmpty.classList.remove("hidden");

    songTools.classList.add("hidden");

    songViewer.innerHTML = "";

    return;
  }

  songViewer.classList.remove("hidden");

  songViewerEmpty.classList.add("hidden");

  songTools.classList.remove("hidden");

  songViewer.innerHTML = `
    <div class="pdf-song-header">
      <h2>${escapeHtml(song.title || "Sin título")}</h2>

      <p>${escapeHtml(song.artist || "Sin artista")}</p>

      <p class="songs-empty-state">
        ${escapeHtml(song.pdfName || "PDF")}
      </p>
    </div>

    <iframe
      class="pdf-song-viewer"
      src="${song.pdfPath || song.pdfDataUrl || ""}"
      title="${escapeHtml(song.title || "PDF")}"
    ></iframe>
  `;
}

/* =========================
   EDICIÓN
========================= */

function openEditForm() {
  const song = songs.find(item => item.id === selectedSongId);
  const duration = editSongDurationInput.value.trim();

  if (!song) return;

  editSongTitleInput.value = song.title || "";
  editSongArtistInput.value = song.artist || "";

  songEditForm.classList.remove("hidden");
}

function closeEditForm() {
  songEditForm.classList.add("hidden");

  songEditForm.reset();
}

function handleSaveEdit(event) {
  event.preventDefault();

  const song = songs.find(item => item.id === selectedSongId);
  const duration = editSongDurationInput.value.trim();

  if (!song) return;

  const title = editSongTitleInput.value.trim();
  const artist = editSongArtistInput.value.trim();

  const file = editSongPdfInput.files?.[0];

  if (!title) {
    alert("Debes indicar el nombre de la canción.");
    return;
  }

  const saveChanges = pdfData => {
    song.title = title;
    song.artist = artist;
    song.duration = duration;
    song.durationSeconds = parseDurationToSeconds(duration);

    if (pdfData) {
      song.pdfName = file.name;
      song.pdfDataUrl = pdfData;
    }

    song.updatedAt = new Date().toISOString();

    songs.sort(compareSongsByArtistThenTitle);

    saveSongs(songs);

    filteredSongs = applyCurrentFilter();

    closeEditForm();

    renderSongsList();
    renderSelectedSong();
  };

  if (!file) {
    saveChanges(null);
    return;
  }

  if (file.type !== "application/pdf") {
    alert("El archivo debe ser PDF.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    saveChanges(reader.result);
  };

  reader.onerror = () => {
    alert("No se pudo leer el PDF.");
  };

  reader.readAsDataURL(file);
}

/* =========================
   ELIMINAR
========================= */

function handleDeleteSong() {
  const song = songs.find(item => item.id === selectedSongId);

  if (!song) return;

  const confirmed = confirm(
    `¿Eliminar "${song.title || "Sin título"}"?`
  );

  if (!confirmed) return;

  songs = songs.filter(item => item.id !== selectedSongId);

  selectedSongId = null;

  saveSongs(songs);

  filteredSongs = applyCurrentFilter();

  closeEditForm();

  renderSongsList();
  renderSelectedSong();
}

/* =========================
   UTILIDADES
========================= */

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDurationToSeconds(value) {
  const text = String(value || "").trim();

  if (!text) return 0;

  const parts = text.split(":").map(Number);

  if (parts.some(Number.isNaN)) return 0;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

function getSongsData() {
  return Array.isArray(window.SONGS_DATA)
    ? [...window.SONGS_DATA]
    : [];
}