# Navegación móvil de Mi Cuenta

Fecha: 2026-08-21
Estado: implementado y verificado

## Resumen de entendimiento

- La página `mi-cuenta` presenta una navegación principal por pestañas.
- En pantallas móviles, `Resumen` repite cuatro destinos ya disponibles en esa navegación: Pedidos, Rastreo, Dirección y Cuenta.
- La repetición proviene de dos grupos de controles distintos; no es un doble renderizado ni un problema de datos.
- El objetivo es ofrecer una sola vía de navegación en móvil y reducir ruido visual.
- Los accesos rápidos deben seguir disponibles en escritorio.
- No se modificarán autenticación, pedidos, rastreo, direcciones, perfil ni permisos administrativos.
- El cambio debe conservar la identidad manga existente y la accesibilidad de la navegación.

## Supuestos y requisitos no funcionales

- **Rendimiento:** el ajuste será CSS; no añadirá JavaScript, listeners ni estado responsive.
- **Escala:** la solución es independiente de la cantidad de usuarios, pedidos o datos de la cuenta.
- **Seguridad y privacidad:** no cambia el flujo de sesión ni se accede a datos adicionales.
- **Confiabilidad:** `AccountSectionNav` continuará siendo la fuente única de navegación móvil.
- **Mantenimiento:** se reutilizará el breakpoint de escritorio existente, `992px`, para evitar reglas divergentes.
- **Accesibilidad:** las pestañas conservarán sus roles ARIA, foco visible, navegación por teclado y objetivos táctiles de al menos 44px.

## Alternativas consideradas

### 1. Visibilidad responsive mediante CSS — elegida

Ocultar `.nk-dash-shortcuts` por debajo de `992px` y mostrarla desde el breakpoint de escritorio. Es un cambio localizado, sin riesgo de hidratación y coherente con la estructura actual.

### 2. Renderizado condicional mediante JavaScript

Consultar el viewport y montar los accesos solo en escritorio. Se descartó porque añade estado, listeners y posibles diferencias de hidratación sin aportar una mejora funcional.

### 3. Eliminar los accesos en todos los tamaños

Simplifica el marcado, pero elimina una ayuda útil en el layout lateral de escritorio. Se descartó porque el problema reportado se limita a móvil.

## Diseño final

- En móvil y tableta, `Resumen` mostrará el saludo y su texto introductorio, sin las cuatro tarjetas duplicadas.
- La cuadrícula de pestañas de `AccountSectionNav` será el único selector de secciones en esos tamaños.
- Desde `992px`, las tarjetas de acceso rápido volverán a mostrarse dentro de `Resumen`.
- No se alterará el marcado, el estado `activeTab` ni la función `activateAccountTab`.
- La dirección visual seguirá siendo manga funcional: tipografía Teko, color primario y bordes existentes.
- DFII: 14/15 por su alto encaje, viabilidad y seguridad de rendimiento, con bajo riesgo de inconsistencia.

## Validación

- Añadir una prueba que compruebe que los estilos ocultan los accesos antes de `992px` y los recuperan en escritorio.
- Ejecutar las pruebas de `mi-cuenta`.
- Ejecutar lint o la verificación estática pertinente sobre los archivos modificados.
- Revisar que no exista desplazamiento horizontal y que la navegación siga siendo usable a 375px, 768px, 1024px y 1440px.

## Registro de decisiones

| Decisión | Alternativas | Motivo |
| --- | --- | --- |
| Mantener una sola navegación en móvil | Conservar ambos grupos de botones | Evita repetición y reduce carga visual. |
| Conservar los accesos rápidos en escritorio | Eliminarlos globalmente | Siguen siendo útiles junto a la navegación lateral. |
| Resolverlo con CSS | Usar detección del viewport en React | Menor complejidad y sin riesgo de hidratación. |
| Reutilizar `992px` | Introducir un breakpoint nuevo | Mantiene coherencia con el layout existente. |

## Resultado de implementación

- `.nk-dash-shortcuts` queda oculto por defecto y recupera su cuadrícula desde `992px`.
- Las pruebas que representan navegación móvil usan `AccountSectionNav` como control principal.
- Se añadió una prueba de regresión para la visibilidad responsive de los accesos rápidos.
- Resultado: 20 pruebas de `src/app/mi-cuenta` aprobadas, lint sin errores y build de producción aprobado.
