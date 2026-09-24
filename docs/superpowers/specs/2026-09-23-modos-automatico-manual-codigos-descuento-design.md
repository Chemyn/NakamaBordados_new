# Modos automático y manual para códigos de Nakama Descuentos

**Fecha:** 23 de septiembre de 2026  
**Estado:** Diseño aprobado  
**Ámbito:** `nakama-discounts`, checkout headless, puente de carrito y checkout WooCommerce

## Relación con el diseño anterior

Este documento amplía y corrige el diseño de códigos públicos aprobado el 18 de septiembre de 2026. En particular, sustituye la regla que reservaba el campo manual exclusivamente para cupones de recuperación de carrito. El resto de las decisiones del diseño original continúa vigente cuando no contradiga lo especificado aquí.

Los códigos administrados por Nakama podrán configurarse con uno de dos modos de entrada mutuamente excluyentes:

- **Automático:** aparece entre las promociones disponibles sin que el cliente conozca ni escriba el código.
- **Manual:** permanece oculto hasta que el cliente escriba el código correcto en el campo promocional existente.

En todo momento seguirá existiendo una sola promoción principal aplicada al pedido.

## Objetivos

- Permitir que administración elija de forma obligatoria y exclusiva si cada código Nakama es automático o manual.
- Reutilizar el campo actual del checkout headless para códigos Nakama manuales y cupones nativos de recuperación de carrito.
- No revelar códigos Nakama manuales antes de que el cliente introduzca uno válido.
- Permitir que el cliente compare un código manual compatible con las demás promociones principales disponibles y elija la que más le convenga.
- Aplicar inmediatamente un código manual no compatible, mostrarlo como única promoción principal y desactivar los beneficios complementarios.
- Mantener a WooCommerce y al motor de Nakama como autoridades del cálculo y de la vigencia.
- Evitar acumulaciones, colisiones ambiguas y descuentos construidos o autorizados por el navegador.

## Fuera de alcance

- Acumular dos promociones principales.
- Mostrar un catálogo de códigos configurados como manuales.
- Cambiar los límites de uso, segmentos, importes mínimos o productos elegibles de los códigos.
- Convertir un código Nakama en un `WC_Coupon`.
- Combinar un código Nakama con un descuento de afiliado.
- Rediseñar el programa de afiliados o el flujo que captura sus códigos.
- Estimar en el frontend el importe de un código Nakama manual antes de que el carrito WooCommerce sea reconstruido y recalculado.

## Modelo de configuración

Cada registro de código público añadirá el campo persistente `entry_mode` con uno de estos valores:

- `automatic`;
- `manual`.

El esquema de la colección subirá de versión. Durante la migración, todos los registros creados antes de este cambio recibirán `automatic`, preservando su comportamiento actual y evitando que desaparezcan del checkout después de actualizar.

El modo de entrada es independiente de `allow_modifiers`:

- `entry_mode` decide cómo descubre y habilita el cliente el código.
- `allow_modifiers` decide si la promoción aplicada conserva transferencia, envío gratis promocional y MSI.

No se aceptarán registros con un modo vacío o desconocido. La normalización del código, unicidad, porcentaje, vigencia y demás validaciones existentes seguirán aplicándose.

## Configurador administrativo

El formulario de alta y edición mostrará el grupo requerido **¿Cómo podrá usarlo el cliente?** con dos radios:

- **Mostrar automáticamente:** el descuento aparece directamente entre las opciones disponibles.
- **Ingresar código manualmente:** el descuento solo aparece después de validar el código en el campo promocional.

Los radios compartirán el mismo nombre de campo, por lo que el navegador y el servidor solo podrán recibir una opción efectiva. No se representarán como casillas independientes.

### Validaciones

Al crear o actualizar un código, el servidor rechazará la operación si falta cualquiera de estos datos obligatorios:

- código;
- porcentaje válido;
- modo de entrada válido.

También se conservarán las validaciones de unicidad y coherencia de fechas. Los errores se mostrarán junto al campo correspondiente, mantendrán los valores introducidos y moverán el foco al primer error. Pulsar **Cancelar** abandonará la edición sin guardar; retirar un código seguirá requiriendo confirmación.

El listado y la tarjeta de edición mostrarán el modo mediante texto —**Automático** o **Manual**— sin depender únicamente del color o de un icono.

## Campo promocional unificado

