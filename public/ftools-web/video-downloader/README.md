# Video Downloader

## Nombre y Propósito
**Video Downloader** es una utilidad web que permite la extracción y descarga de contenido de video desde diversas fuentes. Está orientada a facilitar la obtención de archivos multimedia de forma rápida, directa y sin intermediarios.

## Arquitectura de Procesamiento (Zero-cost compute)
Todo el procesamiento se realiza mediante WebAssembly en el navegador. Al evitar descargas y re-codificaciones en servidores cloud, logramos una **privacidad total** y un **costo de infraestructura $0**, permitiendo viabilidad económica total sin cobrarle al usuario.

## Stack Tecnológico Sugerido
* **Estructura:** HTML5
* **Estilos:** CSS3 con Tailwind CSS
* **Lógica:** JavaScript puro (Vanilla JS)

## Librerías Específicas
* `ffmpeg.wasm` para habilitar la potencia de FFmpeg directamente en el cliente, permitiendo conversiones y manipulaciones de video complejas sin salir del navegador.

## Esquema de UI/UX
* **Interfaz Divertida y Minimalista:** Estilo visual lúdico (Neo-brutalismo) con colores vibrantes, bordes gruesos y micro-animaciones, manteniendo la funcionalidad extremadamente simple.
* **Sistema de Temas (Claro/Oscuro):** Soporte global integrado para cambiar entre modos de color, con sombras elásticas e invertidas para mayor dinamismo.
* **Botón de 'Limpiar rastro':** Acción rápida para eliminar cualquier rastro de caché, enlaces ingresados o fragmentos de video procesados en la memoria del navegador.

## Lógica de Flujo
1. **Carga de archivo/enlace:** El usuario proporciona un enlace o fragmento de video.
2. **Procesamiento local:** Se procesa la descarga o la conversión de formato a través de `ffmpeg.wasm` en el navegador del usuario.
3. **Descarga del resultado:** El archivo de video final se ensambla y se descarga de forma segura al dispositivo local.
