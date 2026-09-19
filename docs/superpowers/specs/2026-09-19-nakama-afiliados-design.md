# Nakama Afiliados: atribución, comisiones y programa mensual de prendas

**Fecha:** 19 de septiembre de 2026
**Estado:** Diseño aprobado
**Ámbito:** nuevo plugin `nakama-affiliates`, integración con `nakama-discounts`, WooCommerce y frontend Next.js

## Contexto

Nakama Bordados usa WooCommerce como autoridad de catálogo, carrito, cobro, pedidos y devoluciones. El frontend Next.js se exporta como sitio estático y consume contratos REST propios autenticados con el JWT de WordPress.

El repositorio conserva una pestaña preliminar de comisiones en `Mi Cuenta`, pero no constituye un sistema de afiliados: depende de un campo que ya no se consulta, muestra un importe fijo y no vincula usuarios, códigos, pedidos, devoluciones, cierres, pagos ni beneficios.

El nuevo sistema permitirá autorizar afiliados de forma individual, asignarles un código de descuento, atribuir ventas, calcular una comisión auditable, registrar pagos mensuales y operar un programa de prendas condicionado por ventas y evidencia de publicaciones.

## Objetivos

- Asignar los permisos de afiliado y afiliado VIP desde el perfil del usuario, siguiendo el patrón de Producción y Almacén.
- Crear un código individual de descuento de hasta 10%, no acumulable con ninguna otra promoción.
- Dar a cada afiliado un enlace personal que conserve la atribución durante 30 días.
- Calcular una comisión del 10% sobre el subtotal de productos antes del descuento, sin envío ni impuestos.
- Ajustar la comisión ante devoluciones parciales o totales sin reescribir meses cerrados.
- Exigir una Constancia de Situación Fiscal aprobada antes de mostrar el dashboard financiero.
- Mostrar ventas atribuidas, comisión bruta, ajustes, retenciones capturadas manualmente, neto y pagos.
- Permitir que administración registre fecha, referencia y comprobante privado del pago.
- Conceder uno, dos o tres productos al mes según las ventas válidas del periodo anterior.
- Excluir Drops y Edición especial salvo para afiliados VIP autorizados manualmente.
- Exigir por entrega mensual dos reels y una historia que etiqueten las cuentas oficiales de Nakama Bordados.
- Admitir una cuarta publicación opcional como mérito para priorizar una selección Drop, sin garantizarla.
- Mantener toda decisión financiera y administrativa en un historial auditable.

## Fuera de alcance

- Timbrado o cancelación automática de CFDI.
- Almacenamiento de CSD, e.firma, llaves privadas o contraseñas fiscales.
- Cálculo automático de tasas de ISR, IVA u otras retenciones.
- Dispersión bancaria automática.
- Validación automática del contenido de Instagram o de las etiquetas mencionadas.
- Scraping de redes sociales.
- Acceso del afiliado a datos personales de los compradores.
- Conversión automática de un afiliado en VIP por antigüedad o rendimiento.
- Garantía automática de una prenda Drop por enviar una publicación bonus.
- Modificación retroactiva de cierres mensuales.

La facturación y las retenciones automáticas se reconsiderarán después de recibir instrucciones de un contador profesional.

## Decisiones aprobadas

