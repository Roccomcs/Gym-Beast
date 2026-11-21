# Ropa ajustada al cuerpo · 19/11/2026

## Correcciones

- Los pantalones y shorts se pintan sobre el cuerpo de la ilustración activa. Se conserva su transparencia, contorno, sombreado y la camiseta en primer plano; no se trasplanta una pierna desde otra ilustración.
- El molde se adapta a las proporciones de cada dibujo vestido. Las láminas originales se recortan según su resolución real.
- Los pantalones de bebés usan un molde redondeado derivado del short en seis especies; el cocodrilo conserva su huevo y el fénix su anatomía propia.
- Gorras y coronas de las demás especies se ajustan a la escala del dibujo vestido. Se corrigió el caso del oso Titán con musculosa. Relojes separados usan referencias de extremidades; el acabado ilustrado del dragón se mantiene.
- Los moldes adicionales necesarios se incluyen en la precarga offline.

## Evidencia y alcance

25 prendas: 21 superiores y cuatro inferiores; ocho especies, cinco etapas vestibles. El huevo no lleva prendas.

- 4.360 renderizados automáticos: 1.000 prendas individuales y 3.360 combinaciones. En los 3.520 casos con pantalón/short se comparó toda la transparencia con el cuerpo correspondiente, sin diferencias. Las 840 prendas superiores restantes se cargaron como referencia. Esta comprobación detecta píxeles añadidos fuera del cuerpo, no certifica por sí sola la calidad artística.
- Ocho láminas de revisión visual con 60 casos cada una (incluyen cuerpo de referencia y once atuendos), más ocho láminas con 20 combinaciones de prendas, gorros, coronas y relojes.
- Caso reportado: [dragón bebé con Boca, pantalón y corona](qa/ropa-ajustada/dragon-bebe-pantalon-corregido.png).
- Láminas y resultado numérico en `docs/qa/ropa-ajustada`.
- 304 pruebas de dominio/interfaz aprobadas, compilación aprobada, tres pruebas nuevas de vestuario, dos de accesorios del dragón y prueba de compra/equipamiento persistente en navegador a 320 px aprobadas.

## Límites y pendientes

La comprobación visual se realizó en Chromium mediante el renderer real de la aplicación y capturas, con movimiento reducido para comparar poses. No sustituye pruebas en teléfonos físicos. El arreglo aplica al compañero vestido del hábitat y sus vistas compartidas; no incorpora ropa a las ilustraciones separadas de la mascota entrenando. La publicación del cambio en el sitio del titular sigue pendiente.
