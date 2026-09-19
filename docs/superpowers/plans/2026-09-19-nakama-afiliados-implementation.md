# Plan de implementación: Nakama Afiliados

**Especificación aprobada:** `docs/superpowers/specs/2026-09-19-nakama-afiliados-design.md`  
**Estrategia:** TDD por capas, WooCommerce como autoridad comercial, `nakama-discounts` como autoridad promocional y Next.js estático como interfaz.  
**Estado:** listo para ejecución por entregas; este documento no implementa todavía cambios de producción.

## Límites invariables de esta versión

- El descuento del afiliado será configurable por perfil, mayor que 0 y con tope de 10%.
- El código de afiliado sustituirá cualquier cupón o promoción; nunca se combinará con bienvenida, fidelidad, 3x2, descuentos públicos, transferencia, envío gratis promocional ni MSI promocional.
- La comisión será 10% del subtotal de productos antes del descuento y antes de impuestos; excluirá envío, impuestos y beneficios gratuitos.
- Las devoluciones reducirán ventas atribuibles y comisión. Un cierre histórico nunca se reescribirá.
- Los importes operativos, metas, cierres y pagos se expresarán en MXN.
- La Constancia de Situación Fiscal aprobada será obligatoria antes de mostrar información financiera.
- Nakama cubrirá el envío de las prendas mensuales.
- No se implementarán facturación automática, CSD, timbrado, cálculo automático de ISR/IVA ni transferencias bancarias automáticas hasta recibir indicaciones del contador.

## Convenciones de ejecución

1. Cada tarea empezará con una prueba que falle por el comportamiento nuevo.
2. Se implementará únicamente lo necesario para hacerla pasar y luego se ejecutará la regresión relacionada.
3. Las rutas REST privadas usarán el JWT de WordPress como identidad única, `credentials: 'omit'`, `cache: 'no-store'` y validación de capacidad en servidor.
4. El frontend no confiará en porcentajes, importes, IDs de afiliado ni estados enviados por el navegador.
5. Los pedidos y reembolsos usarán APIs CRUD de WooCommerce y declararán compatibilidad HPOS.
6. Toda operación repetible tendrá una clave de idempotencia y toda mutación administrativa tendrá nonce/capacidad o autenticación REST.
7. Cada commit incluirá el bloque `NK-RELEASE` exigido por el proyecto.
8. Tras cualquier cambio se ejecutará `graphify update .` antes de cerrar la entrega.

## Contrato técnico que se construirá

### Capacidades

- `access_affiliate_dashboard`: permite usar `/afiliados/` y consultar el historial propio.
- `nakama_affiliate_vip`: habilita categorías restringidas, sin aumentar el número de prendas.
- `manage_woocommerce`: administra perfiles, documentos, cierres, pagos, prendas y evidencias.

Conceder VIP concederá también acceso principal. Retirar acceso no eliminará historial. La suspensión será un estado de perfil y dejará el historial en solo lectura.

### Tablas del plugin

El instalador creará, actualizará y versionará estas tablas:

- `{$wpdb->prefix}nakama_affiliates`: perfil, usuario único, código único, estado, descuento, comisión, fechas y configuración de atribución.
- `{$wpdb->prefix}nakama_affiliate_ledger`: movimientos inmutables de venta, devolución y ajuste con claves únicas de evento.
- `{$wpdb->prefix}nakama_affiliate_closures`: cierre mensual, retenciones manuales, neto, aprobación y pago.
- `{$wpdb->prefix}nakama_affiliate_documents`: versiones de constancia, archivo privado y revisión.
- `{$wpdb->prefix}nakama_affiliate_benefit_periods`: ventas válidas, nivel y cupo concedido por mes.
- `{$wpdb->prefix}nakama_affiliate_requests`: solicitud mensual, dirección, estado operativo y envío cubierto por Nakama.
- `{$wpdb->prefix}nakama_affiliate_request_items`: producto y variación de cada unidad concedida.
- `{$wpdb->prefix}nakama_affiliate_evidence`: dos Reels, una Historia y una publicación bonus opcional con revisión manual.
- `{$wpdb->prefix}nakama_affiliate_audit`: actor, acción, entidad, fecha y descripción segura.

Los índices únicos impedirán duplicar usuario/código, evento de ledger, cierre por afiliado/periodo, beneficio por afiliado/periodo y posición de evidencia por solicitud.

### Metadatos congelados en el pedido

- `_nakama_affiliate_id`
- `_nakama_affiliate_user_id`
- `_nakama_affiliate_code`
- `_nakama_affiliate_discount_rate`
- `_nakama_affiliate_commission_rate`
- `_nakama_affiliate_eligible_subtotal`
- `_nakama_affiliate_order_currency`
- `_nakama_affiliate_rate_to_mxn`
- `_nakama_affiliate_base_mxn`
- `_nakama_affiliate_attributed_at`
- `_nakama_affiliate_source`

## Entrega 1 — Acceso, código, ventas y comisión

Al terminar esta entrega, un administrador podrá activar a un afiliado, el cliente podrá usar su código o enlace, una venta pagada creará una sola comisión y una devolución la ajustará. El afiliado tendrá una página propia, bloqueada por constancia fiscal hasta su aprobación.

### Tarea 1. Crear el núcleo instalable y el esquema completo

**Crear**

