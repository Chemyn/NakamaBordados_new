# Nakama Producción (app Android)

App para los operadores del taller. Hace lo mismo que `https://nakamabordados.com/produccion`
pero desde el teléfono: tablero de pedidos, tomar, validar producto por producto,
finalizar producción y gestionar los PDF de patrones por SKU.

Habla con el **mismo backend** que la web (WordPress/WooCommerce + plugin
`nakama-production-panel.php`), así que lo que se hace en la app se ve en la web y
al revés, al instante.

---

## Cómo trabajar en el proyecto

```bash
cd mobile
npm install
npm start          # abre Metro; escanea el QR con la app de desarrollo
npm run typecheck  # revisa tipos antes de subir cambios
```

Para probar en un teléfono hace falta un **development build** (Expo Go ya no
recibe notificaciones push):

```bash
npx eas build -p android --profile development
```

---

## Pasos de configuración (una sola vez)

### 1. Cuenta de Expo / EAS

```bash
npm install -g eas-cli
eas login
cd mobile
eas init          # crea el proyecto y escribe extra.eas.projectId en app.json
```

Sin ese `projectId` la app funciona, pero las notificaciones quedan desactivadas
(Ajustes lo indica con "No disponibles").

### 2. Firebase (necesario para las notificaciones)

1. En <https://console.firebase.google.com> crear un proyecto (por ejemplo
   "Nakama Producción").
2. Añadir una app **Android** con el paquete `com.nakamabordados.produccion`.
3. Descargar `google-services.json` y dejarlo en `mobile/google-services.json`.
   No se sube al repo; `app.config.js` lo detecta solo si está presente.
4. En Firebase → Configuración del proyecto → Cuentas de servicio → generar una
   clave privada (JSON).
5. Subirla a EAS:

   ```bash
   eas credentials      # Android → Push Notifications → FCM V1 service account key
   ```

### 3. Plugin de WordPress

Subir por cPanel `nakama-production-panel.zip` **v1.4.0** o superior. Es la versión
que añade `POST|DELETE /production/push-token` y el aviso al entrar un pedido a
producción. Sin ella la app funciona igual, solo que sin notificaciones.

### 4. Login social

Ya está configurado en el sitio (Nextend Social Login). La app abre el navegador
del sistema y vuelve por la página `https://nakamabordados.com/app-auth/`, que se
publica con el deploy normal del frontend. No hay que tocar nada en Google ni en
Facebook.

---

## Publicar una versión para el taller

```bash
cd mobile
eas build -p android --profile production
```

EAS devuelve un enlace y un QR. En cada teléfono: abrir el enlace, descargar el
APK, permitir "instalar apps de orígenes desconocidos" y aceptar. Las
actualizaciones se instalan encima siempre que se use la **misma cuenta de EAS**
(la firma la gestiona EAS).

Alternativa sin EAS (requiere Android Studio y JDK 17):

```bash
npx expo prebuild
npx expo run:android --variant release
# APK en android/app/build/outputs/apk/release/
```

Requisito mínimo: **Android 7.0**.

---

## Estructura

```
src/
├── app/                    Rutas (expo-router)
│   ├── login.tsx           Usuario/contraseña + Google/Facebook
│   ├── (tabs)/index.tsx    Tablero: En espera · Fabricando · Pendiente de guía
│   ├── (tabs)/pdfs.tsx     Patrones PDF por SKU
│   ├── (tabs)/ajustes.tsx  Usuario, notificaciones, cerrar sesión
│   └── order/[id].tsx      Detalle: validar productos, tomar, finalizar
├── components/             UI compartida
├── hooks/                  Consultas y mutaciones (TanStack Query)
└── lib/
    ├── api.ts              Cliente REST del panel (port de src/lib/production-api.ts de la web)
    ├── auth.ts             Login GraphQL + login social
    ├── session.ts          JWT en el Keystore de Android (expo-secure-store)
    ├── push.ts             Registro de notificaciones
    └── theme.ts            Colores, tipografías y espaciados
```

## Notas

- `npx expo-doctor` avisa de un "duplicate dependency" de React (19.2.3 aquí,
  19.2.4 en el proyecto web del directorio padre). Es esperado: son dos proyectos
  independientes con su propio `node_modules`, y Metro resuelve primero el de
  `mobile/`. No hay que igualar las versiones: la de aquí la fija el SDK de Expo.
- El JWT se guarda cifrado en el Keystore, nunca en almacenamiento plano.
- Si el token expira, la app intenta renovarlo sola; si no puede, vuelve al login
  con el aviso "Tu sesión expiró".
- Los teléfonos con ahorro de batería agresivo (Xiaomi, Huawei, Samsung) pueden
  bloquear las notificaciones: hay que excluir la app del ahorro de energía. La
  pantalla de Ajustes lo explica.