El componente actualmente presentado como “¿Tienes otro código?” se reutilizará. Su función dejará de estar descrita únicamente como recuperación de carrito y pasará a comunicar que acepta un **código promocional**.

El mismo control podrá resolver:

1. un código Nakama configurado como manual;
2. un cupón nativo de WooCommerce, incluido el enviado para recuperar un carrito abandonado.

Los códigos Nakama configurados como automáticos no se aceptarán al escribirlos: ya estarán disponibles como opciones visibles. La respuesta explicará que el cliente puede elegirlos en el bloque de promociones, sin desbloquear un segundo ejemplar ni alterar la selección.

El formulario tendrá etiqueta visible, texto de ayuda, estado de carga, error en línea, `aria-invalid`, anuncio accesible del resultado y foco visible. No mostrará un estado aplicado antes de recibir confirmación del servidor.

## Resolución en el servidor

El endpoint `nakama/v1/check-coupon` evolucionará de una validación exclusiva de `WC_Coupon` a un resolutor tipado. Recibirá únicamente el código; no confiará en porcentajes, importes, compatibilidad ni tipo enviados por el navegador.

El orden de resolución será:

1. normalizar el código;
2. buscar una coincidencia entre códigos Nakama;
3. validar que sea manual, esté habilitado y se encuentre vigente;
4. si no existe una coincidencia Nakama utilizable, consultar el cupón nativo de WooCommerce;
5. devolver un resultado tipado y mínimo.

Una respuesta válida indicará una de estas clases:

- `nakama_manual`: código Nakama manual reconocido;
- `native_coupon`: cupón nativo reconocido.

Para `nakama_manual`, la respuesta incluirá el código normalizado, la clave estable de selección y si permite beneficios complementarios. No devolverá listados de códigos ocultos. Para `native_coupon`, conservará los datos que el frontend necesita para mostrar su estimación actual, sujetos a la revalidación final de WooCommerce.

Un código Nakama inactivo, programado para el futuro, expirado o retirado devolverá un error claro y no dejará una promoción anterior parcialmente activa. Un código automático escrito manualmente devolverá una respuesta específica que dirija al grupo visible de promociones.

### Colisiones de código

Si el mismo texto identifica simultáneamente un código Nakama manual y un cupón nativo de WooCommerce, el endpoint lo rechazará como ambiguo. No elegirá silenciosamente un proveedor. Administración deberá cambiar uno de los códigos antes de que pueda utilizarse.

La validación de unicidad de Nakama seguirá cubriendo su propia colección. La comprobación cruzada con WooCommerce se realizará al guardar cuando sea posible y siempre al resolver, porque los cupones nativos pueden crearse o modificarse fuera del plugin.

## Estado del checkout headless

El frontend conservará el tipo resuelto, no solo el texto del código. Un código Nakama manual no utilizará el cálculo local de cupones nativos ni inventará un ahorro antes del checkout final.

Al validar un `nakama_manual`:

- se elimina del estado local cualquier cupón nativo;
- se elimina cualquier código o referencia de afiliado activa;
- se guarda únicamente la intención tipada necesaria para el puente;
- se informa que el código fue reconocido y que las promociones se recalcularán en el checkout.

Al validar un `native_coupon` se conserva el comportamiento de estimación existente y se limpian las otras intenciones que ocupen la promoción principal. Solo podrá existir un código escrito vigente en el estado del campo: introducir y validar otro sustituirá el anterior.

El resumen del carrito distinguirá ambos resultados, permitirá retirar el código y no prometerá un importe Nakama que el servidor todavía no haya calculado. Vaciar el carrito o retirar el código limpiará también su tipo y cualquier estado persistido asociado.

## Transferencia mediante el puente

Aunque el cliente utilice un único campo visual, el puente recibirá parámetros distintos según el resultado validado:

- `coupon` para cupones nativos;
- `nakama_code` para códigos Nakama manuales;
- `affiliate_code` para el flujo independiente de afiliados.

El navegador nunca escogerá estos parámetros por el formato del texto; usará el tipo devuelto por el servidor. El puente reconstruirá primero el carrito y volverá a validar la intención recibida.

La resolución seguirá una única ranura promocional. Solo se procesará una intención principal por transferencia. El estado tipado del frontend impedirá generar más de una y el servidor aplicará una precedencia defensiva explícita: `nakama_code`, luego `affiliate_code`, luego `coupon`. Si recibe parámetros incompatibles, retirará las promociones previamente aplicadas antes de procesar la intención ganadora y podrá registrar el conflicto sin exponer datos sensibles.

