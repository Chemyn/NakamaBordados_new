# Nakama Drops: preventas y lanzamientos programados

**Fecha:** 18 de septiembre de 2026  
**Estado:** Diseño aprobado  
**Ámbito:** nuevo plugin `nakama-drops`, WooCommerce y frontend Next.js

## Contexto

Nakama Bordados usa un frontend Next.js exportado como sitio estático y carga el catálogo en tiempo real desde WooCommerce mediante endpoints REST propios. WooCommerce conserva la autoridad sobre productos, variaciones, stock, carrito, cobro y pedidos.

La nueva funcionalidad permitirá programar productos como `DROPS`, venderlos en preventa a un precio especial y convertirlos automáticamente en productos disponibles a un precio final en una fecha y hora exactas. Toda la configuración operativa se realizará desde un plugin dedicado en WordPress.

## Objetivos

- Crear una página pública `/drops/` con dos secciones: próximos `DROPS` y `Ya disponibles`.
- Permitir comprar un DROP antes de su lanzamiento como preventa.
- Mostrar un contador sincronizado con el servidor que disminuya cada segundo.
- Mostrar el precio de lanzamiento tachado junto al precio inferior de preventa.
- Permitir precios de preventa y lanzamiento por variación, con llenado general y ajustes individuales.
- Permitir un cupo global de preventa limitado o ilimitado, separado del stock por variación de WooCommerce.
- Cambiar de forma permanente los precios reales de WooCommerce en el lanzamiento.
- Sustituir automáticamente la categoría `DROPS` por `Ya disponible`, conservando las demás categorías.
- Identificar la preventa y su fecha en pedidos y correos.
- Mantener la experiencia bilingüe español/inglés del frontend.
- Añadir un acceso `DROPS` a la cabecera global existente sin rediseñarla.

## Fuera de alcance

- Reservas sin pago o apartados manuales fuera del checkout de WooCommerce.
- Envíos divididos dentro de un mismo pedido mixto.
- Un sistema independiente de inventario para DROPS.
- Múltiples campañas activas simultáneas para el mismo producto.
- Modificar automáticamente otras categorías distintas de `DROPS` y `Ya disponible`.
- Un informe financiero completo de preventas; el panel mostrará estado, cupo y unidades reservadas.
- Un constructor visual libre para las tarjetas.

## Decisiones aprobadas

- Se construirá un plugin independiente llamado **Nakama Drops**.
- WooCommerce será la fuente definitiva de productos, variaciones, stock, precios cobrados y pedidos.
- La fecha incluirá hora exacta y usará la zona horaria configurada en WordPress.
- El administrador ingresará explícitamente el precio de preventa y el precio de lanzamiento; no se usará un porcentaje.
- En productos variables se podrá aplicar un par de precios general y después sobrescribir cada variación.
- El cupo de preventa será global para el producto y se compartirá entre todas sus variaciones.
- El stock y los pedidos pendientes de cada variación seguirán obedeciendo la configuración nativa de WooCommerce.
- Al agotarse el cupo, la tarjeta permanecerá visible como `Preventa agotada`; la compra normal se habilitará al lanzamiento.
- Cancelaciones, pagos fallidos y reembolsos previos al lanzamiento devolverán unidades al cupo.
- Un carrito podrá mezclar artículos normales y preventas, con un aviso de que todo se elaborará desde el lanzamiento más tardío y una recomendación de hacer dos pedidos si se desea recibir antes el resto.
- Los DROPS también podrán aparecer en la tienda general y el buscador con etiqueta de preventa y ambos precios. El contador completo se reservará para `/drops/` y la ficha del producto.
- El formato del contador será `Días · Horas · Minutos · Segundos` y las cifras usarán ancho tabular.
- La posición predeterminada será sobre la imagen con material translúcido; el administrador podrá elegir también debajo de la tarjeta.
- La cabecera global conservará exactamente su diseño y comportamiento actuales. Solo se añadirá el enlace animado `DROPS`.
- El hero de `/drops/` será negro, sin llamas. La animación de fuego vivirá únicamente dentro del enlace `DROPS` de la navegación.
- El cuerpo de la página será blanco y las tarjetas aplicarán los principios de Apple Design: imagen protagonista, superficies suaves, profundidad ligera, respuesta inmediata y movimiento restringido a lo útil.

## Arquitectura

El sistema tendrá tres responsabilidades separadas:

1. **WooCommerce** conserva catálogo, variaciones, stock, carrito, cobro y pedidos.
2. **Nakama Drops** almacena campañas, resuelve el estado temporal, controla precios y cupo, cambia categorías, añade metadatos de pedido y expone el contrato REST público.
3. **Next.js** consulta productos y campañas en tiempo real, representa la página y los estados, y muestra avisos. Nunca será la autoridad final del precio ni del cupo.

