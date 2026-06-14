/**
 * audio-converter.js — Motor Híbrido
 * Motor 1: Web Audio API + lamejs (sin servidor, funciona en file://)
 * Motor 2: CloudConvert API (todos los formatos + video, requiere API key gratis)
 */

// ── Estado ──────────────────────────────────────────────────────────────────
const State = {
    file: null,
    outputFormat: 'mp3',
    outputBitrate: 128,
    activeTab: 'audio',
    outputUrl: null,
    apiKey: localStorage.getItem('cc_api_key') || '',
};

const AUDIO_EXT = ['wav','mp3','ogg','flac','aac','m4a','opus','wma','aiff'];
const VIDEO_EXT = ['mp4','mkv','mov','webm','avi','m4v','flv'];

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
    tabAudio:       $('tab-audio'),
    tabVideo:       $('tab-video'),
    dropZone:       $('drop-zone'),
    fileInput:      $('file-input'),
    dropIdle:       $('drop-idle'),
    dropLoaded:     $('drop-loaded'),
    dropIcon:       $('drop-icon'),
    dropTitle:      $('drop-title'),
    dropSubtitle:   $('drop-subtitle'),
    fileName:       $('file-name'),
    fileMeta:       $('file-meta'),
    changeFileBtn:  $('change-file-btn'),
    formatGrid:     document.querySelectorAll('[data-format]'),
    bitrateBadges:  document.querySelectorAll('[data-bitrate]'),
    bitrateSection: $('bitrate-section'),
    engineInfo:     $('engine-info'),
    apiKeySection:  $('api-key-section'),
    apiKeyInput:    $('api-key-input'),
    saveKeyBtn:     $('save-key-btn'),
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

// ── MOTOR 1: Web Audio API + lamejs ──────────────────────────────────────────
// Soporta: cualquier audio que el browser decodifique → MP3 o WAV
// Funciona sin servidor, sin COOP/COEP, sin SharedArrayBuffer

async function convertWithWebAudio(file, format, bitrate) {
    setProgress(5, 'Cargando librería MP3...');

    // Cargar lamejs si no está disponible
    if (!window.lamejs) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js');
    }

    setProgress(15, 'Decodificando audio...');

    // Decodificar el archivo con Web Audio API
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        throw new Error(`El navegador no puede decodificar este formato. Prueba con un archivo WAV o MP3. (${e.message})`);
    }

    setProgress(35, 'Procesando canales de audio...');

    if (format === 'wav') {
        return encodeToWAV(audioBuffer);
    } else {
        // MP3 con lamejs
        return encodeToMP3(audioBuffer, bitrate);
    }
}

function encodeToMP3(audioBuffer, bitrate) {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = channels >= 2 ? 2 : 1;

    const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);
    const blockSize = 1152;
    const mp3Chunks = [];

    const left  = float32ToInt16(audioBuffer.getChannelData(0));
    const right = numChannels === 2 ? float32ToInt16(audioBuffer.getChannelData(1)) : null;

    setProgress(50, 'Codificando a MP3...');

    for (let i = 0; i < left.length; i += blockSize) {
        const leftChunk  = left.subarray(i, i + blockSize);
        const rightChunk = right ? right.subarray(i, i + blockSize) : null;
        const mp3buf = rightChunk
            ? encoder.encodeBuffer(leftChunk, rightChunk)
            : encoder.encodeBuffer(leftChunk);
        if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
    }
    const finalBuf = encoder.flush();
    if (finalBuf.length > 0) mp3Chunks.push(finalBuf);

    setProgress(90, 'Empaquetando...');
    return new Blob(mp3Chunks, { type: 'audio/mpeg' });
}

function encodeToWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate  = audioBuffer.sampleRate;
    const length      = audioBuffer.length * numChannels * 2;
    const buffer      = new ArrayBuffer(44 + length);
    const view        = new DataView(buffer);

    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, length, true);

    let off = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const s = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
            view.setInt16(off, s < 0 ? s * 32768 : s * 32767, true);
            off += 2;
        }
    }
    setProgress(90, 'Empaquetando WAV...');
    return new Blob([buffer], { type: 'audio/wav' });
}

