# Mapa del Proyecto Ftools

## Índice General

El ecosistema de Ftools se compone de las siguientes herramientas independientes, modulares y centradas en la privacidad mediante procesamiento del lado del cliente:

* 📁 **`landing-page/`**: Página principal, catálogo interactivo y portal de entrada al ecosistema.
* 📁 **`pdf-editor/`**: Edición, manipulación y anotación de archivos PDF.
* 📁 **`video-downloader/`**: Descarga y procesamiento de contenido multimedia en video.
* 📁 **`pdf-to-doc/`**: Conversión de documentos PDF a formato editable DOCX (motor: `pdf.js` + `docx`).
* 📁 **`audio-converter/`**: Conversor universal de audio — soporta WAV, MP3, OGG, FLAC, AAC, OPUS y extracción de audio desde videos (MP4, MKV, MOV, WEBM, AVI). Motor: `ffmpeg.wasm`.

## Guía de Despliegue (Firebase Hosting)

Para asegurar una distribución global rápida, baja latencia y certificados SSL automáticos, alojaremos Ftools en Firebase Hosting (Google Cloud). A continuación, las instrucciones de despliegue:

1. **Prerrequisitos:**
   * Tener instalada la CLI de Firebase (`npm install -g firebase-tools`).
   * Estar autenticado en Firebase (`firebase login`).
2. **Inicialización:**
   * Navegar a la carpeta raíz del proyecto (`ftools-web`).
   * Ejecutar `firebase init hosting`.
   * Seleccionar o crear el proyecto correspondiente en Google Cloud.
   * Definir el directorio público (por ejemplo, la propia carpeta raíz o una subcarpeta `public/` en futuras iteraciones).
   * Configurar el proyecto como una aplicación de una sola página (SPA) si es necesario (o dejar por defecto si cada herramienta tiene su propio `index.html`).
3. **Despliegue:**
   * Una vez completado el desarrollo o al lanzar una nueva versión, ejecutar `firebase deploy --only hosting`.
   * Firebase proporcionará una URL segura (`https://<tu-proyecto>.web.app`) con el despliegue funcional.

## Hoja de Ruta (Roadmap)

La evolución técnica y estratégica de Ftools se dividirá en las siguientes fases:

### Fase 1: Configuración Inicial y Arquitectura (Actual)
* Creación de la estructura de directorios y repositorios.
* Definición de los lineamientos de UI/UX, arquitectura y privacidad.
* Redacción de documentación y requerimientos por herramienta.

### Fase 2: Desarrollo del Core y Proof of Concept (PoC)
* Implementación de la base HTML5, CSS3 (Tailwind) y Vanilla JS.
* Integración y pruebas de `pdf-lib` y `ffmpeg.wasm` en un entorno local controlado.
* Desarrollo de la funcionalidad "Limpiar rastro" como componente core transversal.

### Fase 3: Integración de UI/UX y Funcionalidades
* Aplicación del esquema visual minimalista y modo oscuro automático.
* Refinamiento de la interacción del usuario y el flujo de conversión/edición local.
* Optimización del rendimiento y gestión de memoria de WebAssembly (`ffmpeg.wasm`).

### Fase 4: Despliegue, Pruebas de Seguridad y Privacidad Total
* Despliegue en Firebase Hosting.
* Auditorías de seguridad y de privacidad, garantizando que el tráfico de red de salida sea nulo para el procesamiento de archivos.
* Lanzamiento inicial público.