- Se construirá un plugin independiente llamado **Nakama Afiliados**.
- WooCommerce será la fuente definitiva de pedidos, productos, variaciones, pagos y devoluciones.
- `nakama-discounts` conservará la autoridad sobre la aplicación y exclusividad de descuentos.
- Next.js representará la experiencia del afiliado, pero no calculará ni autorizará importes.
- El permiso principal será individual y se asignará como los permisos de Producción y Almacén.
- VIP será un permiso manual separado.
- El código se sugerirá a partir del nombre o usuario, podrá editarse antes de activarse y deberá ser único.
- El código usará mayúsculas, letras, números, guion o guion bajo, con máximo de 24 caracteres.
- El descuento del afiliado será configurable por perfil, mayor que 0 y con tope de 10%; el valor sugerido inicial será 10%.
- El descuento no será acumulable con promociones primarias ni modificadores complementarios.
- El afiliado ganará 10% sobre el subtotal previo al descuento, sin envío ni impuestos.
- Las metas usarán la misma base económica que la comisión, después de restar devoluciones.
- Pedidos en USD se convertirán a MXN con el tipo de cambio congelado al momento del pago.
- Todos los cierres, metas y pagos del programa se expresarán en MXN.
- Las ventas del mes determinan el cupo de productos del mes siguiente.
- El cupo se recalculará todos los meses y no se conservará si no se repite la meta.
- La primera solicitud estará disponible cuando la Constancia de Situación Fiscal sea aprobada.
- A partir de la segunda entrega, las evidencias de la entrega anterior deberán estar aprobadas.
- Las evidencias serán dos reels y una historia por entrega mensual, no por cada prenda incluida.
- Nakama cubrirá tanto los productos como su envío.
- No habrá límite de precio por producto; el límite será el número de unidades concedidas.
- La interfaz aprobada será **Centro de misión** con lenguaje visual **Manga impacto**.

## Arquitectura

El sistema tendrá cuatro responsabilidades claramente separadas:

1. **WooCommerce** conserva catálogo, variaciones, pedidos, cobro, moneda, impuestos, reembolsos y estado de pago.
2. **Nakama Discounts** valida y aplica el código de afiliado como una promoción exclusiva, y guarda la fotografía de atribución en el pedido.
3. **Nakama Afiliados** administra perfiles, documentos, libro de comisión, cierres, pagos, cupos, solicitudes y evidencias.
4. **Next.js** consume la API privada, muestra el dashboard y captura las acciones del afiliado sin convertirse en fuente financiera.

El frontend seguirá siendo compatible con la exportación estática. La página `/afiliados/` cargará el estado autenticado desde WordPress en el navegador, igual que los paneles existentes de Producción y Almacén.

## Estructura del plugin

El plugin se organizará por responsabilidades:

- `nakama-affiliates/nakama-affiliates.php`: arranque, activación, versión de esquema y carga de componentes.
- `includes/class-affiliates-installer.php`: tablas, migraciones y capacidades.
- `includes/class-affiliates-repository.php`: perfiles y consultas comunes.
- `includes/class-affiliates-admin.php`: navegación, formularios y acciones administrativas.
- `includes/class-affiliates-codes.php`: creación, normalización, unicidad y contrato con `nakama-discounts`.
- `includes/class-affiliates-attribution.php`: referencias, código manual y fotografía del pedido.
- `includes/class-affiliates-commissions.php`: movimientos de venta, devolución y ajuste.
- `includes/class-affiliates-closures.php`: cálculo y bloqueo de periodos mensuales.
- `includes/class-affiliates-documents.php`: archivos privados y revisión fiscal.
- `includes/class-affiliates-benefits.php`: metas, cupos y elegibilidad de catálogo.
- `includes/class-affiliates-evidence.php`: entregas, URLs y aprobación de contenido.
- `includes/class-affiliates-rest.php`: endpoints autenticados para frontend y administración.
- `assets/admin.css` y `assets/admin.js`: experiencia exclusiva del panel WordPress.

Las clases no dependerán del HTML de Next.js. Los cálculos de dinero utilizarán las utilidades decimales de WooCommerce y valores persistidos con precisión fija.

## Capacidades y acceso

Se añadirán dos capacidades individuales:

- `access_affiliate_dashboard`: permite entrar al programa y consultar datos propios.
- `affiliate_vip`: amplía el catálogo elegible a Drops y Edición especial.

El perfil de usuario de WordPress mostrará checkboxes para ambas capacidades. Conceder VIP concederá también el permiso principal. Retirar el permiso principal ocultará el acceso y denegará la página, pero no eliminará historial, movimientos ni cierres. La suspensión operativa será un estado separado: conservará el permiso y permitirá consultar el historial en modo de solo lectura, mientras bloquea código, evidencias y solicitudes nuevas.