function float32ToInt16(float32Array) {
    const int16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return int16;
}

// ── MOTOR 2: CloudConvert API ─────────────────────────────────────────────────
// Soporta: TODOS los formatos + extracción de audio de video
// Requiere API key gratuita de cloudconvert.com (25 conv/día)

async function convertWithCloudConvert(file, format, bitrate, apiKey) {
    setProgress(5, 'Subiendo archivo a CloudConvert...');

    // 1. Crear un job con upload directo
    const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tasks: {
                'upload-file': { operation: 'import/upload' },
                'convert-file': {
                    operation: 'convert',
                    input: 'upload-file',
                    output_format: format,
                    ...(format !== 'wav' && format !== 'flac' ? { audio_bitrate: bitrate } : {}),
                    ...(STATE_isVideo(file) ? { audio_codec: getAudioCodec(format) } : {}),
                },
                'export-file': {
                    operation: 'export/url',
                    input: 'convert-file',
                    inline: false,
                },
            },
        }),
    });

    if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        throw new Error(err.message || `Error CloudConvert: ${jobRes.status}`);
    }

    const jobData = await jobRes.json();
    const job = jobData.data;

    // 2. Subir el archivo al task de upload
    const uploadTask = job.tasks.find(t => t.name === 'upload-file');
    if (!uploadTask?.result?.form) throw new Error('No se pudo obtener la URL de subida.');

    setProgress(20, 'Subiendo archivo...');
    const { url, parameters } = uploadTask.result.form;
    const formData = new FormData();
    Object.entries(parameters).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', file);

    const uploadRes = await fetch(url, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error('Error al subir el archivo a CloudConvert.');

    // 3. Esperar que el job termine (polling)
    setProgress(40, 'Convirtiendo en servidor...');
    const jobId = job.id;
    let finished = false;
    let attempts = 0;
    let resultJob;

    while (!finished && attempts < 60) {
        await sleep(2000);
        attempts++;
        const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!pollRes.ok) continue;
        resultJob = (await pollRes.json()).data;
        if (resultJob.status === 'finished') { finished = true; break; }
        if (resultJob.status === 'error') throw new Error('CloudConvert reportó un error en la conversión.');
        const pct = 40 + Math.min(attempts * 2, 45);
        setProgress(pct, `Convirtiendo... (${attempts * 2}s)`);
    }

    if (!finished) throw new Error('Tiempo de espera agotado. Intenta con un archivo más pequeño.');

    // 4. Obtener URL de descarga
    const exportTask = resultJob.tasks.find(t => t.name === 'export-file');
    const downloadUrl = exportTask?.result?.files?.[0]?.url;
    if (!downloadUrl) throw new Error('No se encontró el archivo convertido.');

    setProgress(88, 'Descargando resultado...');
    const dlRes = await fetch(downloadUrl);
    if (!dlRes.ok) throw new Error('Error al descargar el archivo convertido.');

    const blob = await dlRes.blob();
    setProgress(98, 'Listo...');
    return blob;
}

function STATE_isVideo(file) {
    return VIDEO_EXT.includes(file.name.split('.').pop().toLowerCase());
}

function getAudioCodec(format) {
    const map = { mp3: 'libmp3lame', aac: 'aac', ogg: 'libvorbis', opus: 'libopus', flac: 'flac', wav: 'pcm_s16le' };
    return map[format] || 'libmp3lame';
}

// ── FLUJO PRINCIPAL ───────────────────────────────────────────────────────────