El frontend seguirá siendo compatible con `output: 'export'`: `/drops/` será una ruta estática cuyo contenido comercial se cargará en el navegador desde WordPress.

## Estructura del plugin

El plugin se organizará como un módulo independiente:

- `nakama-drops/nakama-drops.php`: arranque, activación, versión de esquema y carga de componentes.
- `includes/class-drops-repository.php`: persistencia y consultas.
- `includes/class-drops-admin.php`: menú, listado, formulario, validación y acciones administrativas.
- `includes/class-drops-pricing.php`: aplicación y transición de precios.
- `includes/class-drops-quota.php`: reservas atómicas y devoluciones de cupo.
- `includes/class-drops-lifecycle.php`: programación, reconciliación y cambio de categorías.
- `includes/class-drops-orders.php`: metadatos de línea, avisos y correos.
- `includes/class-drops-rest.php`: endpoints públicos.
- `assets/`: estilos y comportamiento exclusivos de la pantalla administrativa.

Las clases tendrán límites explícitos y no dependerán de HTML del frontend Next.js.

## Persistencia

Se usarán tablas propias para mantener consultas, concurrencia e historial independientes del editor de productos.

### Campañas

La tabla principal almacenará:

- identificador interno estable;
- ID numérico del producto WooCommerce;
- estado: `draft`, `scheduled`, `launching`, `released`, `cancelled` o `error`;
- fecha de lanzamiento en UTC;
- zona horaria de WordPress y valor local usado al guardar;
- cupo nullable, donde `null` significa ilimitado;
- unidades reservadas de preventa;
- posición del contador: `overlay` o `below`;
- instantánea de categorías previa a la programación;
- fechas de creación, actualización, lanzamiento y cancelación;
- último error operativo, sin datos sensibles.

Solo podrá existir una campaña no terminal por producto. Las campañas liberadas o canceladas permanecerán como historial para pedidos y auditoría.

### Precios

Una tabla hija almacenará por producto simple o variación:

- ID del producto o variación;
- precio de preventa;
- precio de lanzamiento;
- instantánea de `_price`, `_regular_price`, `_sale_price` y fechas de oferta anteriores;
- indicador de transición completada.

Los importes se guardarán con la precisión decimal configurada por WooCommerce y se validarán como números positivos. El precio de preventa deberá ser menor que el de lanzamiento.

### Reservas de cupo

Una tabla o ledger de reservas relacionará campaña, pedido, línea de pedido y cantidad. Tendrá una clave única que haga idempotentes las transiciones de estado y los reembolsos parciales.

La reserva usará una actualización condicional atómica. Una compra solo continuará si `reservado + solicitado <= cupo`; dos checkouts simultáneos no podrán consumir la misma última unidad.

## Estados y ciclo de vida

### Borrador

Un borrador no modifica el producto ni aparece públicamente. Puede tener datos incompletos mientras no se intente programar.

### Programación

Al programar una campaña, el servidor validará todos los campos y después:

1. guardará la instantánea de precios y categorías;
2. escribirá los precios de preventa en WooCommerce;
3. usará el precio de lanzamiento como precio regular y el de preventa como precio de oferta;
4. asignará la categoría `DROPS` y retirará `Ya disponible` si estaba presente;
5. conservará cualquier otra categoría;
6. programará un evento único de WordPress;
7. invalidará el caché del API de productos;
8. marcará la campaña como `scheduled`.

Las categorías se localizarán por slug (`drops` y `ya-disponible`) y el plugin las creará si todavía no existen.

### Preventa

Mientras la hora del servidor sea anterior al lanzamiento:

- se cobrará el precio de preventa;
- se aplicará el cupo global si existe;
- WooCommerce seguirá validando stock y backorders por variación;
- el producto será comprable salvo que el cupo esté agotado o WooCommerce lo considere no disponible;
- cada línea de pedido recibirá una instantánea de la campaña y fecha de lanzamiento.

### Lanzamiento

Al llegar la fecha:

1. la campaña pasará a `launching`;
2. cada producto o variación recibirá permanentemente su precio de lanzamiento;
3. se limpiará el precio de oferta de preventa;
4. se retirará únicamente la categoría `DROPS`;
5. se añadirá `Ya disponible`;
6. se invalidarán cachés y transients relacionados;
7. la campaña pasará a `released`.

El cupo deja de aplicar desde el primer instante del lanzamiento. La venta normal dependerá exclusivamente del stock y backorders de WooCommerce.