Los administradores podrán consultar el panel completo. Los afiliados únicamente podrán consultar y modificar recursos asociados a su propio usuario. Ningún endpoint confiará en un identificador de afiliado enviado por el navegador sin compararlo con la identidad autenticada.

## Modelo de datos

Se usarán tablas propias para las operaciones financieras y de programa. Las opciones de WordPress se reservarán para configuración global.

### Perfiles de afiliado

La tabla de perfiles almacenará:

- identificador interno;
- `user_id` único;
- código único normalizado;
- estado `active`, `suspended` o `inactive`;
- porcentaje de descuento, mayor que 0 y limitado a 10%;
- porcentaje de comisión, fijado en 10% en esta versión;
- fecha de alta;
- identificador del documento fiscal vigente;
- estado fiscal `missing`, `pending`, `approved` o `rejected`;
- motivo y fecha de la última revisión;
- administrador que realizó la revisión;
- marcas de creación y actualización.

VIP se resolverá desde la capacidad individual para conservar el mismo patrón de permisos que el resto del proyecto.

### Movimientos de comisión

El libro de comisión almacenará eventos inmutables:

- afiliado;
- tipo `sale`, `refund`, `manual_adjustment` o `carryover`;
- clave de idempotencia única;
- pedido y, cuando corresponda, reembolso;
- moneda original;
- tipo de cambio a MXN congelado;
- subtotal elegible original;
- subtotal elegible en MXN;
- comisión firmada en MXN;
- periodo contable;
- estado `pending` o `closed`;
- descripción administrativa para ajustes manuales;
- autor y marcas temporales.

Los movimientos no se editarán. Una corrección se representará mediante un movimiento compensatorio.

### Cierres mensuales

Cada afiliado tendrá como máximo un cierre por mes calendario. El cierre guardará:

- periodo;
- ventas elegibles en MXN;
- devoluciones y ajustes;
- comisión bruta;
- ISR capturado manualmente;
- IVA capturado manualmente;
- otros ajustes manuales;
- pago neto;
- estado `pending`, `approved` o `paid`;
- fecha y administrador de aprobación;
- fecha, referencia y comprobante de pago;
- instantánea de reglas y totales;
- marcas temporales.

La combinación afiliado-periodo será única. Un cierre aprobado no podrá reabrirse desde la interfaz ordinaria.

### Beneficios y solicitudes

Los ciclos mensuales almacenarán:

- afiliado y periodo de disfrute;
- periodo de ventas que originó el beneficio;
- ventas válidas en MXN;
- unidades concedidas;
- unidades consumidas;
- estado de evidencias de la entrega previa;
- estado `locked`, `available`, `partially_used`, `used` o `expired`.

Las solicitudes almacenarán encabezado, dirección confirmada, estado operativo y una colección de productos o variaciones. Cada unidad elegida consumirá un cupo. El número de solicitudes no alterará el límite total del periodo.

### Evidencias

Cada entrega mensual tendrá una campaña de evidencias con:

- entrega o solicitud asociada;
- periodo;
- estado general;
- dos posiciones obligatorias de tipo `reel`;
- una posición obligatoria de tipo `story`;
- una posición opcional de tipo `bonus`;
- URL normalizada;
- estado `missing`, `pending`, `approved` o `rejected`;
- motivo, fecha y administrador de revisión.

No se descargarán ni copiarán contenidos de redes sociales. La revisión será manual y comprobará que la URL funcione y que la publicación etiquete las cuentas oficiales configuradas de Nakama Bordados.

### Auditoría

Una bitácora registrará cambios sensibles:

- concesión o retiro de capacidades;
- activación, suspensión o cambio de código;
- revisión de documentos;
- ajustes manuales;
- cierre y aprobación de periodos;
- captura de retenciones;
- registro o sustitución de comprobantes;
- aprobación o rechazo de evidencias;
- cambios de solicitudes y envíos.