- `nakama-affiliates/nakama-affiliates.php`
- `nakama-affiliates/readme.txt`
- `nakama-affiliates/includes/class-affiliates-domain.php`
- `nakama-affiliates/includes/class-affiliates-installer.php`
- `nakama-affiliates/includes/class-affiliates-repository.php`
- `tests/nakama-affiliates-domain-test.php`
- `tests/nakama-affiliates-installer-test.php`

**Prueba roja**

- Probar normalización de porcentajes, periodos mensuales en zona horaria WordPress, importes firmados y niveles `1 / 2 / 3` para menos de 10k, 10k y 30k.
- Probar que el instalador define todas las tablas, claves únicas e índices de consulta sin depender de una segunda activación.

**Implementación**

- Declarar versión de plugin y esquema, compatibilidad HPOS y requisito de WooCommerce.
- Mantener reglas comerciales puras en `Nakama_Affiliates_Domain`; ninguna regla de comisión o beneficio vivirá en HTML o controladores REST.
- Hacer la migración idempotente con `dbDelta` y comprobación de versión durante `init`, igual que los módulos operativos existentes.
- Crear métodos de repositorio preparados para perfiles, ledger, cierres, documentos, beneficios, solicitudes, evidencias y auditoría.

**Verificación**

```powershell
php tests/nakama-affiliates-domain-test.php
php tests/nakama-affiliates-installer-test.php
php -l nakama-affiliates/nakama-affiliates.php
```

**Commit previsto:** `feat(affiliates): add plugin foundation and schema`

### Tarea 2. Añadir permisos, perfiles y estados de afiliado

**Crear**

- `nakama-affiliates/includes/class-affiliates-permissions.php`
- `nakama-affiliates/includes/class-affiliates-profiles.php`
- `tests/nakama-affiliates-permissions-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Verificar alta y retiro de `access_affiliate_dashboard` y `nakama_affiliate_vip` desde el perfil de usuario.
- Verificar que VIP implique acceso, que administradores puedan consultar y que un usuario ajeno sea rechazado.
- Verificar que suspender conserve historial pero impida nuevas atribuciones y solicitudes.

**Implementación**

- Seguir el patrón de Producción y Almacén: checkboxes con nonce en `show_user_profile` y `edit_user_profile`, guardados solo con `edit_users`.
- Crear o actualizar el perfil al conceder acceso; sugerir el código sin publicarlo hasta completar su validación.
- Añadir estado `active`, `suspended` o `inactive` separado de las capacidades.
- Conservar perfil, ledger y cierres al retirar permisos.

**Verificación**

```powershell
php tests/nakama-affiliates-permissions-test.php
```

**Commit previsto:** `feat(affiliates): manage affiliate access and vip permission`

### Tarea 3. Implementar códigos únicos y validación pública segura

**Crear**

- `nakama-affiliates/includes/class-affiliates-codes.php`
- `nakama-affiliates/includes/class-affiliates-rest.php`
- `tests/nakama-affiliates-codes-test.php`
- `tests/nakama-affiliates-rest-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Probar mayúsculas, eliminación de acentos, guiones, caracteres permitidos, máximo de 24 y sufijo ante colisión.
- Rechazar porcentaje vacío, cero, negativo o superior a 10%.
- Validar únicamente código activo, usuario con capacidad y perfil no suspendido.
- Confirmar que `GET /nakama/v1/affiliates/code?code=...` solo devuelve código normalizado, validez, mensaje y vencimiento de atribución; no devuelve usuario, porcentaje interno ni ventas.

**Implementación**

- Añadir guardado administrativo del código y descuento al perfil estándar del usuario.
- Resolver unicidad en base de datos además de la validación previa.
- Registrar el endpoint público con limitación de respuesta, `Cache-Control: no-store` y mensajes no enumerables.
- Registrar cada cambio administrativo en auditoría.

**Verificación**

```powershell
php tests/nakama-affiliates-codes-test.php
php tests/nakama-affiliates-rest-test.php
```

**Commit previsto:** `feat(affiliates): add capped unique affiliate codes`

### Tarea 4. Abrir una extensión segura en `nakama-discounts`

**Modificar**

- `nakama-discounts/includes/class-engine.php`
- `nakama-discounts/includes/class-cart.php`
- `nakama-discounts/nakama-discounts.php`
- `tests/nakama-discounts-test.php`
- `tests/nakama-discounts-cart-test.php`

**Prueba roja**

- Inyectar por filtro un candidato `affiliate_code` oculto y comprobar que puede ser seleccionado sin aparecer como botón público.
- Comprobar que `allow_modifiers = false` se respeta para cualquier tipo primario, no solo para códigos públicos.
- Comprobar que la selección afiliada elimina cupones nativos y que aplicar después un cupón nativo elimina la selección afiliada.
- Comprobar que el plan final y su fotografía se entregan mediante un hook, sin que `nakama-discounts` conozca tablas del plugin nuevo.

**Implementación**

- Incorporar filtros para candidatos primarios y visibilidad de opciones.
- Generalizar la decisión de modificadores desde el candidato seleccionado.
- Emitir una acción al congelar el plan en el pedido.
- Mantener compatibilidad con códigos públicos existentes y aumentar la versión de `nakama-discounts`.

**Verificación**

