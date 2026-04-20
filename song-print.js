(function () {

  /* =========================
     NOTAS
  ========================= */

  const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const NOTES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

  const NOTE_TO_INDEX = {
    C: 0, "B#": 0,
    "C#": 1, Db: 1,
    D: 2,
    "D#": 3, Eb: 3,
    E: 4, Fb: 4,
    "E#": 5, F: 5,
    "F#": 6, Gb: 6,
    G: 7,
    "G#": 8, Ab: 8,
    A: 9,
    "A#": 10, Bb: 10,
    B: 11, Cb: 11
  };

  function mmToPx(mm) {
    return mm * 3.7795275591;
  }

  /* =========================
     PARSER
  ========================= */

  function parseContent(text) {
    const rawLines = String(text || "").replace(/\r/g, "").split("\n");
    const blocks = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (line.trim() === "") {
        blocks.push({ type: "blank" });
        continue;
      }

      if (isChordOnlyLine(line)) {
        const nextLine = rawLines[i + 1] ?? "";
        blocks.push({
          type: "pair",
          chordLine: parseChordLine(line),
          lyricLine: nextLine
        });
        i++;
      } else {
        blocks.push({
          type: "lyric",
          lyricLine: line
        });
      }
    }

    return blocks;
  }

  function isChordOnlyLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    const regex = /^(\s*(\(([^)]+)\)([AR]?)|\[([^\]]+)\])\s*)+$/;
    return regex.test(trimmed);
  }

  function parseChordLine(line) {
    const parts = [];
    const regex = /\(([^)]+)\)([AR]?)|\[([^\]]+)\]|(\s+)|([^\s]+)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match[1]) {
        let color = "black";
        if (match[2] === "A") color = "blue";
        if (match[2] === "R") color = "red";

        parts.push({
          type: "chord",
          value: match[1],
          color,
          transpose: true,
          sourceWidth: match[0].length
        });
        continue;
      }

      if (match[3]) {
        parts.push({
          type: "chord",
          value: match[3],
          color: "red",
          transpose: false,
          sourceWidth: match[0].length
        });
        continue;
      }

      if (match[4]) {
        parts.push({ type: "space", value: match[4] });
        continue;
      }

      if (match[5]) {
        parts.push({
          type: "text",
          value: match[5],
          sourceWidth: match[0].length
        });
      }
    }

    return parts;
  }

  /* =========================
     TRANSPOSICIÓN
  ========================= */

  function transposeChordText(chordText, steps, notation = "sharp") {
    if (!steps) return convertChordNotation(chordText, notation);

    return chordText.replace(/[A-G](?:#|b)?/g, note =>
      transposeSingleNote(note, steps, notation)
    );
  }

  function transposeSingleNote(note, steps, notation = "sharp") {
    const idx = NOTE_TO_INDEX[note];
    if (idx === undefined) return note;

    const next = (idx + steps + 120) % 12;
    return notation === "flat" ? NOTES_FLAT[next] : NOTES_SHARP[next];
  }

  function convertChordNotation(chordText, notation = "sharp") {
    return chordText.replace(/[A-G](?:#|b)?/g, note => {
      const idx = NOTE_TO_INDEX[note];
      if (idx === undefined) return note;
      return notation === "flat" ? NOTES_FLAT[idx] : NOTES_SHARP[idx];
    });
  }

  /* =========================
     PRINT PAGE
  ========================= */

  function createPrintPage(pageNumber, titleText, artistText, transposeAmount = 0, notation = "sharp") {
    const page = document.createElement("div");
    page.className = "print-page";

    if (pageNumber === 1) {
      const header = document.createElement("div");
      header.className = "print-header";

      const title = document.createElement("h2");
      title.textContent = titleText;
      header.appendChild(title);

      if (artistText) {
        const artist = document.createElement("p");
        artist.textContent = artistText;
        header.appendChild(artist);
      }

      page.appendChild(header);
    }

    const body = document.createElement("div");
    body.className = "print-body";
    page.appendChild(body);

    return page;
  }

  /* =========================
     HELPERS DE TEXTO EN ROJO
  ========================= */

  function appendBracketStyledText(container, text, redClassName = "chord-red") {
    const line = String(text || "");
    const regex = /\[([^\]]+)\]/g;

    let lastIndex = 0;
    let matchFound = false;
    let match;

    while ((match = regex.exec(line)) !== null) {
      matchFound = true;

      const normalText = line.slice(lastIndex, match.index);
      if (normalText) {
        container.appendChild(document.createTextNode(normalText));
      }

      const redSpan = document.createElement("span");
      redSpan.className = redClassName;
      redSpan.textContent = match[1];
      container.appendChild(redSpan);

      lastIndex = regex.lastIndex;
    }

    if (!matchFound) {
      container.textContent = line || " ";
      return;
    }

    const remainingText = line.slice(lastIndex);
    if (remainingText) {
      container.appendChild(document.createTextNode(remainingText));
    }
  }

  /* =========================
     BLOQUES
  ========================= */

  function buildPrintBlock(block, chordSize, lyricSize, lineGap, stanzaGap, transposeAmount = 0, notation = "sharp") {

    if (block.type === "blank") {
      const el = document.createElement("div");
      el.style.height = `${stanzaGap}px`;
      return el;
    }

    if (block.type === "lyric") {
      const el = document.createElement("div");
      el.className = "print-lyric-line";
      el.style.fontSize = `${lyricSize}px`;
      el.style.marginBottom = `${lineGap}px`;

      appendBracketStyledText(el, block.lyricLine || " ");

      return el;
    }

    if (block.type === "pair") {
      const wrapper = document.createElement("div");
      wrapper.className = "print-line-pair";
      wrapper.style.marginBottom = `${lineGap}px`;

      const chordLine = document.createElement("div");
      chordLine.className = "print-chord-line";
      chordLine.style.fontSize = `${chordSize}px`;

      block.chordLine.forEach(part => {
        const span = document.createElement("span");

        if (part.type === "space") {
          span.textContent = part.value;
        } else if (part.type === "chord") {
          span.textContent = part.transpose
            ? transposeChordText(part.value, transposeAmount, notation)
            : part.value;

          span.className = `chord-${part.color}`;
          span.style.display = "inline-block";
          span.style.width = `${part.sourceWidth || span.textContent.length}ch`;
        } else {
          span.textContent = part.value;
          span.style.display = "inline-block";
          span.style.width = `${part.sourceWidth || span.textContent.length}ch`;
        }

        span.style.whiteSpace = "pre";
        span.style.textAlign = "left";

        chordLine.appendChild(span);
      });

      const lyricLine = document.createElement("div");
      lyricLine.className = "print-lyric-line";
      lyricLine.style.fontSize = `${lyricSize}px`;

      appendBracketStyledText(lyricLine, block.lyricLine || " ");

      wrapper.appendChild(chordLine);
      wrapper.appendChild(lyricLine);

      return wrapper;
    }

    return document.createElement("div");
  }

  /* =========================
     RENDER FINAL
  ========================= */

  async function renderSongPages(container, parsed, settings) {

    const {
      title = "Sin título",
      artist = "",
      chordSize = 22,
      lyricSize = 22,
      lineGap = 7,
      stanzaGap = 22,
      transposeAmount = 0,
      notation = "sharp"
    } = settings || {};

    container.innerHTML = "";
    container.classList.add("print-preview-mode");

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const PAGE_HEIGHT = mmToPx(297 - 30);

    let currentPage = createPrintPage(1, title, artist, transposeAmount, notation);
    let currentBody = currentPage.querySelector(".print-body");

    container.appendChild(currentPage);

    parsed.forEach(block => {
      const blockEl = buildPrintBlock(
        block,
        chordSize,
        lyricSize,
        lineGap,
        stanzaGap,
        transposeAmount,
        notation
      );

      currentBody.appendChild(blockEl);

      if (currentBody.scrollHeight > PAGE_HEIGHT - 4) {
        currentBody.removeChild(blockEl);

        const pageNum = container.querySelectorAll(".print-page").length + 1;

        currentPage = createPrintPage(
          pageNum,
          title,
          artist,
          transposeAmount,
          notation
        );

        currentBody = currentPage.querySelector(".print-body");
        container.appendChild(currentPage);
        currentBody.appendChild(blockEl);
      }
    });
  }

  /* =========================
     EXPORT
  ========================= */

  window.SongPrint = {
    mmToPx,
    parseContent,
    isChordOnlyLine,
    parseChordLine,
    transposeChordText,
    createPrintPage,
    buildPrintBlock,
    renderSongPages
  };

})();