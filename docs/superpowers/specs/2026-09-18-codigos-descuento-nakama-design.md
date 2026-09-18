# Códigos públicos de descuento para Nakama Discounts

**Fecha:** 18 de septiembre de 2026  
**Estado:** Diseño aprobado  
**Ámbito:** Plugin `nakama-discounts`, checkout WooCommerce y puente desde el checkout headless

## Contexto

`nakama-discounts` calcula actualmente un plan de beneficios en el servidor. Las promociones de fidelidad, descuento especial y 3x2 forman un grupo primario mutuamente excluyente; transferencia, envío gratis y MSI actúan como beneficios complementarios. El cliente elige la promoción primaria mediante botones en el carrito y checkout de WooCommerce.

El checkout headless conserva, además, un campo manual que valida cupones nativos de WooCommerce y los transfiere al carrito final. Ese campo se reservará para los cupones enviados por el flujo de recuperación de carritos abandonados.

La nueva funcionalidad permitirá que los administradores creen códigos públicos porcentuales desde Nakama Descuentos. Estos códigos aparecerán como opciones visibles, no como cupones que el cliente deba escribir.

## Objetivos

- Permitir crear, editar, activar, desactivar y retirar códigos públicos porcentuales.
- Permitir vigencia indefinida o programada con fechas opcionales.
- Mostrar cada código vigente como una opción primaria junto a fidelidad, campañas y 3x2.
- Permitir al cliente comparar el ahorro monetario y elegir una sola alternativa.
- Configurar por código si conserva transferencia, envío gratis y MSI.
- Mantener el campo manual exclusivamente como entrada para cupones nativos de carritos abandonados.
- Garantizar que WooCommerce sea la autoridad del descuento realmente cobrado.
- Conservar en el pedido una instantánea auditable del beneficio elegido.

## Fuera de alcance

- Convertir los códigos Nakama en cupones nativos de WooCommerce.
- Aceptar códigos Nakama desde el campo manual.
- Detectar automáticamente qué proveedor creó un cupón de carrito abandonado. El contrato operativo es que el campo manual se utiliza para ese flujo, y técnicamente seguirá validando cupones nativos vigentes de WooCommerce.
- Descuentos fijos, límites de usos, segmentación por cliente, importe mínimo o selección de categorías por código.
- Generación aleatoria o envío automático de códigos.
- Un nuevo panel de informes; se guardarán los datos necesarios para informes futuros.

## Modelo conceptual

### Promoción primaria

Solo una promoción primaria puede afectar a un pedido:

- fidelidad o bienvenida;
- campaña porcentual especial;
- campaña 3x2;
- código público de Nakama;
- cupón nativo de carrito abandonado.

### Beneficios complementarios

Los beneficios complementarios existentes son:

- descuento por transferencia;
- envío gratis topado;
- meses sin intereses.

Un código público con combinación habilitada puede conservar esos tres beneficios. Un código público sin combinación los desactiva mientras sea la promoción primaria. En ningún caso un código público se acumula con otra promoción primaria.

### Subtotal elegible

Los códigos públicos respetarán la regla actual del motor: el porcentaje se calcula sobre el subtotal elegible y excluye los productos asignados directamente a la categoría `lisas`.

## Persistencia

Los códigos se guardarán en una opción propia, separada de `nakama_discounts_settings` y de los cupones de WooCommerce. La colección tendrá versión de esquema y cada elemento incluirá:

- identificador interno estable;
- código público normalizado en mayúsculas;
- porcentaje como tasa decimal;
- estado activo o inactivo;
- fecha inicial opcional;
- fecha final opcional;
- permiso para beneficios complementarios;
- fecha de creación y última actualización.

El identificador interno permitirá editar el texto visible sin romper una sesión ya iniciada. El código será único sin distinguir mayúsculas de minúsculas.

Las fechas se evaluarán en la zona horaria configurada en WordPress. El inicio comienza a las 00:00:00 y el fin incluye el día completo hasta las 23:59:59. Un límite vacío representa vigencia abierta por ese extremo.

