# Comprobaciones pendientes para el cierre final

Actualizado después de la etapa 3, el 18 de noviembre de 2026.
Este registro reúne las validaciones que deben retomarse al cerrar las once etapas.
Las funciones todavía asignadas a etapas 4–11 se mantienen en pendientes.md.

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
- [ ] Completar el ensayo de compensaciones y premios extra cuando se implemente la etapa 7.

## Capacidad y operación

- [ ] Medir 100 cuentas con un año de historial, cinco entrenamientos semanales y veinte series por sesión.
- [ ] Medir también training_operations, sync_changes, wallet_ledger, índices, fotos y tráfico.
- [ ] Definir retención o compactación si las mediciones lo requieren. El registro incremental conserva todos los eventos actualmente.
- [ ] Comprobar cuotas reales y mantener facturación desactivada.
- [ ] Documentar restauración, actualización de PWA y rollback con una cuenta de prueba antes de abrir el grupo.

## Teléfonos y salida

- [ ] Publicar la PWA por HTTPS en Cloudflare Pages.
- [ ] Validar instalación, actualización, teclado y áreas seguras en iPhone y Android físicos.
- [ ] Validar offline, cronómetro en segundo plano, sonido/vibración y reconexión en ambos sistemas.
- [ ] Validar VoiceOver, TalkBack, contraste, foco y movimiento reducido.
- [ ] Medir carga y registro de series en los equipos representativos definidos en la etapa 10.
- [ ] Aprobar la primera muestra de ropa de etapa-4.md y revisar las 1240 entradas visibles de la matriz, además de las combinaciones entre prendas.
- [ ] Completar la revisión visual de mascotas, ejercicios, tienda y Amigos después de sus etapas.
- [ ] Consolidar documentación, investigación, licencias y registro de QA con las decisiones finales.
- [ ] Registrar tu prueba de aceptación en el celular y corregir los problemas encontrados antes de marcar el piloto listo.

## Evidencia disponible

La etapa 1 tiene base local y demostración reproducible.
La etapa 2 tiene acceso e invitaciones probados con SDK y transporte simulados, reglas SQL en PGlite y comprobación de tipos de la función.
La etapa 3 añade SQL real de sincronización ejecutado en PGlite, con recorridos de navegador para dos dispositivos y dos pestañas.
Estas evidencias todavía no sustituyen las comprobaciones alojadas ni las pruebas físicas enumeradas arriba.
