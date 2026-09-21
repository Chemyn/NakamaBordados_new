# Operación de Nakama Afiliados

Este documento describe cómo instalar, verificar, operar y retirar el sistema de afiliados. La facturación automática y el cálculo automático de ISR o IVA permanecen pausados hasta contar con las instrucciones escritas del contador.

## Antes de desplegar

1. Respaldar la base de datos de WordPress y el directorio de archivos privados.
2. Confirmar que WooCommerce está activo y actualizado en el ambiente de pruebas.
3. Ejecutar las pruebas PHP, las pruebas del frontend, el análisis de estilo y la compilación de producción.
4. Generar el paquete con `powershell -ExecutionPolicy Bypass -File scripts/package-nakama-affiliates.ps1`.
5. Abrir el ZIP y confirmar que contiene un solo directorio raíz `nakama-affiliates/`, sin pruebas, documentación interna, mapas ni temporales.

El archivo se genera por defecto en `build/nakama-affiliates.zip`.

## Orden de despliegue

1. Desplegar primero `nakama-discounts` y verificar que las promociones existentes sigan funcionando.
2. Instalar `nakama-affiliates.zip` en WordPress y activarlo.
3. Desplegar el puente de checkout y probar carrito, sesión y pago.
4. Desplegar el frontend estático y purgar cachés de CDN o LiteSpeed.
5. Activar un afiliado interno y completar el recorrido crítico antes de habilitar usuarios reales.

La activación crea o actualiza nueve tablas propias. Reemplazar el ZIP por una versión posterior también ejecuta la migración de esquema pendiente al iniciar WordPress.

## Configuración inicial

En **WordPress → Afiliados → Configuración**:

- indicar los IDs de las categorías Drops y Edición especial;
- registrar las cuentas oficiales que deberán etiquetarse en cada Reel e Historia;
- mantener la captura fiscal como importes manuales revisados por administración.

En el perfil del usuario:

- conceder **Acceso al Panel de Afiliados**;
- conceder **Afiliado VIP** únicamente por decisión administrativa;
- revisar el código, cuyo descuento debe ser mayor que cero y nunca superar 10%;
- usar suspensión para impedir nuevas atribuciones, solicitudes y evidencias sin borrar el historial.

## Recorrido de humo obligatorio

1. Iniciar sesión como afiliado activo y comprobar el acceso a `/afiliados/`.
2. Cargar una Constancia de Situación Fiscal en PDF; comprobar que las métricas sigan bloqueadas mientras está pendiente.
3. Aprobar la constancia desde administración y confirmar que el afiliado ve únicamente sus ventas y pagos.
4. Aplicar el código en la tienda y verificar que sustituye cualquier promoción incompatible.
5. Completar un pedido en MXN y otro en USD; repetir la notificación de pago para comprobar idempotencia.
6. Confirmar que la comisión sea 10% del subtotal elegible antes del descuento, sin envío ni impuestos.
7. Probar devolución parcial, total, solo envío y devolución posterior al cierre.
8. Verificar los límites mensuales de 9,999.99, 10,000, 29,999.99 y 30,000 MXN.
9. Solicitar una, dos o tres prendas según el cupo; confirmar que Nakama cubre el envío y que no existe límite de precio.
10. Como afiliado normal, comprobar la exclusión de Drops y Edición especial; como VIP, comprobar que aparecen sin promesa de aprobación.
11. Registrar dos Reels y una Historia, todos con etiqueta a las cuentas oficiales, y una evidencia bonus opcional.
12. Aprobar o rechazar manualmente las URLs y verificar que el afiliado ve el estado y, si aplica, el motivo para corregir.

También se debe recorrer la interfaz con teclado, zoom al 200%, lector de pantalla, movimiento reducido y anchos de 320, 375, tableta y escritorio.

## Cierres y pagos

1. Previsualizar el periodo desde **Cierres / Pagos**.
2. Resolver cualquier movimiento marcado para revisión.
3. Confirmar el cierre para congelar sus movimientos.
4. Capturar ISR, IVA y otros ajustes exactamente como los indique el contador, junto con su motivo o referencia.
5. Aprobar el cierre después de la revisión manual.
6. Registrar el pago, fecha, referencia y comprobante PDF.

Nunca calcular tasas fiscales a partir de esta pantalla. Una reversión conserva el pago y el comprobante originales para auditoría.

## Migración del prototipo `apoyo_creador_*`

La herramienta está en **Afiliados → Configuración → Comisiones del prototipo anterior**.

1. Introducir el ID del usuario y seleccionar **Previsualizar metadatos**.
2. Comparar cada periodo y monto contra la fuente contable.
3. Marcar la confirmación explícita y ejecutar la importación.
4. Previsualizar y cerrar esos periodos mediante el flujo normal antes de aprobarlos o pagarlos.

Solo se aceptan claves exactas `apoyo_creador_AÑO_MES` con importes positivos y numéricos. La operación conserva los metadatos, es idempotente y crea movimientos de comisión histórica con base de ventas cero. Por ello no aumenta metas de prendas ni pretende reconstruir pedidos. Los importes fijos que solo existieron en una interfaz demostrativa no se leen ni se migran.

## Privacidad y archivos

- Constancias y comprobantes se guardan fuera de la ruta pública, bajo `nakama-private/affiliates` por defecto.
- No mover esa carpeta dentro de `wp-content/uploads`.
- Las descargas deben probarse como propietario, como otro afiliado y como administrador.
- Las respuestas del panel no deben contener correo, nombre o dirección del comprador, rutas de archivos, hashes ni notas internas.
- Las copias de seguridad del directorio privado deben tener el mismo control de acceso que la base de datos.

## Reversión

Si una prueba crítica falla:

1. desactivar el acceso de nuevos afiliados o suspender los perfiles afectados;
2. restaurar la versión anterior de frontend y complementos;
3. restaurar la base de datos solo si la migración de esquema o los datos resultaron dañados;
4. conservar los archivos privados y los registros de auditoría para investigar;
5. repetir el humo crítico antes de reabrir el programa.

Desactivar o desinstalar el complemento conserva tablas, opciones, permisos y documentos de forma predeterminada.

## Purga definitiva

La eliminación es irreversible. Solo después de respaldar y confirmar la baja completa, añadir temporalmente en `wp-config.php`:

```php
define( 'NAKAMA_AFFILIATES_PURGE_DATA', true );
```

Después, desinstalar el complemento desde WordPress. La purga elimina tablas, opciones, capacidades individuales y el directorio privado predeterminado. Retirar la constante al terminar. Si se configuró una ruta privada personalizada, revisarla y eliminarla manualmente: el desinstalador solo borra rutas que terminan exactamente en `nakama-private/affiliates`.