Una validación headless exitosa no autoriza por sí sola el descuento. Si el código cambia de estado, porcentaje, vigencia o deja de existir antes de llegar al checkout, la revalidación del puente prevalece, no aplica el descuento y muestra un aviso.

## Sesión y visibilidad de promociones

Tras revalidar un código Nakama manual, el servidor guardará en la sesión WooCommerce el identificador estable desbloqueado, no el porcentaje recibido desde el cliente. El motor resolverá nuevamente el registro en cada cálculo.

La visibilidad se comportará así:

### Código automático

- aparece entre las promociones principales cuando está vigente y es elegible;
- no necesita estado de desbloqueo;
- puede ser elegido o sustituido igual que las opciones actuales.

### Código manual compatible

- permanece oculto hasta ser validado;
- después de validarlo aparece junto a las promociones automáticas, fidelidad, campañas y 3x2 que sean elegibles;
- el código queda seleccionado inicialmente para respetar la acción explícita del cliente;
- el cliente puede cambiar a otra promoción principal si ofrece mayor ahorro;
- únicamente la opción seleccionada aplica descuento;
- conserva beneficios complementarios solo mientras siga seleccionado.

### Código manual no compatible

- permanece oculto hasta ser validado;
- se selecciona automáticamente al validarlo;
- se muestra como la única promoción principal disponible mientras continúe aplicado;
- desactiva transferencia promocional, envío gratis promocional y MSI;
- no muestra botones alternativos que sugieran una combinación inexistente.

El estado de desbloqueo solo será válido para la sesión WooCommerce actual y solo conservará el último código Nakama manual validado. No revelará otros códigos manuales. Elegir otra opción Nakama automática no lo bloqueará ni lo ocultará: seguirá disponible para que el cliente pueda volver a compararlo. Se limpiará al retirar el código desde el campo, validar otro código escrito, sustituirlo mediante el flujo de afiliados, vaciar el carrito, cerrar el pedido o cuando el registro deje de ser utilizable.

## Exclusividad e interacción con otras promociones

La regla de dominio permanece: un pedido tiene como máximo una promoción principal.

- Elegir una promoción automática después de desbloquear un manual compatible sustituye al manual; no suma ambos porcentajes.
- Aplicar un cupón nativo limpia la selección y el desbloqueo Nakama.
- Aplicar un código Nakama manual elimina los cupones nativos.
- Un código Nakama no compatible oculta y sustituye fidelidad, campañas, 3x2 y demás códigos públicos.
- La compatibilidad de un código solo permite beneficios complementarios; nunca permite dos promociones principales.

### Afiliados

Los descuentos de afiliado ya ocupan la misma ranura promocional y son no acumulables. Al introducir un código Nakama manual se retirará el descuento y la atribución de afiliado activos, de la misma manera en que actualmente un cupón nativo sustituye el código de afiliado. Si después el cliente introduce un código de afiliado válido en su flujo específico, este sustituirá y bloqueará la promoción Nakama.

No se conservará una comisión de afiliado cuando el cliente ha sustituido expresamente esa promoción por un código Nakama, porque produciría una atribución financiera sin el descuento asociado. Los pedidos históricos conservarán sus fotografías y no se modificarán.

## Aplicación y cálculo

El motor seguirá calculando cada candidato sobre el subtotal elegible y excluyendo los productos que ya excluye el diseño original. La clave primaria de un código manual será la misma que tendría en modo automático, basada en su identificador estable.

Después de desbloquear un manual compatible, la elección recomendada por defecto será el código que el cliente acaba de introducir, aunque exista una promoción automática con mayor ahorro. La interfaz mostrará los importes recalculados para que el cliente pueda cambiar conscientemente. Esto evita que una acción explícita parezca ignorada.

Para un manual no compatible, la aplicación será automática y no requerirá un segundo clic. WooCommerce recalculará inmediatamente el descuento y los modificadores.

Cambiar el modo de un código durante una sesión se resolverá en el siguiente cálculo:

- de manual a automático: deja de depender del desbloqueo y entra al conjunto visible ordinario;
- de automático a manual: desaparece de las opciones hasta que vuelva a introducirse;
- si era la selección activa y ya no cumple el flujo permitido, se limpia y se avisa al cliente.

## Pedido y trazabilidad

