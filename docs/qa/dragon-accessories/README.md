# Corrección de accesorios del dragón · 19/11/2026

Se reprodujo una regresión de carga: al hacer diferida la Tienda, sus estilos compartidos de ropa/accesorios dejaron de estar disponibles al abrir Inicio directamente. La prueba falló antes del arreglo y pasó después. Los estilos compartidos ahora se importan desde Companion, separados del diseño exclusivo de la tienda.

El reloj usaba un ancla de pecho fuera de la etapa Cría. Ahora se compone sobre el sprite, a la altura de la muñeca de la pata delantera, con posiciones por etapa y manga y recorte por alfa del cuerpo. Se conserva la ilustración especial del cronógrafo con buzo de Cría.

Se revisaron corona y gorra en Bebé, Cría, Adolescente, Adulto y Titán. Las cabezas de Adulto/Titán cambian de sitio en las láminas con ropa; sus anclas ahora consideran camiseta frente a musculosa/buzo, y conservan las de la silueta base al usar solo pantalones/shorts.

Evidencia visual: seis láminas de diez combinaciones cada una, con corona lunar/gorra GymBeast y reloj deportivo. Las variantes solares/retro/cronógrafo reutilizan geometría con otra paleta; el cronógrafo ilustrado de Cría conserva su ruta existente. Esto no constituye la auditoría completa de todas las mascotas y prendas pendiente de etapa 4.

Prueba reproducible: `npx playwright test --config playwright.wardrobe.config.ts dragon-accessories.spec.ts --workers=1`. Dos recorridos aprobados: igualdad de colocación al abrir en frío/tras cargar tienda y composición de las cinco etapas con seis familias de ropa. Compilación correcta. Se repite también el recorrido de compras/equipamiento persistentes a 320 px.

No se reemplazaron ilustraciones aprobadas ni se reintrodujeron accesorios retirados.
