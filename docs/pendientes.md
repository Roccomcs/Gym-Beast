# Seguimiento de pendientes de GymBeast

## Entrega actual

- [x] Volver a conectar la sugerencia de carga al registro. La carga de cada serie cambia únicamente al aceptar la sugerencia.
- [x] Mostrar la mejor racha y comparar la cantidad de sesiones de la semana seleccionada con la anterior.
- [x] Guardar el objetivo de la rutina en las sesiones nuevas para evitar aplicar el objetivo activo a entrenamientos antiguos. Las semanas antiguas sin plan ni objetivo registrado quedan sin evaluación retrospectiva.
- [x] Agregar nombre de usuario único, solicitud por usuario exacto, aceptación, retiro y bloqueo en Amigos.
- [x] Probar en PostgreSQL embebido el aislamiento de dos cuentas, la aceptación por el destinatario y el bloqueo. El cliente requiere cuenta sincronizada.

- [x] Fotos circulares de Amigos visibles únicamente entre vínculos aceptados.
- [x] Seis etapas ilustradas en 2D para dragón, cocodrilo, oso y lobo.

- [x] Comparar volumen total y carga máxima por ejercicio entre la semana seleccionada y la anterior, desde Progreso.

- [x] Descarga por sesión con una carga sugerida 20 % menor. El historial conserva el entrenamiento y la próxima sesión normal reutiliza la última carga habitual.
- [x] Aviso de descanso opcional por sonido o vibración, con un estado visual siempre disponible.

- [x] Logros avanzados por marca personal, cinco récords, cuatro semanas de constancia y cincuenta sesiones. Se calculan a partir del historial sin añadir recompensas monetarias.
- [x] Técnica específica de los 41 ejercicios, con pasos y diagramas de inicio y fin, y nuevos esquemas para zancadas, dominadas, hip thrust y máquinas de pierna.
- [x] Feed voluntario de sesiones confirmadas y celebraciones entre amigos. Las publicaciones solo exponen que se completó una sesión.
- [x] Desafíos cooperativos de siete días con invitación, aceptación, rechazo y progreso por fechas distintas confirmadas. Probado con PostgreSQL embebido.

## Pendientes

- [ ] Amigos: perfiles compartidos, más tipos de desafíos y rankings. Validar el feed, las celebraciones y los desafíos en el entorno alojado.
- [ ] Misiones semanales, pausas de racha, más insignias, recompensas de logros y compensaciones de economía.
- [ ] Animación individual y una segunda pose pixel art por variante. Las fichas ya incluyen instrucciones propias y dos diagramas.
- [ ] Revisión completa de los diez programas, importador de casos ambiguos y catálogo de ejercicios personalizados.
- [ ] Validar en teléfonos físicos el sonido y la vibración al terminar el descanso.
- [ ] Transiciones de evolución en 2D y cosméticos adicionales.
- [ ] Restauración de cuentas, normalización del núcleo de datos y sincronización incremental con conflictos legibles.
- [ ] Validar migraciones, OAuth, compras, Amigos y sincronización con cuentas reales de Supabase.
- [ ] Publicar en Cloudflare Pages, validar cuotas y recuperación, y probar instalación, teclado, accesibilidad y rendimiento en iPhone y Android físicos.
- [ ] Consolidar investigación, licencias, lint, formato y documentación final.

## Verificación y bloqueos

Los permisos y las reglas SQL se prueban en PostgreSQL embebido. Esta prueba no valida sesiones OAuth ni conectividad contra el proyecto alojado. Para abrir el piloto se necesitan el proyecto Supabase, el cliente OAuth, el proyecto Cloudflare Pages y teléfonos físicos. Los controles retirados explícitamente de Perfil y Entrenar siguen fuera de esas pantallas.
- 15 de noviembre: compilación correcta, 72 pruebas de dominio y PostgreSQL embebido y 14 recorridos en Chromium. Se verificaron el visor 3D, el movimiento reducido y la sugerencia de carga a 320 px.
- Mascota animada de Inicio: ilustración 2D con balanceo en reposo y un salto al tocarla.
