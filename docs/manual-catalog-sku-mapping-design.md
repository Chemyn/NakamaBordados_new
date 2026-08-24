# Diseño: productos de catálogo sin color y SKU manuales

Fecha: 2026-08-24
Identificador de cambio: `NK-2026-08-24`

## Resumen de entendimiento

- Almacén y Producción deben presentar en español los colores que actualmente llegan en inglés.
- Las normalizaciones iniciales son `Bone → Hueso`, `Feet → Kaki`, `Black → Negro`, `White → Blanco` y `Pink → Rosa`.
- Almacén necesita un apartado para productos de WooCommerce que tienen estilo y talla, pero no ofrecen color al cliente.
- Un administrador seleccionará el producto; el servidor tomará automáticamente su estilo, tallas e IDs de variación.
- El único dato manual será un color oculto único para todo el producto, como `Verde botella`.
- Cada variación quedará vinculada al SKU base `Estilo / Color oculto / Talla`, sin modificar los atributos visibles del producto.
- La creación y eliminación se administrarán solo desde web/WordPress; la APK mostrará y ajustará las existencias resultantes.

## Supuestos y requisitos no funcionales

- WordPress es la fuente única de productos, variaciones, asignaciones y existencias.
- El flujo debe aceptar futuros productos sin cambios de código.
- Escala prevista: cientos de productos, decenas de productos manuales y hasta cientos de variaciones por producto.
- La búsqueda será paginada y con debounce; las variaciones se cargarán solo después de seleccionar un producto.
- Solo usuarios con `manage_options` podrán crear, modificar o eliminar asignaciones.
- Usuarios con la capacidad de Almacén podrán consultar y ajustar stock, pero no administrar vínculos.
- Una operación incompleta no debe conservar asignaciones parciales.
- Repetir una solicitud debe ser seguro y no crear duplicados.
- El historial de movimientos se conservará aunque se elimine un SKU huérfano.
- No se añadirán dependencias nativas a la APK para conservar compatibilidad OTA.

## Alternativas consideradas

### 1. Registro dedicado de asignaciones — aceptada

Una tabla propia registra producto, variación, color oculto y SKU base. Los SKU continúan en la tabla actual de existencias y las variaciones reutilizan el override existente.

Ventajas:

- Consultas y auditoría eficientes.
- Validación y eliminación de huérfanos confiables.
- Operaciones atómicas.
- Escala y mantenimiento claros.

Coste: requiere migración de esquema y endpoints nuevos.

### 2. Metadatos de WooCommerce únicamente — descartada

Guardar color en el producto y SKU en cada variación reduce el código inicial, pero dificulta listar asignaciones, auditar cambios y decidir cuándo un SKU quedó huérfano.

### 3. Override manual por ID — descartada

Reutilizar el endpoint actual y escribir IDs/SKU a mano sería frágil, lento y propenso a errores operativos.

## Arquitectura de datos

El plugin de Almacén incorporará una versión de esquema persistida para ejecutar `dbDelta` también al actualizar un plugin activo.

Se añadirá una tabla de asignaciones con, como mínimo:

- ID interno.
- ID del producto padre.
- ID de variación, único.
- Clave del SKU base.
- Estilo detectado.
- Talla detectada.
- Color oculto canónico.
- Usuario creador.
- Fechas de creación y actualización.

La tabla existente de SKU base identificará los SKU de origen manual. Las filas ya existentes conservarán su origen normal. Si una asignación reutiliza un SKU existente, este no se reclasificará ni se eliminará al quitar el producto.

El override `_nakama_base_sku` seguirá siendo el mecanismo que resuelve una variación hacia el SKU base. La tabla nueva será el registro administrativo y de auditoría; no se creará un segundo inventario.

## Flujo de creación

1. El administrador busca un producto publicado por nombre, SKU o slug.
2. El servidor devuelve una lista acotada con imagen, nombre, SKU y estado.
3. Al seleccionar un producto, el servidor carga sus variaciones comprables.
4. Para cada variación deriva estilo y talla desde WooCommerce.
5. El administrador captura un color oculto único.
6. La interfaz muestra una vista previa de todos los SKU resultantes.
7. Al confirmar, el servidor vuelve a leer y validar el producto.
8. Dentro de una transacción crea los SKU faltantes con stock y mínimo `0`, registra los vínculos y actualiza los overrides.
9. Sincroniza `_nakama_wh_key`, estados de stock y caché del catálogo.

Si alguna variación carece de estilo o talla, la operación completa se rechaza con un mensaje que identifica la variación problemática.

## Flujo de eliminación

1. El administrador confirma la eliminación del producto administrado.
2. El servidor obtiene todas sus asignaciones y SKU candidatos.
3. Retira los overrides y registros de asignación.
4. Revisa referencias automáticas y manuales para cada SKU.
5. Elimina únicamente los SKU de origen manual sin ninguna variación vinculada.
6. Conserva los movimientos históricos por clave para auditoría.
7. Sincroniza estados de stock y cachés.

## Contratos REST

Los endpoints administrativos exigirán `manage_options`:

- Buscar productos publicados con paginación.
- Obtener variaciones derivadas de un producto.
- Listar productos con asignación manual.
- Crear o reemplazar la asignación completa de un producto.
- Eliminar la asignación completa de un producto.

Los endpoints existentes de inventario continuarán protegidos con la capacidad de Almacén. Ningún endpoint público expondrá el color oculto ni lo añadirá al producto de tienda.

## Interfaz

### Dirección visual

Estética **editorial industrial manga**, consistente con Nakama: Teko para títulos, Archivo para lectura, tinta oscura, rojo principal y papel claro. DFII: `14/15`.

La diferenciación visual será una cadena de tallas conectada al color oculto, que permite entender de un vistazo cómo se crearán los SKU.

### Web y WordPress

Una pestaña `Productos sin color`, visible solo para administradores, ofrecerá:

- Búsqueda con autocompletado y estados accesibles.
- Ficha del producto seleccionado.
- Lista de variaciones, estilo y tallas detectadas.
- Campo con etiqueta para el color oculto.
- Vista previa de SKU nuevos y reutilizados.
- Confirmación con estado de carga, éxito o error.
- Listado de asignaciones existentes agrupadas por producto.
- Eliminación con resumen de SKU huérfanos potenciales.

Los objetivos táctiles medirán al menos 44 px, los errores usarán `role="alert"`, el foco será visible y el flujo funcionará con teclado.

### APK

La APK no incluirá el formulario administrativo. Los SKU manuales aparecerán en la lista actual de Almacén y en los atributos de Producción. Los controles de stock actuales conservarán sus tamaños táctiles y estados de guardado.

## Colores y datos heredados

El diccionario canónico del backend añadirá:

- `bone` y `hueso` → `Hueso`.
- `feet`, `khaki`, `kaki` y `caqui` → `Kaki`.
- `black` → `Negro`.
- `white` → `Blanco`.
- `pink` → `Rosa`.
- `bottle green` y `verde botella` → `Verde botella`.

Web y APK mantendrán un diccionario defensivo equivalente. Producción resolverá primero el término `pa_color` y luego aplicará la forma canónica.

Las filas heredadas se normalizarán. Si la normalización produce claves duplicadas, el mecanismo existente de fusión sumará stock, conservará el umbral mayor y mantendrá una única fila canónica.

## Errores y casos límite

- Producto eliminado o no publicado durante el flujo.
- Producto simple o sin variaciones comprables.
- Variación sin estilo o talla.
- Producto ya administrado.
- Color vacío o incapaz de formar una clave válida.
- SKU existente creado por el catálogo normal.
- Dos administradores guardando el mismo producto simultáneamente.
- Reintento después de una respuesta de red perdida.
- Eliminación de un SKU todavía usado por otra variación.

Todas las respuestas de error serán accionables y no expondrán consultas SQL ni detalles internos.

## Pruebas y aceptación

- Migración repetible en plugin nuevo y plugin ya activo.
- Permisos de lectura frente a permisos administrativos.
- Búsqueda paginada y variaciones derivadas.
- Creación atómica y reintento idempotente.
- Reutilización de SKU existente.
- Eliminación de SKU manual huérfano y conservación de SKU compartido.
- Conservación del historial de movimientos.
- Traducciones y paridad entre PHP, Next.js y React Native.
- Flujo web responsive a 375, 768, 1024 y 1440 px.
- Navegación por teclado, etiquetas, foco y anuncios de error.
- Typecheck y pruebas de APK.
- Build de producción de Next.js.
- Contenido de cada ZIP idéntico a su fuente.
- Publicación OTA compatible con el runtime instalado.

## Versionado y publicación

- Nakama Almacén: `1.2` → `1.3.0`.
- Nakama Panel de Producción: `2.0.0` → `2.1.0`.
- Nakama Changelog: `1.0.0` → `1.1.0`.
- Changelog: nueva entrada `NK-2026-08-24` antes de `NK-2026-08-22`.
- APK: conserva la versión nativa `1.2.0`; la entrega será una OTA del canal `production`.

Orden de publicación:

1. Verificar migraciones, backend y contratos.
2. Regenerar y validar los ZIP de Almacén, Producción y Changelog.
3. Verificar Next.js y React Native.
4. Publicar la OTA de producción con un mensaje que incluya `NK-2026-08-24`.
5. Crear commit y hacer push del lote completo.

## Registro de decisiones

1. Se utilizará stock compartido mediante SKU base, no inventario independiente por producto.
2. Un color oculto se aplicará a todas las variaciones de un producto.
3. Estilo y talla se derivarán de WooCommerce; no se escribirán IDs manualmente.
4. Solo administradores gestionarán asignaciones.
5. Web y WordPress tendrán el formulario; la APK será de consulta y ajuste de stock.
6. Los SKU manuales huérfanos se eliminarán; el historial permanecerá.
7. `Feet` se corregirá a `Kaki`.
8. Se usará una tabla dedicada de asignaciones.
9. Backend WordPress se validará antes de publicar los clientes.
10. Todos los plugins modificados incrementarán su versión semántica.
