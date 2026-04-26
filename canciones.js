const STORAGE_KEY = "setlist_app_songs";

const songsListEl = document.getElementById("songs-list");
const songSearchInput = document.getElementById("song-search");
const songViewer = document.getElementById("song-viewer");
const songViewerEmpty = document.getElementById("song-viewer-empty");

const songTools = document.getElementById("song-tools");
const transposeSelect = document.getElementById("transpose-select");
const notationSelect = document.getElementById("notation-select");

const editSongBtn = document.getElementById("edit-song-btn");
const duplicateSongBtn = document.getElementById("duplicate-song-btn");
const saveTransposedBtn = document.getElementById("save-transposed-btn");
const deleteSongBtn = document.getElementById("delete-song-btn");

const songEditForm = document.getElementById("song-edit-form");
const editSongTitleInput = document.getElementById("edit-song-title");
const editSongArtistInput = document.getElementById("edit-song-artist");
const editSongContentInput = document.getElementById("edit-song-content");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const exportSongsBtn = document.getElementById("export-songs-btn");
const importSongsBtn = document.getElementById("import-songs-btn");
const importSongsFileInput = document.getElementById("import-songs-file");

let songs = [];
let filteredSongs = [];
let selectedSongId = null;

let previewFrameId = null;

init();

function init() {
  songs = loadSongs().sort(compareSongsByArtistThenTitle);
  filteredSongs = [...songs];

  songSearchInput.addEventListener("input", handleSearch);
  transposeSelect.addEventListener("change", renderSelectedSong);
  notationSelect.addEventListener("change", renderSelectedSong);

  editSongBtn.addEventListener("click", openEditForm);
  duplicateSongBtn.addEventListener("click", handleDuplicateSong);
  saveTransposedBtn.addEventListener("click", handleSaveTransposedSong);
  deleteSongBtn.addEventListener("click", handleDeleteSong);

  cancelEditBtn.addEventListener("click", closeEditForm);
  songEditForm.addEventListener("submit", handleSaveEdit);

  editSongTitleInput.addEventListener("input", scheduleSelectedSongRender);
  editSongArtistInput.addEventListener("input", scheduleSelectedSongRender);
  editSongContentInput.addEventListener("input", scheduleSelectedSongRender);

  exportSongsBtn.addEventListener("click", handleExportSongs);
  importSongsBtn.addEventListener("click", () => importSongsFileInput.click());
  importSongsFileInput.addEventListener("change", handleImportSongsFile);

  renderSongsList();
  renderSelectedSong();
}

