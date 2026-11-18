# Etapa 4 · Revisión de ropa y accesorios

Primera entrega del 18 de noviembre de 2026. Muestra aplicada, pendiente de aprobación del acabado antes de extenderlo al resto de la matriz.

## Inventario y hallazgos

- 31 prendas y accesorios equipables, ocho especies y seis etapas.
- 1488 entradas en la matriz, incluidas 248 entradas de huevo donde no se muestra ropa.
- 1240 casos de prendas/accesorios visibles que requieren la revisión de acabado.
- Comprobados los 80 archivos de atlas y máscaras de fútbol, buzos, musculosas, pantalones y shorts.
- Capturada una lámina con las 48 etapas usando buzo, jogger, gorra y reloj.
- Las gorras genéricas flotan en varias especies y etapas.
- El reloj anterior usa un dibujo geométrico que no sigue de forma consistente la muñeca y el puño.
- El bebé de cocodrilo vestido conserva parte del cascarón en el atlas. Revisar este acabado al extender la corrección.
- Las familias de prendas y sus combinaciones todavía deben aprobarse visualmente. La disponibilidad de archivos no acredita su calce.

La matriz completa está en qa/etapa-4/matriz-ropa.json. La lámina de referencia está en qa/etapa-4/revision-48-etapas.png.
Cada entrada sigue marcada como pendiente de aprobación visual. La muestra corresponde a una combinación concreta y no aprueba automáticamente las prendas individuales.

## Muestra corregida

Se ilustró el dragón Cría con Buzo Oversize y Reloj cronógrafo en una sola imagen.
La correa rodea la muñeca expuesta, la esfera sigue su perspectiva y el puño se integra al conjunto.
El marco, el personaje y su escala se conservaron. Los límites visibles de la ilustración nueva quedan a menos de dos píxeles de los del sprite anterior al normalizarlos a 352 px.
El archivo nuevo es public/wardrobe/dragon-cria-hoodie-watch-v2.png, generado con OpenAI ImageGen a partir del sprite de GymBeast. Su peso es aproximadamente 679 KiB.
La combinación usa esa ilustración dentro del renderizador de equipamiento.

La sustitución se limita a Dragón Cría con Buzo Oversize, Reloj cronógrafo y sin pantalón adicional.
Las demás combinaciones conservan su implementación mientras se aprueba esta muestra.
La muestra puede verse sin compras desde modo local → Perfil → Galería local de mascotas → Ver muestra de ropa.
La vista previa no modifica la mascota activa, compras, oro ni equipamiento guardado.
Cambiar los selectores de mascota/etapa sale de esa muestra y vuelve a la galería habitual.

La captura aplicada está en qa/etapa-4/muestra-reloj-en-app.png.

## Comprobaciones ejecutadas

- Compilación TypeScript/Vite/PWA correcta.
- 112 pruebas de dominio/SQL aprobadas.
- Recorridos de bazar y galería de 48 etapas aprobados.
- Recorrido nuevo de la muestra local aprobado, comprobando que no modifica compras/equipamiento y que no reemplaza al compañero activo.
- npm run test:wardrobe genera matriz y capturas desde los componentes de la aplicación mediante Vite.
- La comprobación de atlas verifica respuesta y tipo de imagen para evitar aceptar una página HTML como recurso válido.
- La revisión visual utiliza movimiento reducido para comparar el calce en la misma posición.

## Después de la aprobación

1. Revisar reloj y manga en el resto de especies y etapas, incluyendo prendas de manga corta y muñecas descubiertas.
2. Revisar gorras y coronas respecto a orejas, cuernos, crestas y cabeza.
3. Revisar camisetas, musculosas, buzos, pantalones y shorts de la matriz y las combinaciones entre prendas.
4. Generar evidencia por objeto, especie y etapa, y repetir compra/equipamiento, reapertura, animaciones y offline.
5. Marcar cada entrada como aprobada o corregida con su evidencia. Cerrar la etapa cuando toda la matriz visible esté revisada.

La etapa 5 comienza cuando se termine esta revisión y el titular apruebe la entrega.