async function convert() {
    if (!State.file) return;
    hideAll();
    showSection('progress');
    setProgress(0, 'Iniciando...');
    disableConvertBtn();

    const format  = State.outputFormat;
    const bitrate = State.outputBitrate;
    const isVideo = STATE_isVideo(State.file);
    const fileExt = State.file.name.split('.').pop().toLowerCase();

    // Decidir motor:
    // Motor 1 (lamejs): audio → mp3 o wav, sin necesidad de API key
    // Motor 2 (CloudConvert): video, o formatos avanzados (ogg/flac/aac/opus), o si el browser no puede decodificar
    const useCloudConvert = isVideo || !['mp3','wav'].includes(format);

    try {
        let blob;
        if (useCloudConvert) {
            if (!State.apiKey) {
                throw new Error('Para convertir videos o formatos avanzados necesitas una API Key gratuita de CloudConvert. Ingresa tu clave en la sección de arriba.');
            }
            blob = await convertWithCloudConvert(State.file, format, bitrate, State.apiKey);
        } else {
            blob = await convertWithWebAudio(State.file, format, bitrate);
        }

        revokeUrl();
        State.outputUrl = URL.createObjectURL(blob);
        const baseName = State.file.name.replace(/\.[^.]+$/, '');
        const outName  = `${baseName}_ftools.${format}`;
        el.downloadLink.href = State.outputUrl;
        el.downloadLink.setAttribute('download', outName);
        const sizeStr = blob.size > 1048576
            ? `${(blob.size/1048576).toFixed(2)} MB`
            : `${(blob.size/1024).toFixed(1)} KB`;
        el.downloadMeta.textContent = `${outName} · ${sizeStr}`;

        setProgress(100, '¡Listo!');
        hideAll();
        showSection('download');
    } catch (err) {
        console.error(err);
        hideAll();
        showError(err.message || String(err));
    } finally {
        enableConvertBtn();
    }
}

// ── GESTIÓN DE ARCHIVOS ───────────────────────────────────────────────────────

function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const isAudio = AUDIO_EXT.includes(ext);
    const isVideo = VIDEO_EXT.includes(ext);
    if (!isAudio && !isVideo) { showError(`Formato ".${ext}" no soportado.`); return; }

    if (isVideo) switchTab('video');
    else switchTab('audio');

    State.file = file;
    el.fileName.textContent = file.name;
    const sz = file.size > 1048576 ? `${(file.size/1048576).toFixed(2)} MB` : `${(file.size/1024).toFixed(1)} KB`;
    el.fileMeta.textContent = `${sz} · ${ext.toUpperCase()}`;
    el.dropIdle.classList.add('hidden');
    el.dropLoaded.classList.remove('hidden');
    el.dropZone.classList.add('file-loaded');
    hideAll();
    revokeUrl();
    updateEngineInfo();
    enableConvertBtn();
}

function resetFile() {
    State.file = null;
    el.fileInput.value = '';
    el.dropIdle.classList.remove('hidden');
    el.dropLoaded.classList.add('hidden');
    el.dropZone.classList.remove('file-loaded','drag-over');
    disableConvertBtn();
    hideAll();
    revokeUrl();
}

