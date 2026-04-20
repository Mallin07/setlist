const STORAGE_KEYS = {
  songs: "setlist_app_songs",
  setlists: "setlist_app_setlists"
};

let songs = loadFromStorage(STORAGE_KEYS.songs, []);
let setlists = loadFromStorage(STORAGE_KEYS.setlists, []);
let selectedSongId = null;
let selectedSetlistId = null;

const songForm = document.getElementById("song-form");
const songTitleInput = document.getElementById("song-title");
const songArtistInput = document.getElementById("song-artist");
const songKeyInput = document.getElementById("song-key");
const songContentInput = document.getElementById("song-content");

const songSearchInput = document.getElementById("song-search");
const songListElement = document.getElementById("song-list");

const viewerTitle = document.getElementById("viewer-title");
const viewerMeta = document.getElementById("viewer-meta");
const songViewer = document.getElementById("song-viewer");
const transposeSelect = document.getElementById("transpose-select");

const setlistForm = document.getElementById("setlist-form");
const setlistNameInput = document.getElementById("setlist-name");
const setlistSelect = document.getElementById("setlist-select");
const setlistSongsElement = document.getElementById("setlist-songs");

const addSongToSetlistButton = document.getElementById("add-song-to-setlist");
const removeSongFromSetlistButton = document.getElementById("remove-song-from-setlist");
const exportPdfButton = document.getElementById("export-pdf");

init();

function init() {
  renderSongs();
  renderSetlists();
  renderSelectedSong();
  renderSelectedSetlistSongs();

  songForm.addEventListener("submit", handleSongSubmit);
  songSearchInput.addEventListener("input", renderSongs);
  setlistForm.addEventListener("submit", handleSetlistSubmit);
  setlistSelect.addEventListener("change", handleSetlistChange);
  addSongToSetlistButton.addEventListener("click", handleAddSongToSetlist);
  removeSongFromSetlistButton.addEventListener("click", handleRemoveSongFromSetlist);

  transposeSelect.addEventListener("change", () => {
    renderSelectedSong();
  });

  exportPdfButton.addEventListener("click", () => {
    alert("La exportación a PDF la conectaremos en el siguiente paso.");
  });
}

function handleSongSubmit(event) {
  event.preventDefault();

  const title = songTitleInput.value.trim();
  const artist = songArtistInput.value.trim();
  const originalKey = songKeyInput.value.trim();
  const content = songContentInput.value.trim();

  if (!title || !content) {
    alert("El título y la letra son obligatorios.");
    return;
  }

  const newSong = {
    id: generateId(),
    title,
    artist,
    originalKey,
    content,
    createdAt: new Date().toISOString()
  };

  songs.unshift(newSong);
  saveToStorage(STORAGE_KEYS.songs, songs);

  selectedSongId = newSong.id;

  songForm.reset();
  transposeSelect.value = "0";

  renderSongs();
  renderSelectedSong();
}

function handleSetlistSubmit(event) {
  event.preventDefault();

  const name = setlistNameInput.value.trim();

  if (!name) {
    alert("Escribe un nombre para el setlist.");
    return;
  }

  const newSetlist = {
    id: generateId(),
    name,
    songIds: [],
    createdAt: new Date().toISOString()
  };

  setlists.push(newSetlist);
  saveToStorage(STORAGE_KEYS.setlists, setlists);

  selectedSetlistId = newSetlist.id;
  setlistNameInput.value = "";

  renderSetlists();
  renderSelectedSetlistSongs();
}

function handleSetlistChange() {
  selectedSetlistId = setlistSelect.value || null;
  renderSelectedSetlistSongs();
}

function handleAddSongToSetlist() {
  if (!selectedSongId) {
    alert("Selecciona una canción primero.");
    return;
  }

  if (!selectedSetlistId) {
    alert("Selecciona un setlist primero.");
    return;
  }

  const setlist = setlists.find(item => item.id === selectedSetlistId);
  if (!setlist) return;

  if (setlist.songIds.includes(selectedSongId)) {
    alert("Esa canción ya está en el setlist.");
    return;
  }

  setlist.songIds.push(selectedSongId);
  saveToStorage(STORAGE_KEYS.setlists, setlists);
  renderSelectedSetlistSongs();
}

