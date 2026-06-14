/**
 * renderer.js — Renderizado de páginas PDF con PDF.js
 * Ftools PDF Editor | 100% Client-side
 */

const FtoolsRenderer = (() => {
  // ─── Config de PDF.js ─────────────────────────────────────────────────────────
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let pdfjsLib = null;
  const pageCanvases = {};   // { pageNum: { canvas, ctx, viewport } }
  const renderTasks = {};    // cancelación de renders previos

  // ─── Inicializar PDF.js ───────────────────────────────────────────────────────
  async function init() {
    if (pdfjsLib) return pdfjsLib;
    await loadScript(PDFJS_CDN);
    window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = WORKER_SRC;
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    return pdfjsLib;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ─── Cargar PDF desde ArrayBuffer ────────────────────────────────────────────
  async function loadPDF(arrayBuffer) {
    const lib = await init();

    // Cancelar renders pendientes
    Object.values(renderTasks).forEach(t => { try { t.cancel(); } catch (e) {} });

    const loadingTask = lib.getDocument({ data: arrayBuffer.slice(0) });
    loadingTask.onProgress = ({ loaded, total }) => {
      const pct = Math.round((loaded / total) * 100);
      FtoolsEditor.emit('loadProgress', pct);
    };

    const pdfJsDoc = await loadingTask.promise;
    FtoolsEditor.state.pdfJsDoc = pdfJsDoc;
    FtoolsEditor.state.totalPages = pdfJsDoc.numPages;
    FtoolsEditor.emit('pdfLoaded', { totalPages: pdfJsDoc.numPages });

    return pdfJsDoc;
  }

  // ─── Renderizar una página ────────────────────────────────────────────────────
  async function renderPage(pageNum) {
    const pdfJsDoc = FtoolsEditor.state.pdfJsDoc;
    if (!pdfJsDoc) return;

    const scale = FtoolsEditor.state.scale;
    const dpr = window.devicePixelRatio || 1;

    // Cancelar render previo de esta página si existe
    if (renderTasks[pageNum]) {
      try { renderTasks[pageNum].cancel(); } catch(e) {}
    }

    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale * dpr });

    // Obtener o crear canvas
    let canvasWrapper = document.querySelector(`[data-page="${pageNum}"]`);
    if (!canvasWrapper) {
      canvasWrapper = createPageWrapper(pageNum, viewport, scale, dpr);
    }

    const canvas = canvasWrapper.querySelector('canvas.pdf-canvas');
    const ctx = canvas.getContext('2d');

    // Dimensiones físicas (alta resolución)
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Dimensiones CSS (tamaño visual)
    const cssWidth = viewport.width / dpr;
    const cssHeight = viewport.height / dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvasWrapper.style.width = `${cssWidth}px`;
    canvasWrapper.querySelector('.annotation-layer').style.width = `${cssWidth}px`;
    canvasWrapper.querySelector('.annotation-layer').style.height = `${cssHeight}px`;

    pageCanvases[pageNum] = { canvas, ctx, viewport, cssWidth, cssHeight, scale: scale * dpr };

    const renderContext = { canvasContext: ctx, viewport };
    const task = page.render(renderContext);
    renderTasks[pageNum] = task;

    try {
      await task.promise;
      FtoolsEditor.emit('pageRendered', { pageNum, cssWidth, cssHeight });
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error renderizando página:', err);
      }
    }
  }

  // ─── Crear contenedor de página ───────────────────────────────────────────────
  function createPageWrapper(pageNum, viewport, scale, dpr) {
    const cssWidth = viewport.width / dpr;
    const cssHeight = viewport.height / dpr;

    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.setAttribute('data-page', pageNum);
    wrapper.style.position = 'relative';
    wrapper.style.width = `${cssWidth}px`;
    wrapper.style.display = 'inline-block';
    wrapper.style.marginBottom = '24px';

    // Número de página
    const pageLabel = document.createElement('div');
    pageLabel.className = 'page-label';
    pageLabel.textContent = `Página ${pageNum}`;

    // Canvas PDF
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-canvas';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '4px';

    // Capa de anotaciones (HTML overlay)
    const annotationLayer = document.createElement('div');
    annotationLayer.className = 'annotation-layer';
    annotationLayer.setAttribute('data-page', pageNum);
    annotationLayer.style.position = 'absolute';
    annotationLayer.style.top = '0';
    annotationLayer.style.left = '0';
    annotationLayer.style.pointerEvents = 'all';
    annotationLayer.style.overflow = 'hidden';
    annotationLayer.style.width = `${cssWidth}px`;
    annotationLayer.style.height = `${cssHeight}px`;

    wrapper.appendChild(pageLabel);
    wrapper.appendChild(canvas);
    wrapper.appendChild(annotationLayer);

    document.getElementById('pdf-pages-container').appendChild(wrapper);
    return wrapper;
  }

  // ─── Renderizar todas las páginas ─────────────────────────────────────────────
  async function renderAllPages() {
    const total = FtoolsEditor.state.totalPages;
    const container = document.getElementById('pdf-pages-container');
    container.innerHTML = '';

    for (let i = 1; i <= total; i++) {
      await renderPage(i);
    }
    FtoolsEditor.emit('allPagesRendered');
  }

  // ─── Obtener info de canvas de una página ────────────────────────────────────
  function getPageCanvas(pageNum) {
    return pageCanvases[pageNum] || null;
  }

  // ─── Obtener coordenadas PDF desde coordenadas del DOM ───────────────────────
  function domToPdfCoords(pageNum, domX, domY) {
    const info = pageCanvases[pageNum];
    if (!info) return { x: domX, y: domY };

    const { cssWidth, cssHeight } = info;
    const pdfPage = FtoolsEditor.state.pdfJsDoc;

    // Normalizar a [0,1] y luego escalar al espacio PDF
    const normX = domX / cssWidth;
    const normY = domY / cssHeight;

    // Espacio PDF: y invertida (PDF origin = bottom-left)
    return {
      x: normX * cssWidth,
      y: normY * cssHeight,
      normX,
      normY,
    };
  }

  // ─── Cambiar escala ───────────────────────────────────────────────────────────
  async function setScale(newScale) {
    FtoolsEditor.state.scale = newScale;
    await renderAllPages();
    // Redibujar anotaciones
    FtoolsEditor.emit('scaleChanged', newScale);
  }

  return {
    init,
    loadPDF,
    renderPage,
    renderAllPages,
    getPageCanvas,
    domToPdfCoords,
    setScale,
  };
})();
