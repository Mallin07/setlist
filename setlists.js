const SONGS_STORAGE_KEY = "setlist_app_songs";
const SETLISTS_STORAGE_KEY = "setlist_app_setlists";

const setlistSearchInput = document.getElementById("setlist-search");
const setlistsListEl = document.getElementById("setlists-list");

const setlistViewerEmpty = document.getElementById("setlist-viewer-empty");
const setlistTools = document.getElementById("setlist-tools");
const setlistViewer = document.getElementById("setlist-viewer");

const editSetlistBtn = document.getElementById("edit-setlist-btn");
const duplicateSetlistBtn = document.getElementById("duplicate-setlist-btn");
const exportSetlistPdfBtn = document.getElementById("export-setlist-pdf-btn");
const deleteSetlistBtn = document.getElementById("delete-setlist-btn");

const setlistEditForm = document.getElementById("setlist-edit-form");
const editSetlistNameInput = document.getElementById("edit-setlist-name");
const editSetlistSongsEmpty = document.getElementById("edit-setlist-songs-empty");
const editSetlistSongsList = document.getElementById("edit-setlist-songs-list");
const cancelEditSetlistBtn = document.getElementById("cancel-edit-setlist-btn");

const viewerSetlistTitle = document.getElementById("viewer-setlist-title");
const viewerSetlistMeta = document.getElementById("viewer-setlist-meta");
const viewerSetlistSongsEmpty = document.getElementById("viewer-setlist-songs-empty");
const viewerSetlistSongs = document.getElementById("viewer-setlist-songs");

let songs = [];
let setlists = [];
let filteredSetlists = [];
let selectedSetlistId = null;
let editingSongIds = [];
let draggedSongIndex = null;

init();

function init() {
  songs = getSongsData().sort(compareSongsByArtistThenTitle);
  setlists = loadFromStorage(SETLISTS_STORAGE_KEY, []).sort(compareSetlistsByName);
  filteredSetlists = [...setlists];

  setlistSearchInput.addEventListener("input", handleSearch);

  editSetlistBtn.addEventListener("click", openEditForm);
  duplicateSetlistBtn.addEventListener("click", handleDuplicateSetlist);
  exportSetlistPdfBtn.addEventListener("click", handleExportSetlistPdf);
  deleteSetlistBtn.addEventListener("click", handleDeleteSetlist);

  setlistEditForm.addEventListener("submit", handleSaveEditSetlist);
  cancelEditSetlistBtn.addEventListener("click", closeEditForm);

  renderSetlistsList();
  renderSelectedSetlist();
}

/* =========================
   FILTRO Y LISTADO
========================= */

function handleSearch() {
  filteredSetlists = applyCurrentFilter();

  if (!filteredSetlists.some(setlist => setlist.id === selectedSetlistId)) {
    selectedSetlistId = null;
    closeEditForm();
  }

  renderSetlistsList();
  renderSelectedSetlist();
}

function renderSetlistsList() {
  setlistsListEl.innerHTML = "";

  if (filteredSetlists.length === 0) {
    setlistsListEl.innerHTML = `<div class="songs-empty-state">No hay setlists guardados.</div>`;
    return;
  }

  filteredSetlists.forEach(setlist => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "setlist-list-item";

    if (setlist.id === selectedSetlistId) {
      item.classList.add("active");
    }

    const songCount = Array.isArray(setlist.songIds) ? setlist.songIds.length : 0;

    item.innerHTML = `
      <div class="setlist-list-title">${escapeHtml(setlist.name || "Sin nombre")}</div>
      <div class="setlist-list-meta">${songCount} ${songCount === 1 ? "canción" : "canciones"}</div>
    `;

    item.addEventListener("click", () => {
      selectedSetlistId = setlist.id;
      closeEditForm();
      renderSetlistsList();
      renderSelectedSetlist();
    });

    setlistsListEl.appendChild(item);
  });
}

/* =========================
   VISOR
========================= */

function renderSelectedSetlist() {
  const setlist = getSelectedSetlist();

  if (!setlist) {
    setlistViewerEmpty.classList.remove("hidden");
    setlistTools.classList.add("hidden");
    setlistViewer.classList.add("hidden");

    viewerSetlistTitle.textContent = "Setlist";
    viewerSetlistMeta.textContent = "";
    viewerSetlistSongs.innerHTML = "";
    viewerSetlistSongsEmpty.classList.add("hidden");
    return;
  }

  setlistViewerEmpty.classList.add("hidden");
  setlistTools.classList.remove("hidden");
  setlistViewer.classList.remove("hidden");

  viewerSetlistTitle.textContent = setlist.name || "Sin nombre";

  const validSongs = getSetlistSongs(setlist);
  const totalSongs = Array.isArray(setlist.songIds) ? setlist.songIds.length : 0;
  const missingSongs = Math.max(0, totalSongs - validSongs.length);

  const totalDurationSeconds = getSetlistTotalDuration(setlist);

  let metaText = `${totalSongs} ${totalSongs === 1 ? "canción" : "canciones"} · Duración total: ${formatDuration(totalDurationSeconds)}`;

  if (missingSongs > 0) {
    metaText += ` · ${missingSongs} no ${missingSongs === 1 ? "encontrada" : "encontradas"}`;
  }

  viewerSetlistMeta.textContent = metaText;

  renderViewerSongs(setlist);
}