```powershell
php tests/nakama-discounts-test.php
php tests/nakama-discounts-cart-test.php
php tests/nakama-discounts-admin-test.php
php tests/nakama-discounts-admin-ui-test.php
```

**Commit previsto:** `feat(discounts): expose exclusive affiliate promotion hook`

### Tarea 5. Conectar el código afiliado al motor promocional

**Crear**

- `nakama-affiliates/includes/class-affiliates-discounts.php`
- `tests/nakama-affiliates-discounts-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Un código válido creará un candidato primario oculto con el porcentaje congelado y `allow_modifiers = false`.
- Un código inválido, suspendido o retirado limpiará la selección anterior.
- Un código afiliado sustituirá bienvenida, especial, 3x2, código público, cupón nativo, transferencia, envío gratis y MSI promocional.
- La URL manipulada no podrá decidir tasa, importe ni ID de afiliado.

**Implementación**

- Guardar solo código y origen en la sesión de WooCommerce; resolver el perfil de nuevo en servidor.
- Reutilizar `Nakama_Cart::apply_selection()` para que la exclusividad tenga una sola autoridad.
- Distinguir origen `manual` y `referral` sin cambiar la tasa.
- Invalidar la selección cuando cambie estado, capacidad o vigencia.

**Verificación**

```powershell
php tests/nakama-affiliates-discounts-test.php
php tests/nakama-discounts-test.php
php tests/nakama-discounts-cart-test.php
```

**Commit previsto:** `feat(affiliates): enforce exclusive affiliate discounts`

### Tarea 6. Capturar referencias y coordinar códigos en el frontend

**Crear**

- `src/lib/affiliate-attribution.ts`
- `src/lib/affiliate-attribution.test.ts`
- `src/app/components/AffiliateReferralCapture.tsx`
- `src/app/components/AffiliateReferralCapture.test.tsx`
- `src/app/components/AffiliateCodeField.tsx`
- `src/app/components/AffiliateCodeField.test.tsx`

**Modificar**

- `src/app/layout.tsx`
- `src/app/context/CartContext.tsx`
- `src/app/context/CartContext.test.tsx`
- `src/app/components/AbandonedCartCoupon.tsx`
- `src/app/cart/page.tsx`
- `src/app/cart/page.test.tsx`
- `src/app/checkout/page.tsx`
- `src/app/checkout/page.test.tsx`
- `src/app/context/LanguageContext.tsx`

**Prueba roja**

- `?ref=CODIGO` se validará después de hidratar, guardará código normalizado y expiración a 30 días y retirará el parámetro visible de la URL.
- Una referencia inválida borrará una atribución previa en vez de conservarla silenciosamente.
- El código manual válido prevalecerá sobre la referencia guardada.
- Aplicar código afiliado retirará cupón nativo; aplicar cupón nativo retirará código afiliado.
- Recargar la página revalidará ambos tipos de código con WordPress y fallará de forma cerrada si la red no responde.
- El formulario tendrá etiqueta, ayuda, estado de carga, error asociado, foco visible y objetivos táctiles de 44 px.

**Implementación**

- Mantener estado `affiliateCode`, `affiliateSource`, `affiliateExpiresAt`, `applyAffiliateCode` y `removeAffiliateCode` en `CartContext`.
- Guardar únicamente código, origen y expiración en `localStorage`; calcular el descuento visible solo con la respuesta vigente del servidor.
- Montar el capturador como Client Component pequeño dentro del layout; acceder a `window` y `localStorage` únicamente en `useEffect`, compatible con `output: 'export'`.
- Mostrar el campo en carrito y checkout junto al control de cupón, explicando que no se acumulan.
- Añadir copias ES/EN sin reutilizar la etiqueta de “carrito abandonado”.

**Verificación**

```powershell
npm test -- src/lib/affiliate-attribution.test.ts src/app/components/AffiliateReferralCapture.test.tsx src/app/components/AffiliateCodeField.test.tsx src/app/context/CartContext.test.tsx src/app/cart/page.test.tsx src/app/checkout/page.test.tsx
```

**Commit previsto:** `feat(storefront): capture and apply affiliate referrals`

### Tarea 7. Revalidar el código en el puente de checkout

**Modificar**

- `nakama-checkout-tools.php`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `tests/nakama-checkout-tools-test.php`
- `src/app/cart/page.test.tsx`
- `src/app/checkout/page.test.tsx`

**Prueba roja**

- El puente enviará `affiliate_code` y `affiliate_source`, nunca porcentaje ni ID.
- Si se reciben cupón nativo y afiliado a la vez, el código afiliado explícito sustituirá el cupón antes de redirigir.
- El servidor volverá a validar código, permiso y estado; una referencia caducada o perfil suspendido no dejará selección en sesión.
- Los flujos `pay-quote` y `social-login` conservarán su comportamiento actual.

**Implementación**

- Añadir un filtro de puente con contrato neutral para que `nakama-checkout-tools.php` no dependa de la clase del plugin.
- Hacer que Nakama Afiliados aplique la selección a la sesión WooCommerce únicamente después de crear y validar el carrito.
- Codificar todos los parámetros con `URLSearchParams` en el frontend.
- Mostrar en WooCommerce un aviso recuperable cuando un código ya no sea válido.

**Verificación**

```powershell
php tests/nakama-checkout-tools-test.php
npm test -- src/app/cart/page.test.tsx src/app/checkout/page.test.tsx
```

**Commit previsto:** `feat(checkout): revalidate affiliate attribution in WooCommerce`

### Tarea 8. Congelar la atribución y crear una comisión idempotente

**Crear**

- `nakama-affiliates/includes/class-affiliates-currency.php`
- `nakama-affiliates/includes/class-affiliates-orders.php`
- `nakama-affiliates/includes/class-affiliates-commissions.php`
- `tests/nakama-affiliates-orders-test.php`
- `tests/nakama-affiliates-commissions-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- La fotografía usará la suma de subtotales de línea antes de descuento e impuestos; no incluirá envío, fees ni impuestos.
- MXN usará factor 1. USD congelará el factor a MXN al pagarse y no cambiará después.
- Un pedido pagado mediante avisos repetidos producirá un solo evento `sale:{order_id}`.
- Comisión y progreso equivaldrán exactamente a `base_mxn × 0.10` con redondeo monetario explícito.
- Un beneficio mensual gratuito marcado por el plugin no generará atribución, venta, meta ni comisión.
- Si no existe tasa confiable para una moneda distinta de MXN, el evento quedará en revisión y no se inventará una conversión.

