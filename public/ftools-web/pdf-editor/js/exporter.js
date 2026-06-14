/**
 * exporter.js — Exportar PDF editado usando pdf-lib
 * Ftools PDF Editor | 100% Client-side
 */

const FtoolsExporter = (() => {
  const PDFLIB_CDN = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';

  let PDFLib = null;

  // ─── Cargar pdf-lib ───────────────────────────────────────────────────────────
  async function loadPdfLib() {
    if (PDFLib) return PDFLib;

    await new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${PDFLIB_CDN}"]`)) {
        resolve(); return;
      }
      const s = document.createElement('script');
      s.src = PDFLIB_CDN;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    PDFLib = window.PDFLib;
    return PDFLib;
  }

  // ─── Convertir color hex a RGB [0,1] ─────────────────────────────────────────
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }

  // ─── Mapeo de fuente a pdf-lib StandardFont ───────────────────────────────────
  function getPdfLibFont(fontFamily, bold, italic) {
    const lib = PDFLib;
    const f = fontFamily.toLowerCase();

    if (f.includes('times') || f.includes('georgia') || f.includes('serif')) {
      if (bold && italic) return lib.StandardFonts.TimesRomanBoldItalic;
      if (bold) return lib.StandardFonts.TimesRomanBold;
      if (italic) return lib.StandardFonts.TimesRomanItalic;
      return lib.StandardFonts.TimesRoman;
    }
    if (f.includes('courier') || f.includes('mono')) {
      if (bold && italic) return lib.StandardFonts.CourierBoldOblique;
      if (bold) return lib.StandardFonts.CourierBold;
      if (italic) return lib.StandardFonts.CourierOblique;
      return lib.StandardFonts.Courier;
    }
    // Default: Helvetica
    if (bold && italic) return lib.StandardFonts.HelveticaBoldOblique;
    if (bold) return lib.StandardFonts.HelveticaBold;
    if (italic) return lib.StandardFonts.HelveticaOblique;
    return lib.StandardFonts.Helvetica;
  }

  // ─── Convertir dataUrl a Uint8Array ──────────────────────────────────────────
  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // ─── Calcular coordenadas PDF (origin bottom-left) ────────────────────────────
  // PDF.js usa origen top-left en CSS; pdf-lib usa bottom-left
  function cssToPageCoords(cssX, cssY, cssHeight, pageHeight, cssWidth, pageWidth) {
    const scaleX = pageWidth / cssWidth;
    const scaleY = pageHeight / cssHeight;
    const pdfX = cssX * scaleX;
    const pdfY = pageHeight - (cssY * scaleY);
    return { pdfX, pdfY, scaleX, scaleY };
  }

  // ─── Exportar PDF ─────────────────────────────────────────────────────────────
  async function exportPDF() {
    const pdfBytes = FtoolsEditor.state.pdfBytes;
    const annotations = FtoolsEditor.state.annotations;

    if (!pdfBytes) {
      showToast('No hay PDF cargado', 'error');
      return;
    }

    try {
      const lib = await loadPdfLib();
      showToast('Preparando PDF...', 'info');
      FtoolsEditor.emit('exportStarted');

      // Cargar el PDF original
      const pdfDoc = await lib.PDFDocument.load(pdfBytes.slice(0));
      const pages = pdfDoc.getPages();

      // Pre-cargar fuentes únicas necesarias
      const fontCache = {};
      const uniqueFonts = new Set();
      annotations.filter(a => a.type === 'text').forEach(ann => {
        const key = `${ann.fontFamily}-${ann.bold}-${ann.italic}`;
        uniqueFonts.add(key);
      });

      for (const key of uniqueFonts) {
        const [fontFamily, bold, italic] = key.split('-');
        const fontName = getPdfLibFont(fontFamily, bold === 'true', italic === 'true');
        fontCache[key] = await pdfDoc.embedFont(fontName);
      }

      // Fuente para text-edit (Helvetica, re-usable)
      const helvetica = await pdfDoc.embedFont(lib.StandardFonts.Helvetica);

      // Procesar cada anotación
      for (const ann of annotations) {
        const pageIdx = ann.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Obtener dimensiones CSS del canvas
        const pageInfo = FtoolsRenderer.getPageCanvas(ann.page);
        if (!pageInfo) continue;

        const { cssWidth, cssHeight } = pageInfo;

        if (ann.type === 'text') {
          await drawTextAnnotation(page, ann, pageWidth, pageHeight, cssWidth, cssHeight, fontCache);
        } else if (ann.type === 'image') {
          await drawImageAnnotation(pdfDoc, page, ann, pageWidth, pageHeight, cssWidth, cssHeight, lib);
        } else if (ann.type === 'censor') {
          await drawCensorAnnotation(page, ann, pageWidth, pageHeight, cssWidth, cssHeight, lib);
        } else if (ann.type === 'text-edit') {
          await drawTextEditAnnotation(pdfDoc, page, ann, pageWidth, pageHeight, lib, helvetica);
        }
      }

      // Guardar y descargar
      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const triggerDownload = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${FtoolsEditor.state.fileName}_editado.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revocar URL después de un momento
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        showToast('¡PDF descargado con éxito! 🎉', 'success');
        FtoolsEditor.emit('exportCompleted');
      };

      // Mostrar interstitial antes de descargar (si está disponible)
      if (typeof FtoolsAds !== 'undefined') {
        FtoolsAds.showInterstitial(triggerDownload);
      } else {
        triggerDownload();
      }

    } catch (err) {
      console.error('Error exportando PDF:', err);
      showToast(`Error al exportar: ${err.message}`, 'error');
      FtoolsEditor.emit('exportError', err);
    }
  }

  // ─── Dibujar texto en página PDF ──────────────────────────────────────────────
  async function drawTextAnnotation(page, ann, pageWidth, pageHeight, cssWidth, cssHeight, fontCache) {
    const key = `${ann.fontFamily}-${ann.bold}-${ann.italic}`;
    const font = fontCache[key];
    if (!font) return;

    const { pdfX, pdfY, scaleY } = cssToPageCoords(ann.x, ann.y, cssHeight, pageHeight, cssWidth, pageWidth);
    const rgb = hexToRgb(ann.color);
    const fontSize = ann.fontSize * (pageHeight / cssHeight);

    // Ajustar Y por el tamaño de fuente (la y CSS es la parte superior del texto)
    const adjustedY = pdfY - fontSize;

    // Manejar texto multilínea
    const lines = ann.content.split('\n');
    const lineHeight = fontSize * 1.2;

    lines.forEach((line, i) => {
      page.drawText(line, {
        x: Math.max(0, pdfX),
        y: Math.max(0, adjustedY - (i * lineHeight)),
        size: fontSize,
        font,
        color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
        maxWidth: pageWidth - pdfX - 10,
      });
    });
  }

  // ─── Dibujar imagen en página PDF ─────────────────────────────────────────────
  async function drawImageAnnotation(pdfDoc, page, ann, pageWidth, pageHeight, cssWidth, cssHeight, lib) {
    if (!ann.imageDataUrl) return;

    try {
      const bytes = dataUrlToBytes(ann.imageDataUrl);
      const image = await pdfDoc.embedPng(bytes);

      const { pdfX, pdfY } = cssToPageCoords(ann.x, ann.y, cssHeight, pageHeight, cssWidth, pageWidth);
      const scaleX = pageWidth / cssWidth;
      const scaleY = pageHeight / cssHeight;

      const drawWidth = ann.width * scaleX;
      const drawHeight = ann.height * scaleY;

      page.drawImage(image, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY - drawHeight),
        width: drawWidth,
        height: drawHeight,
      });
    } catch (err) {
      console.warn('No se pudo incrustar imagen:', err);
    }
  }

  // ─── Dibujar rectángulo de censura ───────────────────────────────────────────
  async function drawCensorAnnotation(page, ann, pageWidth, pageHeight, cssWidth, cssHeight, lib) {
    const { pdfX, pdfY } = cssToPageCoords(ann.x, ann.y, cssHeight, pageHeight, cssWidth, pageWidth);
    const scaleX = pageWidth / cssWidth;
    const scaleY = pageHeight / cssHeight;

    page.drawRectangle({
      x: Math.max(0, pdfX),
      y: Math.max(0, pdfY - ann.height * scaleY),
      width: ann.width * scaleX,
      height: ann.height * scaleY,
      color: lib.rgb(0, 0, 0),
    });
  }

  // ─── Cubrir texto original y dibujar nuevo texto ─────────────────────────────
  async function drawTextEditAnnotation(pdfDoc, page, ann, pageWidth, pageHeight, lib, helvetica) {
    const { pdfX, pdfY, pdfFontSize, pdfWidth, newText, color, fontInfo } = ann;
    if (!newText || pdfFontSize <= 0) return;

    // Elegir fuente pdf-lib según la detectada
    let font = helvetica;
    try {
      const fi = fontInfo || {};
      const pl = fi.pdfLibFont || 'Helvetica';
      const fontName = getPdfLibFont(pl, fi.isBold, fi.isItalic);
      font = await pdfDoc.embedFont(fontName);
    } catch { /* fallback to helvetica */ }

    // Convertir color hex a RGB
    const rgb = hexToRgb(color || '#1a1a1a');

    // Rectángulo blanco sobre el texto original
    const coverH = pdfFontSize * 1.4;
    const coverW = Math.max(pdfWidth, newText.length * pdfFontSize * 0.6) + 4;
    page.drawRectangle({
      x: Math.max(0, pdfX - 1),
      y: Math.max(0, pdfY - pdfFontSize * 0.3),
      width:  Math.min(coverW, pageWidth - pdfX),
      height: Math.min(coverH, pageHeight),
      color:  lib.rgb(1, 1, 1),
      borderWidth: 0,
    });

    // Nuevo texto con color y fuente detectados
    try {
      page.drawText(newText, {
        x:    Math.max(0, pdfX),
        y:    Math.max(1, pdfY),
        size: pdfFontSize,
        font,
        color: lib.rgb(rgb.r, rgb.g, rgb.b),
        maxWidth: pageWidth - pdfX - 4,
      });
    } catch (e) { console.warn('text-edit draw:', e); }
  }


  return {
    loadPdfLib,
    exportPDF,
  };
})();