function handleRemoveSongFromSetlist() {
  if (!selectedSongId) {
    alert("Selecciona una canción primero.");
    return;
  }

  if (!selectedSetlistId) {
    alert("Selecciona un setlist primero.");
    return;
  }

  const setlist = setlists.find(item => item.id === selectedSetlistId);
  if (!setlist) return;

  setlist.songIds = setlist.songIds.filter(songId => songId !== selectedSongId);
  saveToStorage(STORAGE_KEYS.setlists, setlists);
  renderSelectedSetlistSongs();
}

function renderSongs() {
  const searchTerm = songSearchInput.value.trim().toLowerCase();

  const filteredSongs = songs.filter(song => {
    const combinedText = `${song.title} ${song.artist} ${song.originalKey}`.toLowerCase();
    return combinedText.includes(searchTerm);
  });

  songListElement.innerHTML = "";

  if (filteredSongs.length === 0) {
    songListElement.innerHTML = "<li>No hay canciones todavía.</li>";
    return;
  }

  filteredSongs.forEach(song => {
    const li = document.createElement("li");
    li.className = song.id === selectedSongId ? "active" : "";

    li.innerHTML = `
      <div class="song-item-title">${escapeHtml(song.title)}</div>
      <div class="song-item-meta">
        ${escapeHtml(song.artist || "Sin artista")} · ${escapeHtml(song.originalKey || "Sin tono")}
      </div>
    `;

    li.addEventListener("click", () => {
      selectedSongId = song.id;
      transposeSelect.value = "0";
      renderSongs();
      renderSelectedSong();
    });

    songListElement.appendChild(li);
  });
}

function renderSelectedSong() {
  const song = songs.find(item => item.id === selectedSongId);

  if (!song) {
    viewerTitle.textContent = "Visor de canción";
    viewerMeta.textContent = "Selecciona una canción para verla aquí.";
    songViewer.innerHTML = `<p class="placeholder-text">Aquí se mostrará la letra con acordes.</p>`;
    return;
  }

  const transposeValue = Number(transposeSelect.value || 0);

  viewerTitle.textContent = song.title;
  viewerMeta.textContent = `${song.artist || "Sin artista"} · Tono original: ${song.originalKey || "No definido"} · Transposición: ${transposeValue > 0 ? "+" : ""}${transposeValue}`;

  songViewer.innerHTML = `<pre>${escapeHtml(song.content)}</pre>`;
}

function renderSetlists() {
  setlistSelect.innerHTML = `<option value="">-- Selecciona --</option>`;

  setlists.forEach(setlist => {
    const option = document.createElement("option");
    option.value = setlist.id;
    option.textContent = setlist.name;

    if (setlist.id === selectedSetlistId) {
      option.selected = true;
    }

    setlistSelect.appendChild(option);
  });
}

function renderSelectedSetlistSongs() {
  setlistSongsElement.innerHTML = "";

  if (!selectedSetlistId) {
    setlistSongsElement.innerHTML = "<li>Selecciona un setlist.</li>";
    return;
  }

  const setlist = setlists.find(item => item.id === selectedSetlistId);

  if (!setlist) {
    setlistSongsElement.innerHTML = "<li>Setlist no encontrado.</li>";
    return;
  }

  if (setlist.songIds.length === 0) {
    setlistSongsElement.innerHTML = "<li>No hay canciones en este setlist.</li>";
    return;
  }

  setlist.songIds.forEach(songId => {
    const song = songs.find(item => item.id === songId);

    const li = document.createElement("li");
    li.textContent = song ? `${song.title} - ${song.artist || "Sin artista"}` : "Canción no encontrada";
    setlistSongsElement.appendChild(li);
  });
}

function loadFromStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    console.error(`Error leyendo ${key} desde localStorage:`, error);
    return fallbackValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error guardando ${key} en localStorage:`, error);
  }
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}