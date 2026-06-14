/**
 * core.js — Estado global y event bus del PDF Editor
 * Ftools PDF Editor | 100% Client-side
 */

const FtoolsEditor = (() => {
  // ─── Estado Global ───────────────────────────────────────────────────────────
  const state = {
    pdfDoc: null,          // pdf-lib PDFDocument (para exportar)
    pdfJsDoc: null,        // PDF.js doc (para renderizar)
    pdfBytes: null,        // ArrayBuffer original del PDF
    fileName: 'document',  // nombre del archivo cargado
    totalPages: 0,
    currentPage: 1,
    scale: 1.5,            // escala de renderizado
    activeTool: 'select',  // 'select' | 'text' | 'image' | 'censor'
    annotations: [],       // todas las anotaciones añadidas
    selectedAnnotation: null,
    undoStack: [],
    redoStack: [],
    isLoading: false,
  };

  // ─── Event Bus ───────────────────────────────────────────────────────────────
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => cb(data));
  }

  // ─── Gestión de Anotaciones ──────────────────────────────────────────────────
  function addAnnotation(annotation) {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAnnotation = { ...annotation, id };
    state.annotations.push(newAnnotation);

    // Push to undo stack
    state.undoStack.push({ type: 'add', annotation: newAnnotation });
    state.redoStack = [];

    emit('annotationAdded', newAnnotation);
    return newAnnotation;
  }

  function updateAnnotation(id, updates) {
    const idx = state.annotations.findIndex(a => a.id === id);
    if (idx === -1) return;

    const prev = { ...state.annotations[idx] };
    state.annotations[idx] = { ...state.annotations[idx], ...updates };

    state.undoStack.push({ type: 'update', id, prev, next: { ...state.annotations[idx] } });
    state.redoStack = [];

    emit('annotationUpdated', state.annotations[idx]);
    return state.annotations[idx];
  }

  function removeAnnotation(id) {
    const idx = state.annotations.findIndex(a => a.id === id);
    if (idx === -1) return;

    const removed = state.annotations.splice(idx, 1)[0];
    state.undoStack.push({ type: 'remove', annotation: removed, index: idx });
    state.redoStack = [];

    emit('annotationRemoved', removed);
  }

  function getAnnotationsForPage(pageNum) {
    return state.annotations.filter(a => a.page === pageNum);
  }

  // ─── Undo / Redo ─────────────────────────────────────────────────────────────
  function undo() {
    const action = state.undoStack.pop();
    if (!action) return;

    switch (action.type) {
      case 'add':
        state.annotations = state.annotations.filter(a => a.id !== action.annotation.id);
        emit('annotationRemoved', action.annotation);
        break;
      case 'remove':
        state.annotations.splice(action.index, 0, action.annotation);
        emit('annotationAdded', action.annotation);
        break;
      case 'update':
        const idx = state.annotations.findIndex(a => a.id === action.id);
        if (idx !== -1) {
          state.annotations[idx] = action.prev;
          emit('annotationUpdated', action.prev);
        }
        break;
    }
    state.redoStack.push(action);
    emit('historyChanged');
  }

  function redo() {
    const action = state.redoStack.pop();
    if (!action) return;

    switch (action.type) {
      case 'add':
        state.annotations.push(action.annotation);
        emit('annotationAdded', action.annotation);
        break;
      case 'remove':
        state.annotations = state.annotations.filter(a => a.id !== action.annotation.id);
        emit('annotationRemoved', action.annotation);
        break;
      case 'update':
        const idx = state.annotations.findIndex(a => a.id === action.id);
        if (idx !== -1) {
          state.annotations[idx] = action.next;
          emit('annotationUpdated', action.next);
        }
        break;
    }
    state.undoStack.push(action);
    emit('historyChanged');
  }

  // ─── Limpiar Rastro ──────────────────────────────────────────────────────────
  function clearAll() {
    state.pdfDoc = null;
    state.pdfJsDoc = null;
    state.pdfBytes = null;
    state.fileName = 'document';
    state.totalPages = 0;
    state.currentPage = 1;
    state.annotations = [];
    state.selectedAnnotation = null;
    state.undoStack = [];
    state.redoStack = [];

    // Revocar URLs de objeto si existen
    emit('cleared');
  }

  // ─── Herramienta activa ──────────────────────────────────────────────────────
  function setTool(tool) {
    state.activeTool = tool;
    emit('toolChanged', tool);
  }

  return {
    state,
    on, off, emit,
    addAnnotation, updateAnnotation, removeAnnotation, getAnnotationsForPage,
    undo, redo,
    clearAll,
    setTool,
  };
})();

// Atajos de teclado globales
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    FtoolsEditor.undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    FtoolsEditor.redo();
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const sel = FtoolsEditor.state.selectedAnnotation;
    if (sel && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      FtoolsEditor.removeAnnotation(sel);
      FtoolsEditor.state.selectedAnnotation = null;
    }
  }
});
