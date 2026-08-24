# Changelog automático desde Git

El plugin `Nakama Changelog` 1.2.0 consulta la rama `main` del repositorio público
`Chemyn/NakamaBordados_new`. Esta es la última versión que necesita instalarse
manualmente para habilitar el flujo; las notas siguientes llegan desde GitHub.

## Cómo escribir una actualización

Si el commit solo tiene encabezado, el plugin lo convierte a una nota según el
prefijo (`feat`, `fix`, `perf`, `docs`, `chore`, etc.). Para publicar varias notas
claras en WordPress, se recomienda incluir un bloque en el cuerpo:

```text
feat: agrega una mejora operativa

NK-CHANGELOG:
- Primera mejora visible para administradores.
- Segunda mejora visible para producción.
```

Las líneas del bloque se muestran en `Actividad Git`, agrupadas por fecha bajo el
identificador `NK-AAAA-MM-DD`. El widget del Escritorio presenta las primeras tres
notas del día y la pestaña `Cambios NK` presenta el detalle completo.

## Sincronización y recuperación

- Caché normal: 15 minutos.
- WP-Cron: una sincronización por hora.
- La pestaña incluye `Actualizar ahora` para validar un push inmediatamente.
- WordPress conserva un snapshot de hasta 500 commits desde el 22 de agosto de
  2026. Si GitHub no responde, se usa ese snapshot y las entradas locales.
- No se almacena un token porque el repositorio es público. Si el repositorio se
  vuelve privado, debe usarse un proxy o GitHub App del servidor; nunca se debe
  incluir una credencial dentro del plugin o del repositorio.
