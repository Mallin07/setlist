const STORAGE_KEY = "setlist_app_songs";

const titleInput = document.getElementById("song-title");
const artistInput = document.getElementById("song-artist");
const contentInput = document.getElementById("song-content");

const printPreview = document.getElementById("print-preview-page");

const form = document.getElementById("song-form");
const clearBtn = document.getElementById("clear-all");

let previewFrameId = null;

init();

function init() {
  titleInput.addEventListener("input", scheduleRender);
  artistInput.addEventListener("input", scheduleRender);
  contentInput.addEventListener("input", scheduleRender);

  form.addEventListener("submit", handleSave);
  clearBtn.addEventListener("click", handleClear);

  renderAll();
}

function scheduleRender() {
  if (previewFrameId) {
    cancelAnimationFrame(previewFrameId);
  }

  previewFrameId = requestAnimationFrame(() => {
    previewFrameId = null;
    renderAll();
  });
}

async function renderAll() {
  const parsed = SongPrint.parseContent(contentInput.value);

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  await SongPrint.renderSongPages(printPreview, parsed, {
    title: titleInput.value.trim() || "Sin título",
    artist: artistInput.value.trim(),
    chordSize: 18,
    lyricSize: 18,
    lineGap: 4,
    stanzaGap: 18,
    transposeAmount: 0,
    notation: "sharp"
  });
}

/* =========================
   GUARDAR
========================= */

function handleSave(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const artist = artistInput.value.trim();
  const content = contentInput.value;

  if (!title) {
    alert("Debes introducir el nombre de la canción.");
    return;
  }

  if (!content.trim()) {
    alert("Debes introducir la letra o los acordes.");
    return;
  }

  const songs = loadSongs();

  songs.push({
    id: generateId(),
    title,
    artist,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  saveSongs(songs);
  alert("Canción guardada");
}

function handleClear() {
  const confirmed = confirm("¿Limpiar todo?");
  if (!confirmed) return;

  form.reset();
  renderAll();
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

function saveSongs(songs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch (error) {
    console.error("Error al guardar canciones:", error);
    alert("No se pudo guardar la canción.");
  }
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}