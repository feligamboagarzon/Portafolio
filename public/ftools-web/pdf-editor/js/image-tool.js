/**
 * image-tool.js — Herramienta para reemplazar imágenes existentes en el PDF
 * Ftools PDF Editor | 100% Client-side
 */

const FtoolsImageTool = (() => {
  // Imágenes extraídas del PDF (detectadas con PDF.js)
  const extractedImages = [];

  // ─── Extraer imágenes de una página (posiciones en DOM) ───────────────────────
  async function extractImagesFromPage(pageNum) {
    const pdfJsDoc = FtoolsEditor.state.pdfJsDoc;
    if (!pdfJsDoc) return [];

    const page = await pdfJsDoc.getPage(pageNum);
    const ops = await page.getOperatorList();

    const images = [];
    // PDF.js expone OPS para imágenes pintadas
    const OPS = pdfjsLib.OPS || {};

    let i = 0;
    while (i < ops.fnArray.length) {
      // OPS.paintImageXObject = 85, paintInlineImageXObject = 86
      if (ops.fnArray[i] === 85 || ops.fnArray[i] === 86) {
        const imgRef = ops.argsArray[i][0];
        images.push({ pageNum, imgRef, opIndex: i });
      }
      i++;
    }

    return images;
  }

  // ─── Crear overlay de imagen reemplazable en el DOM ───────────────────────────
  function createImageOverlay(annotation) {
    const el = document.createElement('div');
    el.className = 'annotation image-annotation';
    el.setAttribute('data-id', annotation.id);
    el.setAttribute('data-type', 'image');
    el.setAttribute('data-page', annotation.page);

    el.style.position = 'absolute';
    el.style.left = `${annotation.x}px`;
    el.style.top = `${annotation.y}px`;
    el.style.width = `${annotation.width}px`;
    el.style.height = `${annotation.height}px`;
    el.style.cursor = 'pointer';
    el.style.zIndex = '10';
    el.style.border = '2px dashed transparent';
    el.style.boxSizing = 'border-box';
    el.style.transition = 'border-color 0.2s';

    // Si tiene imageDataUrl, mostrar preview
    if (annotation.imageDataUrl) {
      const img = document.createElement('img');
      img.src = annotation.imageDataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'fill';
      img.style.display = 'block';
      el.appendChild(img);
    }

    // Badge de reemplazar
    const badge = document.createElement('div');
    badge.className = 'img-replace-badge';
    badge.innerHTML = '🖼️ Reemplazar';
    badge.style.cssText = `
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(0,0,0,0.7); color:#fff;
      padding:4px 10px; border-radius:6px;
      font-size:12px; font-weight:bold;
      pointer-events:none; opacity:0;
      transition:opacity 0.2s; white-space:nowrap;
    `;
    el.appendChild(badge);

    el.addEventListener('mouseenter', () => {
      el.style.borderColor = '#ff007f';
      badge.style.opacity = '1';
    });
    el.addEventListener('mouseleave', () => {
      el.style.borderColor = 'transparent';
      badge.style.opacity = '0';
    });

    // Click → abrir file picker para reemplazar imagen
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageReplacer(annotation, el);
    });

    // Drag para mover
    setupImageDrag(el, annotation);

    return el;
  }

  // ─── Drag de imagen ───────────────────────────────────────────────────────────
  function setupImageDrag(el, annotation) {
    let isDragging = false;
    let startX, startY, origX, origY;

    el.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = annotation.x;
      origY = annotation.y;
      e.preventDefault();

      const onMove = (e) => {
        if (!isDragging) return;
        annotation.x = origX + (e.clientX - startX);
        annotation.y = origY + (e.clientY - startY);
        el.style.left = `${annotation.x}px`;
        el.style.top = `${annotation.y}px`;
      };

      const onUp = () => {
        isDragging = false;
        FtoolsEditor.updateAnnotation(annotation.id, { x: annotation.x, y: annotation.y });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ─── Abrir selector de imagen para reemplazar ─────────────────────────────────
  function openImageReplacer(annotation, el) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        const pngDataUrl = await convertToPng(dataUrl);

        // Actualizar anotación
        FtoolsEditor.updateAnnotation(annotation.id, {
          imageDataUrl: pngDataUrl,
          imageFile: file,
          imageMimeType: 'image/png',
        });
        annotation.imageDataUrl = pngDataUrl;

        // Actualizar DOM
        let imgEl = el.querySelector('img');
        if (!imgEl) {
          imgEl = document.createElement('img');
          imgEl.style.width = '100%';
          imgEl.style.height = '100%';
          imgEl.style.objectFit = 'fill';
          imgEl.style.display = 'block';
          el.insertBefore(imgEl, el.firstChild);
        }
        imgEl.src = pngDataUrl;

        FtoolsEditor.emit('imageReplaced', annotation);
        showToast('Imagen reemplazada ✓', 'success');
      } catch (err) {
        console.error('Error al procesar imagen:', err);
        showToast('Error al procesar la imagen', 'error');
      }

      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  }

  // ─── Herramienta: añadir imagen nueva ────────────────────────────────────────
  function activateImagePlacement() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = 'crosshair';
      layer.addEventListener('click', onLayerClick);
    });
  }

  function deactivateImagePlacement() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = '';
      layer.removeEventListener('click', onLayerClick);
    });
  }

  function onLayerClick(e) {
    if (FtoolsEditor.state.activeTool !== 'image') return;
    const layer = e.currentTarget;
    const pageNum = parseInt(layer.getAttribute('data-page'));
    const rect = layer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Abrir picker de imagen
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        const pngDataUrl = await convertToPng(dataUrl);

        // Obtener dimensiones
        const dims = await getImageDimensions(pngDataUrl);
        const maxW = 200;
        const ratio = dims.width > maxW ? maxW / dims.width : 1;
        const w = dims.width * ratio;
        const h = dims.height * ratio;

        const annotation = FtoolsEditor.addAnnotation({
          type: 'image',
          page: pageNum,
          x: x - w / 2,
          y: y - h / 2,
          width: w,
          height: h,
          imageDataUrl: pngDataUrl,
          imageMimeType: 'image/png',
        });

        const el = createImageOverlay(annotation);
        layer.appendChild(el);

        showToast('Imagen añadida ✓', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al cargar imagen', 'error');
      }

      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function convertToPng(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // ─── Reconstruir overlays de imagen en el DOM ─────────────────────────────────
  function renderAnnotationsForPage(pageNum) {
    const layer = document.querySelector(`.annotation-layer[data-page="${pageNum}"]`);
    if (!layer) return;

    layer.querySelectorAll('.image-annotation').forEach(el => el.remove());

    FtoolsEditor.getAnnotationsForPage(pageNum)
      .filter(a => a.type === 'image')
      .forEach(ann => {
        const el = createImageOverlay(ann);
        layer.appendChild(el);
      });
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────────
  FtoolsEditor.on('toolChanged', (tool) => {
    if (tool === 'image') activateImagePlacement();
    else deactivateImagePlacement();
  });

  FtoolsEditor.on('pageRendered', ({ pageNum }) => {
    renderAnnotationsForPage(pageNum);
  });

  FtoolsEditor.on('annotationRemoved', (ann) => {
    if (ann.type !== 'image') return;
    const el = document.querySelector(`.image-annotation[data-id="${ann.id}"]`);
    if (el) el.remove();
  });

  FtoolsEditor.on('annotationUpdated', (ann) => {
    if (ann.type !== 'image') return;
    const el = document.querySelector(`.image-annotation[data-id="${ann.id}"]`);
    if (el) {
      el.style.left = `${ann.x}px`;
      el.style.top = `${ann.y}px`;
      el.style.width = `${ann.width}px`;
      el.style.height = `${ann.height}px`;
    }
  });

  return {
    activateImagePlacement,
    deactivateImagePlacement,
    renderAnnotationsForPage,
    createImageOverlay,
    extractImagesFromPage,
    fileToDataUrl,
    convertToPng,
    getImageDimensions,
  };
})();