### Reconciliación

WordPress Cron depende del tráfico y no garantiza ejecución en el segundo exacto. Por ello, el evento programado será solo la primera vía. El plugin reconciliará también cualquier campaña vencida al:

- consultar el endpoint público;
- cargar un producto afectado;
- añadir o recalcular un artículo del carrito;
- iniciar checkout;
- entrar al panel de Nakama Drops.

Los filtros de precio devolverán el precio de lanzamiento desde el instante límite aunque la escritura permanente todavía esté en curso. El proceso será idempotente: repetirlo no volverá a incrementar ni transformar el precio.

### Cancelación previa

Una campaña podrá cancelarse antes del lanzamiento. El plugin restaurará la instantánea de precios y categorías previa, eliminará el evento programado y conservará la información de preventa en pedidos ya creados. Después del lanzamiento no se ofrecerá “cancelar”; cualquier cambio será una edición normal del producto.

## Panel de administración

Se añadirá el menú **Nakama Drops** para usuarios con `manage_woocommerce`.

### Listado

El listado mostrará:

- producto e imagen;
- estado textual;
- fecha y hora de lanzamiento;
- rango de precios de preventa y lanzamiento;
- reservado frente al cupo, o `Ilimitado`;
- posición del contador;
- último error, si existe;
- acciones de editar, duplicar, cancelar o reintentar.

El estado nunca dependerá solo del color. Los errores operativos tendrán una acción concreta y no se ocultarán tras un estado genérico.

### Formulario

El formulario tendrá tres grupos:

1. **Producto y lanzamiento:** selector con búsqueda WooCommerce, fecha, hora, zona horaria visible y cupo limitado/ilimitado.
2. **Precios por variación:** campos generales con “Aplicar a todas” y una cuadrícula editable para ajustes individuales. Un producto simple mostrará un solo par.
3. **Presentación:** contador de cuatro unidades y posición `Sobre la imagen` o `Debajo de la tarjeta`.

Una columna lateral mostrará resumen, transición de categorías, vista previa de tarjeta y acciones `Guardar borrador` o `Programar DROP`.

La programación se rechazará si:

- falta algún precio requerido;
- preventa no es menor que lanzamiento;
- la fecha no es futura;
- el cupo limitado no es un entero positivo;
- el producto ya tiene otra campaña activa;
- una variación comprable no tiene precios configurados.

Si se añade una variación nueva después de programar, el panel marcará la campaña como incompleta y esa variación fallará cerrada hasta que reciba ambos precios.

## API pública

El plugin expondrá endpoints GET bajo `nakama/v1` para:

- listar campañas públicas activas y las liberadas cuyo producto todavía pertenezca a `Ya disponible`;
- consultar la campaña de un producto concreto;
- obtener la hora actual del servidor en ISO 8601.

El contrato público incluirá únicamente:

- ID y slug del producto;
- estado público: `presale`, `sold_out` o `released`;
- fecha de lanzamiento;
- hora del servidor;
- cupo restante solo cuando sea limitado;
- precios públicos por producto o variación;
- posición del contador.

No incluirá instantáneas anteriores, errores internos, IDs de pedidos, unidades por cliente ni capacidades administrativas.

La respuesta deshabilitará cachés intermedios que puedan dejar precios o cupos obsoletos. La configuración CORS seguirá el patrón de los endpoints públicos actuales.

## Página pública `/drops/`

La página tendrá:

1. la cabecera global existente con un nuevo enlace `DROPS`;
2. hero negro con título blanco y sin fuego;
3. aviso destacado de preventa;
4. sección `Próximos DROPS`;
5. sección `Ya disponibles`;
6. estados de carga, vacío y error coherentes con la tienda.

En el modo claro predeterminado el cuerpo será blanco. El selector oscuro existente seguirá funcionando mediante los tokens globales de la web; DROPS no introducirá un tema independiente. La paleta reutilizará el negro, blanco y rojo actuales de Nakama. No se rediseñarán el logo, menús, búsqueda, cuenta, carrito, tema, idioma ni moneda.

### Enlace animado de navegación

El enlace `DROPS` contendrá una animación CSS de fuego a color que cubra todo el botón. Tendrá dimensiones estables para no mover la cabecera, texto con contraste suficiente, estado activo y foco visible.

Con `prefers-reduced-motion: reduce`, las llamas quedarán en una composición estática. La animación usará transformaciones y opacidad, sin recalcular el layout.

### Aviso de preventa

El texto explicará explícitamente:

- que se trata de una preventa;
- que la elaboración comienza a partir del lanzamiento;
- que en un carrito mixto todo comenzará a procesarse desde la fecha más tardía;
- que se recomienda hacer dos pedidos separados para recibir antes los productos normales.

El mismo principio se repetirá de forma más compacta en la ficha de producto, carrito y checkout.

### Tarjetas

Las tarjetas seguirán una dirección Apple adaptada a la marca:

- imagen como elemento dominante;
- borde sutil y radios suaves;
- sombra ligera proporcional al tamaño;
- contador sobre la imagen con material oscuro translúcido, o debajo si así se configuró;
- respuesta visual inmediata al presionar;
- transición interrumpible y sin rebote salvo que exista un gesto con impulso;
- precio de preventa destacado y precio de lanzamiento tachado;
- `Quedan X en preventa` solo cuando exista un cupo limitado;
- etiqueta textual `Preventa`, `Preventa agotada` o `Ya disponible`.

No se dependerá del hover para revelar información esencial.

## Tienda, búsqueda y ficha de producto

Los productos en preventa podrán aparecer en la tienda general y resultados de búsqueda. Allí mostrarán la etiqueta de preventa y los dos precios, pero no el contador completo.

La ficha de producto mostrará:

- estado de preventa;
- fecha y hora de lanzamiento;
- contador completo;
- precio de preventa y lanzamiento por la variación seleccionada;
- cupo restante cuando sea limitado;
- aviso de que la elaboración comienza después del lanzamiento;
- botón de compra deshabilitado si el cupo está agotado, aunque el contador continúe.

Al seleccionar una variación cambiarán juntos los dos precios. Si WooCommerce marca la variación sin stock y no permite backorders, la compra seguirá bloqueada aunque exista cupo de preventa.

## Contador y sincronización temporal

El frontend calculará un desfase entre `serverNow` y el reloj local. El contador avanzará usando ese desfase y no confiará directamente en la hora del dispositivo.

Al llegar a cero:

1. dejará de mostrar valores negativos;
2. volverá a consultar la campaña;
3. actualizará precio y estado;
4. moverá el producto a `Ya disponibles` cuando corresponda.

Los números visibles se actualizarán cada segundo con `font-variant-numeric: tabular-nums`. El texto accesible no será una región viva por segundo; anunciará hitos útiles y el lanzamiento final.

## Cupo, pedidos y reembolsos

El cupo limitado se reservará al crear el pedido, antes de aceptar una cantidad que exceda la disponibilidad. La reserva se conservará para estados pagados, en procesamiento, en espera o completados.

Antes del lanzamiento:

- `failed`, `cancelled` y pedidos pendientes expirados liberarán toda su reserva;
- un reembolso parcial liberará solo las unidades reembolsadas;
- un reembolso total liberará toda la reserva restante;
- cada liberación será idempotente.

Después del lanzamiento no se recalculará el cupo, porque ya no limita la venta.

Cada línea de pedido de preventa guardará y mostrará:

- `Preventa`;
- fecha y hora de lanzamiento;
- ID interno de campaña no visible al cliente;
- precio y cantidad reservados como instantánea.

Los correos al cliente y la vista administrativa del pedido mostrarán la condición de preventa y la fecha. Si un pedido contiene varios DROPS, el aviso general usará la fecha de lanzamiento más tardía.

## Carritos abiertos durante el lanzamiento

Un precio visto antes de la fecha no se garantiza después del vencimiento. Al recalcular carrito o checkout, WooCommerce resolverá el precio vigente según la hora del servidor.

Si el precio cambió, se actualizarán los totales y se mostrará un aviso claro antes del pago. El servidor nunca confiará en el precio almacenado en `localStorage` ni enviado por el navegador.

## Internacionalización

La interfaz pública añadirá claves españolas e inglesas al sistema actual de idiomas para:

- navegación;
- títulos y subtítulos;
- unidades del contador;
- estados y cupo;
- avisos de preventa y carrito mixto;
- errores y estados vacíos.

Los nombres y descripciones de producto seguirán procediendo de WooCommerce tal como ocurre actualmente.

## Accesibilidad y movimiento

- Contraste mínimo de 4.5:1 para texto normal.
- Objetivos táctiles de al menos 44 por 44 píxeles.
- Foco visible en enlace DROPS, tarjetas enlazadas y acciones.
- La información no dependerá únicamente de color o animación.
- Las cifras del contador no producirán desplazamientos visuales.
- `prefers-reduced-motion` eliminará desplazamientos y animará solo mediante cambios estáticos o fundidos breves.
- `prefers-reduced-transparency` sustituirá el vidrio del contador por una superficie oscura casi sólida.
- `prefers-contrast: more` añadirá separación y bordes más definidos.

