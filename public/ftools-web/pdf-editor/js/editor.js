/**
 * editor.js — Orquestador principal del Editor
 * Ftools PDF Editor | 100% Client-side
 *
 * Gestiona: carga de archivos, herramienta de censura,
 * select tool, y coordinación entre módulos.
 */

const FtoolsEditorUI = (() => {
  // ─── Herramienta de Selección ─────────────────────────────────────────────────
  function activateSelectTool() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = 'default';
    });
    document.querySelectorAll('.annotation').forEach(el => {
      el.style.pointerEvents = 'all';
    });
  }

  // ─── Herramienta de Censura (rectángulo negro) ────────────────────────────────
  let censorRect = null;
  let censorStart = null;

  function activateCensorTool() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = 'crosshair';
      layer.addEventListener('mousedown', onCensorMouseDown);
    });
  }

  function deactivateCensorTool() {
    document.querySelectorAll('.annotation-layer').forEach(layer => {
      layer.style.cursor = '';
      layer.removeEventListener('mousedown', onCensorMouseDown);
    });
    if (censorRect) { censorRect.remove(); censorRect = null; }
  }

  function onCensorMouseDown(e) {
    if (FtoolsEditor.state.activeTool !== 'censor') return;
    const layer = e.currentTarget;
    const pageNum = parseInt(layer.getAttribute('data-page'));
    const rect = layer.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    censorRect = document.createElement('div');
    censorRect.style.cssText = `
      position:absolute; background:black;
      left:${startX}px; top:${startY}px;
      width:0; height:0; pointer-events:none; z-index:20;
    `;
    layer.appendChild(censorRect);

    const onMove = (e) => {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      censorRect.style.left = `${Math.min(startX, x)}px`;
      censorRect.style.top = `${Math.min(startY, y)}px`;
      censorRect.style.width = `${Math.abs(x - startX)}px`;
      censorRect.style.height = `${Math.abs(y - startY)}px`;
    };

    const onUp = (e) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const annX = Math.min(startX, x);
      const annY = Math.min(startY, y);
      const w = Math.abs(x - startX);
      const h = Math.abs(y - startY);

      if (w < 5 || h < 5) {
        if (censorRect) censorRect.remove();
        censorRect = null;
        return;
      }

      const annotation = FtoolsEditor.addAnnotation({
        type: 'censor',
        page: pageNum,
        x: annX, y: annY,
        width: w, height: h,
      });

      // El rectángulo ya está en el DOM, convertirlo en elemento de anotación
      censorRect.setAttribute('data-id', annotation.id);
      censorRect.setAttribute('data-type', 'censor');
      censorRect.setAttribute('data-page', pageNum);
      censorRect.className = 'annotation censor-annotation';
      censorRect.style.pointerEvents = 'all';
      censorRect.style.cursor = 'pointer';
      censorRect.title = 'Click para eliminar';

      // Click para borrar censura
      censorRect.addEventListener('click', (ev) => {
        ev.stopPropagation();
        FtoolsEditor.removeAnnotation(annotation.id);
        censorRect.remove();
      });

      censorRect = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ─── Deseleccionar al hacer click en canvas vacío ─────────────────────────────
  function setupDeselectOnCanvas() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.annotation') &&
          !e.target.closest('#properties-panel') &&
          !e.target.closest('#tool-sidebar')) {
        document.querySelectorAll('.annotation.selected').forEach(el => {
          el.classList.remove('selected');
        });
        FtoolsEditor.state.selectedAnnotation = null;
        FtoolsEditor.emit('annotationDeselected');
      }
    });
  }

  // ─── Carga de PDF via drag & drop y file input ───────────────────────────────
  function setupFileInput() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropArea  = document.getElementById('drop-area');
    if (!dropZone || !fileInput) return;

    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) showModeModal(file);
    });

    ['dragenter', 'dragover'].forEach(evt =>
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag-over'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('drag-over'); })
    );
    dropZone.addEventListener('drop', e => {
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') showModeModal(file);
      else showToast('Por favor sube un archivo PDF', 'error');
    });
  }

  // ─── Modal de modo de edición ─────────────────────────────────────────────────
  let _pendingFile = null;
  let _editMode = 'extract'; // default

  function showModeModal(file) {
    _pendingFile = file;
    const modal = document.getElementById('mode-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function setupModeModal() {
    const modal = document.getElementById('mode-modal');
    const cardExtract = document.getElementById('mode-card-extract');
    const cardOverlay = document.getElementById('mode-card-overlay');
    const btnConfirm  = document.getElementById('btn-mode-confirm');
    if (!modal || !btnConfirm) return;

    [cardExtract, cardOverlay].forEach(card => {
      if (!card) return;
      card.addEventListener('click', () => {
        cardExtract.classList.remove('selected');
        cardOverlay.classList.remove('selected');
        card.classList.add('selected');
        _editMode = card.dataset.mode;
      });
    });

    btnConfirm.addEventListener('click', () => {
      modal.classList.add('hidden');
      if (_pendingFile) {
        loadFile(_pendingFile, _editMode);
        _pendingFile = null;
      }
    });
  }

  // ─── Cargar archivo PDF ───────────────────────────────────────────────────────
  async function loadFile(file, editMode = 'extract') {
    if (file.type !== 'application/pdf') {
      showToast('Solo se permiten archivos PDF', 'error');
      return;
    }
    FtoolsEditor.state.editMode = editMode;
    showLoadingOverlay(true, 'Cargando PDF...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      FtoolsEditor.state.pdfBytes   = arrayBuffer;
      FtoolsEditor.state.fileName   = file.name.replace(/\.pdf$/i, '');
      FtoolsExporter.loadPdfLib().catch(console.warn);
      await FtoolsRenderer.loadPDF(arrayBuffer);
      await FtoolsRenderer.renderAllPages();

      document.getElementById('drop-zone').classList.add('hidden');
      document.getElementById('pdf-workspace').classList.remove('hidden');
      document.getElementById('file-name-display').textContent = file.name;
      document.getElementById('total-pages-display').textContent = FtoolsEditor.state.totalPages;
      updateZoomDisplay();

      // Auto-activar herramienta según modo elegido
      const autoTool = editMode === 'extract' ? 'text-edit' : 'text';
      const tools = ['select', 'text', 'text-edit', 'image', 'censor'];
      tools.forEach(t => document.getElementById(`tool-${t}`)?.classList.remove('tool-active'));
      document.getElementById(`tool-${autoTool}`)?.classList.add('tool-active');

      // Mostrar/ocultar botón T↔ según modo
      const textEditBtn = document.getElementById('tool-text-edit');
      if (textEditBtn) {
        textEditBtn.style.display = editMode === 'extract' ? '' : 'none';
      }

      FtoolsEditor.setTool(autoTool);
      showToast(`PDF cargado — modo: ${editMode === 'extract' ? 'Editar texto' : 'Agregar texto'} ✓`, 'success');
    } catch (err) {
      console.error('Error cargando PDF:', err);
      showToast('Error al cargar el PDF: ' + err.message, 'error');
    } finally {
      showLoadingOverlay(false);
    }
  }

  // ─── Controles de zoom ────────────────────────────────────────────────────────
  function setupZoomControls() {
    document.getElementById('btn-zoom-in')?.addEventListener('click', async () => {
      const newScale = Math.min(3, FtoolsEditor.state.scale + 0.25);
      showLoadingOverlay(true, 'Reescalando...');
      await FtoolsRenderer.setScale(newScale);
      updateZoomDisplay();
      showLoadingOverlay(false);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', async () => {
      const newScale = Math.max(0.5, FtoolsEditor.state.scale - 0.25);
      showLoadingOverlay(true, 'Reescalando...');
      await FtoolsRenderer.setScale(newScale);
      updateZoomDisplay();
      showLoadingOverlay(false);
    });

    document.getElementById('btn-zoom-reset')?.addEventListener('click', async () => {
      showLoadingOverlay(true, 'Reescalando...');
      await FtoolsRenderer.setScale(1.5);
      updateZoomDisplay();
      showLoadingOverlay(false);
    });
  }

  function updateZoomDisplay() {
    const el = document.getElementById('zoom-display');
    if (el) el.textContent = `${Math.round(FtoolsEditor.state.scale * 100)}%`;
  }

  // ─── Barra de herramientas ────────────────────────────────────────────────────
  function setupToolbar() {
    const tools = ['select', 'text', 'text-edit', 'image', 'censor'];

    tools.forEach(tool => {
      const btn = document.getElementById(`tool-${tool}`);
      if (!btn) return;

      btn.addEventListener('click', () => {
        FtoolsEditor.setTool(tool);
        tools.forEach(t => {
          document.getElementById(`tool-${t}`)?.classList.remove('tool-active');
        });
        btn.classList.add('tool-active');
      });
    });

    // Limpiar rastro
    document.querySelectorAll('.btn-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres limpiar todo? Se perderán todos los cambios.')) {
          FtoolsEditor.clearAll();
          const dropZone = document.getElementById('drop-zone');
          const workspace = document.getElementById('pdf-workspace');
          if (dropZone) dropZone.classList.remove('hidden');
          if (workspace) workspace.classList.add('hidden');
          document.getElementById('pdf-pages-container').innerHTML = '';
          document.getElementById('file-input').value = '';
          showToast('Todo limpiado 🧹', 'info');
        }
      });
    });

    // Guardar PDF
    document.getElementById('btn-export')?.addEventListener('click', () => {
      FtoolsExporter.exportPDF();
    });

    // Deshacer / Rehacer
    document.getElementById('btn-undo')?.addEventListener('click', () => FtoolsEditor.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => FtoolsEditor.redo());
  }

  // ─── Panel de propiedades de texto ───────────────────────────────────────────
  function setupPropertiesPanel() {
    const fontSelect = document.getElementById('prop-font');
    const sizeInput = document.getElementById('prop-size');
    const sizeValue = document.getElementById('prop-size-value');
    const colorInput = document.getElementById('prop-color');
    const boldBtn = document.getElementById('prop-bold');
    const italicBtn = document.getElementById('prop-italic');

    if (fontSelect) {
      // Poblar fuentes
      FtoolsTextTool.getFonts().forEach(font => {
        const opt = document.createElement('option');
        opt.value = font.value;
        opt.textContent = font.label;
        opt.style.fontFamily = font.value;
        fontSelect.appendChild(opt);
      });

      fontSelect.addEventListener('change', () => {
        FtoolsTextTool.updateSelectedProperty('fontFamily', fontSelect.value);
      });
    }

    if (sizeInput) {
      sizeInput.addEventListener('input', () => {
        const val = parseInt(sizeInput.value);
        if (sizeValue) sizeValue.textContent = `${val}px`;
        FtoolsTextTool.updateSelectedProperty('fontSize', val);
      });
    }

    if (colorInput) {
      colorInput.addEventListener('input', () => {
        FtoolsTextTool.updateSelectedProperty('color', colorInput.value);
      });
    }

    if (boldBtn) {
      boldBtn.addEventListener('click', () => {
        const isBold = boldBtn.classList.toggle('active');
        FtoolsTextTool.updateSelectedProperty('bold', isBold);
      });
    }

    if (italicBtn) {
      italicBtn.addEventListener('click', () => {
        const isItalic = italicBtn.classList.toggle('active');
        FtoolsTextTool.updateSelectedProperty('italic', isItalic);
      });
    }

    // Mostrar/ocultar panel según herramienta
    FtoolsEditor.on('toolChanged', (tool) => {
      const panel = document.getElementById('properties-panel');
      if (panel) {
        panel.style.display = tool === 'text' ? 'flex' : 'none';
      }
    });
  }

  // ─── Progress bar de carga ────────────────────────────────────────────────────
  FtoolsEditor.on('loadProgress', (pct) => {
    const bar = document.getElementById('load-progress-bar');
    if (bar) bar.style.width = `${pct}%`;
  });

  // ─── Historial ────────────────────────────────────────────────────────────────
  FtoolsEditor.on('historyChanged', () => {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = FtoolsEditor.state.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = FtoolsEditor.state.redoStack.length === 0;
  });

  // ─── Export loading ───────────────────────────────────────────────────────────
  FtoolsEditor.on('exportStarted', () => showLoadingOverlay(true, 'Generando PDF...'));
  FtoolsEditor.on('exportCompleted', () => showLoadingOverlay(false));
  FtoolsEditor.on('exportError', () => showLoadingOverlay(false));

  // ─── Herramienta de censura events ───────────────────────────────────────────
  FtoolsEditor.on('toolChanged', (tool) => {
    if (tool === 'censor') activateCensorTool();
    else deactivateCensorTool();

    if (tool === 'select') activateSelectTool();
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupFileInput();
    setupModeModal();
    setupToolbar();
    setupZoomControls();
    setupPropertiesPanel();
    setupDeselectOnCanvas();

    // El botón T↔ se muestra solo si el usuario elige modo 'extract'
    const textEditBtn = document.getElementById('tool-text-edit');
    if (textEditBtn) textEditBtn.style.display = 'none';

    FtoolsEditor.setTool('select');
    document.getElementById('tool-select')?.classList.add('tool-active');

    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = true;
    if (redoBtn) redoBtn.disabled = true;
  }

  return { init };
})();

// ─── Utilidades globales ──────────────────────────────────────────────────────

function showLoadingOverlay(show, message = 'Cargando...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) return;

  if (show) {
    overlay.querySelector('#loading-message').textContent = message;
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    const bar = document.getElementById('load-progress-bar');
    if (bar) bar.style.width = '0%';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-remover
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  FtoolsEditorUI.init();
});