function renderViewerSongs(setlist) {
  viewerSetlistSongs.innerHTML = "";

  const songIds = Array.isArray(setlist.songIds) ? setlist.songIds : [];

  if (songIds.length === 0) {
    viewerSetlistSongsEmpty.classList.remove("hidden");
    return;
  }

  viewerSetlistSongsEmpty.classList.add("hidden");

  songIds.forEach((songId, index) => {
    const song = songs.find(item => item.id === songId);

    const item = document.createElement("div");
    item.className = "setlist-song-view-item";

    item.innerHTML = `
      <div class="setlist-song-view-position">${index + 1}</div>

      <div class="setlist-song-view-main">
        <div class="setlist-song-view-title">${escapeHtml(song?.title || "Canción no encontrada")}</div>
        <div class="setlist-song-view-meta">${escapeHtml(song?.artist || "Sin artista")}</div>
        <div class="setlist-song-view-pdf">${escapeHtml(song?.pdfName || "PDF")}</div>
      </div>
    `;

    viewerSetlistSongs.appendChild(item);
  });
}

/* =========================
   EDICIÓN
========================= */

function openEditForm() {
  const setlist = getSelectedSetlist();

  if (!setlist) return;

  editSetlistNameInput.value = setlist.name || "";
  editingSongIds = [...(setlist.songIds || [])];

  setlistEditForm.classList.remove("hidden");
  renderEditSongs();
}

function closeEditForm() {
  setlistEditForm.classList.add("hidden");
  setlistEditForm.reset();
  editSetlistSongsList.innerHTML = "";
  editSetlistSongsEmpty.classList.add("hidden");
  editingSongIds = [];
  draggedSongIndex = null;
}

function renderEditSongs() {
  editSetlistSongsList.innerHTML = "";

  if (editingSongIds.length === 0) {
    editSetlistSongsEmpty.classList.remove("hidden");
    return;
  }

  editSetlistSongsEmpty.classList.add("hidden");

  editingSongIds.forEach((songId, index) => {
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
    removeBtn.addEventListener("click", () => removeSongFromEdit(index));

    setupDragAndDrop(item, index);

    editSetlistSongsList.appendChild(item);
  });
}

function handleSaveEditSetlist(event) {
  event.preventDefault();

  const setlist = getSelectedSetlist();

  if (!setlist) return;

  const name = editSetlistNameInput.value.trim();

  if (!name) {
    alert("Debes indicar un nombre para el setlist.");
    return;
  }

  if (editingSongIds.length === 0) {
    alert("El setlist debe tener al menos una canción.");
    return;
  }

  setlist.name = name;
  setlist.songIds = [...editingSongIds];
  setlist.updatedAt = new Date().toISOString();

  setlists.sort(compareSetlistsByName);
  saveToStorage(SETLISTS_STORAGE_KEY, setlists);

  filteredSetlists = applyCurrentFilter();

  closeEditForm();
  renderSetlistsList();
  renderSelectedSetlist();
}

function removeSongFromEdit(index) {
  editingSongIds = editingSongIds.filter((_, currentIndex) => currentIndex !== index);
  renderEditSongs();
}

/* =========================
   DRAG AND DROP
========================= */