Cada entrada incluirá actor, acción, entidad, identificador, fecha y una descripción segura sin secretos.

## Código y atribución

### Creación

Al activar un afiliado, el sistema sugerirá un código a partir de su nombre visible o usuario:

1. convertir a mayúsculas;
2. eliminar acentos;
3. reemplazar espacios por guiones;
4. retirar caracteres no permitidos;
5. limitar a 24 caracteres;
6. comprobar unicidad;
7. añadir un sufijo corto si ya existe;
8. permitir que administración lo edite y vuelva a validar antes de guardar.

### Aplicación manual

El carrito y checkout presentarán un campo específico para código de afiliado. Los códigos de afiliado no aparecerán como una lista pública de botones.

El servidor validará existencia, estado, permiso y vigencia. Un código válido sustituirá cualquier promoción primaria o cupón aplicado. Un código inválido no conservará una atribución anterior de forma silenciosa y mostrará un mensaje claro.

### Enlace personal

Cada afiliado recibirá una URL de la forma:

`https://nakamabordados.com/?ref=CODIGO`

El frontend validará la referencia con WordPress y conservará únicamente el código normalizado y su vencimiento durante 30 días. Al transferir el carrito al checkout de WooCommerce, enviará el código mediante el puente existente. WooCommerce volverá a validarlo y lo establecerá en su sesión.

El navegador nunca enviará porcentajes, importes ni identificadores de afiliado confiables. El código manual introducido posteriormente tendrá precedencia sobre la referencia guardada. Una referencia nueva y válida sustituirá la anterior.

### Exclusividad promocional

Los códigos de afiliado serán candidatos de promoción primaria con `allow_modifiers = false`. Al aplicarlos se retirarán:

- bienvenida o fidelidad;
- descuento especial;
- 3x2;
- otros códigos públicos;
- cupones nativos;
- descuento por transferencia;
- envío gratis promocional;
- beneficios promocionales de MSI.

Los métodos ordinarios de pago y envío seguirán disponibles; únicamente se desactivarán sus beneficios promocionales.

### Fotografía en el pedido

Al crear el pedido se guardará:

- identificador y usuario del afiliado;
- código aplicado;
- porcentaje de descuento;
- porcentaje de comisión;
- subtotal elegible previo al descuento;
- moneda y tipo de cambio;
- base equivalente en MXN;
- fecha de atribución;
- origen `manual` o `referral`.

Estos valores no cambiarán si el administrador modifica o suspende posteriormente el perfil.

## Comisión y devoluciones

Una venta creará comisión únicamente cuando el pedido alcance una condición pagada reconocida por WooCommerce. Los avisos repetidos usarán la misma clave de idempotencia y no duplicarán movimientos.

La base será la suma del subtotal de productos antes del descuento y antes de impuestos. Se excluirán envío, tarifas ajenas al producto, impuestos y productos gratuitos del programa de afiliados.

La comisión se calculará así:

`comisión MXN = subtotal elegible original × tipo de cambio a MXN × 10%`

El tipo de cambio se congelará al pagarse el pedido. No se recalculará con tasas posteriores.

### Reembolsos

- Un reembolso total revertirá toda la base elegible y su comisión.
- Un reembolso parcial con líneas identificadas revertirá el subtotal previo al descuento de las unidades devueltas.
- Un reembolso exclusivo de envío no afectará la comisión.
- Un reembolso monetario sin líneas suficientes para determinar productos quedará marcado para revisión administrativa; no se inventará una distribución automática.
- Antes del cierre, el ajuste permanecerá en el periodo original.
- Después del cierre, el ajuste negativo se asignará al siguiente periodo abierto.
- Ningún ajuste reescribirá el cierre histórico que el afiliado ya consultó o cobró.