## Administración

En **WooCommerce → Nakama Descuentos** se añadirá una sección **Códigos públicos**.

### Listado

Cada registro mostrará:

- código;
- porcentaje;
- estado textual: Activo ahora, Programado, Expirado o Inactivo;
- rango de vigencia;
- “Conserva beneficios complementarios” o “No acumulable”;
- acciones de edición, activación/desactivación y retirada.

El estado no dependerá únicamente del color. La retirada pedirá confirmación; los pedidos anteriores conservarán su instantánea aunque el registro deje de existir.

### Formulario

El formulario incluirá:

- código requerido;
- porcentaje requerido, mayor que 0 y hasta 100, con decimales permitidos;
- control activo/inactivo;
- inicio y fin opcionales;
- control “Permitir transferencia, envío gratis y MSI”.

El servidor validará capacidad `manage_woocommerce`, nonce, unicidad, rango porcentual y coherencia de fechas. Los errores aparecerán junto al campo correspondiente y no convertirán silenciosamente una entrada inválida.

## Motor de descuentos

Se introducirá un componente dedicado a almacenar, sanear y resolver la vigencia de los códigos públicos. El motor consumirá únicamente los códigos activos en el momento del cálculo.

Cada código vigente generará un candidato primario con:

- clave de selección basada en su identificador estable;
- código visible;
- tasa;
- ahorro calculado sobre el subtotal elegible;
- indicador de beneficios complementarios.

La selección seguirá estas reglas:

1. Si hay un cupón nativo aplicado, este ocupa el lugar de promoción primaria y no se añade ningún fee primario Nakama.
2. Si el cliente elige una opción Nakama, se retiran los cupones nativos aplicados antes de guardar la selección.
3. Si se aplica un cupón nativo, se limpia la selección Nakama de la sesión.
4. Si no existe una selección explícita, se conserva el comportamiento actual de fidelidad automática y de aplicación automática de la mejor promoción cuando dicha preferencia esté activa.
5. Un código seleccionado que ya no esté vigente o no exista deja de aplicarse. El servidor limpia la selección y muestra un aviso al cliente.

Para un cupón de carrito abandonado, el importe lo seguirá calculando WooCommerce. El contexto del motor incorporará el descuento nativo al calcular los totales posteriores y los umbrales de beneficios, evitando que la estimación ignore ese descuento.

Para un código público no acumulable, el plan devolverá transferencia no aplicada, envío gratis desactivado y cero MSI. Para uno acumulable, esos beneficios se resolverán con las reglas y umbrales actuales sobre el total ya descontado.

## Interacción en carrito y checkout

La interfaz conservará el patrón de botones existente y ampliará el grupo con los códigos públicos vigentes.

Cada opción mostrará:

- nombre o código;
- porcentaje cuando corresponda;
- ahorro monetario real para el carrito actual;
- condición de acumulación de los códigos públicos.

La opción aplicada tendrá un estado visual inequívoco y `aria-pressed="true"`. Los controles serán botones nativos, operables por teclado, con foco visible y una altura táctil mínima de 44 píxeles.

Al elegir una opción:

1. se bloquea temporalmente el grupo para impedir envíos dobles;
2. se solicita al servidor el cambio de promoción;
3. el servidor elimina cualquier cupón nativo, guarda la selección y recalcula;
4. WooCommerce actualiza totales, envío y métodos de pago;
5. el foco y el estado accesible permanecen en la opción elegida.

Si la petición falla, la interfaz restaura la selección anterior y presenta un error cercano al grupo. No mostrará una opción como activa antes de que el servidor la confirme.

### Campo manual del checkout headless

“¿Tienes otro código?” permanecerá plegado y explicará que sirve para el código recibido por recuperación de carrito abandonado. Tendrá etiqueta visible, validación en línea y estado de carga.

El endpoint manual continuará consultando exclusivamente cupones nativos de WooCommerce. Como los códigos públicos viven solo en Nakama Discounts, nunca serán aceptados por este campo.

Cuando se aplique un cupón de carrito abandonado:

