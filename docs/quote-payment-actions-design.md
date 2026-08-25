# Selector de pago para cotizaciones en Mi Cuenta

## Resumen de entendimiento

- El cliente debe ver acciones de pago únicamente para solicitudes de cotización originales y todavía pagables.
- Un pedido ordinario pendiente, incluido uno con transferencia bancaria, no debe mostrar acciones de cotización.
- Una cotización pagada o convertida en pedido debe dejar de mostrar esas acciones.
- La decisión del servidor `nakamaQuotePaymentEligible` es la fuente de verdad; el folio `NK-` y `needsPayment` no prueban por sí solos que sea una cotización pagable.
- La tarjeta mostrará una sola acción, **Pagar cotización**, y abrirá un selector con pago directo o carrito.
- El checkout, moneda, cupones, envío y la conversión de la cotización a pedido no cambian.

## Supuestos no funcionales

- Rendimiento: se reutiliza la consulta GraphQL de elegibilidad existente; no se agregan peticiones por pedido.
- Escala: la solución mantiene costo lineal sobre los pedidos ya cargados en Mi Cuenta.
- Seguridad: ante datos ausentes, inválidos o un error de esquema, la interfaz falla cerrada y no muestra acciones.
- Fiabilidad: el modal conserva las validaciones del bridge de WooCommerce y comunica fallos al iniciar el checkout.
- Mantenimiento: la condición permanece centralizada en `canShowQuotePaymentActions`.
- Accesibilidad: diálogo etiquetado, foco inicial y restaurado, cierre con `Escape`, controles de al menos 44 px y estado ocupado anunciado.

## Alternativas consideradas

1. **Modal accesible (seleccionada).** Mantiene una sola llamada a la acción en la tarjeta y concentra la decisión sin desplazar la lista de pedidos.
2. **Desplegable dentro de la tarjeta.** Evita una superposición, pero mueve el contenido y permite varios selectores abiertos simultáneamente.
3. **Página independiente.** Aísla el flujo, pero añade navegación y una pantalla innecesaria para una elección de dos opciones.

## Diseño aprobado

La tarjeta renderiza **Pagar cotización** solamente cuando `canShowQuotePaymentActions(order)` devuelve `true`. El modal muestra folio y total, y ofrece:

- **Pagar solo esta cotización:** siembra la sesión de WordPress y abre el checkout exclusivo existente.
- **Agregar al carrito:** guarda la referencia de la cotización en el carrito local; si ya existe, muestra **Ya está en el carrito** deshabilitado.

El diálogo conserva el lenguaje editorial manga de alto contraste de Mi Cuenta, usa los tokens `nk-*` existentes y evita dependencias visuales nuevas. El botón desaparece automáticamente cuando una recarga de pedidos devuelve la cotización como no elegible.

## Casos límite y errores

- Elegibilidad ausente o `false`: no se renderiza el botón.
- Pedido normal con `needsPayment: true`: no se renderiza el botón.
- Pedido convertido que conserva folio `NK-`: no se renderiza si el servidor lo marca no elegible.
- Cotización ya agregada: pago directo sigue disponible; agregar nuevamente queda deshabilitado.
- Error al sembrar la sesión: el modal permanece abierto y presenta un mensaje para reintentar.

## Estrategia de pruebas

- Cotización elegible: aparece el disparador y el modal ofrece ambas rutas.
- Pedido ordinario pendiente por transferencia: no aparece ninguna acción de cotización.
- Cotización pagada o convertida: no aparece el disparador aunque conserve un folio `NK-`.
- Agregar al carrito: envía ID, llave, folio y total correctos y cierra el modal.
- Estado ya agregado: la segunda ruta queda deshabilitada.

## Registro de decisiones

| Decisión | Alternativas | Motivo |
| --- | --- | --- |
| Usar un único modal | Desplegable o página nueva | Reduce ruido en tarjetas y hace explícita la elección. |
| Confiar solo en `nakamaQuotePaymentEligible` | Prefijo `NK-` o `needsPayment` | La procedencia y el estado real solo se verifican de forma segura en WooCommerce. |
| Mantener el backend actual | Crear otro endpoint | La elegibilidad central ya cubre tipo, estado, precio, moneda y necesidad de pago. |
| Reutilizar tokens visuales existentes | Adoptar la paleta sugerida por la herramienta | Evita romper la identidad manga y mantiene consistencia con Mi Cuenta. |

