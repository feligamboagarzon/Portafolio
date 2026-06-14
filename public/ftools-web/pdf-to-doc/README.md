# PDF to DOC Converter

## Nombre y Propósito
**PDF to DOC Converter** es una herramienta especializada en transformar documentos de formato PDF a archivos editables de Microsoft Word (.doc/.docx), preservando el formato y estructura original del texto.

## Arquitectura de Procesamiento (Zero-cost compute)
La conversión es puramente local. Procesar PDFs en un servidor externo (AWS, CloudConvert) generaría costos masivos, destruyendo la rentabilidad gratuita. Con este enfoque aseguramos **privacidad extrema** y gastos de servidor prácticamente nulos ($0 compute cost).

## Stack Tecnológico Sugerido
* **Estructura:** HTML5
* **Estilos:** CSS3 con Tailwind CSS
* **Lógica:** JavaScript puro (Vanilla JS)

## Librerías Específicas
* `pdf-lib` para la extracción del contenido del PDF, en conjunto con librerías generadoras de documentos DOCX en el cliente para estructurar el resultado.

## Esquema de UI/UX
* **Interfaz Divertida y Minimalista:** Estilo visual lúdico (Neo-brutalismo) con colores vibrantes, bordes gruesos y micro-animaciones, manteniendo la funcionalidad extremadamente simple.
* **Sistema de Temas (Claro/Oscuro):** Soporte global integrado para cambiar entre modos de color, con sombras elásticas e invertidas para mayor dinamismo.
* **Botón de 'Limpiar rastro':** Funcionalidad crítica para destruir los buffers de memoria y cachés temporales de los documentos una vez terminada la conversión.

## Lógica de Flujo
1. **Carga de archivo:** El usuario sube el documento PDF.
2. **Procesamiento local:** El navegador extrae el texto y el formato del PDF, traduciéndolo a la estructura de un archivo DOCX.
3. **Descarga del resultado:** El documento de Word (.doc/.docx) es empaquetado y descargado automáticamente en el equipo local.