Cancelaciones o contracargos de pedidos pagados seguirán el mismo mecanismo de reversión.

## Cierre y pago mensual

Los periodos usarán meses calendario en la zona horaria de WordPress.

El cierre reunirá los movimientos pendientes del afiliado y periodo. Antes de confirmarlo mostrará ventas, devoluciones, ajustes y comisión bruta. La acción requerirá confirmación explícita.

Después del cierre:

1. administración capturará manualmente ISR, IVA y otros ajustes conforme a las instrucciones vigentes del contador;
2. cada importe exigirá autor, fecha y motivo;
3. el sistema calculará `neto = comisión bruta - ISR - IVA + otros ajustes firmados`;
4. administración aprobará el cierre;
5. al efectuar el pago registrará fecha, referencia y comprobante privado;
6. el afiliado verá el periodo como pagado y podrá descargar el comprobante.

El sistema no sugerirá tasas fiscales ni interpretará automáticamente el régimen del afiliado en esta versión.

## Expediente fiscal

La Constancia de Situación Fiscal será obligatoria para habilitar el dashboard financiero.

Estados:

- `missing`: solo se muestra la carga del documento;
- `pending`: se muestra la fecha de recepción y la opción de reemplazarlo;
- `rejected`: se muestra el motivo y una acción para corregir;
- `approved`: se habilita el dashboard completo.

Solo se aceptarán PDF con tamaño máximo configurable. El servidor comprobará extensión, tipo MIME y firma del archivo, asignará un nombre interno aleatorio y lo guardará fuera de rutas públicas. La descarga requerirá autenticación y autorización en cada petición.

Reemplazar una constancia conservará el historial de revisión, pero únicamente la versión vigente podrá descargarse desde la operación ordinaria.

## Programa mensual de prendas

Las ventas válidas del mes cerrado determinarán el cupo del siguiente mes:

- menos de $10,000 MXN: 1 producto;
- desde $10,000 MXN y menos de $30,000 MXN: 2 productos;
- desde $30,000 MXN: 3 productos.

El cupo se recalculará cada mes. Alcanzar dos o tres prendas en un periodo no garantiza conservar ese nivel en el siguiente.

La primera solicitud se habilitará cuando administración apruebe la Constancia de Situación Fiscal. Las solicitudes posteriores requerirán que las evidencias de la entrega mensual anterior estén aprobadas.

Cada unidad podrá ser cualquier producto o variación disponible, sin límite de precio. Para afiliados ordinarios se excluirán productos pertenecientes a las categorías configuradas como Drops y Edición especial. Los VIP podrán elegirlas cuando estén disponibles, pero administración conservará la decisión operativa final y el stock de WooCommerce seguirá siendo obligatorio.

La solicitud permitirá confirmar la dirección de envío. Nakama cubrirá el producto y el costo del envío. Se generará un registro operativo separado de las ventas comerciales para que una prenda gratuita nunca genere comisión, ventas atribuibles ni progreso de metas.

## Evidencias y motivación

Cada entrega mensual, independientemente de que contenga una, dos o tres prendas, exigirá:

- Reel 1;
- Reel 2;
- una historia;
- una publicación bonus opcional.

El afiliado capturará las URLs. La interfaz recordará que cada publicación debe etiquetar las cuentas oficiales configuradas de Nakama Bordados e incentivar el uso de su código.

Administración abrirá cada URL y aprobará o rechazará manualmente. El rechazo exigirá un motivo. Las tres evidencias obligatorias deberán aprobarse para desbloquear una solicitud posterior.

La publicación bonus no será necesaria para continuar. Servirá como señal visible en el panel administrativo para priorizar una posible prenda Drop. No concederá automáticamente VIP ni modificará el cupo mensual.

## Experiencia del afiliado

### Acceso desde Mi Cuenta

Cuando el usuario tenga `access_affiliate_dashboard`, la sección “Accesos de trabajo” mostrará `Panel de Afiliados`. El enlace llevará a `/afiliados/`.

