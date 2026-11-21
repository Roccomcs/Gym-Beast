# Etapa 10 · Calidad móvil y rendimiento

Fecha: 19/11/2026. Implementación local; publicación y teléfonos físicos pendientes. Se conserva Obsidiana dorada, las mascotas 2D y la ropa actual. No se inicia la etapa 11.

## Cambios

- Rutas de entrenamiento, rutinas, progreso, comunidad y tienda cargadas por separado. El inicio no carga esas interfaces de antemano.
- Búsqueda indexada de series anteriores, cálculo cronológico de mejoras de carga y agrupación de premios. Se evita recorrer repetidamente todo el historial por ejercicio.
- Una serie se marca después de confirmar su transacción local, sin esperar otra lectura completa del historial. Ante error de almacenamiento, muestra un error y permite reintentar sin marcarla falsamente como guardada.
- Imágenes fuera del registro inicial de instalación. La rutina activa prepara sus ilustraciones, demostración, compañero, hábitat y ropa en segundo plano, con estado visible y reintento en Entrenar. Se requiere esperar «Imágenes listas sin conexión» antes de desconectarse por primera vez. Solo se cachean recursos públicos, no datos personales ni respuestas de cuentas.
- 82 láminas PNG tienen versiones WebP sin pérdida: 169.687.628 → 118.048.134 bytes, reducción del 30,4%. Se comprobó igualdad exacta de RGBA al convertir. Cada compilación valida sus huellas. Las fuentes PNG se conservan; la salida publicada incluye WebP y reglas para las URL anteriores. Referencia de reglas: [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/redirects/), consultada el 19/11/2026. La comprobación en Cloudflare sigue pendiente.
- Caché inicial reducida de aproximadamente 22,1 MiB/143 entradas a 772,82 KiB/34 entradas. Las imágenes de rutinas se agregan a demanda; no se afirma que todo el catálogo quede disponible offline. Cachés con límites de cantidad, edad y liberación ante cuota.
- Se evita interrumpir una imagen ya en descarga al cambiar de pantalla, para no cortar la copia del service worker en WebKit.
- Correcciones de contraste en Perfil y durante las transiciones. Los textos no se desvanecen por debajo del contraste requerido. Foco en encabezados al cambiar de pantalla, nombres largos sin desbordamiento, margen de desplazamiento en campos y ocultación de barra inferior cuando se detecta teclado visual abierto.
- Ícono Android maskable con espacio de seguridad, sin cambiar el emblema aprobado. Las animaciones y la preferencia de movimiento reducido se conservan.

## Comprobaciones y evidencia

Compilación correcta y **228 pruebas de dominio/SQL, 30 móviles, 25 generales, 14 de cuentas y 4 sociales móviles aprobadas**. Los comandos requieren instalar Chromium y WebKit con `npx playwright install chromium webkit`.

| Comprobación | Comando | Alcance |
|---|---|---|
| Dominio, permisos y SQL | `npm test` | 228 casos; incluye límites temporales del índice de premios y archivos offline para todas las especies/movimientos |
| Móvil | `npm run test:mobile` | Chromium/WebKit × 320/390/430 px; 12 pantallas, contraste automático, foco, campos largos, alta, error de guardado, offline y descanso |
| Comunidad móvil | `npm run test:mobile-social` | 4 recorridos a 430 px, perfiles/comparación y feed/desafíos con revisión automática de accesibilidad |
| Regresión general | `npm run test:e2e -- --workers=2` | 25 recorridos |
| Cuentas y sincronización | `npm run test:accounts` | 14 recorridos con Auth simulado y SQL embebido; no son cuentas alojadas reales |
| Rendimiento | `npm run test:performance` | Chromium 390×844, 260 sesiones/5200 series, CPU ×4; resultados JSON, no prueba física |

Los recorridos de accesibilidad usan axe WCAG A/AA y 2.1 AA; no certifican accesibilidad ni reemplazan lectores de pantalla. El teclado se aproxima con un viewport más corto y foco: **no se probó un teclado iOS/Android real**. La prueba de primer plano simula eventos y adelanta el reloj, no bloquea un teléfono físico. Las pruebas sociales bloquean service workers para interceptar su API; la PWA offline se comprueba en una suite separada con el service worker real.

Resumen estructurado: `qa/etapa-10/results.json`. Capturas de Inicio, Entrenar, Progreso, Perfil, Tienda y editor con viewport corto: `qa/etapa-10/pantallas/`, Chromium 390 px y WebKit 320 px. El primer recorrido encontró contraste insuficiente en el acceso a tienda y durante desvanecimientos. Se corrigieron. Dos ejecuciones detectaron interrupciones de recursos en WebKit 320; después de dejar terminar las descargas activas, el conjunto de 30 pasó completo sin esos errores. No se ocultaron errores del navegador en las aserciones.