## Errores y recuperación

- **Cron retrasado:** filtros y reconciliación aplican el precio correcto en la primera interacción posterior.
- **Transición parcial:** la campaña queda en `launching` o `error`, conserva un registro del paso fallido y se puede reintentar sin repetir pasos completados.
- **API caída:** el frontend conserva la última fecha conocida, muestra un estado de actualización y no inventa cupo ni precio. WooCommerce sigue validando el cobro.
- **Pestaña antigua:** carrito y checkout sustituyen el precio vencido e informan antes del pago.
- **Producto eliminado o despublicado:** la campaña deja de exponerse y el panel solicita cancelar o reparar la selección.
- **Cupo agotado simultáneamente:** solo la reserva atómica confirmada continúa; el otro checkout recibe un mensaje de disponibilidad.
- **Variación nueva sin precios:** no se vende como preventa hasta configurarla.
- **Categoría modificada manualmente durante la campaña:** el panel lo advierte y la reconciliación restaura `DROPS` mientras la campaña siga activa.

## Seguridad

- Acciones administrativas protegidas con `manage_woocommerce` y nonces.
- Saneamiento y escape de IDs, fechas, importes y estados.
- Consultas preparadas para tablas propias.
- Endpoints públicos de solo lectura sin metadatos internos.
- El servidor vuelve a resolver campaña, fecha, precio, stock y cupo en cada operación crítica.
- Ningún valor comercial enviado por el cliente se considera autorizado.

## Pruebas

### Plugin

- creación y migración de tablas;
- validación de producto simple y variable;
- llenado general y sobrescritura por variación;
- rechazo de precios o fechas inválidos;
- programación y cancelación con restauración de instantáneas;
- escritura de precios de preventa y lanzamiento;
- conservación de categorías ajenas y sustitución `DROPS` → `Ya disponible`;
- idempotencia de lanzamiento y reintentos;
- reconciliación cuando el cron no se ejecuta;
- contrato REST, permisos y ausencia de datos sensibles.

### Cupo y pedidos

- cupo ilimitado;
- cupo limitado y límite exacto;
- dos reservas concurrentes para la última unidad;
- bloqueo al agotarse;
- liberación por fallo, cancelación y expiración;
- reembolso parcial y total sin devoluciones dobles;
- liberación solo antes del lanzamiento;
- metadatos de línea y correo;
- fecha más tardía en pedidos con varios DROPS.

### Frontend

- cálculo con desfase del servidor;
- días, horas, minutos y segundos;
- transición exacta a cero;
- posición overlay y debajo;
- precio por variación;
- estados de preventa, agotada y disponible;
- cupo visible solo cuando es limitado;
- tienda general sin contador completo;
- aviso de carrito mixto;
- español e inglés;
- fallos de red y datos incompletos.

### Verificación visual y de accesibilidad

- anchos de 375, 768, 1024 y 1440 píxeles;
- cabecera existente con el nuevo enlace sin desbordes;
- navegación por teclado y foco visible;
- contraste claro y oscuro;
- movimiento, transparencia y contraste reducidos;
- contador estable sin cambios de ancho;
- toque y presión inmediata en tarjetas y enlace.

### Comandos de entrega

- pruebas PHP existentes y nuevas;
- `php -l` para todos los archivos del plugin;
- `npm test`;
- `npm run lint`;
- `npm run build`;
- actualización del grafo mediante `graphify update .` después de implementar.

## Criterios de aceptación

1. Un administrador puede programar un producto simple o variable sin editar código.
2. El producto recibe precios de preventa y categoría `DROPS` al programarse.
3. `/drops/` muestra el contador, los dos precios, la disponibilidad y el aviso de preventa.
4. Una compra de preventa cobra el precio configurado y queda identificada en pedido y correo.
5. El cupo global no puede superarse ni siquiera con compras simultáneas.
6. Cancelaciones, fallos y reembolsos previos restituyen las unidades correctas.
7. En la fecha exacta, ningún checkout acepta el precio vencido.
8. El lanzamiento escribe permanentemente los precios finales, libera el cupo y cambia solo `DROPS` por `Ya disponible`.
9. El producto liberado aparece en la sección `Ya disponibles` hasta que se cambie manualmente de categoría.
10. La tienda general y la ficha muestran estados coherentes con la campaña.
11. La cabecera conserva su diseño actual y el nuevo enlace DROPS contiene la animación completa de fuego.
12. La experiencia funciona en español e inglés, móvil y escritorio, con preferencias de accesibilidad respetadas.
