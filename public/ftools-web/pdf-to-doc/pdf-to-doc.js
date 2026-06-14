/**
 * pdf-to-doc.js — Motor Híbrido PDF → DOCX
 *
 * Motor 1 (primario):  CloudConvert API — conversión perfecta en servidor
 *                      Preserva tablas, imágenes, estilos. 25 gratis/día.
 * Motor 2 (fallback):  pdf.js + docx.js — extracción de texto local
 *                      Solo texto plano, sin necesidad de API key.
 */

// ── CDNs ──────────────────────────────────────────────────────────────────────
// PDF.js v3 — probado y funcional en el PDF Editor
const PDFJS_SRC    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const DOCX_SRC     = 'https://unpkg.com/docx@8.5.0/build/index.umd.js';

// ── Estado ────────────────────────────────────────────────────────────────────
const State = {
    file: null,
    pdfDoc: null,
    totalPages: 0,
    outputUrl: null,
    apiKey: localStorage.getItem('cc_api_key') || '',
    engine: 'cloudconvert', // 'cloudconvert' | 'local'
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
    dropZone:       $('drop-zone'),
    fileInput:      $('file-input-pdf'),
    dropIdle:       $('drop-idle'),
    dropLoaded:     $('drop-loaded'),
    pdfName:        $('pdf-name'),
    pdfMeta:        $('pdf-meta'),
    pageCountLabel: $('page-count-label'),
    changePdfBtn:   $('change-pdf-btn'),
    pagesPreview:   $('pages-preview'),
    pagesGrid:      $('pages-grid'),
    engineCloudBtn: $('engine-cloud'),
    engineLocalBtn: $('engine-local'),
    apiKeySection:  $('api-key-section'),
    apiKeyInput:    $('api-key-input'),
    saveKeyBtn:     $('save-key-btn'),
    localWarning:   $('local-warning'),
    progressSection:$('progress-section'),
    progressBar:    $('progress-bar'),
    progressLabel:  $('progress-label'),
    downloadSection:$('download-section'),
    downloadLink:   $('download-link'),
    downloadMeta:   $('download-meta'),
    errorSection:   $('error-section'),
    errorMsg:       $('error-msg'),
    retryBtn:       $('retry-btn'),
    convertBtn:     $('convert-btn'),
    clearBtn:       $('clear-btn'),
    clearBtnMobile: $('clear-btn-mobile'),
};

// ── Helpers de carga de scripts ───────────────────────────────────────────────
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
        document.head.appendChild(s);
    });
}

// ── MOTOR 1: CloudConvert API ─────────────────────────────────────────────────
async function convertWithCloudConvert(file, apiKey) {
    setProgress(5, 'Conectando con CloudConvert...');

    // 1. Crear job con import/upload → convert → export/url
    const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tasks: {
                'upload-pdf':   { operation: 'import/upload' },
                'convert-docx': {
                    operation: 'convert',
                    input: 'upload-pdf',
                    output_format: 'docx',
                    // Opciones de alta calidad
                    pages: null,
                },
                'export-docx':  {
                    operation: 'export/url',
                    input: 'convert-docx',
                    inline: false,
                },
            },
        }),
    });

    if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        if (jobRes.status === 401) throw new Error('API Key inválida. Verifica tu clave de CloudConvert.');
        if (jobRes.status === 402) throw new Error('Cuota agotada. Has usado tus 25 conversiones gratuitas de hoy. Intenta mañana o actualiza tu plan.');
        throw new Error(`Error CloudConvert (${jobRes.status}): ${err.message || 'Error desconocido'}`);
    }

    const jobData = await jobRes.json();
    const job = jobData.data;

    // 2. Subir el PDF al task de upload
    const uploadTask = job.tasks.find(t => t.name === 'upload-pdf');
    if (!uploadTask?.result?.form) throw new Error('CloudConvert no devolvió URL de subida.');

    setProgress(15, 'Subiendo PDF...');
    const { url, parameters } = uploadTask.result.form;
    const formData = new FormData();
    Object.entries(parameters).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', file);

    const uploadRes = await fetch(url, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('Error al subir el PDF a CloudConvert.');

    // 3. Polling hasta que el job termine
    setProgress(30, 'Convirtiendo PDF en servidor...');
    const jobId = job.id;
    let resultJob;
    let attempts = 0;

    while (attempts < 90) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;

        const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!pollRes.ok) continue;
        resultJob = (await pollRes.json()).data;

        if (resultJob.status === 'finished') break;
        if (resultJob.status === 'error') {
            const errTask = resultJob.tasks.find(t => t.status === 'error');
            throw new Error(`Error en la conversión: ${errTask?.message || 'Error desconocido de CloudConvert'}`);
        }

        const pct = 30 + Math.min(attempts * 1.5, 55);
        setProgress(pct, `Convirtiendo... (${attempts * 2}s)`);
    }

    if (!resultJob || resultJob.status !== 'finished') {
        throw new Error('Tiempo de espera agotado. El PDF puede ser muy grande. Intenta con un archivo más pequeño.');
    }

    // 4. Descargar el DOCX resultante
    const exportTask = resultJob.tasks.find(t => t.name === 'export-docx');
    const downloadUrl = exportTask?.result?.files?.[0]?.url;
    if (!downloadUrl) throw new Error('No se encontró el archivo DOCX resultante.');

    setProgress(88, 'Descargando DOCX...');
    const dlRes = await fetch(downloadUrl);
    if (!dlRes.ok) throw new Error('Error al descargar el archivo convertido.');

    return dlRes.blob();
}