function setupDragAndDrop(item, index) {
  item.addEventListener("dragstart", event => {
    draggedSongIndex = index;
    item.classList.add("dragging");
    editSetlistSongsList.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  });

  item.addEventListener("dragend", () => {
    draggedSongIndex = null;
    editSetlistSongsList.classList.remove("is-dragging");
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

function moveSongByDrag(fromIndex, targetIndex) {
  if (fromIndex < 0 || fromIndex >= editingSongIds.length) {
    return;
  }

  const updated = [...editingSongIds];
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

  editingSongIds = updated;
  renderEditSongs();
}

function clearDragStyles() {
  editSetlistSongsList.querySelectorAll(".setlist-selected-item").forEach(item => {
    item.classList.remove("drag-over", "drag-over-top", "drag-over-bottom", "dragging");
  });
}

/* =========================
   ACCIONES
========================= */

function handleDuplicateSetlist() {
  const setlist = getSelectedSetlist();

  if (!setlist) return;

  const duplicatedSetlist = {
    ...setlist,
    id: generateId(),
    name: buildDuplicatedSetlistName(setlist.name || "Setlist"),
    songIds: [...(setlist.songIds || [])],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  setlists.push(duplicatedSetlist);
  setlists.sort(compareSetlistsByName);
  saveToStorage(SETLISTS_STORAGE_KEY, setlists);

  filteredSetlists = applyCurrentFilter();
  selectedSetlistId = duplicatedSetlist.id;

  closeEditForm();
  renderSetlistsList();
  renderSelectedSetlist();
}

function handleDeleteSetlist() {
  const setlist = getSelectedSetlist();

  if (!setlist) return;

  const confirmed = confirm(`¿Eliminar el setlist "${setlist.name || "Sin nombre"}"?`);

  if (!confirmed) return;

  setlists = setlists.filter(item => item.id !== selectedSetlistId);
  saveToStorage(SETLISTS_STORAGE_KEY, setlists);

  filteredSetlists = applyCurrentFilter();
  selectedSetlistId = null;

  closeEditForm();
  renderSetlistsList();
  renderSelectedSetlist();
}

/* =========================
   EXPORTAR PDF
========================= */

async function handleExportSetlistPdf() {
  const setlist = getSelectedSetlist();

  if (!setlist) return;

  const setlistSongs = getSetlistSongs(setlist);

  if (setlistSongs.length === 0) {
    alert("Este setlist no tiene canciones válidas para exportar.");
    return;
  }

  const songsWithoutPdf = setlistSongs.filter(song => !song.pdfPath);

  if (songsWithoutPdf.length > 0) {
    alert("Hay canciones sin PDF. Revisa la biblioteca antes de exportar.");
    return;
  }

  if (!window.PDFLib) {
    alert("No se pudo cargar la librería para unir PDFs.");
    return;
  }

  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    const mergedPdf = await PDFDocument.create();

    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const marginX = 50;
    const bottomMargin = 60;
    const lineHeight = 22;

    let coverPage = mergedPdf.addPage([pageWidth, pageHeight]);

    function drawCoverHeader(page) {
      let y = 760;

      page.drawText(setlist.name || "Setlist", {
        x: marginX,
        y,
        size: 26,
        font: boldFont,
        color: rgb(0.07, 0.09, 0.15)
      });

      y -= 40;

      page.drawText(`${setlistSongs.length} ${setlistSongs.length === 1 ? "canción" : "canciones"}`, {
        x: marginX,
        y,
        size: 12,
        font,
        color: rgb(0.3, 0.34, 0.42)
      });

      y -= 50;

      page.drawText("Listado de canciones", {
        x: marginX,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.07, 0.09, 0.15)
      });

      return y - 30;
    }

    function splitTextIntoLines(text, maxWidth, textFont, fontSize) {
      const words = String(text).split(" ");
      const lines = [];
      let currentLine = "";

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = textFont.widthOfTextAtSize(testLine, fontSize);

        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }

          currentLine = word;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    }

    let y = drawCoverHeader(coverPage);

    setlistSongs.forEach((song, index) => {
      const line = `${index + 1}. ${song.title || "Sin título"}${song.artist ? ` — ${song.artist}` : ""}`;
      const lines = splitTextIntoLines(line, pageWidth - marginX * 2, font, 12);

      lines.forEach(textLine => {
        if (y < bottomMargin) {
          coverPage = mergedPdf.addPage([pageWidth, pageHeight]);
          y = drawCoverHeader(coverPage);
        }

        coverPage.drawText(textLine, {
          x: marginX,
          y,
          size: 12,
          font,
          color: rgb(0.07, 0.09, 0.15)
        });

        y -= lineHeight;
      });
    });

    for (const song of setlistSongs) {
      const response = await fetch(song.pdfPath);

      if (!response.ok) {
        throw new Error(`No se pudo cargar: ${song.pdfPath}`);
      }

      const pdfBytes = await response.arrayBuffer();
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });
    }

    const finalPdfBytes = await mergedPdf.save();

    const blob = new Blob([finalPdfBytes], {
      type: "application/pdf"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(setlist.name || "setlist")}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error al exportar setlist:", error);
    alert("No se pudo exportar el setlist. Revisa que los PDFs existan en assets/songs y que estés abriendo la web desde servidor local.");
  }
}