La instantánea ya prevista para promociones Nakama añadirá el modo de entrada efectivo:

- tipo de promoción;
- identificador interno;
- código normalizado;
- porcentaje;
- ahorro monetario;
- permiso de beneficios complementarios;
- `entry_mode` con valor `automatic` o `manual`.

El pedido guardará únicamente la promoción que finalmente fue aplicada. Introducir un código y cambiar después a otra opción no dejará el código anterior como descuento ni como atribución financiera.

## Seguridad y manejo de errores

- Toda decisión de existencia, vigencia, porcentaje y compatibilidad se repite en el servidor.
- La respuesta no enumerará códigos manuales ni distinguirá de forma innecesaria entre “no existe” y datos internos sensibles.
- Los códigos se normalizarán y escaparán en administración, REST, avisos, checkout y metadatos.
- Una clave de selección o identificador manipulado no desbloqueará un código manual.
- Un fallo de red mantendrá la última selección confirmada por el servidor y permitirá reintentar sin duplicar descuentos.
- La sesión no conservará un código retirado, vencido o deshabilitado.
- El formulario administrativo no guardará parcialmente un código si falta el modo, código o porcentaje.

## Pruebas

### Configuración y migración

- el modo es obligatorio y solo acepta `automatic` o `manual`;
- los radios no permiten seleccionar ambos modos;
- los registros antiguos migran a `automatic`;
- alta, edición, cancelación, activación y retirada preservan sus validaciones;
- porcentaje, código o modo ausentes muestran un error específico y no guardan;
- el listado muestra el modo en texto.

### Resolutor

- reconoce un código Nakama manual vigente;
- rechaza Nakama automático introducido en el campo;
- rechaza manual inactivo, futuro, expirado o retirado;
- resuelve un cupón nativo de recuperación de carrito;
- rechaza colisiones entre Nakama manual y cupón nativo;
- no expone otros códigos manuales.

### Motor y sesión

- los automáticos siguen visibles sin escribir un código;
- los manuales no aparecen antes de validarse;
- un manual compatible se desbloquea, queda seleccionado y muestra las demás alternativas;
- cambiar desde un manual compatible deja una sola promoción aplicada;
- un manual compatible permanece visible al elegir otra opción automática durante la misma sesión;
- un manual no compatible se aplica automáticamente y oculta alternativas;
- los modificadores se conservan o desactivan según `allow_modifiers`;
- retirar, sustituir, expirar o desactivar limpia selección y desbloqueo;
- manipular la sesión o la clave pública no habilita un manual;
- el pedido guarda únicamente la selección final y su modo.

### Puente y frontend

- el campo distingue `nakama_manual` de `native_coupon` usando la respuesta del servidor;
- `nakama_code` y `coupon` nunca viajan simultáneamente desde el estado válido;
- el puente revalida el código después de reconstruir el carrito;
- un cambio de vigencia entre validación y checkout impide la aplicación;
- el frontend no calcula localmente un descuento Nakama manual;
- retirar y vaciar limpian estado y almacenamiento local;
- carga, éxito y error se anuncian de forma accesible;
- el foco vuelve a un punto útil después de aplicar o retirar.

### Regresiones e integraciones

- cupones de carrito abandonado continúan funcionando;
- fidelidad, campañas, 3x2, transferencia, envío gratis y MSI mantienen sus reglas;
- un Nakama manual sustituye código y atribución de afiliado;
- un código de afiliado posterior sustituye el Nakama manual;
- no se acumulan afiliado, cupón nativo y código Nakama;
- los totales del checkout y del pedido coinciden con WooCommerce;
- el ZIP instalable incluye la versión y el esquema actualizados.

## Criterios de aceptación

La funcionalidad se considera terminada cuando administración puede crear o editar un código y debe elegir exactamente un modo; los registros previos continúan como automáticos; un código manual no se revela antes de ser escrito; el mismo campo distingue con seguridad entre códigos Nakama manuales y cupones nativos; un manual compatible se aplica primero y permite comparar alternativas; un manual no compatible se aplica automáticamente como única promoción y elimina beneficios complementarios; y ningún flujo permite aplicar más de una promoción principal.

La prueba final debe confirmar que el descuento cobrado, los beneficios complementarios, la relación con afiliados y la fotografía del pedido corresponden a la decisión final validada por WooCommerce, incluso si el código cambia de estado entre el carrito headless y el checkout.