function scheduleSelectedSongRender() {
  if (previewFrameId) {
    cancelAnimationFrame(previewFrameId);
  }

  previewFrameId = requestAnimationFrame(() => {
    previewFrameId = null;
    renderSelectedSong();
  });
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

/* =========================
   LISTA LATERAL
========================= */

function renderSongsList() {
  songsListEl.innerHTML = "";

  if (filteredSongs.length === 0) {
    songsListEl.innerHTML = `<div class="songs-empty-state">No hay canciones guardadas.</div>`;
    return;
  }

  const groupedSongs = groupSongsByArtist(filteredSongs);
  const hasSearch = songSearchInput.value.trim() !== "";

  groupedSongs.forEach(group => {
    const details = document.createElement("details");
    details.className = "song-artist-group";

    if (hasSearch || group.songs.some(song => song.id === selectedSongId)) {
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
        <div class="song-list-title">${escapeHtml(song.title || "Sin título")}</div>
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
  songViewer.innerHTML = "";

  const isEditing = !songEditForm.classList.contains("hidden");

  const previewTitle = isEditing
    ? (editSongTitleInput.value.trim() || "Sin título")
    : (song.title || "Sin título");

  const previewArtist = isEditing
    ? editSongArtistInput.value.trim()
    : (song.artist || "");

  const previewContent = isEditing
    ? editSongContentInput.value
    : (song.content || "");

  const parsed = SongPrint.parseContent(previewContent);

  const transposeAmount = Number(transposeSelect.value || 0);
  const notation = notationSelect.value || "sharp";

  const chordSize = 18;
  const lyricSize = 18;
  const lineGap = 4;
  const stanzaGap = 18;

  SongPrint.renderSongPages(songViewer, parsed, {
    title: previewTitle,
    artist: previewArtist,
    chordSize,
    lyricSize,
    lineGap,
    stanzaGap,
    transposeAmount,
    notation
  });
}

/* =========================
   EDICIÓN
========================= */

function openEditForm() {
  const song = songs.find(item => item.id === selectedSongId);
  if (!song) return;

  editSongTitleInput.value = song.title || "";
  editSongArtistInput.value = song.artist || "";
  editSongContentInput.value = song.content || "";

  songEditForm.classList.remove("hidden");
  renderSelectedSong();
}

function closeEditForm() {
  songEditForm.classList.add("hidden");
  songEditForm.reset();
  renderSelectedSong();
}

function handleSaveEdit(event) {
  event.preventDefault();

  const song = songs.find(item => item.id === selectedSongId);
  if (!song) return;

  const title = editSongTitleInput.value.trim();
  const artist = editSongArtistInput.value.trim();
  const content = editSongContentInput.value;

  if (!title) {
    alert("Debes indicar el nombre de la canción.");
    return;
  }

  if (!content.trim()) {
    alert("Debes indicar la letra o los acordes.");
    return;
  }

  song.title = title;
  song.artist = artist;
  song.content = content;
  song.updatedAt = new Date().toISOString();

  songs.sort(compareSongsByArtistThenTitle);
  saveSongs(songs);

  filteredSongs = applyCurrentFilter();

  closeEditForm();
  renderSongsList();
  renderSelectedSong();
}

function handleDeleteSong() {
  const song = songs.find(item => item.id === selectedSongId);
  if (!song) return;

  const confirmed = confirm(`¿Eliminar "${song.title || "Sin título"}"?`);
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
   DUPLICAR Y GUARDAR TRANSPUESTA
========================= */

function handleDuplicateSong() {
  const song = songs.find(item => item.id === selectedSongId);
  if (!song) return;

  const duplicatedSong = {
    ...song,
    id: generateId(),
    title: buildDuplicatedTitle(song.title || "Sin título"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  songs.push(duplicatedSong);
  songs.sort(compareSongsByArtistThenTitle);
  saveSongs(songs);

  filteredSongs = applyCurrentFilter();
  selectedSongId = duplicatedSong.id;

  closeEditForm();
  renderSongsList();
  renderSelectedSong();
}

function handleSaveTransposedSong() {
  const song = songs.find(item => item.id === selectedSongId);
  if (!song) return;

  const transposeAmount = Number(transposeSelect.value || 0);
  const notation = notationSelect.value || "sharp";

  if (transposeAmount === 0) {
    alert("Selecciona un transporte distinto de 0 para guardar una versión transpuesta.");
    return;
  }

  const confirmed = confirm(
    `¿Guardar una nueva canción transpuesta ${transposeAmount > 0 ? "+" : ""}${transposeAmount}?`
  );

  if (!confirmed) return;

  const transposedContent = transposeSongContent(
    song.content || "",
    transposeAmount,
    notation
  );

  const newSong = {
    ...song,
    id: generateId(),
    title: `${song.title || "Sin título"} (${formatTransposeLabel(transposeAmount, notation)})`,
    content: transposedContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  songs.push(newSong);
  songs.sort(compareSongsByArtistThenTitle);
  saveSongs(songs);

  filteredSongs = applyCurrentFilter();
  selectedSongId = newSong.id;
  transposeSelect.value = "0";

  closeEditForm();
  renderSongsList();
  renderSelectedSong();
}

function transposeSongContent(content, steps, notation = "sharp") {
  const rawLines = content.replace(/\r/g, "").split("\n");

  return rawLines
    .map(line => {
      if (!SongPrint.isChordOnlyLine(line)) {
        return line;
      }

      return transposeChordLineText(line, steps, notation);
    })
    .join("\n");
}

function transposeChordLineText(line, steps, notation = "sharp") {
  return line.replace(/\(([^)]+)\)([AR]?)|\[([^\]]+)\]/g, (match, chordInParens, colorSuffix, bracketText) => {
    if (chordInParens) {
      const transposed = transposeChordText(chordInParens, steps, notation);
      return `(${transposed})${colorSuffix || ""}`;
    }

    if (bracketText) {
      return `[${bracketText}]`;
    }

    return match;
  });
}

function buildDuplicatedTitle(title) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return "Canción duplicada";
  }

  if (/\(copia(?: \d+)?\)$/i.test(trimmedTitle)) {
    return `${trimmedTitle} 2`;
  }

  return `${trimmedTitle} (copia)`;
}

function formatTransposeLabel(steps, notation = "sharp") {
  return `tono ${steps > 0 ? "+" : ""}${steps} ${notation === "flat" ? "b" : "#"}`;
}

/* =========================
   TRANSPORTE
========================= */

const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_TO_INDEX = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11
};

function transposeChordText(chordText, steps, notation = "sharp") {
  if (!steps) {
    return convertChordNotation(chordText, notation);
  }

  return chordText.replace(/[A-G](?:#|b)?/g, note =>
    transposeSingleNote(note, steps, notation)
  );
}

function transposeSingleNote(note, steps, notation = "sharp") {
  const currentIndex = NOTE_TO_INDEX[note];

  if (currentIndex === undefined) {
    return note;
  }

  const nextIndex = (currentIndex + steps + 120) % 12;

  return notation === "flat"
    ? NOTES_FLAT[nextIndex]
    : NOTES_SHARP[nextIndex];
}

function convertChordNotation(chordText, notation = "sharp") {
  return chordText.replace(/[A-G](?:#|b)?/g, note => {
    const index = NOTE_TO_INDEX[note];

    if (index === undefined) {
      return note;
    }

    return notation === "flat"
      ? NOTES_FLAT[index]
      : NOTES_SHARP[index];
  });
}

/* =========================
   EXPORTAR
========================= */

function handleExportSongs() {
  const payload = {
    app: "traklist",
    version: 1,
    exportedAt: new Date().toISOString(),
    songs
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `traklist_canciones_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function handleImportSongsFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedSongs = normalizeImportedSongs(parsed);

      if (importedSongs.length === 0) {
        alert("El archivo no contiene canciones válidas.");
        resetImportInput();
        return;
      }

      const importMode = confirm(
        "Pulsa Aceptar para fusionar con las canciones actuales.\n\nPulsa Cancelar si prefieres reemplazar todas manualmente en una siguiente versión."
      );

      if (importMode) {
        mergeImportedSongs(importedSongs);
      }
    } catch (error) {
      console.error("Error al importar canciones:", error);
      alert("El archivo JSON no es válido.");
    }

    resetImportInput();
  };

  reader.onerror = () => {
    alert("No se pudo leer el archivo.");
    resetImportInput();
  };

  reader.readAsText(file, "utf-8");
}

function resetImportInput() {
  importSongsFileInput.value = "";
}

function normalizeImportedSongs(data) {
  const rawSongs = Array.isArray(data) ? data : data?.songs;

  if (!Array.isArray(rawSongs)) {
    return [];
  }

  return rawSongs
    .filter(isValidImportedSong)
    .map(song => ({
      id: typeof song.id === "string" && song.id.trim() ? song.id : generateId(),
      title: String(song.title || "").trim(),
      artist: String(song.artist || "").trim(),
      content: String(song.content || ""),
      printSettings: {
        chordSize: Number(song.printSettings?.chordSize || 16),
        lyricSize: Number(song.printSettings?.lyricSize || 16),
        lineGap: Number(song.printSettings?.lineGap || 4),
        stanzaGap: Number(song.printSettings?.stanzaGap || 16)
      },
      createdAt: song.createdAt || new Date().toISOString(),
      updatedAt: song.updatedAt || new Date().toISOString()
    }));
}

function isValidImportedSong(song) {
  return (
    song &&
    typeof song === "object" &&
    typeof song.title === "string" &&
    song.title.trim() !== "" &&
    typeof song.content === "string"
  );
}

function mergeImportedSongs(importedSongs) {
  const existingIds = new Set(songs.map(song => song.id));
  const preparedSongs = importedSongs.map(song => {
    let nextId = song.id;

    if (existingIds.has(nextId)) {
      nextId = generateId();
    }

    existingIds.add(nextId);

    return {
      ...song,
      id: nextId
    };
  });

  songs = [...songs, ...preparedSongs].sort(compareSongsByArtistThenTitle);
  saveSongs(songs);

  filteredSongs = applyCurrentFilter();
  renderSongsList();
  renderSelectedSong();

  alert(`Se han importado ${preparedSongs.length} canciones.`);
}

function replaceAllSongs(importedSongs) {
  songs = [...importedSongs].sort(compareSongsByArtistThenTitle);
  selectedSongId = null;

  saveSongs(songs);
  filteredSongs = applyCurrentFilter();
  closeEditForm();
  renderSongsList();
  renderSelectedSong();

  alert(`Se han cargado ${importedSongs.length} canciones.`);
}

/* =========================
   UTILIDADES
========================= */

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