// ── MOTOR 2: pdf.js + docx.js (solo texto) ────────────────────────────────────
async function convertWithLocal(file) {
    setProgress(5, 'Cargando motor local...');

    // Cargar PDF.js
    await loadScript(PDFJS_SRC);

    // Detectar el namespace correcto (varía entre builds)
    let pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjsLib) throw new Error('PDF.js no se cargó. Verifica tu conexión a internet.');

    // Configurar worker
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    } catch (_) {}

    setProgress(15, 'Cargando docx...');
    await loadScript(DOCX_SRC);
    if (!window.docx) throw new Error('La librería docx no se cargó.');

    setProgress(25, 'Leyendo PDF...');

    let pdfDoc;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const task = pdfjsLib.getDocument({
            data: arrayBuffer,
            // Evitar errores de worker en entornos restrictivos
            useWorkerFetch: false,
            isEvalSupported: false,
        });
        pdfDoc = await task.promise;
    } catch (err) {
        throw new Error(`No se pudo abrir el PDF: ${err.message}. ¿Está protegido con contraseña?`);
    }

    setProgress(35, 'Extrayendo texto...');

    // Extraer texto de todas las páginas
    const allText = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const content = await page.getTextContent({ normalizeWhitespace: true });

        // Agrupar por línea (coordenada Y)
        const lineMap = new Map();
        for (const item of content.items) {
            // pdf.js v3: item puede ser TextItem (con str) o TextMarkedContent (sin str)
            const str = item.str ?? '';
            if (!str.trim()) continue;
            const y = Math.round(item.transform[5]);
            const existing = lineMap.get(y) || '';
            lineMap.set(y, existing + str);
        }

        // Ordenar Y descendente = de arriba abajo
        const lines = [...lineMap.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, text]) => text.trim())
            .filter(Boolean);

        allText.push({ pageNum: p, lines });

        const pct = 35 + Math.round((p / pdfDoc.numPages) * 40);
        setProgress(pct, `Extrayendo página ${p} de ${pdfDoc.numPages}...`);
    }

    const totalLines = allText.reduce((s, p) => s + p.lines.length, 0);
    if (totalLines === 0) {
        throw new Error(
            'No se detectó texto seleccionable en este PDF.\n\n' +
            'Posibles causas:\n' +
            '• El PDF es una imagen o escaneo (no tiene texto digital)\n' +
            '• El PDF usa fuentes con encoding especial\n\n' +
            'Solución: Usa el motor CloudConvert (requiere API Key gratuita) — ' +
            'soporta OCR y preserva tablas e imágenes.'
        );
    }

    setProgress(78, 'Generando DOCX...');

    // Construir DOCX con docx.js
    const { Document, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType } = window.docx;
    const children = [];

    children.push(new Paragraph({
        children: [new TextRun({ text: file.name.replace(/\.pdf$/i, ''), bold: true, size: 36 })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
    }));

    for (let i = 0; i < allText.length; i++) {
        if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));

        children.push(new Paragraph({
            children: [new TextRun({ text: `— Página ${allText[i].pageNum} —`, color: 'AAAAAA', italics: true, size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
        }));

        for (const line of allText[i].lines) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 120 },
            }));
        }
    }

    const doc = new Document({
        creator: 'Ftools — PDF a Word',
        sections: [{ properties: {}, children }],
    });

    setProgress(92, 'Empaquetando DOCX...');
    return window.docx.Packer.toBlob(doc);
}