## Mediciones reproducibles

Se usó la compilación de producción sin conexión Supabase configurada, un perfil local con **260 sesiones / 5200 series** y cinco registros nuevos. Chromium de escritorio a 390×844, sin otros tests corriendo. CPU ×4 ralentiza el procesador mediante CDP; no emula un modelo de teléfono. Los valores son una muestra de laboratorio, no percentiles de usuarios reales.

| Escenario | LCP | Confirmación visual: mediana / máximo | Transacción local: máximo | Memoria JS al terminar |
|---|---:|---:|---:|---:|
| Antes de optimizar, CPU ×4, red local | 804 ms | 1077,7 / 2245,9 ms | No instrumentada | 47,9 MiB |
| Actual, CPU normal, red local | 148 ms | 68 / 85,1 ms | 84 ms | 54,5 MiB |
| Actual, CPU ×4, red local | 664 ms | 39,7 / 107,5 ms | 97,2 ms | 59,6 MiB |
| Actual, CPU ×4, 5 Mbps / 1 Mbps / 80 ms | 1052 ms | 33,6 / 72,6 ms | 67,2 ms | 50,0 MiB |

La distinta latencia entre muestras refleja variación del equipo y del navegador; no indica que ralentizar CPU o red acelere la app. El guardado quedó debajo de 100 ms en estas muestras; **la confirmación visual no cumple el objetivo de 100 ms en todos los registros**. El objetivo LCP de 2,5 s se cumplió en estos escenarios. Inicio acumuló 466 ms de tareas largas en CPU ×4: queda trabajo de carga inicial para equipos reales. El marcador de escena decodificada más la pausa de observación de 350 ms quedó en 1187 ms (red local) y 1705 ms (red limitada); LCP no representa por sí solo toda la descarga de ilustraciones.

En una ventana estable de 1,5 segundos, tras volver a Inicio y esperar un segundo, se midieron 91–92 cuadros y un intervalo p95 de 16,7–16,8 ms. Esto no prueba 60 fps en todas las animaciones ni descarta pérdidas durante la carga. La memoria es una lectura de heap JS, no RAM total ni una prueba de ausencia de fugas. Las láminas decodificadas y la caché también consumen memoria fuera de esa lectura. El muestreo anterior de animación no tenía la misma espera, por lo que no se usa para afirmar una mejora comparativa.

Resultados crudos: `qa/etapa-10/baseline.json`, `performance-cpu1.json`, `performance-cpu4.json` y `performance-cpu4-network.json`. Para repetir red limitada en PowerShell: `$env:GYMBEAST_NETWORK='mobile'; npm run test:performance; Remove-Item Env:\GYMBEAST_NETWORK`. Para CPU normal usar `GYMBEAST_CPU_RATE='1'` y eliminar esa variable al terminar.

La suma de JS/CSS referenciados inicialmente es **584 kB / 180 kB gzip** sin cuentas configuradas y **806 kB / 236 kB gzip** con cuentas. No incluye fuentes, imágenes ni módulos posteriores. La variante con cuentas todavía emite el aviso de un chunk de más de 500 kB; el SDK es necesario para su acceso. `node scripts/mobile-build-report.mjs` registra ambas variantes ya compiladas en `qa/etapa-10/build-report.json`. La salida completa ocupa aproximadamente 139 MB y el archivo mayor 1,75 MB; esto no sustituye la prueba de cuotas/tráfico de 100 cuentas de la etapa 11.

## Pendientes que permanecen

- Safari/Chrome físicos, instalación real, teclado, áreas seguras, bloqueo, VoiceOver y TalkBack. [Guía de prueba](prueba-en-telefono.md).
- Cuentas y sincronización en HTTPS con Supabase real y reglas de Cloudflare publicadas.
- Rendimiento en dispositivos representativos; los tiempos del equipo de desarrollo no son garantías de teléfono. La carga de ilustraciones completas se mide separada del primer contenido visible.
- La caché del navegador puede ser eliminada por el sistema. Mantener respaldo de cuenta y no depender de IndexedDB como único respaldo permanente.
- La variante con cuentas incluye el SDK de autenticación y pesa más que el modo sin configurar. Su carga y consumo alojados deben verificarse en etapa 11.
- Auditoría de capacidad de 100 cuentas, fotos, cuotas, actualizaciones de recursos, restauración y operación: etapa 11. La auditoría de dependencias deja cuatro avisos moderados en herramientas de compilación transitivas, guardados en `qa/etapa-10/dependency-audit.json`; no se aplicaron actualizaciones forzadas. La auditoría solo de producción no informó vulnerabilidades conocidas (`production-dependency-audit.json`); eso no constituye una auditoría de seguridad completa.

El piloto no se declara listo con estas pruebas de escritorio.