La página manejará estados de carga, sesión ausente, permiso denegado, expediente incompleto, revisión pendiente, rechazo, suspensión y dashboard activo. Ningún error de red se interpretará como permiso concedido.

### Dashboard aprobado

La estructura será **Centro de misión**:

- código y enlace personal con acciones para copiar;
- ventas válidas del periodo;
- comisión bruta;
- estado del cierre o pago;
- barra de progreso con marcadores textuales en $10,000 y $30,000;
- prendas desbloqueadas para el siguiente mes;
- siguiente evidencia o acción pendiente;
- producto mensual y estado de envío;
- tarjeta de publicación bonus;
- accesos a ventas, pagos, prendas y evidencias.

El historial de ventas mostrará una referencia segura, fecha, subtotal elegible, comisión y estado. No expondrá nombre, correo, teléfono, dirección, productos sensibles ni notas privadas del comprador.

### Lenguaje visual

El estilo aprobado será **Manga impacto**:

- fondo marfil con trama controlada;
- bordes negros gruesos;
- sombras sólidas de desplazamiento corto;
- rojo para acciones y estados prioritarios;
- amarillo para progreso, metas y recompensas;
- tipografía de títulos enérgica y cifras financieras limpias;
- iconos SVG o del sistema existente, sin emojis decorativos;
- decoración reducida en tablas y bloques de dinero.

Las interacciones responderán desde la pulsación, usarán transiciones breves en `transform` y `opacity`, serán interrumpibles y no bloquearán controles durante el movimiento. `prefers-reduced-motion` sustituirá desplazamientos por cambios estáticos o fundidos breves.

Todos los controles tendrán área táctil mínima de 44 × 44 px, foco visible, etiquetas persistentes, validación junto al campo y resúmenes de error enfocables. La barra de progreso incluirá cifras y texto; el color nunca será la única señal.

## Panel administrativo

WordPress añadirá el menú **Nakama Afiliados** con las siguientes vistas:

### Resumen

- afiliados activos y suspendidos;
- documentos pendientes;
- cierres pendientes de aprobación o pago;
- solicitudes de producto pendientes;
- evidencias pendientes;
- errores operativos que requieren revisión.

### Afiliados

- búsqueda por nombre, correo o código;
- estado, VIP, fecha de alta y estado fiscal;
- ventas y nivel del periodo;
- edición del código con validación de unicidad;
- suspensión sin pérdida de historial.

Los checkboxes de acceso y VIP también estarán disponibles en el perfil estándar del usuario.

### Documentos fiscales

- cola de pendientes;
- visor o descarga privada;
- aprobar o rechazar;
- motivo obligatorio al rechazar;
- historial de versiones y revisores.

### Ventas, cierres y pagos

- desglose por afiliado y periodo;
- movimientos de venta, devolución y ajuste;
- advertencias por reembolsos ambiguos;
- cierre irreversible con confirmación;
- captura manual de ISR, IVA y otros ajustes;
- aprobación y registro de pago;
- carga o sustitución del comprobante privado.

### Prendas

- cupo del periodo y fundamento de la meta;
- solicitudes y unidades elegidas;
- comprobación de categoría y stock;
- dirección confirmada;
- estado de preparación y envío;
- vínculo con la campaña de evidencias.

### Evidencias

- entrega y periodo;
- URLs obligatorias y bonus;
- acceso rápido a la publicación;
- recordatorio de cuentas oficiales;
- aprobar o rechazar con motivo;
- indicador de bonus para decisiones de prioridad.

### Configuración

- cuentas oficiales que deben etiquetarse;
- duración de atribución, fijada inicialmente en 30 días;
- categorías excluidas;
- tamaño máximo de documentos;
- textos de ayuda y contacto;
- versión de esquema y herramientas de reconciliación.

Los porcentajes máximos de descuento y comisión, así como los umbrales económicos aprobados, serán constantes del dominio en esta primera versión y no campos editables generales.

