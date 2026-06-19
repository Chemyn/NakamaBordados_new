# 📔 2026-06-19 Nakama Bordados Progress Update

> 🌟 **Daily Highlight**
> Hoy se completó la de-comisión completa de WordPress/WooCommerce y se implementó un panel de administrador local nativo en Next.js para gestionar ventas, cupones, productos, medios y el modo de mantenimiento, compilando el proyecto de manera 100% exitosa para producción en Hostinger.

---

## 📁 Project Tracking

### 🏴‍☠️ NakamaBordados_new
* **Today's Progress**:
  * **TypeScript Compile Fixes**:
    * Se importó el tipo `Language` en `Navbar.tsx`.
    * Se añadió `discountType` al Provider de `CartContext.tsx`.
    * Se agregó la propiedad `username` al tipo `Customer` en `AuthContext.tsx` y su query GraphQL.
    * Se instaló e integró la librería `jose` y `bcryptjs` para la autenticación y cifrado locales.
  * **Security Patches**:
    * Se abstrayó el API Token de Envia.com a variables de entorno (`ENVIA_API_TOKEN`).
    * Se reforzó la autenticación del Webhook de Envia para que falle cerrado si no hay secret configurado.
    * Se protegió la ruta de sincronización asíncrona `/api/sync-db` requiriendo validación mediante `SYNC_DB_SECRET`.
    * Se sanitizó la ordenación dinámica en `db.ts` para evitar posibles vectores de inyección SQL.
    * Se crearon validaciones `verifyToken` y verificaciones de administrador (`isAdmin`) en la API para bloquear accesos indebidos.
  * **Design & Redirección (Fase Híbrida)**:
    * Se deshabilitó la simulación local de checkout de Next.js, configurando una redirección asíncrona automática en `/checkout` hacia el puente seguro `nk_bridge` de WooCommerce.
    * **Modal de Confirmación de Carrito**: Se eliminó el `alert` nativo del navegador al agregar un producto al carrito y se implementó un popup de éxito personalizado con temática pirata/One Piece en `ProductClient.tsx`.
    * **Simplificación de Localización y Moneda**: Se removió el soporte al idioma japonés (JP) y monedas EUR/JPY de todo el proyecto, limitando las selecciones exclusivamente a Inglés/Español y pesos mexicanos (MXN) / dólares estadounidenses (USD) en `LanguageContext.tsx`, `CurrencyContext.tsx` y `Navbar.tsx`.
  * **Decomisión de WordPress/WooCommerce & Panel de Administrador**:
    * **Plan de Migración**: Se redactó un plan de migración exhaustivo en `MIGRATION_PLAN.md` (y su copia en `docs/plans/2026-06-19-migrate-to-hostinger-node.md`) para documentar el esquema de base de datos MySQL y la de-comisión de WP.
    * **Inicialización de Base de Datos**: Se desarrolló el script `scripts/init-db.js` que automatiza la creación del nuevo esquema de 12 tablas en el MySQL local, sembrando configuraciones, categorías, administrador principal y datos simulados de ventas.
    * **Autenticación Local REST**: Se crearon las rutas de API `/api/auth/login`, `/api/auth/register` y `/api/auth/me` con cookies HTTP-only de sesión.
    * **Panel de Control `/admin`**: Panel local modular que incluye:
      * **Ventas**: Métricas clave y ticket promedio por Día/Mes/Año, y tablas de productos más y menos vendidos.
      * **Creación de Productos**: Permite registrar nuevos artículos y sus variantes (Color, Estilo, Talla) en la base de datos local.
      * **Cupones**: Creador y gestor de códigos de descuento activos.
      * **Gestor de Medios**: Carga y listado de archivos en `/public/uploads/` sin dependencias externas.
      * **Modo Mantenimiento**: Interruptor y personalizador del mensaje, imagen de aviso y enlaces a redes sociales.
    * **Bloqueo de Mantenimiento**: El componente `MaintenanceWrapper` en `layout.tsx` valida el estado contra el API y restringe a usuarios comunes de navegar por la web si el mantenimiento está activo (mostrando el aviso y sus redes sociales).
    * **Corrección de Ambiguidades SQL y Estilos**: Se solucionó un error de sintaxis MySQL por columnas `created_at` ambiguas en JOINS de analítica y se forzó con estilos inline y bloques CSS locales con `!important` el contraste blanco del menú de navegación lateral del administrador para evitar conflictos de color.

* **Action Items**:
  * [ ] Ejecutar el script `init-db.js` en el servidor MySQL de producción de Hostinger para crear las nuevas tablas.
  * [ ] Definir las variables de entorno de producción (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET`, etc.) en Hostinger hPanel.
  * [ ] Terminar de reescribir las queries del frontend (como listados de la tienda `/store` y detalle `/product/[id]`) para que consuman la base local sin intermediarios de GraphQL.

---

## 🧠 Improvements & Learnings

📌 **New Rules / Discoveries**
* **Fail Closed Security**: En webhooks y APIs críticas, nunca asumir que la ausencia de configuración es segura. Si un token esperado está ausente, rechazar la petición inmediatamente con un error de configuración del servidor.
* **Coherencia Temática en UI**: Los popups nativos del navegador (`alert`) rompen la inmersión del diseño del sitio (especialmente en temáticas inmersivas como manga/anime). Es preferible utilizar componentes de modales nativos en React integrados con el sistema de diseño global.
* **Evitar Ambiguidades SQL en JOINS**: En consultas MySQL complejas que involucran uniones de múltiples tablas que comparten nombres de columnas idénticas (como `created_at` o `status`), siempre especificar el prefijo del alias de la tabla correspondiente (`o.created_at` o `p.status`) para evitar excepciones de compilación de base de datos.
* **Fuerza de Selectores Locales**: En Next.js con hojas de estilo globales masivas, es recomendable utilizar selectores específicos locales con directivas `!important` para asegurar que las variables de interacción en los botones (como contraste activo) se respeten en navegadores móviles y de escritorio.
