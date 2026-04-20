const SONGS_STORAGE_KEY = "setlist_app_songs";
const SETLISTS_STORAGE_KEY = "setlist_app_setlists";

const setlistForm = document.getElementById("setlist-form");
const setlistNameInput = document.getElementById("setlist-name");
const songSearchInput = document.getElementById("setlist-song-search");
const songsListEl = document.getElementById("setlist-song-list");
const selectedListEl = document.getElementById("setlist-selected-list");
const selectedEmptyEl = document.getElementById("setlist-selected-empty");
const clearSetlistBtn = document.getElementById("clear-setlist-btn");

let songs = [];
let filteredSongs = [];
let selectedSongIds = [];
let draggedSongIndex = null;

init();

function init() {
  songs = loadFromStorage(SONGS_STORAGE_KEY, []).sort(compareSongsByArtistThenTitle);
  filteredSongs = [...songs];

  songSearchInput.addEventListener("input", handleSearch);
  setlistForm.addEventListener("submit", handleSaveSetlist);
  clearSetlistBtn.addEventListener("click", handleClearSetlist);

  renderSongsList();
  renderSelectedSongs();
}

function handleSearch() {
  const term = songSearchInput.value.trim().toLocaleLowerCase("es");

  filteredSongs = songs.filter(song => {
    const artist = (song.artist || "").toLocaleLowerCase("es");
    const title = (song.title || "").toLocaleLowerCase("es");
    return artist.includes(term) || title.includes(term);
  });

  renderSongsList();
}

function renderSongsList() {
  songsListEl.innerHTML = "";

  if (filteredSongs.length === 0) {
    songsListEl.innerHTML = `<div class="songs-empty-state">No hay canciones disponibles.</div>`;
    return;
  }

  const groupedSongs = groupSongsByArtist(filteredSongs);
  const hasSearch = songSearchInput.value.trim() !== "";

  groupedSongs.forEach(group => {
    const details = document.createElement("details");
    details.className = "song-artist-group";

    if (hasSearch || group.songs.some(song => selectedSongIds.includes(song.id))) {
      details.open = true;
    }

    const summary = document.createElement("summary");
    summary.className = "song-artist-summary";
    summary.textContent = group.artist;
    details.appendChild(summary);

    const songsWrapper = document.createElement("div");
    songsWrapper.className = "song-artist-songs";

    group.songs.forEach(song => {
      const item = document.createElement("div");
      item.className = "setlist-song-item";

      const alreadyAdded = selectedSongIds.includes(song.id);

      item.innerHTML = `
        <div class="setlist-song-main">
          <div class="setlist-song-title">${escapeHtml(song.title || "Sin título")}</div>
        </div>
        <div class="setlist-song-actions">
          <button type="button" ${alreadyAdded ? "disabled" : ""}>
            ${alreadyAdded ? "Añadida" : "Añadir"}
          </button>
        </div>
      `;

      const addButton = item.querySelector("button");
      addButton.addEventListener("click", () => {
        if (selectedSongIds.includes(song.id)) return;

        selectedSongIds.push(song.id);
        renderSongsList();
        renderSelectedSongs();
      });

      songsWrapper.appendChild(item);
    });

    details.appendChild(songsWrapper);
    songsListEl.appendChild(details);
  });
}

function renderSelectedSongs() {
  selectedListEl.innerHTML = "";

  if (selectedSongIds.length === 0) {
    selectedEmptyEl.classList.remove("hidden");
    return;
  }

  selectedEmptyEl.classList.add("hidden");

  selectedSongIds.forEach((songId, index) => {
    const song = songs.find(item => item.id === songId);

    const item = document.createElement("div");
    item.className = "setlist-selected-item";
    item.draggable = true;
    item.dataset.index = String(index);

    item.innerHTML = `
  <div class="setlist-selected-item-main">
       <div class="setlist-selected-position">${index + 1}</div>
       <div class="setlist-selected-title">${escapeHtml(song?.title || "Canción no encontrada")}</div>
       <div class="setlist-selected-meta">${escapeHtml(song?.artist || "Sin artista")}</div>
     </div>
     <div class="setlist-selected-actions">
       <button type="button" class="danger" data-action="remove">Quitar</button>
     </div>
   `;

    const removeBtn = item.querySelector('[data-action="remove"]');

    
    removeBtn.addEventListener("click", () => removeSongFromSetlist(index));

    setupDragAndDrop(item, index);

    selectedListEl.appendChild(item);
  });
}