// ── Flujo principal ───────────────────────────────────────────────────────────
async function convert() {
    if (!State.file) return;
    hideAll();
    showSection('progress');
    setProgress(0, 'Iniciando...');
    disableConvertBtn();

    const file = State.file;

    try {
        let blob;

        if (State.engine === 'cloudconvert') {
            if (!State.apiKey) {
                throw new Error(
                    'Necesitas una API Key gratuita de CloudConvert.\n' +
                    'Regístrate en cloudconvert.com (sin tarjeta de crédito) → ' +
                    'Dashboard → API Keys → Crea una clave y pégala arriba.'
                );
            }
            blob = await convertWithCloudConvert(file, State.apiKey);
        } else {
            blob = await convertWithLocal(file);
        }

        setProgress(97, 'Preparando descarga...');
        revokeUrl();
        State.outputUrl = URL.createObjectURL(blob);

        const baseName = file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_ftools.docx`;
        el.downloadLink.href = State.outputUrl;
        el.downloadLink.setAttribute('download', outName);

        const sz = blob.size > 1048576
            ? `${(blob.size / 1048576).toFixed(2)} MB`
            : `${(blob.size / 1024).toFixed(1)} KB`;
        const engine = State.engine === 'cloudconvert' ? 'CloudConvert (alta fidelidad)' : 'Motor local (solo texto)';
        el.downloadMeta.textContent = `${outName} · ${sz} · Motor: ${engine}`;

        setProgress(100, '¡Listo!');
        hideAll();
        showSection('download');

    } catch (err) {
        console.error('Conversion error:', err);
        hideAll();
        showError(err.message || String(err));
    } finally {
        enableConvertBtn();
    }
}

// ── Gestión de archivo ────────────────────────────────────────────────────────
async function handleFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showError('Solo se aceptan archivos PDF. Asegúrate de que el archivo tenga extensión .pdf');
        return;
    }

    State.file = file;
    el.pdfName.textContent = file.name;
    const sz = file.size > 1048576
        ? `${(file.size / 1048576).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
    el.pdfMeta.textContent = `${sz} · PDF`;
    el.pageCountLabel.textContent = 'Listo para convertir';

    el.dropIdle.classList.add('hidden');
    el.dropLoaded.classList.remove('hidden');
    el.dropZone.classList.add('file-loaded');
    hideAll();
    revokeUrl();
    enableConvertBtn();

    // Intentar obtener número de páginas en background (sin bloquear)
    getPageCount(file);
}

async function getPageCount(file) {
    try {
        await loadScript(PDFJS_SRC);
        const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        if (!lib) return;
        try { lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; } catch (_) {}
        const ab = await file.arrayBuffer();
        const doc = await lib.getDocument({ data: ab, useWorkerFetch: false }).promise;
        State.totalPages = doc.numPages;
        el.pageCountLabel.textContent = `${doc.numPages} página${doc.numPages !== 1 ? 's' : ''} detectada${doc.numPages !== 1 ? 's' : ''}`;
        buildPagePreview(doc.numPages);
        State.pdfDoc = doc;
    } catch (_) {
        el.pageCountLabel.textContent = 'Listo para convertir';
    }
}

function buildPagePreview(total) {
    el.pagesGrid.innerHTML = '';
    const max = Math.min(total, 16);
    for (let i = 1; i <= max; i++) {
        const card = document.createElement('div');
        card.className = 'page-card text-center';
        card.innerHTML = `<div class="text-xl">📃</div><div class="font-bold text-xs">Pág. ${i}</div>`;
        el.pagesGrid.appendChild(card);
    }
    if (total > 16) {
        const more = document.createElement('div');
        more.className = 'page-card text-center opacity-50';
        more.innerHTML = `<div>···</div><div class="text-xs">+${total - 16} más</div>`;
        el.pagesGrid.appendChild(more);
    }
    el.pagesPreview.classList.remove('hidden');
}

function resetFile() {
    State.file = null;
    State.pdfDoc = null;
    State.totalPages = 0;
    el.fileInput.value = '';
    el.dropIdle.classList.remove('hidden');
    el.dropLoaded.classList.add('hidden');
    el.dropZone.classList.remove('file-loaded', 'drag-over');
    el.pagesPreview.classList.add('hidden');
    el.pagesGrid.innerHTML = '';
    el.pageCountLabel.textContent = '';
    disableConvertBtn();
    hideAll();
    revokeUrl();
}

function clearTrace() {
    if (State.pdfDoc) { try { State.pdfDoc.destroy(); } catch (_) {} }
    revokeUrl();
    resetFile();
    [el.clearBtn, el.clearBtnMobile].forEach(b => {
        b.textContent = '✅ Limpiado';
        setTimeout(() => { b.innerHTML = '🗑️ Limpiar Rastro'; }, 1500);
    });
}

// ── Selección de motor ────────────────────────────────────────────────────────
function setEngine(engine) {
    State.engine = engine;
    el.engineCloudBtn.classList.toggle('engine-active', engine === 'cloudconvert');
    el.engineLocalBtn.classList.toggle('engine-active', engine === 'local');
    el.apiKeySection.classList.toggle('hidden', engine === 'local');
    el.localWarning.classList.toggle('hidden', engine === 'cloudconvert');
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setProgress(pct, label) {
    el.progressBar.style.width = `${pct}%`;
    el.progressLabel.textContent = label;
}
function showSection(name) {
    const map = { progress: el.progressSection, download: el.downloadSection, error: el.errorSection };
    if (map[name]) map[name].classList.remove('hidden');
}
function hideAll() {
    [el.progressSection, el.downloadSection, el.errorSection].forEach(e => e.classList.add('hidden'));
}
function showError(msg) {
    // Reemplazar \n con saltos de línea reales en el mensaje
    el.errorMsg.innerHTML = msg.replace(/\n/g, '<br>');
    showSection('error');
}
function enableConvertBtn() {
    el.convertBtn.disabled = false;
    el.convertBtn.classList.remove('opacity-40', 'cursor-not-allowed');
}
function disableConvertBtn() {
    el.convertBtn.disabled = true;
    el.convertBtn.classList.add('opacity-40', 'cursor-not-allowed');
}
function revokeUrl() {
    if (State.outputUrl) { URL.revokeObjectURL(State.outputUrl); State.outputUrl = null; }
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Drop zone
    el.dropZone.addEventListener('click', e => { if (e.target !== el.changePdfBtn) el.fileInput.click(); });
    el.dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') el.fileInput.click(); });
    el.dropZone.addEventListener('dragover', e => { e.preventDefault(); el.dropZone.classList.add('drag-over'); });
    el.dropZone.addEventListener('dragleave', () => el.dropZone.classList.remove('drag-over'));
    el.dropZone.addEventListener('drop', e => {
        e.preventDefault(); el.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    el.fileInput.addEventListener('change', () => { if (el.fileInput.files[0]) handleFile(el.fileInput.files[0]); });
    el.changePdfBtn.addEventListener('click', e => { e.stopPropagation(); resetFile(); });

    // Selección de motor
    el.engineCloudBtn.addEventListener('click', () => setEngine('cloudconvert'));
    el.engineLocalBtn.addEventListener('click', () => setEngine('local'));

    // API Key
    if (State.apiKey) el.apiKeyInput.value = State.apiKey;
    el.saveKeyBtn.addEventListener('click', () => {
        const key = el.apiKeyInput.value.trim();
        if (!key) { return; }
        State.apiKey = key;
        localStorage.setItem('cc_api_key', key);
        el.saveKeyBtn.textContent = '✅ Guardada';
        setTimeout(() => { el.saveKeyBtn.textContent = 'Guardar'; }, 2000);
    });

    // Convertir / Reintentar / Limpiar
    el.convertBtn.addEventListener('click', convert);
    el.retryBtn.addEventListener('click', () => { hideAll(); if (State.file) enableConvertBtn(); });
    el.clearBtn.addEventListener('click', clearTrace);
    el.clearBtnMobile.addEventListener('click', clearTrace);

    // ── Interstitial antes de descarga ────────────────────────────────
    el.downloadLink.addEventListener('click', function(e) {
        if (this.dataset.adShown === 'true') {
            this.dataset.adShown = 'false';
            return; // Let the actual download proceed
        }
        e.preventDefault();
        if (typeof FtoolsAds !== 'undefined') {
            FtoolsAds.showInterstitial(() => {
                this.dataset.adShown = 'true';
                this.click();
            });
        }
    });

    // Motor inicial
    setEngine('cloudconvert');
});