function buildPrintableSetlistHtml(setlist, setlistSongs) {
  const payload = {
    setlist: {
      name: setlist.name || "Setlist"
    },
    songs: setlistSongs.map(song => ({
      title: song.title || "Sin título",
      artist: song.artist || "",
      pdfName: song.pdfName || "PDF",
      pdfDataUrl: song.pdfDataUrl || ""
    }))
  };

  const indexHtml = payload.songs
    .map((song, index) => {
      const artistHtml = song.artist
        ? `<span class="setlist-index-artist">— ${escapeHtml(song.artist)}</span>`
        : "";

      return `
        <li>
          <span class="setlist-index-number">${index + 1}.</span>
          <span class="setlist-index-title">${escapeHtml(song.title)}</span>
          ${artistHtml}
        </li>
      `;
    })
    .join("");

  const pdfSections = payload.songs
    .map(song => `
      <section class="pdf-section">
        <iframe src="${song.pdfDataUrl}" title="${escapeHtml(song.title)}"></iframe>
      </section>
    `)
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(payload.setlist.name)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }

    .setlist-cover {
      min-height: 100vh;
      padding: 15mm;
      page-break-after: always;
      break-after: page;
    }

    .setlist-cover-header {
      margin-bottom: 10mm;
      padding-bottom: 5mm;
      border-bottom: 1px solid #dbe3ef;
    }

    .setlist-cover-header h1 {
      margin: 0 0 4mm;
      font-size: 24pt;
      line-height: 1.2;
    }

    .setlist-cover-header p {
      margin: 0;
      color: #4b5563;
      font-size: 11pt;
    }

    .setlist-index-title-block h2 {
      margin: 0 0 6mm;
      font-size: 15pt;
    }

    .setlist-index {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }

    .setlist-index li {
      font-size: 12pt;
      line-height: 1.35;
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
    }

    .setlist-index-number,
    .setlist-index-title {
      font-weight: 700;
    }

    .setlist-index-number {
      min-width: 24px;
      flex-shrink: 0;
    }

    .setlist-index-artist {
      color: #4b5563;
    }

    .pdf-section {
      width: 100vw;
      height: 100vh;
      page-break-before: always;
      break-before: page;
      overflow: hidden;
    }

    .pdf-section iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }

    @media print {
      @page {
        size: A4;
        margin: 0;
      }

      .setlist-cover {
        padding: 15mm;
      }

      .pdf-section {
        width: 100vw;
        height: 100vh;
      }
    }
  </style>
</head>
<body>
  <section class="setlist-cover">
    <div class="setlist-cover-header">
      <h1>${escapeHtml(payload.setlist.name)}</h1>
      <p>${payload.songs.length} ${payload.songs.length === 1 ? "canción" : "canciones"}</p>
    </div>

    <div class="setlist-index-title-block">
      <h2>Listado de canciones</h2>

      <ol class="setlist-index">
        ${indexHtml}
      </ol>
    </div>
  </section>

  ${pdfSections}

  <script>
    setTimeout(() => {
      window.focus();
      window.print();
    }, 700);
  <\/script>
</body>
</html>
  `;
}

/* =========================
   UTILIDADES
========================= */

function getSelectedSetlist() {
  return setlists.find(item => item.id === selectedSetlistId) || null;
}

function getSetlistSongs(setlist) {
  const songIds = Array.isArray(setlist.songIds) ? setlist.songIds : [];

  return songIds
    .map(songId => songs.find(song => song.id === songId))
    .filter(Boolean);
}

function applyCurrentFilter() {
  const term = setlistSearchInput.value.trim().toLocaleLowerCase("es");

  return setlists.filter(setlist =>
    (setlist.name || "").toLocaleLowerCase("es").includes(term)
  );
}

function compareSetlistsByName(a, b) {
  const nameA = (a.name || "").trim().toLocaleLowerCase("es");
  const nameB = (b.name || "").trim().toLocaleLowerCase("es");

  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;

  return 0;
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

function buildDuplicatedSetlistName(name) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "Setlist duplicado";
  }

  if (/\(copia(?: \d+)?\)$/i.test(trimmedName)) {
    return `${trimmedName} 2`;
  }

  return `${trimmedName} (copia)`;
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

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function sanitizeFileName(name) {
  return String(name)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function sanitizeFileName(name) {
  return String(name)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function getSetlistTotalDuration(setlist) {
  const songIds = Array.isArray(setlist.songIds) ? setlist.songIds : [];

  return songIds.reduce((total, songId) => {
    const song = songs.find(item => item.id === songId);
    return total + Number(song?.durationSeconds || 0);
  }, 0);
}

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds || 0);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSongsData() {
  return Array.isArray(window.SONGS_DATA)
    ? [...window.SONGS_DATA]
    : [];
}