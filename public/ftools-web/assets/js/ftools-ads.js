/**
 * ftools-ads.js — Sistema centralizado de monetización
 * Ftools | Ad Placeholders + Video Interstitial Pre-Descarga
 * 
 * USO:
 *   FtoolsAds.init()                     — Inyecta placeholders según la página
 *   FtoolsAds.showInterstitial(callback) — Muestra video interstitial, luego ejecuta callback
 */

const FtoolsAds = (() => {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const SKIP_DELAY_MS = 5000;   // Segundos antes de poder omitir
  const TOTAL_DURATION_MS = 15000; // Duración total del "anuncio" 
  const PROGRESS_INTERVAL = 50;   // ms entre actualizaciones de barra

  let interstitialEl = null;
  let isInitialized = false;

  // ── Detectar página actual ────────────────────────────────────────────────
  function detectPage() {
    const path = window.location.pathname;
    if (path.includes('pdf-editor'))       return 'pdf-editor';
    if (path.includes('audio-converter'))  return 'audio-converter';
    if (path.includes('pdf-to-doc'))       return 'pdf-to-doc';
    if (path.includes('video-downloader')) return 'video-downloader';
    return 'landing';
  }

  // ── Crear el HTML de un placeholder ───────────────────────────────────────
  function createPlaceholder(type, size, extraClass = '') {
    const div = document.createElement('div');
    div.className = `ftools-ad ftools-ad-${type} ${extraClass}`.trim();
    div.setAttribute('data-ad-slot', `${type}-${size}`);
    div.innerHTML = `
      <div class="ftools-ad-inner">
        <span class="ad-placeholder-icon">📢</span>
        <span class="ad-placeholder-text">Tu anuncio aquí</span>
        <span class="ad-placeholder-size">${size}</span>
      </div>
    `;
    return div;
  }

  // ── Crear el interstitial modal (una sola vez) ────────────────────────────
  function createInterstitialModal() {
    if (interstitialEl) return;

    const modal = document.createElement('div');
    modal.className = 'ftools-interstitial';
    modal.id = 'ftools-interstitial';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Anuncio antes de descarga');

    modal.innerHTML = `
      <div class="ftools-interstitial-dialog">
        <!-- Video / Ad area -->
        <div class="interstitial-video-area">
          <div class="interstitial-video-placeholder">
            <div class="interstitial-bars">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <span class="video-ad-icon">📺</span>
            <span class="video-ad-label">Espacio Publicitario</span>
          </div>
          <div class="interstitial-progress" id="interstitial-progress"></div>
          <button class="interstitial-skip-btn" id="interstitial-skip">
            Omitir en <span id="interstitial-skip-countdown">${Math.ceil(SKIP_DELAY_MS / 1000)}</span>s
          </button>
        </div>

        <!-- Friendly message -->
        <div class="interstitial-message">
          <h3>Gracias por apoyar Ftools <span class="heart-icon">💛</span></h3>
          <p>
            Este breve anuncio nos permite mantener todas las herramientas 
            <strong>100% gratis</strong>, sin registro y sin muros de pago. 
            ¡Tu paciencia hace la diferencia!
          </p>
        </div>

        <!-- Footer -->
        <div class="interstitial-footer">
          <span>Ftools · Herramientas gratuitas y privadas</span>
          <span class="interstitial-countdown" id="interstitial-total-countdown"></span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    interstitialEl = modal;
  }

  // ── Mostrar el interstitial ───────────────────────────────────────────────
  function showInterstitial(onComplete) {
    if (!interstitialEl) createInterstitialModal();

    const progressBar = document.getElementById('interstitial-progress');
    const skipBtn     = document.getElementById('interstitial-skip');
    const skipCount   = document.getElementById('interstitial-skip-countdown');
    const totalCount  = document.getElementById('interstitial-total-countdown');

    // Reset state
    progressBar.style.width = '0%';
    skipBtn.classList.remove('active');
    skipBtn.innerHTML = `Omitir en <span id="interstitial-skip-countdown">${Math.ceil(SKIP_DELAY_MS / 1000)}</span>s`;

    // Show modal
    interstitialEl.classList.add('visible');
    document.body.style.overflow = 'hidden';

    let elapsed = 0;
    let completed = false;

    function finish() {
      if (completed) return;
      completed = true;
      clearInterval(timer);

      interstitialEl.classList.remove('visible');
      document.body.style.overflow = '';

      // Small delay for animation, then execute the download
      setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, 400);
    }

    const timer = setInterval(() => {
      elapsed += PROGRESS_INTERVAL;
      const pct = Math.min((elapsed / TOTAL_DURATION_MS) * 100, 100);
      progressBar.style.width = pct + '%';

      // Update skip countdown
      const skipRemaining = Math.max(0, SKIP_DELAY_MS - elapsed);
      const skipSec = Math.ceil(skipRemaining / 1000);

      if (skipRemaining > 0) {
        const countdownSpan = document.getElementById('interstitial-skip-countdown');
        if (countdownSpan) countdownSpan.textContent = skipSec;
      } else {
        skipBtn.classList.add('active');
        skipBtn.textContent = 'Omitir anuncio →';
      }

      // Update total countdown
      const totalRemaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
      const totalSec = Math.ceil(totalRemaining / 1000);
      totalCount.textContent = totalSec > 0 ? `${totalSec}s restantes` : '';

      // Auto-finish when complete
      if (elapsed >= TOTAL_DURATION_MS) {
        finish();
      }
    }, PROGRESS_INTERVAL);

    // Skip button handler
    const skipHandler = () => {
      if (elapsed >= SKIP_DELAY_MS) {
        finish();
      }
    };
    skipBtn.onclick = skipHandler;

    // Prevent closing by clicking backdrop
    interstitialEl.onclick = (e) => {
      if (e.target === interstitialEl) {
        // Subtle shake to indicate can't close
        const dialog = interstitialEl.querySelector('.ftools-interstitial-dialog');
        dialog.style.animation = 'none';
        dialog.offsetHeight; // trigger reflow
        dialog.style.animation = 'interstitialSlideUp 0.3s ease';
      }
    };
  }

  // ── Inyectar ads según la página ──────────────────────────────────────────
  function injectAds(page) {
    switch (page) {
      case 'landing':
        injectLandingAds();
        break;
      case 'pdf-editor':
        injectPdfEditorAds();
        break;
      case 'audio-converter':
        injectAudioConverterAds();
        break;
      case 'pdf-to-doc':
        injectPdfToDocAds();
        break;
      case 'video-downloader':
        injectVideoDownloaderAds();
        break;
    }
  }

  // ── Landing Page Ads ──────────────────────────────────────────────────────
  function injectLandingAds() {
    // Banner after the tools grid, before footer
    const footer = document.querySelector('footer');
    if (footer) {
      const banner = createPlaceholder('banner', '728 × 90');
      const wrapper = document.createElement('div');
      wrapper.className = 'flex justify-center px-4';
      wrapper.appendChild(banner);
      footer.parentNode.insertBefore(wrapper, footer);
    }
  }

  // ── PDF Editor Ads ────────────────────────────────────────────────────────
  function injectPdfEditorAds() {
    // Ad at the bottom of the properties panel
    const propsPanel = document.getElementById('properties-panel');
    if (propsPanel) {
      const ad = createPlaceholder('sidebar', '260 × 200');
      ad.style.marginTop = 'auto';
      ad.style.maxWidth = '100%';
      ad.style.height = '200px';
      propsPanel.appendChild(ad);
    }
  }

  // ── Audio Converter Ads ───────────────────────────────────────────────────
  function injectAudioConverterAds() {
    const mainContainer = document.querySelector('main .max-w-2xl');
    if (!mainContainer) return;

    // Inline ad between bitrate section and convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      const inline = createPlaceholder('inline', '100%  × 100');
      mainContainer.insertBefore(inline, convertBtn);
    }

    // Sidebar ad (desktop only) — append to main as absolute sidebar
    injectDesktopSidebar(document.querySelector('main'));
  }

  // ── PDF to DOC Ads ────────────────────────────────────────────────────────
  function injectPdfToDocAds() {
    const mainContainer = document.querySelector('main .max-w-2xl');
    if (!mainContainer) return;

    // Inline ad between drop zone and convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      const inline = createPlaceholder('inline', '100% × 100');
      mainContainer.insertBefore(inline, convertBtn);
    }

    // Desktop sidebar
    injectDesktopSidebar(document.querySelector('main'));
  }

  // ── Video Downloader Ads ──────────────────────────────────────────────────
  function injectVideoDownloaderAds() {
    const mainContent = document.querySelector('main > div');
    if (!mainContent) return;

    // Banner below the main card
    const mainCard = document.querySelector('main');
    if (mainCard) {
      const banner = createPlaceholder('banner', '728 × 90');
      const wrapper = document.createElement('div');
      wrapper.className = 'flex justify-center px-4 mt-6';
      wrapper.appendChild(banner);
      mainCard.appendChild(wrapper);
    }
  }

  // ── Helper: Desktop Sidebar ───────────────────────────────────────────────
  function injectDesktopSidebar(parentEl) {
    if (!parentEl || window.innerWidth < 1024) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'ftools-ad-sidebar-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 5;
    `;

    const sidebar = createPlaceholder('sidebar', '160 × 600', 'ftools-ad-sidebar-sticky');
    sidebar.style.width = '160px';
    sidebar.style.height = '600px';
    wrapper.appendChild(sidebar);
    document.body.appendChild(wrapper);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (isInitialized) return;
    isInitialized = true;

    const page = detectPage();
    createInterstitialModal();
    injectAds(page);

    console.log(`[FtoolsAds] Initialized for: ${page}`);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Delay slightly so page-specific elements are rendered
    setTimeout(init, 100);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    init,
    showInterstitial,
    detectPage,
  };
})();