- se limpia la selección Nakama;
- el cupón aparece como beneficio activo en los totales;
- las opciones Nakama siguen visibles para que el cliente compare;
- elegir posteriormente una opción Nakama retira el cupón abandonado y recalcula el pedido.

El checkout headless puede mostrar una estimación del cupón abandonado, pero el puente y WooCommerce vuelven a validarlo antes de cobrar. Se eliminará el fallback local actual de códigos hardcodeados: si WooCommerce no confirma el cupón, el checkout no mostrará ni conservará un descuento estimado.

## Integración con el puente headless

El parámetro existente `coupon` seguirá reservado para cupones nativos. El puente reconstruirá el carrito, intentará aplicar el cupón mediante WooCommerce y después redirigirá al checkout final.

Los códigos públicos no viajarán en ese parámetro ni se crearán como `WC_Coupon`. Su elección se realizará en la interfaz final del carrito o checkout mediante la sesión de WooCommerce y el endpoint protegido del motor.

La separación evita que un mismo código pueda entrar por dos caminos o que WooCommerce y Nakama apliquen dos veces el mismo porcentaje.

## Pedido y trazabilidad

Al crear el pedido se guardará una instantánea de la promoción primaria Nakama, cuando corresponda:

- tipo de promoción;
- identificador interno;
- código visible;
- porcentaje;
- ahorro monetario;
- estado de combinación.

Para un cupón de carrito abandonado, WooCommerce continuará guardando sus propios datos de cupón. No se duplicará como promoción Nakama.

## Errores y casos límite

- Un código inactivo, aún no iniciado o expirado no se muestra ni se acepta como selección.
- Si un administrador cambia el porcentaje durante una sesión, el siguiente recálculo utiliza el valor nuevo y lo hace visible antes de finalizar el pedido.
- Si retira el código, la selección desaparece y se informa al cliente.
- Un carrito sin subtotal elegible no ofrece códigos públicos.
- El ahorro nunca puede reducir el total elegible por debajo de cero.
- Las peticiones con una clave de promoción inexistente se rechazan; no basta con que el cliente envíe un identificador con formato válido.
- Ante fallo de red, el servidor conserva la última selección confirmada.
- El código público se escapa en administración, checkout, metadatos y avisos.

## Pruebas

### Reglas del servidor

- saneamiento y unicidad de códigos;
- porcentaje válido e inválido;
- vigencia abierta, programada, activa y expirada;
- límite inclusivo de fechas en la zona horaria de WordPress;
- cálculo sobre subtotal elegible y exclusión de `lisas`;
- exclusión mutua entre fidelidad, campañas, 3x2, código público y cupón nativo;
- código acumulable y no acumulable;
- retirada o expiración durante una sesión;
- metadatos guardados en el pedido.

### Integración

- seleccionar un código retira el cupón nativo;
- aplicar un cupón nativo limpia la selección Nakama;
- el puente solo aplica cupones nativos;
- los códigos públicos no son aceptados por `check-coupon`;
- un fallo de `check-coupon` no activa ningún fallback local;
- recalcular el checkout mantiene una única opción activa;
- regresión de fidelidad, 10%, 3x2, transferencia, envío gratis y MSI.

### Interfaz

- navegación completa por teclado;
- nombre accesible, foco visible y estado `aria-pressed` correcto;
- controles táctiles de al menos 44 píxeles;
- feedback de carga y error sin selección optimista falsa;
- comportamiento responsive sin desplazamiento horizontal;
- comparación visible del ahorro de cada alternativa.

## Criterios de aceptación

La funcionalidad se considera terminada cuando un administrador puede crear un código porcentual vigente, verlo como botón en checkout, seleccionarlo como única promoción primaria y comprobar que el total y los beneficios complementarios respetan su configuración. El cliente debe poder sustituirlo por un cupón de carrito abandonado —o realizar la operación inversa— sin que ambos descuentos primarios se acumulen. El pedido final debe coincidir con los totales calculados por WooCommerce y conservar los datos de auditoría de la opción elegida.
