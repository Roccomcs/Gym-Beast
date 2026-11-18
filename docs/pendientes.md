# Cierre de GymBeast por etapas

Estado revisado el 18 de noviembre de 2026. Este documento reemplaza el inventario anterior.
Cada etapa se entrega y espera la aprobación del titular antes de comenzar la siguiente.

## Decisiones vigentes

- Obsidiana dorada como única paleta, sin encabezado superior.
- Mascotas 2D. Permanecen retirados bandanas, medallas, cadenas, gafas y guantes.
- Navegación con Inicio, Entrenar, Rutinas, Tienda y Perfil. Progreso y Amigos desde Perfil.
- Acceso previsto por usuario y contraseña con invitación de un solo uso. Recuperación con ayuda del titular.
- Sesión persistente y sincronización automática. Datos privados por cuenta.
- Amigos aceptados podrán ver foto, mascota, EXP, constancia, récords y rutinas compartidas. Peso corporal y notas privados.
- Premio previsto por superar la mayor carga anterior, sin exigir las mismas repeticiones, de 5 EXP de cuenta, 5 EXP de mascota y 5 de oro por ejercicio. Máximo tres ejercicios por sesión.
- La EXP adicional acelerará la evolución. El premio base sigue siendo 25 EXP y 20 de oro.
- Diez amigos iniciales y objetivo de capacidad comprobada para 100 cuentas.

## Inventario por etapa

| Etapa | Estado | Implementación restante y condición de cierre |
|---|---|---|
| 1. Base comprobable | Completada, a revisión | Dependencias operativas, compilación, 78 pruebas de dominio/SQL, 17 recorridos existentes y una demostración reproducible aprobados. Ver etapa-1.md. |
| 2. Acceso e invitaciones | Implementada localmente, a revisión | Usuario y contraseña con invitación, sesión persistente, cambio y recuperación administrativa. 100 pruebas, seis recorridos de acceso y validación Deno. Falta desplegar y comprobar Auth real con el proyecto del titular. Ver etapa-2.md. |
| 3. Persistencia y respaldo | Implementada localmente, a revisión | Lotes, cursor incremental, eliminaciones versionadas, relaciones por cuenta, conflictos legibles, bitácora de premios/compras, respaldo, restauración y borrado administrativo. 112 pruebas y recorridos de dos dispositivos/pestañas. Falta la validación alojada y la auditoría histórica. Ver etapa-3.md y cierre-final.md. |
| 4. Ropa y accesorios | Primera muestra aplicada, a aprobación | Inventario de 31 objetos × 48 etapas y captura de las 48 variantes. Muestra del dragón Cría con buzo y reloj integrada. Faltan aprobar el acabado y extender/corregir la matriz completa. Ver etapa-4.md. |
| 5. Mascota entrenando y animación | Parcial | Hay demostraciones ilustradas y movimiento de mascotas/fondos. Falta comprobar identidad de cada etapa, cobertura por movimiento, transiciones, festejo y modo de movimiento reducido. |
| 6. Ejercicios y rutinas | Parcial | 41 ejercicios, dos poses asignadas, 10 adaptaciones y Rocco. Falta revisión visual/anatómica, progresiones de programas, catálogo personalizado y ambigüedades del importador. La regresión de 5 días/31 ejercicios pasa. |
| 7. Premio por carga | Pendiente | Implementar referencia histórica por variante/modalidad, premios únicos y compensaciones, límite de tres y desglose en el cierre. Máximo previsto 40 EXP y 35 de oro. |
| 8. Gamificación y vida | Parcial | Etapas 0/100/300/700/1500/3250, vida, logros y misiones iniciales existentes. Faltan misiones semanales, revisión de muerte/descenso/recuperación y equivalencia con cuentas sincronizadas. |
| 9. Amigos y comparación | Parcial | Solicitudes, bloqueo, feed y desafíos con pruebas SQL. Faltan perfil compartido, comparación, copia de rutinas y recorrido real con varias cuentas. |
| 10. Móvil y rendimiento | Parcial | Recorridos Chromium a anchos móviles existentes. Faltan WebKit, 430 px, mediciones, teclado y pruebas físicas iOS/Android, VoiceOver y TalkBack. |
| 11. Capacidad y publicación | Pendiente | Medir 100 cuentas/año, cuotas, fotos y recursos. Configurar proyectos del titular, publicar HTTPS y completar documentación y operación. |

## Dependencias externas

No se encontraron variables de conexión locales configuradas durante esta revisión, solo .env.example.
Para la validación alojada hacen falta Supabase y Cloudflare del titular.
Las pruebas físicas requieren iPhone y Android disponibles para la comprobación.
La simulación de identidad en PGlite prueba permisos SQL, pero no valida tokens, OAuth ni la red del servidor alojado.

## Avisos abiertos de la base

- Archivo principal de producción de aproximadamente 576 kB, unos 182 kB comprimidos.
- Caché inicial de 140 archivos, aproximadamente 19 MiB. Revisar carga diferida en etapa 10.
- El acceso visible ya usa usuario y contraseña. Habilitarlo requiere configurar el proyecto y desplegar accounts. La migración conserva cuentas antiguas, pero su vinculación a un usuario requiere planificación si existen en el proyecto.
- La restauración local existe en código pero no tiene acceso visible en Perfil.
- Los informes anteriores de pilot-qa.md son históricos y pueden describir requisitos reemplazados.

## Cierre después de las once etapas

Las comprobaciones alojadas, físicas y operativas que deben retomarse al terminar están en [Cierre final](cierre-final.md). Este registro se actualizará en las siguientes entregas.