function updateEngineInfo() {
    if (!State.file) return;
    const isVideo = STATE_isVideo(State.file);
    const format  = State.outputFormat;
    const needsCC = isVideo || !['mp3','wav'].includes(format);
    el.engineInfo.textContent = needsCC
        ? '🌐 Motor: CloudConvert (requiere API Key gratuita)'
        : '⚡ Motor: Navegador — sin internet extra requerido';
    el.apiKeySection.classList.toggle('hidden', !needsCC);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function loadScript(src) {
    return new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = () => rej(new Error(`No se pudo cargar: ${src}`));
        document.head.appendChild(s);
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setProgress(pct, label) {
    el.progressBar.style.width = `${pct}%`;
    el.progressLabel.textContent = label;
}

function showSection(name) {
    if (name === 'progress') el.progressSection.classList.remove('hidden');
    if (name === 'download') el.downloadSection.classList.remove('hidden');
    if (name === 'error')    el.errorSection.classList.remove('hidden');
}

function hideAll() {
    [el.progressSection, el.downloadSection, el.errorSection].forEach(e => e.classList.add('hidden'));
}

function showError(msg) {
    el.errorMsg.textContent = msg;
    showSection('error');
}

function enableConvertBtn() {
    el.convertBtn.disabled = false;
    el.convertBtn.classList.remove('opacity-40','cursor-not-allowed');
}

function disableConvertBtn() {
    el.convertBtn.disabled = true;
    el.convertBtn.classList.add('opacity-40','cursor-not-allowed');
}

function revokeUrl() {
    if (State.outputUrl) { URL.revokeObjectURL(State.outputUrl); State.outputUrl = null; }
}

function switchTab(tab) {
    State.activeTab = tab;
    el.tabAudio.classList.toggle('active', tab === 'audio');
    el.tabVideo.classList.toggle('active', tab === 'video');
    if (tab === 'audio') {
        el.dropIcon.textContent = '🎧';
        el.dropTitle.textContent = 'Selecciona tu archivo de audio';
        el.dropSubtitle.textContent = 'WAV, MP3, OGG, FLAC, AAC, M4A · Arrastra o haz clic';
        el.fileInput.accept = 'audio/*,.wav,.mp3,.ogg,.flac,.aac,.m4a,.opus';
    } else {
        el.dropIcon.textContent = '🎬';
        el.dropTitle.textContent = 'Selecciona tu video';
        el.dropSubtitle.textContent = 'MP4, MKV, MOV, WEBM, AVI · Se extrae el audio';
        el.fileInput.accept = 'video/*,.mp4,.mkv,.mov,.webm,.avi';
    }
    if (State.file) {
        const ext = State.file.name.split('.').pop().toLowerCase();
        const isVid = VIDEO_EXT.includes(ext);
        if ((tab === 'audio' && isVid) || (tab === 'video' && !isVid)) resetFile();
    }
}

function clearTrace() {
    revokeUrl();
    resetFile();
    [el.clearBtn, el.clearBtnMobile].forEach(b => {
        b.textContent = '✅ Limpiado';
        setTimeout(() => { b.innerHTML = '🗑️ Limpiar Rastro'; }, 1500);
    });
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    el.tabAudio.addEventListener('click', () => switchTab('audio'));
    el.tabVideo.addEventListener('click', () => switchTab('video'));

    el.dropZone.addEventListener('click', e => { if (e.target !== el.changeFileBtn) el.fileInput.click(); });
    el.dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') el.fileInput.click(); });
    el.dropZone.addEventListener('dragover', e => { e.preventDefault(); el.dropZone.classList.add('drag-over'); });
    el.dropZone.addEventListener('dragleave', () => el.dropZone.classList.remove('drag-over'));
    el.dropZone.addEventListener('drop', e => {
        e.preventDefault(); el.dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    el.fileInput.addEventListener('change', () => { if (el.fileInput.files[0]) handleFile(el.fileInput.files[0]); });
    el.changeFileBtn.addEventListener('click', e => { e.stopPropagation(); resetFile(); });

    el.formatGrid.forEach(b => {
        b.addEventListener('click', () => {
            el.formatGrid.forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            State.outputFormat = b.dataset.format;
            const lossless = ['wav','flac'].includes(State.outputFormat);
            el.bitrateSection.style.opacity = lossless ? '0.4' : '1';
            el.bitrateSection.style.pointerEvents = lossless ? 'none' : '';
            updateEngineInfo();
        });
    });

    el.bitrateBadges.forEach(b => {
        b.addEventListener('click', () => {
            el.bitrateBadges.forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            State.outputBitrate = parseInt(b.dataset.bitrate);
        });
    });

    // API Key
    if (State.apiKey) el.apiKeyInput.value = State.apiKey;
    el.saveKeyBtn.addEventListener('click', () => {
        const key = el.apiKeyInput.value.trim();
        if (!key) { alert('Ingresa una API Key válida.'); return; }
        State.apiKey = key;
        localStorage.setItem('cc_api_key', key);
        el.saveKeyBtn.textContent = '✅ Guardada';
        setTimeout(() => { el.saveKeyBtn.textContent = 'Guardar'; }, 2000);
    });

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

    switchTab('audio');
});
