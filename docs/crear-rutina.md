# Crear rutina por días · 19/11/2026

## Recorrido implementado

Crear rutina desde Entrenar o Rutinas abre directamente `/editor/manual`. Se eliminó el componente de elección entre creación manual e importación. La antigua URL `/editor` solo redirige al nuevo editor, para no romper enlaces anteriores. El importador sigue funcionando por su URL histórica para conservar esa herramienta; no aparece como paso ni opción en la nueva creación.

La pantalla Nueva rutina abre el Día 1 sin pedir nombre ni foto. El catálogo ofrece selección múltiple por imágenes, categorías horizontales (Pecho, Espalda, Piernas, Hombros, Brazos, Core, Cardio y Movilidad), búsqueda opcional y filtro de equipo. Los ejercicios elegidos se acumulan en orden, con número en la tarjeta y una selección removible. Los propios guardados aparecen en Mis ejercicios. La creación de un ejercicio propio queda plegada en una opción secundaria.

Continuar muestra una lista compacta con series, repeticiones y peso. El cardio usa segundos y permite distinguir calentamiento de cardio/finalización. El peso admite coma o punto y usa la unidad de la cuenta. Guardar día abre un resumen ilustrado con editar, quitar y agregar día; Agregar día abre directamente su catálogo. No hay formularios de días o ejercicios vacíos que deban agregarse antes de comenzar.

Crear rutina guarda el programa y abre Mis rutinas. En programas nuevos, tres días asignan Rutina básica y bronce; cuatro, Rutina intermedia y plata; cinco o más, Rutina avanzada y oro. Uno o dos días usan Rutina de N días y bronce, sin afirmar su dificultad real. Son nombres/portadas predeterminados, no una evaluación automática del esfuerzo de los ejercicios elegidos.

Después de crearla, Editar permite cambiar nombre, elegir portada o subir/quitar una foto. Se conservan metadatos, identificadores, observaciones, superseries y rangos anteriores salvo el campo que la persona cambie. Las versiones anteriores siguen disponibles. Los nombres y fotos existentes se respetan al editar.

## Borradores y persistencia

IndexedDB incorpora `routineDrafts`, separado por cuenta y por rutina en edición. Se muestra cuándo terminó de guardarse el borrador; al recargar o volver al editor se recuperan etapa, selección, orden y valores confirmados. El borrador se mantiene solo en el dispositivo hasta crear/guardar la rutina; no se publica como rutina incompleta ni se envía a la cola remota. Al guardar se elimina, y al eliminar datos de una cuenta también se limpia.

Una edición concurrente no reemplaza silenciosamente otra versión local más reciente: se conserva el borrador y se permite guardar como copia. La sincronización de rutinas terminadas conserva las reglas de conflictos existentes.

## Revisión de UX

Se consultaron fuentes oficiales para adoptar selección múltiple, filtros por músculo/equipo y configuración posterior:

- Hevy, biblioteca y filtros: https://www.hevyapp.com/features/exercise-library/
- Hevy, incorporación de varios ejercicios: https://www.hevyapp.com/features/exercise-programming-options/
- Strong, plantillas reutilizables: https://help.strongapp.io/article/105-about-templates

Se mantiene la identidad Obsidiana dorada, las imágenes propias y la tipografía existente. No se copiaron pantallas ni recursos externos. Las miniaturas se montan al aproximarse a la zona visible para evitar cargar todo el catálogo de golpe. La barra Continuar queda fuera del contenedor animado de la página para permanecer visible, y los botones del resumen/configuración no cubren Agregar día ni campos. El teclado se contempla con el tamaño del área visible del navegador.

## Verificación

- Compilación aprobada y 300 pruebas de dominio/SQL aprobadas.
- Doce recorridos nuevos aprobados: tres escenarios en Chromium y WebKit, a 320 y 390 px. Incluyen cinco días, portadas automáticas, valores con coma, foto posterior, entrenamiento con datos precargados, borrador al recargar, cardio y validación de días vacíos.
- Batería principal: 31 casos aprobados en la ejecución general y el caso restante de ejercicios propios aprobado después de ubicar su acceso junto al buscador. Se mantienen las pruebas de importación por URL, historial, versiones y rutinas anteriores.
- Calidad móvil: nueve casos aprobados inicialmente en Chromium 320 y WebKit 390; el restante se repitió y aprobó tras corregir la descarga de recursos después de abandonar una página. La prueba recorre las pantallas y comprueba accesibilidad, foco, contraste, teclado y movimiento reducido.
- La preparación offline ahora detiene nuevos trabajos al recibir pagehide y retoma después de pageshow con restauración del navegador. Evita errores Context is stopped de WebKit al navegar rápidamente.
- Capturas revisadas: qa/crear-rutina. Siguen pendientes las comprobaciones en iPhone y Android físicos y en el entorno público del titular. El piloto público no se marca listo por estas pruebas locales.
