/**
 * text-editor-tool.js — Editar texto existente del PDF
 * v3: bug fix pointer-events + mejoras de extracción
 */

const FtoolsTextEditorTool = (() => {
  const pageTextData  = {}; // pageNum → { items[], extracted }
  const overlayItems  = new WeakMap(); // el → item (para acceso en finishEdit)

  // ─── Parsear nombre de fuente interno ────────────────────────────────────────
  function parseFontName(raw = '') {
    const clean = raw.replace(/^[A-Z]{6}\+/, '');
    const lo    = clean.toLowerCase();
    const isBold   = /bold|black|heavy|demi/i.test(clean);
    const isItalic = /italic|oblique|slant/i.test(clean);
    let cssFamily  = 'Arial, Helvetica, sans-serif';
    let pdfLibFont = 'Helvetica';
    if (/times|roman|minion|garamond|baskerville|palatino/i.test(lo)) {
      cssFamily = '"Times New Roman", Times, serif'; pdfLibFont = 'TimesRoman';
    } else if (/courier|cour/i.test(lo)) {
      cssFamily = '"Courier New", Courier, monospace'; pdfLibFont = 'Courier';
    } else if (/georgia/i.test(lo)) {
      cssFamily = 'Georgia, serif'; pdfLibFont = 'TimesRoman';
    }
    return { cssFamily, pdfLibFont, isBold, isItalic };
  }

  // ─── Samplear color del canvas en el punto del texto ─────────────────────────
  function sampleColor(canvas, pdfX, pdfY, viewport, dpr, scale) {
    try {
      const ctx = canvas.getContext('2d');
      // Punto en físicos: baseline desplazada ligeramente hacia arriba (mitad del cuerpo)
      const [vx, vy] = viewport.convertToViewportPoint(pdfX, pdfY);
      const py = Math.round(vy - scale * dpr * 4); // 4pt sobre baseline → zona de trazo
      const px = Math.round(vx + scale * dpr * 2);
      if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return '#1a1a1a';

      const tally = {};
      for (let i = 0; i < 5; i++) {
        const x = px + i * Math.max(1, Math.round(scale * dpr * 3));
        if (x >= canvas.width) break;
        const [r, g, b, a] = ctx.getImageData(x, py, 1, 1).data;
        if (a < 40 || (r > 228 && g > 228 && b > 228)) continue; // skip transparent/white
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        tally[hex] = (tally[hex] || 0) + 1;
      }
      const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      return best ? best[0] : '#1a1a1a';
    } catch { return '#1a1a1a'; }
  }

  // ─── Filtrar items que no son texto real ──────────────────────────────────────
  function isRealText(item) {
    if (!item.str || !item.str.trim()) return false;
    if (/symbol|wingdings|dingbat|webdings|icon|zapf/i.test(item.fontName || '')) return false;
    return true;
  }

  // ─── Extraer items de texto de una página ────────────────────────────────────
  async function extractText(pageNum) {
    if (pageTextData[pageNum]?.extracted) return pageTextData[pageNum].items;
    const pdfJsDoc = FtoolsEditor.state.pdfJsDoc;
    if (!pdfJsDoc) return [];

    const page     = await pdfJsDoc.getPage(pageNum);
    const tc       = await page.getTextContent();           // sin opciones → máxima compat.
    const pageInfo = FtoolsRenderer.getPageCanvas(pageNum);
    if (!pageInfo) return [];

    const { canvas, viewport } = pageInfo;
    const dpr   = window.devicePixelRatio || 1;
    const scale = FtoolsEditor.state.scale;

    const items = tc.items.filter(isRealText).map((item, idx) => {
      const [a, b, , , e, f] = item.transform;
      const pdfFontSize = Math.sqrt(a * a + b * b) || 12;
      const pdfX = e, pdfY = f;
      const pdfWidth = item.width > 0 ? item.width : pdfFontSize * item.str.length * 0.55;

      // CSS coordinates
      const cssFontSize = Math.max(pdfFontSize * scale, 6);
      const cssW        = Math.max(pdfWidth * scale, 8);
      const cssH        = cssFontSize * 1.25;

      let cssX = 0, cssTop = 0;
      try {
        const [vx, vy] = viewport.convertToViewportPoint(pdfX, pdfY);
        cssX   = vx / dpr;
        cssTop = vy / dpr - cssFontSize * 0.85; // baseline → top del div
      } catch { /* fallback a 0,0 */ }

      const fontInfo = parseFontName(item.fontName || '');
      const color    = sampleColor(canvas, pdfX, pdfY, viewport, dpr, scale);

      return {
        idx, str: item.str, fontName: item.fontName, fontInfo, color,
        pdfX, pdfY, pdfFontSize, pdfWidth,
        cssX, cssTop, cssW, cssH, cssFontSize,
      };
    });

    pageTextData[pageNum] = { items, extracted: true };
    return items;
  }

  // ─── Helpers de estilo para overlays ─────────────────────────────────────────
  function getAnn(pageNum, idx) {
    return FtoolsEditor.state.annotations.find(
      a => a.type === 'text-edit' && a.page === pageNum && a.itemIdx === idx
    );
  }
  function markEdited(el) {
    el.style.background   = 'rgba(0,85,255,.09)';
    el.style.borderColor  = 'rgba(0,85,255,.5)';
    el.style.borderStyle  = 'solid';
  }
  function markHover(el) {
    el.style.background  = 'rgba(255,222,0,.35)';
    el.style.borderColor = '#e6c800';
    el.style.borderStyle = 'solid';
  }
  function resetStyle(el) {
    el.style.background  = 'transparent';
    el.style.borderColor = 'transparent';
  }

  // ─── Crear overlays para una página ──────────────────────────────────────────
  // CLAVE: pointer-events se asigna según herramienta ACTIVA en el momento de creación
  async function createOverlays(pageNum) {
    const layer = document.querySelector(`.annotation-layer[data-page="${pageNum}"]`);
    if (!layer) return;

    // Limpiar overlays anteriores
    layer.querySelectorAll('.te-overlay').forEach(el => el.remove());

    const items  = await extractText(pageNum);
    const isActive = FtoolsEditor.state.activeTool === 'text-edit';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className   = 'te-overlay';
      el.dataset.page = pageNum;
      el.dataset.idx  = item.idx;
      el.title = `Editar: "${item.str.slice(0, 60)}"`;

      el.style.cssText = `
        position:absolute;
        left:${item.cssX}px; top:${item.cssTop}px;
        width:${item.cssW}px; height:${item.cssH}px;
        box-sizing:border-box; border-radius:2px;
        border:1px solid transparent;
        cursor:text; z-index:15;
        transition:background .1s, border-color .1s;
        pointer-events:${isActive ? 'all' : 'none'};
      `;

      overlayItems.set(el, item); // guardar referencia para finishEdit

      // Marcar si ya fue editado previamente
      const prevAnn = getAnn(pageNum, item.idx);
      if (prevAnn) renderEditedText(el, item, prevAnn.newText);

      el.addEventListener('mouseenter', () => {
        if (FtoolsEditor.state.activeTool !== 'text-edit') return;
        if (!el.classList.contains('te-editing') && !getAnn(pageNum, item.idx)) markHover(el);
      });
      el.addEventListener('mouseleave', () => {
        if (el.classList.contains('te-editing')) return;
        // Si ya fue editado, no quitamos el renderizado
        if (!getAnn(pageNum, item.idx)) resetStyle(el);
      });
      el.addEventListener('click', e => {
        if (FtoolsEditor.state.activeTool !== 'text-edit') return;
        e.stopPropagation();
        startEdit(el, item, pageNum);
      });

      layer.appendChild(el);
    });
  }

  // ─── Iniciar edición inline ───────────────────────────────────────────────────
  function startEdit(el, item, pageNum) {
    if (el.classList.contains('te-editing')) return;

    // Cerrar cualquier otro editor abierto
    document.querySelectorAll('.te-overlay.te-editing').forEach(o => {
      if (o !== el) finishEdit(o);
    });

    el.classList.add('te-editing');
    Object.assign(el.style, {
      background:  'rgba(255,255,255,.97)',
      borderColor: '#ff007f',
      borderStyle: 'solid',
      boxShadow:   '0 2px 14px rgba(255,0,127,.3)',
      zIndex:      '30',
      minWidth:    item.cssW + 'px',
      width:       'auto',
      height:      'auto',
    });

    const ann = getAnn(pageNum, item.idx);
    const currentVal = ann ? ann.newText : item.str;

    const input = document.createElement('input');
    input.type  = 'text';
    input.value = currentVal;
    input.style.cssText = `
      border:none; outline:none; background:transparent; padding:0; margin:0;
      font-family:${item.fontInfo.cssFamily};
      font-size:${Math.min(Math.max(item.cssFontSize, 10), 24)}px;
      font-weight:${item.fontInfo.isBold ? 'bold' : 'normal'};
      font-style:${item.fontInfo.isItalic ? 'italic' : 'normal'};
      color:#1a1a1a; min-width:60px; width:100%; line-height:1.2;
    `;

    el.innerHTML = '';
    el.appendChild(input);
    input.focus();
    input.select();

    const finish = () => {
      if (el._finishing) return;
      const val = input.value; // NO trim: preservar espacios del usuario
      const hasChanged = val !== item.str || getAnn(pageNum, item.idx);
      if (val.trim() && hasChanged) {
        saveEdit(pageNum, item, val);
        el.title = `✏️ "${val.slice(0, 60)}"`;
      } else if (!val.trim()) {
        const ex = getAnn(pageNum, item.idx);
        if (ex) FtoolsEditor.removeAnnotation(ex.id);
      }
      finishEdit(el);
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentVal; input.blur(); }
      e.stopPropagation(); // evitar atajos globales durante edición
    });
  }

  // ─── Renderizar texto editado sobre el overlay (cubre original del canvas) ────
  function renderEditedText(el, item, newText) {
    el.innerHTML = '';

    // Fondo blanco para tapar el texto original del PDF en el canvas
    el.style.background = 'white';
    el.style.borderColor = 'rgba(0,85,255,.4)';
    el.style.borderStyle = 'solid';
    el.style.width       = 'auto';
    el.style.minWidth    = (item ? item.cssW : 0) + 'px';
    el.style.height      = 'auto';
    el.style.overflow    = 'hidden';
    el.style.display     = 'flex';
    el.style.alignItems  = 'center';

    const span = document.createElement('span');
    span.textContent = newText;
    if (item) {
      const fs = Math.min(Math.max(item.cssFontSize, 8), 32);
      span.style.cssText = `
        font-family: ${item.fontInfo.cssFamily};
        font-size: ${fs}px;
        font-weight: ${item.fontInfo.isBold ? 'bold' : 'normal'};
        font-style: ${item.fontInfo.isItalic ? 'italic' : 'normal'};
        color: ${item.color || '#1a1a1a'};
        white-space: nowrap;
        line-height: ${item.cssH}px;
        display: inline-block;
      `;
    }
    el.appendChild(span);
  }

  function finishEdit(el) {
    if (el._finishing) return; // guard contra llamadas dobles por blur
    el._finishing = true;
    el.classList.remove('te-editing');
    el.style.boxShadow = '';
    el.style.zIndex    = '15';

    const p = +el.dataset.page, i = +el.dataset.idx;
    const ann  = getAnn(p, i);
    const item = overlayItems.get(el);

    if (ann) {
      // Mostrar el nuevo texto cubriendo el original
      renderEditedText(el, item, ann.newText);
    } else {
      el.innerHTML = '';
      el.style.width    = '';
      el.style.height   = '';
      el.style.minWidth = '';
      el.style.display  = '';
      resetStyle(el);
    }
    setTimeout(() => { el._finishing = false; }, 50);
  }

  function saveEdit(pageNum, item, newText) {
    const ex = getAnn(pageNum, item.idx);
    if (ex) FtoolsEditor.removeAnnotation(ex.id);
    FtoolsEditor.addAnnotation({
      type: 'text-edit', page: pageNum, itemIdx: item.idx,
      originalText: item.str, newText,
      pdfX: item.pdfX, pdfY: item.pdfY,
      pdfFontSize: item.pdfFontSize, pdfWidth: item.pdfWidth,
      color: item.color, fontInfo: item.fontInfo,
    });
    showToast('Texto actualizado ✓', 'success');
  }

  // ─── Activar herramienta ──────────────────────────────────────────────────────
  // Ahora simplemente crea/recrea los overlays (que se crean con pointer-events:all)
  async function activate() {
    // Primero activar overlays ya existentes (re-render previo)
    document.querySelectorAll('.te-overlay').forEach(el => el.style.pointerEvents = 'all');
    // Crear para páginas que aún no tienen overlays
    const total = FtoolsEditor.state.totalPages;
    for (let i = 1; i <= total; i++) {
      const layer = document.querySelector(`.annotation-layer[data-page="${i}"]`);
      if (layer && layer.querySelectorAll('.te-overlay').length === 0) {
        await createOverlays(i);
      } else if (layer) {
        // Ya existen → solo activar pointer-events
        layer.querySelectorAll('.te-overlay').forEach(el => el.style.pointerEvents = 'all');
      }
    }
  }

  // ─── Desactivar herramienta ───────────────────────────────────────────────────
  function deactivate() {
    document.querySelectorAll('.te-overlay.te-editing').forEach(el => finishEdit(el));
    document.querySelectorAll('.te-overlay').forEach(el => {
      el.style.pointerEvents = 'none';
      const p = +el.dataset.page, i = +el.dataset.idx;
      getAnn(p, i) ? markEdited(el) : resetStyle(el);
    });
  }

  // ─── Event listeners ─────────────────────────────────────────────────────────
  FtoolsEditor.on('toolChanged', async tool => {
    if (tool === 'text-edit') await activate();
    else deactivate();
  });

  // Al renderizar una página: recrear overlays si la herramienta está activa
  FtoolsEditor.on('pageRendered', async ({ pageNum }) => {
    delete pageTextData[pageNum]; // forzar re-extracción (escala puede haber cambiado)
    await createOverlays(pageNum); // crea con pointer-events según herramienta actual
  });

  FtoolsEditor.on('pdfLoaded', () => {
    Object.keys(pageTextData).forEach(k => delete pageTextData[k]);
  });
  FtoolsEditor.on('cleared', () => {
    Object.keys(pageTextData).forEach(k => delete pageTextData[k]);
  });

  // Sincronizar indicadores visuales al deshacer/rehacer
  FtoolsEditor.on('annotationRemoved', ann => {
    if (ann.type !== 'text-edit') return;
    const el = document.querySelector(`.te-overlay[data-page="${ann.page}"][data-idx="${ann.itemIdx}"]`);
    if (!el) return;
    el.innerHTML  = '';
    el.style.width = el.style.minWidth = el.style.height = '';
    el.style.display = '';
    resetStyle(el);
    el.title = '';
  });
  FtoolsEditor.on('annotationAdded', ann => {
    if (ann.type !== 'text-edit') return;
    const el = document.querySelector(`.te-overlay[data-page="${ann.page}"][data-idx="${ann.itemIdx}"]`);
    if (!el) return;
    const item = overlayItems.get(el);
    renderEditedText(el, item, ann.newText);
    el.title = `✏️ "${ann.newText.slice(0, 60)}"`;
  });

  return { activate, deactivate, createOverlays, extractText };
})();
