# Comprobaciones pendientes para el cierre final

Actualizado hasta la etapa 11, el 19 de noviembre de 2026.
Este registro reúne las validaciones que deben retomarse al cerrar las once etapas.
El estado local y las condiciones de salida se mantienen en pendientes.md y etapa-11.md.

## Proyecto y cuentas reales

- [ ] Configurar Supabase del titular y aplicar todas las migraciones, incluidas las que se añadan en las próximas etapas.
- [ ] Desplegar accounts y configurar sus orígenes permitidos, claves públicas y secretos administrativos.
- [ ] Probar dos altas con invitaciones diferentes, reintento de una respuesta perdida, código usado/vencido/revocado y usuario ocupado.
- [ ] Probar renovación real de sesión, contraseña incorrecta, recuperación administrativa y sustitución obligatoria de la clave temporal.
- [ ] Si el proyecto tiene identidades antiguas de Google o email, vincularlas al acceso por usuario preservando sus UUID antes de sustituir el acceso.

## Datos y recuperación

- [ ] Ejecutar los recorridos de sincronización con conexiones PostgreSQL independientes en Supabase, incluyendo dos pestañas y dos instalaciones.
- [ ] Cortar la conexión después de confirmar una escritura y comprobar que reintentar conserva una sesión y un premio.
- [ ] Revisar series históricas sin sesión propia o sin ejercicio en su instantánea. Los registros anteriores se conservaron al agregar la restricción NOT VALID.
- [ ] Corregir los datos históricos encontrados y validar la clave foránea owned_session_parent sobre todo el conjunto.
- [ ] Comprobar que una restauración llegue a los teléfonos y que una edición pendiente conserve ambas versiones.
- [ ] Crear y restaurar un respaldo de una cuenta de prueba alojada. Comprobar historial, EXP, oro, compras y equipamiento.
- [ ] Preparar y ensayar el respaldo global de PostgreSQL/Auth para recuperar identidades eliminadas o todo el proyecto. El procedimiento debe reiniciar los cursores de clientes cuando el servidor vuelva a una copia anterior y forzar una reconciliación completa.
- [ ] Verificar el borrado de cuenta conectado y la limpieza de sus datos descargados al volver a conectar los demás dispositivos. Un equipo desconectado requiere reconectarse para enterarse.
- [x] Ensayar compensaciones y premios extra localmente en etapa 7; falta repetir la validación contra el servidor real.

## Capacidad y operación

- [x] Medir localmente 100 cuentas con un año de historial, cinco entrenamientos semanales y veinte series por sesión. Resultado y límites en etapa-11.md; falta medir el proyecto alojado completo.
- [x] Medir training_operations, sync_changes, wallet_ledger, índices y fotos en la base embebida, y volumen JSON de sincronización. Falta el tráfico real de Auth/comunidad y consumo alojado.
- [x] Definir compactación de eventos reemplazados, sin podar UUID de operaciones, ledger ni tombstones. La revisión de las series queda en su fila; mantenimiento físico explícito en operacion.md.
- [ ] Comprobar cuotas reales y mantener facturación desactivada.
- [ ] Documentar restauración, actualización de PWA y rollback con una cuenta de prueba antes de abrir el grupo.

## Teléfonos y salida

- [ ] Publicar la PWA por HTTPS en Cloudflare Pages.
- [ ] Validar instalación, actualización, teclado y áreas seguras en iPhone y Android físicos.
- [ ] Validar offline, cronómetro en segundo plano, sonido/vibración y reconexión en ambos sistemas.
- [ ] Validar VoiceOver, TalkBack, contraste, foco y movimiento reducido.
- [ ] Medir carga y registro de series en los equipos representativos definidos en la etapa 10.
- [x] Registrar la decisión del titular del 19/11: conservar la ropa existente. La auditoría exhaustiva de 1240 entradas no se declara realizada y queda fuera del alcance actual.
- [ ] Completar la revisión visual de mascotas, ejercicios, tienda y Amigos después de sus etapas.
- [x] Consolidar documentación activa, referencias históricas, licencias y registro de QA con las decisiones finales en etapa 11.
- [ ] Registrar tu prueba de aceptación en el celular y corregir los problemas encontrados antes de marcar el piloto listo.