function setupDragAndDrop(item, index) {
  item.addEventListener("dragstart", event => {
    draggedSongIndex = index;
    item.classList.add("dragging");
    selectedListEl.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  });

  item.addEventListener("dragend", () => {
    draggedSongIndex = null;
    selectedListEl.classList.remove("is-dragging");
    clearDragStyles();
  });

  item.addEventListener("dragover", event => {
    event.preventDefault();

    if (draggedSongIndex === null || draggedSongIndex === index) {
      return;
    }

    const rect = item.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const insertAfter = offsetY > rect.height / 2;

    item.classList.add("drag-over");
    item.classList.toggle("drag-over-top", !insertAfter);
    item.classList.toggle("drag-over-bottom", insertAfter);
  });

  item.addEventListener("dragleave", () => {
    item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
  });

  item.addEventListener("drop", event => {
    event.preventDefault();

    if (draggedSongIndex === null || draggedSongIndex === index) {
      clearDragStyles();
      return;
    }

    const rect = item.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const insertAfter = offsetY > rect.height / 2;

    let targetIndex = index;

    if (insertAfter) {
      targetIndex = index + 1;
    }

    moveSongByDrag(draggedSongIndex, targetIndex);
    clearDragStyles();
  });
}

function clearDragStyles() {
  selectedListEl.querySelectorAll(".setlist-selected-item").forEach(item => {
    item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom", "dragging");
  });
}

function moveSong(fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= selectedSongIds.length ||
    toIndex >= selectedSongIds.length
  ) {
    return;
  }

  const updated = [...selectedSongIds];
  const [movedSongId] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, movedSongId);

  selectedSongIds = updated;
  renderSelectedSongs();
}

function moveSongByDrag(fromIndex, targetIndex) {
  if (fromIndex < 0 || fromIndex >= selectedSongIds.length) {
    return;
  }

  const updated = [...selectedSongIds];
  const [movedSongId] = updated.splice(fromIndex, 1);

  let finalIndex = targetIndex;

  if (fromIndex < targetIndex) {
    finalIndex -= 1;
  }

  if (finalIndex < 0) {
    finalIndex = 0;
  }

  if (finalIndex > updated.length) {
    finalIndex = updated.length;
  }

  updated.splice(finalIndex, 0, movedSongId);

  selectedSongIds = updated;
  renderSelectedSongs();
}

function removeSongFromSetlist(index) {
  selectedSongIds = selectedSongIds.filter((_, currentIndex) => currentIndex !== index);
  renderSongsList();
  renderSelectedSongs();
}

function handleSaveSetlist(event) {
  event.preventDefault();

  const name = setlistNameInput.value.trim();

  if (!name) {
    alert("Debes indicar un nombre para el setlist.");
    return;
  }

  if (selectedSongIds.length === 0) {
    alert("Debes añadir al menos una canción al setlist.");
    return;
  }

  const setlists = loadFromStorage(SETLISTS_STORAGE_KEY, []);

  const newSetlist = {
    id: generateId(),
    name,
    songIds: [...selectedSongIds],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  setlists.push(newSetlist);
  saveToStorage(SETLISTS_STORAGE_KEY, setlists);

  alert("Setlist guardado.");
  resetForm();
}

function handleClearSetlist() {
  const hasContent =
    setlistNameInput.value.trim() !== "" ||
    selectedSongIds.length > 0 ||
    songSearchInput.value.trim() !== "";

  if (!hasContent) {
    return;
  }

  const confirmed = confirm("¿Limpiar el setlist actual?");
  if (!confirmed) return;

  resetForm();
}

function resetForm() {
  setlistForm.reset();
  selectedSongIds = [];
  filteredSongs = [...songs];
  draggedSongIndex = null;
  renderSongsList();
  renderSelectedSongs();
}

function groupSongsByArtist(songList) {
  const groupsMap = new Map();

  songList.forEach(song => {
    const artistName = (song.artist || "Sin artista").trim() || "Sin artista";

    if (!groupsMap.has(artistName)) {
      groupsMap.set(artistName, []);
    }

    groupsMap.get(artistName).push(song);
  });

  return [...groupsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es", { sensitivity: "base" }))
    .map(([artist, artistSongs]) => ({
      artist,
      songs: [...artistSongs].sort(compareSongsByArtistThenTitle)
    }));
}

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

function loadFromStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    console.error(`Error al cargar ${key}:`, error);
    return fallbackValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error al guardar ${key}:`, error);
    alert("No se pudo guardar la información.");
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