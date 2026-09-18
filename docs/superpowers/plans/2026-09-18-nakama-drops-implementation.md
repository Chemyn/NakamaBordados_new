# Plan de implementación: Nakama Drops

**Especificación:** `docs/superpowers/specs/2026-09-18-nakama-drops-design.md`  
**Estrategia:** TDD por capas, con WooCommerce como autoridad comercial y Next.js como presentación en tiempo real.

## 1. Núcleo del plugin y persistencia

- Crear el plugin modular `nakama-drops/` y su bootstrap.
- Definir tablas de campañas, precios y reservas con migración idempotente.
- Implementar repositorio, normalización de fechas, precios y cupos.
- Añadir pruebas PHP que fallen primero para estados temporales, validaciones, cupo restante y contratos públicos.

## 2. Precios, ciclo de vida y categorías

- Aplicar preventa como precio de oferta nativo de WooCommerce.
- Guardar instantáneas de precios/categorías para cancelación.
- Implementar lanzamiento idempotente, reconciliación y caché.
- Crear o resolver las categorías `drops` y `ya-disponible`.
- Probar programación, precio vigente, transición y restauración antes de escribir cada comportamiento.

## 3. Cupos, pedidos y correos

- Reservar cupo global mediante actualización atómica y ledger idempotente.
- Liberar reservas por fallo, cancelación, expiración y reembolso previo.
- Validar cupo en carrito/checkout sin reemplazar el stock nativo.
- Guardar metadatos de preventa por línea y mostrarlos en administración/correos.
- Añadir aviso para pedidos mixtos y fecha de elaboración más tardía.

## 4. Panel y API pública

- Crear listado y formulario de Nakama Drops con capacidad `manage_woocommerce` y nonces.
- Buscar productos, cargar variaciones y permitir precios generales con ajustes individuales.
- Añadir borradores, programación, cancelación y reintento.
- Exponer campañas públicas con hora del servidor, cupo restante y configuración visual.
- Verificar que el endpoint no exponga datos internos y desactive cachés obsoletos.

## 5. Dominio frontend

- Añadir tipos y cliente REST para Drops.
- Implementar cálculo del contador con desfase del servidor y pruebas unitarias.
- Añadir helpers para mapa de campañas, estados y fecha más tardía de carritos mixtos.

## 6. Componentes y página `/drops/`

- Crear contador accesible y tarjeta Apple adaptada a Nakama.
- Crear la página cliente con hero negro, cuerpo blanco/tema global, aviso de preventa y secciones `Próximos DROPS` y `Ya disponibles`.
- Mantener datos esenciales visibles sin hover y respetar movimiento/transparencia/contraste reducidos.

## 7. Integraciones públicas

- Añadir el enlace DROPS animado a la cabecera existente sin modificar sus demás controles.
- Etiquetar preventas en tienda y búsqueda.
- Mostrar contador, cupo y bloqueo de preventa agotada en la ficha de producto.
- Persistir una instantánea pública de preventa en el artículo local del carrito.
- Mostrar avisos de carrito mixto en carrito y checkout.
- Añadir textos ES/EN y sitemap.

## 8. Entrega y verificación

- Ejecutar pruebas PHP, Vitest, lint y build estático.
- Revisar visualmente móvil/escritorio y estados accesibles en navegador.
- Generar `nakama-drops.zip` instalable.
- Ejecutar `graphify update .`.
- Revisar diff completo y crear commit con bloque `NK-RELEASE`.