**Implementación**

- Congelar el perfil y la base durante `woocommerce_checkout_create_order`, y congelar la tasa definitiva al alcanzar estado pagado.
- Para USD, consumir el proveedor de tasa ya usado por WordPress mediante una interfaz aislada; guardar el factor exacto en el pedido y ledger.
- Escuchar `woocommerce_payment_complete` y cambios hacia estados pagados reconocidos por WooCommerce.
- Insertar ledger por clave única y tratar reintentos como éxito idempotente.
- No almacenar datos personales del comprador en el ledger.

**Verificación**

```powershell
php tests/nakama-affiliates-orders-test.php
php tests/nakama-affiliates-commissions-test.php
```

**Commit previsto:** `feat(affiliates): record paid sales and commissions`

### Tarea 9. Procesar devoluciones sin reescribir meses cerrados

**Crear**

- `nakama-affiliates/includes/class-affiliates-refunds.php`
- `tests/nakama-affiliates-refunds-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`
- `nakama-affiliates/includes/class-affiliates-commissions.php`

**Prueba roja**

- Reembolso total revertirá toda la base y comisión una sola vez.
- Reembolso parcial con líneas revertirá las unidades y subtotales originales correspondientes.
- Reembolso exclusivo de envío no cambiará comisión ni meta.
- Reembolso monetario sin detalle suficiente quedará en revisión manual sin prorrateo inventado.
- Antes del cierre se asignará al periodo original; después del cierre se llevará al siguiente periodo abierto.
- Cancelación o contracargo de una venta ya comisionada seguirá el mismo mecanismo.

**Implementación**

- Escuchar reembolsos de WooCommerce y reconciliar por `refund_id` y líneas originales.
- Escribir eventos negativos inmutables con referencia al evento de venta.
- Crear alerta administrativa cuando falte detalle; permitir después un ajuste manual auditado.
- Añadir un reconciliador seguro para reparar avisos perdidos sin duplicar movimientos.

**Verificación**

```powershell
php tests/nakama-affiliates-refunds-test.php
php tests/nakama-affiliates-commissions-test.php
```

**Commit previsto:** `feat(affiliates): reconcile refunds and chargebacks`

### Tarea 10. Proteger y revisar la Constancia de Situación Fiscal

**Crear**

- `nakama-affiliates/includes/class-affiliates-documents.php`
- `nakama-affiliates/includes/class-affiliates-private-files.php`
- `tests/nakama-affiliates-documents-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-rest.php`
- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Solo el afiliado autenticado podrá cargar su PDF; solo administración y el propietario podrán descargar la versión autorizada.
- Rechazar extensiones falsas, MIME distinto de PDF, archivo vacío y tamaño superior al límite configurado.
- Cargar una nueva constancia conservará versiones previas y pondrá la nueva en `pending`.
- Aprobar o rechazar exigirá administración; el rechazo tendrá motivo y auditoría.
- Ningún documento tendrá URL pública directa.

**Implementación**

- Guardar archivos fuera del árbol público de uploads, con nombre aleatorio no derivado del usuario y defensa adicional del servidor web.
- Servir descargas mediante REST autenticado y cabeceras `no-store`, `nosniff` y `Content-Disposition`.
- Añadir rutas `/me/fiscal-document`, `/me/fiscal-document/download` y rutas administrativas de revisión.
- Borrar el archivo físico solo mediante una operación administrativa explícita; el historial normal conservará versiones.

**Verificación**

```powershell
php tests/nakama-affiliates-documents-test.php
php tests/nakama-affiliates-rest-test.php
```

**Commit previsto:** `feat(affiliates): add private fiscal document review`

### Tarea 11. Crear el contrato privado y la primera página `/afiliados/`

**Crear**

