# Project DevLog: NakamaBordados_new
* **📅 Date**: 2026-06-05
* **🏷️ Tags**: `#UI` `#UX` `#InfiniteLoop` `#ZoomEffect` `#DarkMode` `#GraphQL` `#WhatsAppBot`

---

> 🎯 **Progress Summary**
> Se realizó una actualización masiva de la interfaz y funcionalidad, enfocada en el pulido estético y la experiencia de usuario (UX) en todos los dispositivos. Se estabilizó el sistema de autenticación GraphQL y se implementaron mejoras críticas en la navegación y visualización de productos.

### ✅ Accomplishments
- **Sliders Infinitos**: Se transformaron los carruseles de productos y categorías en la Home en loops infinitos (marquee) con pausa al pasar el mouse.
- **Efecto de Zoom**: Implementado zoom tipo lupa en PC (hover) y visor optimizado a pantalla completa en móviles para imágenes de producto y guías de tallas.
- **Rediseño de Carrito**: Ahora el carrito es 100% responsivo y cuenta con un popup temático de redirección cuando está vacío.
- **Estética Manga**: Se corrigieron las sombras en modo oscuro (ahora usan el rojo primario para visibilidad) y el logo conserva sus colores originales mientras las letras pasan a blanco.
- **GraphQL**: Se añadieron validaciones locales de JWT para evitar "Internal Server Errors" y se silenciaron los logs ruidosos de sesiones expiradas.
- **Chatbot**: El botón de WhatsApp ahora incluye un flujo de "Diseño Personalizado" con mensajes pre-escritos.
- **Hero Video**: Se sustituyeron las imágenes estáticas por el video de fondo original del sitio (corregido a `banner2.webm` ya que el link anterior daba 404).

### 🚩 Challenges & Solutions
- **Problema**: Las sombras desaparecían en modo oscuro.
- **Solución**: Se migraron los estilos inline a variables CSS dinámicas que cambian de color según el tema.
- **Problema**: Errores de servidor en GraphQL por tokens expirados.
- **Solución**: Implementada lógica de decodificación local para verificar `exp` antes de la petición.

### ⏭️ Next Steps
- [ ] Realizar pruebas finales de pasarelas de pago con el nuevo flujo responsivo del carrito.
- [ ] Verificar la correcta recepción de guías de Envia.com en el dashboard de usuario.
- [ ] Optimizar el rendimiento del video del hero (carga diferida o compresión adicional).
