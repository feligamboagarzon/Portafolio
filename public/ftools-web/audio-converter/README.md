# WAV to MP3 Converter

## Nombre y Propósito
**WAV to MP3 Converter** proporciona una solución ágil para comprimir y convertir archivos de audio en formato WAV de alta calidad al formato MP3, mucho más ligero y de uso extendido, ideal para distribución y reproducción general.

## Arquitectura de Procesamiento (Zero-cost compute)
La recodificación ocurre vía `ffmpeg.wasm`. Procesar audio en la nube consumiría recursos costosos. Al trasladar el cómputo al cliente, el costo por conversión es $0, permitiéndonos ofrecer una herramienta premium gratuita y con total privacidad local.

## Stack Tecnológico Sugerido
* **Estructura:** HTML5
* **Estilos:** CSS3 con Tailwind CSS
* **Lógica:** JavaScript puro (Vanilla JS)

## Librerías Específicas
* `ffmpeg.wasm` para realizar la codificación de audio compleja y eficiente directamente en el navegador, ofreciendo un rendimiento equiparable al de una aplicación de escritorio.

## Esquema de UI/UX
* **Interfaz Divertida y Minimalista:** Estilo visual lúdico (Neo-brutalismo) con colores vibrantes, bordes gruesos y micro-animaciones, manteniendo la funcionalidad extremadamente simple.
* **Sistema de Temas (Claro/Oscuro):** Soporte global integrado para cambiar entre modos de color, con sombras elásticas e invertidas para mayor dinamismo.
* **Botón de 'Limpiar rastro':** Función que purga inmediatamente los archivos de audio decodificados y los buffers de memoria del navegador para garantizar que no queden copias residuales.

## Lógica de Flujo
1. **Carga de archivo:** El usuario selecciona el archivo de audio WAV.
2. **Procesamiento local:** `ffmpeg.wasm` recodifica el flujo de audio de WAV a MP3 usando los recursos locales de la CPU del usuario.
3. **Descarga del resultado:** El archivo MP3 resultante se guarda de forma segura en el almacenamiento local del usuario.