## Contrato REST

Los endpoints autenticados seguirán el patrón `nakama/v1/affiliates`.

### Afiliado

- `GET /access`: capacidades y estado general, sin datos sensibles.
- `GET /me`: perfil, código, enlace, expediente y resumen del periodo.
- `GET /me/sales`: movimientos propios paginados.
- `GET /me/closures`: cierres y pagos propios.
- `GET /me/benefits`: cupos y solicitudes propias.
- `POST /me/fiscal-document`: carga o reemplazo de constancia.
- `POST /me/product-requests`: creación o actualización permitida.
- `POST /me/evidence`: alta o reemplazo de URL.
- `GET /me/payment-proof/{id}`: descarga privada autorizada.

### Aplicación de código

- `POST /resolve-code`: valida un código sin revelar identidad ni métricas del afiliado.
- `POST /apply-code`: establece el código en la sesión WooCommerce y retira promociones incompatibles.

El puente del checkout podrá transportar el código de referencia para que WordPress lo valide y lo aplique al reconstruir el carrito.

### Administración

Las acciones administrativas usarán endpoints o formularios WordPress con capacidades de administración, nonce, validación y auditoría. Los endpoints nunca aceptarán importes calculados por el navegador como autoridad.

## Privacidad y seguridad

- Documentos y comprobantes permanecerán fuera de rutas públicas.
- Las descargas comprobarán usuario, capacidad y pertenencia en cada petición.
- No se incluirán secretos ni datos fiscales completos en logs.
- Las respuestas del afiliado no incluirán datos personales de compradores.
- Las URLs de evidencias se sanearán y solo admitirán `https`.
- Las cargas tendrán límites de tamaño y frecuencia.
- Los cambios administrativos usarán nonce y capacidades explícitas.
- Los eventos de pedido usarán claves de idempotencia y restricciones únicas.
- Las consultas financieras usarán parámetros preparados.
- Las tablas de administración escaparán todo contenido mostrado.
- Suspender un afiliado impedirá nuevas atribuciones, evidencias y solicitudes, pero conservará para el propio afiliado acceso de solo lectura a todo su historial financiero y de pagos.

## Errores y recuperación

- Si la comprobación de acceso falla, el frontend cerrará el panel de forma segura y ofrecerá reintento.
- Si un código ya no es válido, se retirará de la sesión y se informará al cliente antes de pagar.
- Si el evento de pago se repite, la restricción de idempotencia devolverá el movimiento existente.
- Si un reembolso no contiene detalle suficiente, se creará una alerta para revisión; no se adivinará la comisión.
- Si falla un cierre, la transacción completa se revertirá y el periodo seguirá abierto.
- Si falla una carga, el documento anterior continuará vigente.
- Si un producto deja de estar disponible antes de confirmar la solicitud, no consumirá cupo y se pedirá elegir otro.
- Si una evidencia deja de estar disponible, administración podrá rechazarla con motivo y el afiliado podrá sustituirla.
- Las tareas programadas tendrán una reconciliación manual idempotente desde administración.

## Migración del prototipo actual

La pestaña preliminar `Comisiones` de `Mi Cuenta` y el fragmento GraphQL basado en metadatos `apoyo_creador_*` dejarán de ser fuentes de verdad.

La nueva página sustituirá esa pestaña por un acceso dedicado. Cualquier dato histórico real encontrado en esos metadatos se migrará únicamente mediante una herramienta explícita de administración que muestre previsualización y requiera confirmación. El importe fijo de demostración no se migrará.

## Entregas

### Entrega 1: núcleo de afiliados

- plugin, tablas y capacidades;
- perfiles y códigos;
- enlace de referencia y atribución de 30 días;
- exclusividad de descuento;
- fotografía del pedido;
- movimientos de venta y devolución;
- Constancia de Situación Fiscal;
- acceso `/afiliados/` y dashboard financiero base.

### Entrega 2: operación mensual

