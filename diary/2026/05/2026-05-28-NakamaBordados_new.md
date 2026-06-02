# Project DevLog: NakamaBordados_new
* **📅 Date**: 2026-05-28
* **🏷️ Tags**: `#Tracking` `#Fixes` `#Performance` `#UI`

---

> 🎯 **Progress Summary**
> Implementado sistema de rastreo con Envia.com, corregidos errores de inicio de sesión y optimizada la tienda con scroll infinito y diseño adaptable.

### 🛠️ Execution Details & Changes
* **Git Commits**: (Pendientes de realizar por el usuario)
* **Core File Modifications**:
  * 📄 `nakama-envia-tracking.php`: Nuevo plugin para WordPress que maneja webhooks y consultas de rastreo.
  * 📄 `src/app/store/page.tsx`: Implementación de Infinite Scroll (Lazy Loading) y limpieza de botones duplicados.
  * 📄 `src/app/context/AuthContext.tsx`: Corregida la consulta de usuario (eliminado `comisiones`, ajustado `role`).
  * 📄 `src/app/mi-cuenta/page.tsx`: Integración de línea de tiempo de rastreo real y eliminación de barra admin.
  * 📄 `src/app/components/Navbar.tsx`: Nuevas categorías (Lisas, Variedad) e iconos minimalistas.
  * 📄 `src/lib/graphql-client.ts` & `src/app/api/graphql/route.ts`: Ajuste de cabeceras para bypass de Imunify360.
  * 📄 `src/lib/queries.ts`: Optimización de paginación para evitar errores 500 en el backend.

### 🚀 Technical Implementation
* **Rastreo Automático**: Se movió la lógica de API de Next.js a un plugin PHP nativo para asegurar compatibilidad con hosting compartido y seguridad de tokens.
* **Bypass de Seguridad**: Se eliminaron cabeceras `Origin` y `Referer` en las peticiones internas de servidor para evitar bloqueos por falsos positivos de bots en el hosting.
* **Performance**: Reducción de carga inicial de productos de 100 a 12, con carga bajo demanda mediante `IntersectionObserver`.

### 🚨 Troubleshooting
> 🐛 **Problem Encountered**: Error 404 en productos individuales e inicio de sesión fallido.
> 💡 **Solution**: El 404 era un bloqueo de Imunify360 (solucionado con headers). El login fallaba por un campo inexistente (`comisiones`) y falta de JWT Secret en `wp-config.php`.

### ⏭️ Next Steps
- [ ] Configurar el Webhook real en el panel de Envia.com apuntando a la nueva ruta de WordPress.
- [ ] Realizar un pedido de prueba real para validar el flujo completo.
- [ ] Revisar el diseño de la "Admin Suite" local para asegurar coherencia con los nuevos botones.
