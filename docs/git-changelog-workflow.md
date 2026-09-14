# Changelog automático desde Git

El plugin `Nakama Changelog` 1.3.0 consulta la rama `main` del repositorio público
`Chemyn/NakamaBordados_new`. Esta versión debe instalarse una vez en WordPress;
después, las fichas nuevas llegan automáticamente desde GitHub.

Los commits posteriores a `8083ed4` se presentan como fichas independientes. Cada
una utiliza el identificador `NK-AAAA-MM-DD-abcdefg`, donde los últimos siete
caracteres corresponden al commit. El historial anterior conserva su presentación
original.

## Cómo escribir una actualización

Cada commit debe tener un encabezado conventional commit y un bloque editorial
`NK-RELEASE`. El encabezado se convierte en el título de la ficha, sin el prefijo
técnico. `Resumen` explica el beneficio general y cada `Grupo` genera uno de los
bloques visuales de la ficha.

```text
feat(account): habilita edición segura del perfil

Permite que los clientes mantengan actualizados sus datos personales.

NK-RELEASE:
Resumen: Los clientes ahora pueden administrar sus datos con mayor seguridad.

Grupo: Mi Cuenta
- Se puede editar nombre, apellidos, teléfono y dirección.
- El correo, usuario y rol permanecen protegidos.

Grupo: Sesión y seguridad
- Cerrar sesión elimina también la cookie persistente de WordPress.
```

Se pueden incluir tantos grupos y notas como requiera el cambio. Si un commit no
trae `NK-RELEASE`, el plugin crea una ficha de respaldo con el encabezado, los
párrafos del cuerpo y el área indicada en el scope. Por eso ningún commit nuevo
vuelve a mostrarse únicamente como una línea técnica.

El widget del Escritorio presenta las primeras tres notas de la ficha más reciente
y la pestaña `Cambios NK` conserva el detalle completo.

## Sincronización y recuperación

- Caché normal: 15 minutos.
- WP-Cron: una sincronización por hora.
- La pestaña incluye `Actualizar ahora` para validar un push inmediatamente.
- WordPress conserva un snapshot de hasta 500 commits desde el 22 de agosto de
  2026, incluyendo fecha exacta y enlace de origen. Si GitHub no responde, se usa
  ese snapshot y las entradas locales.
- No se almacena un token porque el repositorio es público. Si el repositorio se
  vuelve privado, debe usarse un proxy o GitHub App del servidor; nunca se debe
  incluir una credencial dentro del plugin o del repositorio.