- cierres de mes;
- devoluciones posteriores como arrastre;
- captura manual de retenciones y ajustes;
- aprobación y pago;
- comprobantes privados;
- historial para afiliado y administración.

### Entrega 3: programa de prendas

- cálculo mensual de cupos;
- selección de productos y variaciones;
- exclusiones y VIP;
- solicitud, dirección y seguimiento operativo;
- campañas de evidencias;
- bonus y prioridad administrativa.

Cada entrega deberá ser utilizable, migrable y verificable antes de comenzar la siguiente.

## Pruebas

### Dominio y persistencia

- creación y unicidad de códigos;
- rechazo de porcentajes mayores a 10%;
- comisión de 10% sobre subtotal previo al descuento;
- exclusión de envío e impuestos;
- conversión USD a MXN con tasa congelada;
- idempotencia de pago y reembolso;
- devoluciones parciales, totales y posteriores al cierre;
- invariantes de cierres y movimientos inmutables;
- cálculo de neto con capturas manuales.

### Descuentos y checkout

- código escrito manualmente;
- referencia por enlace durante 30 días;
- expiración de referencia;
- precedencia del código manual;
- sustitución de promociones primarias y complementarias;
- fotografía completa en el pedido;
- reconstrucción correcta mediante el puente headless.

### Permisos y privacidad

- afiliado sin acceso;
- afiliado, VIP y administrador;
- aislamiento entre afiliados;
- documentos y comprobantes no públicos;
- autorización de descargas;
- ausencia de datos personales de compradores.

### Programa de prendas

- un producto por debajo de $10,000;
- dos desde $10,000;
- tres desde $30,000;
- recálculo mensual sin conservar niveles anteriores;
- consumo por unidad;
- exclusión de Drops y Edición especial;
- acceso VIP sin aumentar cupo;
- envío gratuito operativo sin generar ventas ni comisión;
- bloqueo por evidencias incompletas;
- requisito único de dos reels y una historia por entrega mensual;
- bonus opcional sin concesión automática.

### Interfaz

- estados fiscal faltante, pendiente, rechazado y aprobado;
- carga, error y reintento;
- navegación por teclado y foco visible;
- validación junto al campo y resumen enfocable;
- barra de metas con texto accesible;
- anchos de 375, 768, 1024 y 1440 px;
- movimiento reducido;
- pruebas de componentes, lint y build de producción Next.js.

### Empaquetado

- actualización de versión y esquema del plugin;
- ZIP reproducible de `nakama-affiliates`;
- pruebas de activación y migración sobre una copia de datos;
- validación de compatibilidad con HPOS;
- prueba conjunta con `nakama-discounts` activo e inactivo.

## Criterios de aceptación

La funcionalidad se considerará completa cuando:

1. un administrador pueda conceder acceso, sugerir o editar un código único y marcar VIP;
2. el afiliado vea el botón de acceso y deba completar su expediente antes del dashboard;
3. un cliente pueda usar el código o enlace sin acumular otra promoción;
4. el pedido conserve una fotografía verificable de atribución y tipo de cambio;
5. una venta pagada produzca exactamente una comisión del 10% sobre la base aprobada;
6. las devoluciones se reflejen correctamente sin alterar cierres históricos;
7. el cierre mensual permita capturar retenciones, aprobar y registrar un pago manual;
8. el afiliado pueda consultar cifras e historial sin datos personales de compradores;
9. las ventas mensuales concedan uno, dos o tres productos para el siguiente mes;
10. las categorías restringidas se excluyan salvo permiso VIP;
11. cada entrega mensual requiera dos reels y una historia aprobados antes de la siguiente solicitud;
12. la publicación bonus sea visible para priorización sin crear un derecho automático;
13. Constancias y comprobantes permanezcan privados;
14. la interfaz aprobada funcione en móvil, escritorio, teclado y movimiento reducido;
15. todas las pruebas de dominio, integración, interfaz y empaquetado estén aprobadas.
