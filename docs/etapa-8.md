# Etapa 8 · Misiones, vida y evolución

Entrega del 19 de noviembre de 2026. No cambia ropa, accesorios, navegación ni paleta.

## Implementado

- Progreso abre con dos misiones semanales: cumplir los días del plan y mejorar la carga de tres movimientos distintos. Muestran avance, estado completo e insignia; las insignias anteriores quedan en un historial desplegable. No agregan EXP ni oro: se mantienen los premios de sesiones y los hitos existentes.
- Los cuatro logros avanzados muestran insignias, progreso y estado desbloqueado. Las mejoras de carga usan el desglose confirmado de etapa 7; las sesiones, rachas y misiones excluyen registros incompletos o sin confirmación. Una corrección puede retirar un logro/insignia que ya no cumple su condición.
- Vida, constancia y misión de cumplimiento comparten las mismas reglas semanales. Cinco sesiones en un día dan sus premios correspondientes pero cuentan como un día para un plan de cinco días. Un calendario explícito compara sus turnos; los descansos programados no faltan y una semana íntegra de descanso programado cumple el plan.
- Cada semana cerrada incumplida resta 50 de vida. El segundo incumplimiento lleva a cero y baja una etapa al umbral inicial de la anterior. Mientras siga en cero no continúa bajando cada semana. Entrenar sin evolucionar no cura. Cruzar un umbral de etapa devuelve 100 de vida.
- Los umbrales se conservan: Huevo 0, Bebé 100, Cría 300, Adolescente 700, Adulto 1500 y Titán 3250 EXP propia. Sin bonos, cinco sesiones por semana llegan a Titán en la sesión 130; la EXP adicional puede adelantarlo.
- La EXP queda en la mascota que acompañó la sesión, aunque después se elija otra. La responsabilidad del plan semanal queda fijada para esa semana. Cambiar de rutina o compañero guarda la nueva regla para el siguiente lunes, evitando reescribir semanas anteriores o eludir un incumplimiento.
- La primera semana iniciada después del lunes es de adaptación: hay progreso y premios, sin castigo al cerrarla. Desde la siguiente se evalúa el plan completo. Sin plan no hay castigo. Los ciclos de más de siete días usan un objetivo semanal máximo de siete días.
- Se usa la fecha de entrenamiento guardada en la sesión y la fecha actual en la zona del perfil. Terminar después de medianoche no mueve un entrenamiento a otra semana. El orden de descarga no altera el resultado y las sesiones futuras no adelantan EXP ni misiones.
- El estado de mascota se reconstruye con sesiones, planes y premios confirmados, tanto en local como en cuentas. No hay otro saldo de vida/EXP de mascota que pueda desincronizarse. Las correcciones y los premios recibidos después se reflejan al reconstruir ese estado.
- Migración 202611190015_pet_plan_validation.sql: valida zona horaria y entradas del historial de planes (fecha, 0–7 días y especie), conservando perfiles anteriores sin ese campo.
- La explicación de vida, evolución, umbrales y cambios de plan queda en un desplegable de Progreso; no se repusieron los textos retirados de Inicio.

## Comprobado

- Compilación y 214 pruebas de dominio/PostgreSQL embebido aprobadas.
- Simulaciones: 130 sesiones hasta Titán, aceleración por bonos, semanas completas/incompletas, descanso, primera semana parcial, cero vida, descenso único, recuperación al evolucionar, cambio de compañero/rutina, orden de descarga y corrección de premios.
- Comparación local/cuenta: diez sesiones válidas en dos semanas, dos semanas incumplidas, descenso a huevo y cuatro sesiones para evolucionar y recuperar vida. Ambos recorridos producen la misma EXP y vida con premios generados por el servidor SQL de prueba.
- Doce recorridos de acceso/sincronización aprobados con la nueva migración, incluidos offline, respuesta perdida y recuperación desde otro navegador.
- Los 25 recorridos generales aprobaron: importación, rutinas, entrenamiento, tienda, ropa, persistencia y gamificación.
- Chromium a 320 px y WebKit a 390 px: misiones, insignias, muerte, descenso, cuatro sesiones de recuperación, reapertura offline y movimiento reducido.

Reproducción: npm test; npm run build; npx playwright test --config playwright.stage-eight.config.ts --workers=1; npm run test:accounts; npm run test:e2e -- --workers=1.

Capturas conservadas: [320 px](qa/etapa-8/misiones-320-chromium.png) y [390 px](qa/etapa-8/misiones-390-webkit.png). En cuentas, mientras hay entrenamientos sin confirmar, la vida y las misiones representan el historial confirmado y pueden ajustarse al sincronizar; Progreso lo indica expresamente.

## Pendientes del cierre final

- Aplicar la migración 015 en Supabase del titular y volver a probar sincronización y restauración en el servidor publicado. PGlite prueba SQL y permisos; el transporte de navegador está simulado y no equivale a Auth/red alojados.
- Validar iPhone/Android físicos y medir historiales grandes, caché y rendimiento en etapas 10–11. Se mantiene el aviso del tamaño del archivo principal.
- En etapa 9, las comparaciones y fichas sociales deben distinguir EXP de cuenta y EXP/etapa efectiva de mascota después de castigos; no basta sumar premios para dibujar la etapa de un amigo.
- No se inició la etapa 9. Las misiones actuales dan insignias visuales; no se añadieron premios económicos semanales ni notificaciones externas.