## Evidencia disponible

La etapa 1 tiene base local y demostración reproducible.
La etapa 2 tiene acceso e invitaciones probados con SDK y transporte simulados, reglas SQL en PGlite y comprobación de tipos de la función.
La etapa 3 añade SQL real de sincronización ejecutado en PGlite, con recorridos de navegador para dos dispositivos y dos pestañas.
Estas evidencias todavía no sustituyen las comprobaciones alojadas ni las pruebas físicas enumeradas arriba.

## Continuación de etapa 5

- [x] Cobertura revisada de mascotas entrenando: cinco principales en cada especie y todos los ejercicios del catálogo para el dragón, con selección automática. Las 75 láminas sustituyen el plan anterior de 72; ver etapa-5.md.
- [x] Registrar que la ropa sobre las nuevas poses no se amplía en este cierre por decisión de conservar el acabado actual.
- [x] Comprobar las 48 combinaciones de especie/etapa, reacción, familiar y movimiento reducido en Chromium y WebKit locales.
- [x] Comprobar evolución sin repetición y premio tardío en navegador; comprobar las nuevas láminas offline con service worker y premio de la mascota original.
- [ ] Repetir la comprobación con servidor real y PWA instalada en teléfonos físicos, además de medir rendimiento y comprimir los originales.

## Continuación de etapa 6

- [x] Revisar catálogo, dos poses y músculos; ampliar a 46 movimientos y corregir el press francés.
- [x] Revisar diez adaptaciones, fuentes y diferencias; conservar Rutina Rocco y la regresión de cinco días/31 ejercicios.
- [x] Preservar ejercicios propios, identidad, músculos y modalidad; probar reutilización, guardado y reapertura offline en Chromium/WebKit.
- [x] Exigir confirmación de ambigüedades reales sin convertir cada valor sugerido en una advertencia bloqueante.
- [x] Probar alternancia A/B/A → B/A/B, guardado sin avisos obsoletos e historial sin reescritura.
- [ ] Aplicar 202611190013_exercise_snapshots.sql en el proyecto del titular y repetir la validación alojada.
- [ ] Completar las comprobaciones físicas, de rendimiento y capacidad previstas en etapas 10–11.
- [x] Implementar el premio por aumentar peso en la entrega de etapa 7.

## Continuación de etapa 7

- [x] Comparar máximos por variante/modalidad y excluir referencias inválidas, con máximo de tres mejoras por sesión.
- [x] Mostrar base, mejoras y total; incluir EXP extra en la mascota original y esperar confirmación en cuentas offline.
- [x] Reconciliar correcciones, historial tardío y eliminaciones con ajustes de monedero, sin premios duplicados.
- [x] Conservar y reconstruir el desglose al respaldar/restaurar. Probar permisos e independencia entre cuentas.
- [x] Recorrer finalización offline, recarga, respuesta perdida y recuperación en otro navegador con el servidor SQL de prueba.
- [ ] Aplicar 202611190014_load_bonus.sql en el proyecto del titular y repetir esos recorridos con Supabase real.
- [ ] Validar en teléfonos físicos y medir historiales grandes durante etapas 10–11.
## Continuación de etapa 8