- `src/lib/affiliates-api.ts`
- `src/lib/affiliates-api.test.ts`
- `src/app/afiliados/page.tsx`
- `src/app/afiliados/AffiliateDashboard.tsx`
- `src/app/afiliados/AffiliateDashboard.test.tsx`
- `src/app/afiliados/affiliate.module.css`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-rest.php`
- `src/app/mi-cuenta/page.tsx`
- `src/app/mi-cuenta/page.test.tsx`
- `src/app/mi-cuenta/AccountSectionNav.tsx`
- `src/app/mi-cuenta/AccountSectionNav.test.tsx`
- `src/app/context/LanguageContext.tsx`
- `src/app/sitemap.ts`

**Prueba roja**

- Un visitante verá acceso denegado/inicio de sesión; un usuario sin capacidad no verá datos.
- Un afiliado con constancia ausente, pendiente o rechazada verá únicamente el expediente fiscal y las instrucciones correspondientes.
- Un afiliado aprobado verá código, enlace, ventas propias, base, comisión y estados sin PII del comprador.
- Un administrador tendrá acceso equivalente para soporte sin depender de que fallen o no las consultas de capacidad.
- La antigua pestaña de comisión fija y `apoyo_creador_*` dejarán de mostrarse como fuente de verdad.
- La página será usable a 320 px, con navegación por teclado, foco visible, regiones con títulos y estados anunciados.

**Implementación**

- Añadir `GET /me`, `GET /me/dashboard` y `GET /me/sales` con paginación y consultas siempre filtradas por el usuario autenticado.
- Crear un cliente REST equivalente a Producción/Almacén y nunca enviar cookies de wp-admin.
- Añadir el botón “Panel de Afiliados” en “Accesos de trabajo” de Mi Cuenta tras consultar `/access`.
- Reemplazar el prototipo de comisiones por el acceso dedicado; no migrar importes de demostración.
- Construir el estado fiscal y el dashboard con lenguaje “Manga impacto”: composición diagonal contenida, negro/blanco/amarillo, rojo reservado para alertas, sin sacrificar legibilidad.
- Incluir estados de carga, vacío, error recuperable y sesión expirada.

**Verificación**

```powershell
npm test -- src/lib/affiliates-api.test.ts src/app/afiliados/AffiliateDashboard.test.tsx src/app/mi-cuenta/page.test.tsx src/app/mi-cuenta/AccountSectionNav.test.tsx
npm run lint
npm run build
```

**Commit previsto:** `feat(affiliates): add gated affiliate dashboard`

### Puerta de aceptación de la Entrega 1

- Activar, suspender, reactivar y marcar VIP funciona desde el perfil de usuario.
- Código y enlace aplican un máximo de 10% y reemplazan toda promoción.
- El pedido conserva una fotografía auditable aunque el perfil cambie después.
- Pago repetido no duplica comisión; devolución no duplica ajuste.
- La constancia fiscal controla el acceso financiero.
- El afiliado solo ve sus propios datos y ninguna PII del comprador.

## Entrega 2 — Cierres, retenciones manuales y pagos

Al terminar esta entrega, administración podrá cerrar un mes, capturar retenciones o ajustes indicados por el contador, aprobarlo y registrar el pago con comprobante privado. No habrá cálculo fiscal ni facturación automática.

### Tarea 12. Implementar el dominio de cierre mensual

**Crear**

- `nakama-affiliates/includes/class-affiliates-closures.php`
- `tests/nakama-affiliates-closures-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-repository.php`
- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Previsualizar reunirá ventas, devoluciones y ajustes del periodo sin mutar datos.
- Confirmar requerirá una segunda acción explícita y será único por afiliado/mes.
- El bruto será la suma de ledger incluida y permanecerá congelado.
- `neto = bruto - ISR - IVA + otros ajustes firmados` con motivo, autor y fecha.
- No se podrá pagar un cierre sin aprobar, ni editar la base de uno aprobado/pagado.
- Reembolsos posteriores se moverán al siguiente periodo abierto.

**Implementación**

- Añadir estados `draft`, `closed`, `approved` y `paid` con transiciones explícitas.
- Asociar cada movimiento incluido al cierre sin modificar su importe.
- Guardar retenciones manuales como importes, no porcentajes sugeridos.
- Auditar previsualización confirmada, cierre, ajuste, aprobación y reapertura excepcional.

**Verificación**

```powershell
php tests/nakama-affiliates-closures-test.php
php tests/nakama-affiliates-refunds-test.php
```

**Commit previsto:** `feat(affiliates): add auditable monthly closures`

### Tarea 13. Construir el panel administrativo operativo

**Crear**

- `nakama-affiliates/includes/class-affiliates-admin.php`
- `nakama-affiliates/assets/admin.css`
- `nakama-affiliates/assets/admin.js`
- `tests/nakama-affiliates-admin-test.php`
- `tests/nakama-affiliates-admin-ui-test.php`

**Modificar**

- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- El menú exigirá `manage_woocommerce` y todas las mutaciones usarán nonce.
- Resumen mostrará pendientes fiscales, revisiones de reembolso, cierres por aprobar y pagos pendientes.
- La ficha permitirá perfil, código, descuento, estado y VIP sin exponer secretos.
- La previsualización de cierre mostrará conteos e importes antes de confirmar.
- Capturar ajuste o rechazo sin motivo será imposible.

**Implementación**

- Crear secciones Resumen, Afiliados, Documentos, Ventas, Cierres/Pagos, Prendas, Evidencias y Configuración.
- Implementar primero las secciones de Entregas 1 y 2; Prendas/Evidencias mostrarán estado “disponible en Entrega 3” hasta su implementación.
- Usar tablas paginadas, filtros por periodo/estado y enlaces seguros a pedido sin copiar datos personales al plugin.
- Incorporar avisos y confirmaciones accesibles; ninguna acción económica dependerá solo de JavaScript.

**Verificación**

```powershell
php tests/nakama-affiliates-admin-test.php
php tests/nakama-affiliates-admin-ui-test.php
```

**Commit previsto:** `feat(affiliates): add monthly operations admin`

### Tarea 14. Registrar pagos y comprobantes privados

**Crear**

- `nakama-affiliates/includes/class-affiliates-payments.php`
- `tests/nakama-affiliates-payments-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-private-files.php`
- `nakama-affiliates/includes/class-affiliates-rest.php`
- `nakama-affiliates/includes/class-affiliates-admin.php`

**Prueba roja**

- Registrar pago exigirá cierre aprobado, fecha, referencia y comprobante válido.
- Repetir el envío no duplicará pago ni archivo.
- Solo afiliado propietario y administración podrán descargar el comprobante.
- Reemplazar comprobante conservará auditoría; eliminarlo no cambiará el estado financiero sin una reversión explícita.

**Implementación**

- Reutilizar almacenamiento privado con una carpeta lógica separada.
- Congelar neto pagado y datos operativos mínimos; no almacenar cuentas bancarias.
- Añadir descarga privada y vista de historial al contrato REST.
- Registrar reversión administrativa como un evento independiente, nunca borrando el pago silenciosamente.

**Verificación**

```powershell
php tests/nakama-affiliates-payments-test.php
php tests/nakama-affiliates-documents-test.php
```

**Commit previsto:** `feat(affiliates): record manual commission payments`

### Tarea 15. Completar el dashboard financiero del afiliado

**Modificar**

- `src/lib/affiliates-api.ts`
- `src/lib/affiliates-api.test.ts`
- `src/app/afiliados/AffiliateDashboard.tsx`
- `src/app/afiliados/AffiliateDashboard.test.tsx`
- `src/app/afiliados/affiliate.module.css`
- `src/app/context/LanguageContext.tsx`

**Prueba roja**

- Mostrar ventas válidas, devoluciones, ajustes, comisión bruta, ISR manual, IVA manual, otros ajustes, neto y estado de pago por periodo.
- Etiquetar claramente toda retención como “capturada por administración”, sin presentar asesoría fiscal ni una tasa automática.
- Permitir descargar solo el comprobante propio pagado.
- Explicar el arrastre de una devolución posterior sin modificar el cierre anterior.
- Tablas y tarjetas conservarán lectura y orden lógico en móvil, teclado y lector de pantalla.

**Implementación**

- Añadir endpoints propios de periodos, cierre y descarga.
- Separar resumen del mes abierto, historial cerrado y detalle de movimientos.
- Mostrar importes en MXN y la moneda original solo como contexto del movimiento.
- Añadir estados de cero ventas, cierre en proceso, pago pendiente y pago realizado.

**Verificación**

```powershell
npm test -- src/lib/affiliates-api.test.ts src/app/afiliados/AffiliateDashboard.test.tsx
npm run lint
npm run build
```

**Commit previsto:** `feat(affiliates): show closures and payment history`

### Puerta de aceptación de la Entrega 2

- Un cierre confirmado es reproducible, auditable e inmutable.
- ISR, IVA y otros ajustes se capturan manualmente con motivo; el sistema no sugiere tasas.
- Pago y comprobante solo se registran sobre un cierre aprobado.
- El afiliado ve bruto, retenciones, neto y pago sin acceder a información ajena.
- Un reembolso tardío aparece como arrastre en el siguiente mes abierto.

## Entrega 3 — Prendas, metas y evidencias

Al terminar esta entrega, cada afiliado podrá solicitar de una a tres prendas según sus ventas válidas del mes anterior, con exclusiones de categoría, envío pagado por Nakama y evidencia obligatoria para continuar el programa.

### Tarea 16. Calcular metas y cupo mensual sin arrastre

**Crear**

- `nakama-affiliates/includes/class-affiliates-benefits.php`
- `tests/nakama-affiliates-benefits-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-closures.php`
- `nakama-affiliates/includes/class-affiliates-repository.php`
- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Ventas netas menores a 10,000 MXN concederán una prenda; desde 10,000 dos; desde 30,000 tres.
- La base será la misma del ledger después de devoluciones, no el total cobrado ni la comisión.
- El cupo se recalculará cada mes, no se acumulará y VIP no añadirá unidades.
- El nivel del mes siguiente se congelará al cierre y conservará la base que lo justificó.
- Sin cierre previo válido se aplicará el cupo base de una prenda, sujeto a requisitos de evidencia.

**Implementación**

- Crear el periodo de beneficio cuando se confirme el cierre anterior.
- Exponer progreso hacia 10k y 30k con montos exactos, nivel actual y siguiente recompensa.
- Mantener el cálculo puro y reutilizable entre REST, admin y frontend.
- Auditar cualquier corrección excepcional de cupo.

**Verificación**

```powershell
php tests/nakama-affiliates-benefits-test.php
php tests/nakama-affiliates-closures-test.php
```

**Commit previsto:** `feat(affiliates): grant monthly product tiers`

### Tarea 17. Crear catálogo elegible y solicitudes operativas

**Crear**

- `nakama-affiliates/includes/class-affiliates-products.php`
- `nakama-affiliates/includes/class-affiliates-requests.php`
- `tests/nakama-affiliates-products-test.php`
- `tests/nakama-affiliates-requests-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-rest.php`
- `nakama-affiliates/includes/class-affiliates-admin.php`
- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Un afiliado ordinario no verá ni podrá enviar IDs de productos en Drops o Edición especial.
- Un VIP podrá verlos y solicitarlos si hay disponibilidad, sin garantía automática de aprobación.
- No habrá límite de precio; sí tope estricto de unidades según el periodo.
- Producto/variación inexistente, agotado o fuera de catálogo se rechazará nuevamente en servidor.
- Una solicitud previa sin evidencias obligatorias aprobadas bloqueará la siguiente.
- La solicitud guardará dirección confirmada y envío cubierto por Nakama, pero no creará venta, comisión ni meta.

**Implementación**

- Configurar por ID las categorías restringidas y las cuentas oficiales de Nakama.
- Consultar productos/variaciones publicados y stock vigente desde WooCommerce con paginación.
- Crear un registro operativo separado con estados `draft`, `submitted`, `approved`, `preparing`, `shipped`, `completed`, `rejected` y `cancelled`.
- Permitir a administración registrar guía/paquetería sin convertir la entrega en pedido comercial.
- Marcar explícitamente cualquier integración futura con Woo como beneficio gratuito excluido de atribución.

**Verificación**

```powershell
php tests/nakama-affiliates-products-test.php
php tests/nakama-affiliates-requests-test.php
```

**Commit previsto:** `feat(affiliates): add monthly product requests`

### Tarea 18. Implementar evidencias y validación manual

**Crear**

- `nakama-affiliates/includes/class-affiliates-evidence.php`
- `tests/nakama-affiliates-evidence-test.php`

**Modificar**

- `nakama-affiliates/includes/class-affiliates-rest.php`
- `nakama-affiliates/includes/class-affiliates-admin.php`
- `nakama-affiliates/nakama-affiliates.php`

**Prueba roja**

- Exigir exactamente dos posiciones Reel y una Historia por entrega mensual; aceptar una cuarta URL bonus opcional.
- Aceptar solo `https`, normalizar URL y rechazar duplicados dentro del periodo.
- Aprobar/rechazar será manual; rechazo requerirá motivo.
- Las tres obligatorias aprobadas desbloquearán el siguiente periodo; el bonus nunca será requisito.
- El bonus mostrará prioridad potencial para elegir un Drop, pero no concederá VIP, cupo ni garantía.
- El sistema no descargará ni copiará contenido social.

**Implementación**

- Registrar tipo, posición, URL, estado, revisor, fecha y motivo.
- Mostrar en administración enlaces externos seguros y el recordatorio de verificar etiquetas a las cuentas oficiales.
- Añadir reenvío/reemplazo controlado después de rechazo y conservar auditoría.
- Vincular evidencias a la solicitud/entrega concreta, no solo al usuario.

**Verificación**

```powershell
php tests/nakama-affiliates-evidence-test.php
php tests/nakama-affiliates-requests-test.php
```

**Commit previsto:** `feat(affiliates): add manual social evidence review`

### Tarea 19. Diseñar la experiencia mensual “Manga impacto”

**Crear**

- `src/app/afiliados/AffiliateProgress.tsx`
- `src/app/afiliados/AffiliateProgress.test.tsx`
- `src/app/afiliados/AffiliateProductRequest.tsx`
- `src/app/afiliados/AffiliateProductRequest.test.tsx`
- `src/app/afiliados/AffiliateEvidence.tsx`
- `src/app/afiliados/AffiliateEvidence.test.tsx`

**Modificar**

- `src/lib/affiliates-api.ts`
- `src/lib/affiliates-api.test.ts`
- `src/app/afiliados/AffiliateDashboard.tsx`
- `src/app/afiliados/AffiliateDashboard.test.tsx`
- `src/app/afiliados/affiliate.module.css`
- `src/app/context/LanguageContext.tsx`

**Prueba roja**

- La barra anunciará progreso actual, meta siguiente y recompensa: 1, 2 o 3 prendas.
- El selector impedirá exceder cupo y explicará categorías excluidas; VIP mostrará su acceso especial sin prometer aprobación.
- La solicitud confirmará dirección y que Nakama cubre el envío.
- La evidencia mostrará dos Reels, una Historia y bonus, con estados y motivo de rechazo.
- El texto recordará etiquetar las cuentas oficiales e incentivar compras con el código.
- El bonus explicará prioridad posible para un Drop, no garantía.
- La interfaz respetará contraste, zoom, movimiento reducido, 44 px, errores asociados y orden de foco.

**Implementación**

- Crear composición de “centro de misión” con jerarquía clara: progreso, recompensa disponible, selección, evidencias e historial.
- Usar amarillo para progreso/recompensa, rojo solo para bloqueo/error y tramas manga decorativas con `aria-hidden`.
- Ofrecer guardado recuperable de borradores de URL y selección, pero revalidar todo al enviar.
- Mostrar una sola llamada principal por estado para evitar competir con acciones financieras.

**Verificación**

```powershell
npm test -- src/lib/affiliates-api.test.ts src/app/afiliados/AffiliateProgress.test.tsx src/app/afiliados/AffiliateProductRequest.test.tsx src/app/afiliados/AffiliateEvidence.test.tsx src/app/afiliados/AffiliateDashboard.test.tsx
npm run lint
npm run build
```

**Commit previsto:** `feat(affiliates): add monthly rewards mission center`

### Puerta de aceptación de la Entrega 3

- Menos de 10k concede una unidad, 10k dos y 30k tres para el mes siguiente.
- El cupo no se acumula ni aumenta por VIP.
- No existe límite de precio; Drops y Edición especial se excluyen salvo VIP.
- Una entrega gratuita no genera venta, comisión ni meta; Nakama cubre el envío.
- Dos Reels y una Historia aprobados habilitan el siguiente ciclo; bonus es opcional.
- La validación de etiquetas y publicidad es manual y queda auditada.

## Tarea 20. Verificación integral, migración controlada y paquete instalable

**Crear**

- `nakama-affiliates/uninstall.php`
- `scripts/package-nakama-affiliates.ps1`
- `docs/operations/nakama-affiliates-runbook.md`
- `tests/nakama-affiliates-privacy-test.php`

**Modificar si existen datos reales que migrar**

- `nakama-affiliates/includes/class-affiliates-admin.php`
- `nakama-affiliates/includes/class-affiliates-repository.php`

**Prueba roja**

- Confirmar que REST nunca expone PII de compradores, rutas físicas privadas, motivos internos o datos de otros afiliados.
- Confirmar que la herramienta de migración solo previsualiza `apoyo_creador_*`, requiere confirmación y nunca migra el importe fijo de demostración.
- Confirmar que desinstalar conserva datos por defecto y solo los borra con una constante explícita de purga.
- Confirmar que el ZIP contiene un único directorio raíz y excluye pruebas, documentos internos y archivos temporales.

**Verificación completa**

```powershell
php tests/nakama-affiliates-domain-test.php
php tests/nakama-affiliates-installer-test.php
php tests/nakama-affiliates-permissions-test.php
php tests/nakama-affiliates-codes-test.php
php tests/nakama-affiliates-rest-test.php
php tests/nakama-affiliates-discounts-test.php
php tests/nakama-affiliates-orders-test.php
php tests/nakama-affiliates-commissions-test.php
php tests/nakama-affiliates-refunds-test.php
php tests/nakama-affiliates-documents-test.php
php tests/nakama-affiliates-closures-test.php
php tests/nakama-affiliates-admin-test.php
php tests/nakama-affiliates-admin-ui-test.php
php tests/nakama-affiliates-payments-test.php
php tests/nakama-affiliates-benefits-test.php
php tests/nakama-affiliates-products-test.php
php tests/nakama-affiliates-requests-test.php
php tests/nakama-affiliates-evidence-test.php
php tests/nakama-affiliates-privacy-test.php
php tests/nakama-discounts-test.php
php tests/nakama-discounts-cart-test.php
php tests/nakama-checkout-tools-test.php
npm test
npm run lint
npm run build
graphify update .
```

**Revisión manual obligatoria**

- Probar móvil 320/375 px, tablet y escritorio.
- Probar teclado completo, zoom 200%, lector de pantalla y movimiento reducido.
- Ejecutar un pedido MXN y uno USD de prueba, pago repetido, devolución parcial, total, solo envío y posterior al cierre.
- Probar afiliado activo, suspendido, sin constancia, constancia rechazada/aprobada, VIP y administrador.
- Probar límites 9,999.99; 10,000; 29,999.99 y 30,000 MXN.
- Verificar que ninguna ruta o archivo privado sea accesible sin el JWT y la identidad correctos.
- Generar `nakama-affiliates.zip`, instalarlo en staging y repetir el humo crítico antes de producción.

**Commit previsto:** `chore(affiliates): verify and package affiliate program`

## Orden de despliegue

1. Respaldar base de datos y archivos de WordPress.
2. Desplegar primero la versión extendida de `nakama-discounts` y comprobar regresión de promociones existentes.
3. Instalar `nakama-affiliates` desactivado, activar y comprobar esquema/capacidades.
4. Desplegar `nakama-checkout-tools.php` y probar el puente sin código, con cupón nativo y con código afiliado.
5. Desplegar el frontend estático y purgar cachés de CDN/LiteSpeed.
6. Activar un afiliado interno de prueba; completar constancia, venta, devolución y vista de dashboard.
7. Abrir la Entrega 1 a afiliados reales; Entregas 2 y 3 se habilitarán solo al superar sus respectivas puertas de aceptación.

## Condiciones para reanudar la facturación automática

Ese trabajo será un proyecto separado. No deberá añadirse a este plan hasta que el contador defina por escrito:

- quién emite cada CFDI y bajo qué concepto;
- régimen y obligaciones aplicables;
- tasas y bases de ISR/IVA, incluidos casos especiales;
- tratamiento de IVA trasladado o retenido;
- requisitos del receptor y uso de CFDI;
- momento fiscal del pago y cancelaciones;
- proveedor PAC, manejo de CSD y custodia de secretos;
- conciliación entre CFDI, cierre y pago.

Hasta entonces, el sistema solo registrará importes manuales proporcionados por administración y mostrará claramente que no constituyen cálculo fiscal automático.
