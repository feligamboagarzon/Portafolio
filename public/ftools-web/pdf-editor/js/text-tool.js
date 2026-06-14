/**
 * text-tool.js — Herramienta de texto para añadir y editar texto
 * Ftools PDF Editor | 100% Client-side
 */

const FtoolsTextTool = (() => {
  // ─── Propiedades por defecto ──────────────────────────────────────────────────
  const defaults = {
    fontFamily: 'Helvetica',
    fontSize: 16,
    color: '#000000',
    bold: false,
    italic: false,
    content: 'Texto nuevo',
  };

  let currentProps = { ...defaults };

  // ─── Fuentes disponibles ──────────────────────────────────────────────────────
  const FONTS = [
    { label: 'Helvetica', value: 'Helvetica', pdfLib: 'Helvetica' },
    { label: 'Times New Roman', value: 'Times New Roman, serif', pdfLib: 'TimesRoman' },
    { label: 'Courier', value: 'Courier New, monospace', pdfLib: 'Courier' },
    { label: 'Georgia', value: 'Georgia, serif', pdfLib: 'TimesRoman' },
    { label: 'Space Grotesk', value: 'Space Grotesk, sans-serif', pdfLib: 'Helvetica' },
  ];

  // ─── Crear elemento de anotación de texto en el DOM ──────────────────────────
  function createTextElement(annotation) {
    const el = document.createElement('div');
    el.className = 'annotation text-annotation';
    el.setAttribute('data-id', annotation.id);
    el.setAttribute('data-type', 'text');
    el.setAttribute('data-page', annotation.page);

    applyStyles(el, annotation);
    el.textContent = annotation.content;

    el.style.position = 'absolute';
    el.style.left = `${annotation.x}px`;
    el.style.top = `${annotation.y}px`;
    el.style.cursor = 'move';
    el.style.userSelect = 'none';
    el.style.zIndex = '10';
    el.style.whiteSpace = 'pre';
    el.style.lineHeight = '1.2';
    el.style.padding = '2px 4px';

    setupInteractions(el, annotation);
    return el;
  }

  // ─── Aplicar estilos de la anotación al elemento ──────────────────────────────
  function applyStyles(el, ann) {
    el.style.fontFamily = ann.fontFamily;
    el.style.fontSize = `${ann.fontSize}px`;
    el.style.color = ann.color;
    el.style.fontWeight = ann.bold ? 'bold' : 'normal';
    el.style.fontStyle = ann.italic ? 'italic' : 'normal';
  }

  // ─── Setup drag, doble-clic para editar, click para seleccionar ───────────────
  function setupInteractions(el, annotation) {
    let isDragging = false;
    let startX, startY, origX, origY;

    // Selección
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAnnotation(annotation.id, el);
    });

    // Doble clic → editar inline
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startInlineEdit(el, annotation);
    });

    // Drag
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('resize-handle')) return;
      if (e.detail > 1) return; // ignore double click

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = annotation.x;
      origY = annotation.y;
      el.style.cursor = 'grabbing';
      e.preventDefault();

      const onMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        annotation.x = origX + dx;
        annotation.y = origY + dy;
        el.style.left = `${annotation.x}px`;
        el.style.top = `${annotation.y}px`;
      };

      const onUp = () => {
        if (isDragging) {
          FtoolsEditor.updateAnnotation(annotation.id, { x: annotation.x, y: annotation.y });
        }
        isDragging = false;
        el.style.cursor = 'move';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Touch support
    el.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      origX = annotation.x;
      origY = annotation.y;

      const onMove = (e) => {
        const touch = e.touches[0];
        annotation.x = origX + (touch.clientX - startX);
        annotation.y = origY + (touch.clientY - startY);
        el.style.left = `${annotation.x}px`;
        el.style.top = `${annotation.y}px`;
      };

      const onEnd = () => {
        FtoolsEditor.updateAnnotation(annotation.id, { x: annotation.x, y: annotation.y });
        el.removeEventListener('touchmove', onMove);
        el.removeEventListener('touchend', onEnd);
      };

      el.addEventListener('touchmove', onMove, { passive: true });
      el.addEventListener('touchend', onEnd);
    }, { passive: true });
  }

  // ─── Edición inline (contenteditable) ────────────────────────────────────────
  function startInlineEdit(el, annotation) {
    const originalText = annotation.content;
    el.contentEditable = 'true';
    el.style.cursor = 'text';
    el.style.outline = '2px dashed #ff007f';
    el.style.minWidth = '50px';
    el.focus();

    // Seleccionar todo el texto
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finishEdit = () => {
      el.contentEditable = 'false';
      el.style.cursor = 'move';
      el.style.outline = '';
      const newText = el.textContent.trim() || originalText;
      el.textContent = newText;
      FtoolsEditor.updateAnnotation(annotation.id, { content: newText });
      annotation.content = newText;
    };

    el.addEventListener('blur', finishEdit, { once: true });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
      if (e.key === 'Escape') {
        el.textContent = originalText;
        el.blur();
      }
    });
  }

  // ─── Seleccionar anotación ────────────────────────────────────────────────────
  function selectAnnotation(id, el) {
    // Deseleccionar prev
    document.querySelectorAll('.annotation.selected').forEach(a => {
      a.classList.remove('selected');
    });

    FtoolsEditor.state.selectedAnnotation = id;
    el.classList.add('selected');
    FtoolsEditor.emit('annotationSelected', id);

    // Actualizar panel de propiedades
    const ann = FtoolsEditor.state.annotations.find(a => a.id === id);
    if (ann) updatePropertiesPanel(ann);
  }

  // ─── Actualizar panel de propiedades con la anotación seleccionada ────────────
  function updatePropertiesPanel(ann) {
    const fontSelect = document.getElementById('prop-font');
    const sizeInput = document.getElementById('prop-size');
    const sizeValue = document.getElementById('prop-size-value');
    const colorInput = document.getElementById('prop-color');
    const boldBtn = document.getElementById('prop-bold');
    const italicBtn = document.getElementById('prop-italic');

    if (fontSelect) fontSelect.value = ann.fontFamily;
    if (sizeInput) {
      sizeInput.value = ann.fontSize;
      if (sizeValue) sizeValue.textContent = `${ann.fontSize}px`;
    }
    if (colorInput) colorInput.value = ann.color;
    if (boldBtn) boldBtn.classList.toggle('active', ann.bold);
    if (italicBtn) italicBtn.classList.toggle('active', ann.italic);
  }

  // ─── Poner texto en el canvas al hacer click ──────────────────────────────────
  function activateTextPlacement() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = 'text';
      layer.addEventListener('click', onLayerClick);
    });
  }

  function deactivateTextPlacement() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = '';
      layer.removeEventListener('click', onLayerClick);
    });
  }

  function onLayerClick(e) {
    if (FtoolsEditor.state.activeTool !== 'text') return;
    const layer = e.currentTarget;
    const pageNum = parseInt(layer.getAttribute('data-page'));
    const rect = layer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const annotation = FtoolsEditor.addAnnotation({
      type: 'text',
      page: pageNum,
      x,
      y,
      content: currentProps.content,
      fontFamily: currentProps.fontFamily,
      fontSize: currentProps.fontSize,
      color: currentProps.color,
      bold: currentProps.bold,
      italic: currentProps.italic,
    });

    const el = createTextElement(annotation);
    layer.appendChild(el);

    // Auto-editar al crear
    setTimeout(() => startInlineEdit(el, annotation), 50);
  }

  // ─── Reconstruir anotaciones de texto en el DOM ───────────────────────────────
  function renderAnnotationsForPage(pageNum) {
    const layer = document.querySelector(`.annotation-layer[data-page="${pageNum}"]`);
    if (!layer) return;

    // Limpiar sólo las de texto
    layer.querySelectorAll('.text-annotation').forEach(el => el.remove());

    FtoolsEditor.getAnnotationsForPage(pageNum)
      .filter(a => a.type === 'text')
      .forEach(ann => {
        const el = createTextElement(ann);
        layer.appendChild(el);
      });
  }

  // ─── Actualizar propiedad de la anotación seleccionada desde el panel ─────────
  function updateSelectedProperty(prop, value) {
    const id = FtoolsEditor.state.selectedAnnotation;
    if (!id) {
      // Actualizar defaults
      currentProps[prop] = value;
      return;
    }

    const ann = FtoolsEditor.state.annotations.find(a => a.id === id);
    if (!ann || ann.type !== 'text') {
      currentProps[prop] = value;
      return;
    }

    FtoolsEditor.updateAnnotation(id, { [prop]: value });
    ann[prop] = value;

    // Actualizar DOM
    const el = document.querySelector(`.text-annotation[data-id="${id}"]`);
    if (el) applyStyles(el, ann);

    currentProps[prop] = value;
  }

  // ─── Obtener fuentes disponibles ──────────────────────────────────────────────
  function getFonts() { return FONTS; }
  function getCurrentProps() { return currentProps; }

  // Escuchar cambios de herramienta
  FtoolsEditor.on('toolChanged', (tool) => {
    if (tool === 'text') {
      activateTextPlacement();
    } else {
      deactivateTextPlacement();
    }
  });

  // Reconstruir al renderizar páginas
  FtoolsEditor.on('pageRendered', ({ pageNum }) => {
    renderAnnotationsForPage(pageNum);
  });

  // Actualizar DOM cuando se modifica una anotación
  FtoolsEditor.on('annotationUpdated', (ann) => {
    if (ann.type !== 'text') return;
    const el = document.querySelector(`.text-annotation[data-id="${ann.id}"]`);
    if (el) {
      applyStyles(el, ann);
      el.style.left = `${ann.x}px`;
      el.style.top = `${ann.y}px`;
      if (document.activeElement !== el) el.textContent = ann.content;
    }
  });

  FtoolsEditor.on('annotationRemoved', (ann) => {
    if (ann.type !== 'text') return;
    const el = document.querySelector(`.text-annotation[data-id="${ann.id}"]`);
    if (el) el.remove();
  });

  return {
    activateTextPlacement,
    deactivateTextPlacement,
    renderAnnotationsForPage,
    updateSelectedProperty,
    getFonts,
    getCurrentProps,
    selectAnnotation,
    createTextElement,
    applyStyles,
  };
})();