- [x] Misiones semanales de cumplimiento y mejora, insignias previas y logros con progreso confirmado.
- [x] Unificar cumplimiento, rachas y castigo semanal; excluir incompletas y premios sin confirmar.
- [x] Probar dos incumplimientos, descenso, cero vida y recuperación únicamente al evolucionar.
- [x] Conservar umbrales y aplicar la EXP adicional a la mascota original de la sesión.
- [x] Revisar cambios de plan/compañero, semana inicial parcial, descanso, fecha de entrenamiento y correcciones.
- [x] Comparar local y cuenta con premios SQL; recorrer muerte y recuperación offline en Chromium/WebKit.
- [ ] Aplicar 202611190015_pet_plan_validation.sql y repetir cuentas/restauración en el proyecto del titular.
- [ ] Probar dispositivos físicos y rendimiento/capacidad en etapas 10–11.
- [x] Usar la etapa efectiva de mascota y EXP de cuenta por separado en las fichas sociales de etapa 9.

## Continuación de etapa 9

- [x] Perfiles aceptados, fotos, mascota/vida efectiva, constancia, récords y comparación con períodos equivalentes.
- [x] Compartir rutinas por elección, quitar notas/pesos privados y guardar copias independientes editables.
- [x] Recorrer solicitud, aceptación, foto, comparación, copia, publicación, celebración, desafío y bloqueo con dos cuentas.
- [x] Validar aislamiento, terceros, retiro/archivo, bloqueo y helpers privados con SQL.
- [x] Comprobar que una escritura que llega durante una descarga se confirme antes de anunciar su publicación.
- [ ] Aplicar 202611190016_friend_profiles.sql y repetir con Auth/HTTP/HTTPS reales y conexiones independientes.
- [ ] Medir consultas y respuestas de perfil con historiales grandes y probar teléfonos físicos en etapas 10–11.

## Continuación de etapa 10

- [x] Carga por pantallas, índice de historial/premios, confirmación tras guardado y error recuperable.
- [x] Ilustraciones WebP con igualdad de píxeles, caché inicial reducida y preparación explícita de rutina offline.
- [x] Comprobaciones de diseño y accesibilidad automática en Chromium/WebKit a 320/390/430 px; comunidad adicional a 430 px.
- [x] Simular recarga offline, cuota insuficiente, primer plano, movimiento reducido y campos largos.
- [x] Medir un historial de 260 sesiones/5200 series y documentar presupuestos, cargas y limitaciones en etapa-10.md.
- [ ] Instalación, teclado, áreas seguras, cronómetro bloqueado, VoiceOver y TalkBack en iPhone/Android físicos.
- [ ] Repetir con cuentas/HTTPS reales, verificar actualización de imágenes y cuotas de almacenamiento en etapa 11.
- [ ] Medir respuesta y memoria en teléfonos representativos y las consultas alojadas de amigos.


## Continuación de etapa 11

- [x] Cargar 100 propietarios, 26.000 sesiones, 520.000 series, 650.200 operaciones, fotos, compras y actividad sintética; medir también lote real e idempotencia.
- [x] Reducir duplicación, preservar registros históricos y documentar dependencia del mantenimiento: 448 MB públicos y 52 MB de margen antes de Auth real.
- [x] Agregar generación de recuperación y comprobar cursor adelantado, recarga y conflicto pendiente sin descartar operaciones.
- [x] Comprobar actualización desde la migración 016, permisos de administración y controles de publicación.
- [x] Actualizar arquitectura, datos, diseño, README y avisos de dependencias servidos con la app. Publicación/operación/rollback quedan documentados.
- [ ] Conectar los proyectos gratuitos del titular, aplicar hasta 020 y desplegar accounts/Pages con la URL HTTPS autorizada.
- [ ] Ensayar respaldo global real y restauración con Auth, secretos/configuración y generación nueva. El script solo se comprobó sintácticamente; Docker no estaba iniciado.
- [ ] Confirmar espacio total de Supabase, concurrencia real y tráfico social antes de ampliar de diez a cien amigos. El modelo local no prueba esas cuotas.
- [ ] Verificar actualizaciones de PWA y rollback alojado, dos cuentas reales y teléfonos físicos antes de marcar el piloto listo.
