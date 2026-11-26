# Hormiga

Sistema para carga masiva de códigos SAP B1 por empresa (H&G, VH, ISL), con administración del historial por zona, usuario, etc.

Formulario para solicitar artículos SAP B1 por empresa (H&G, VH, ISL). El administrador los completa y exporta el TXT en ANSI para Data Transfer Workbench.

Tecnologías: **React 19 + Vite**, con **Firebase** (Authentication + Firestore) en el proyecto `hormiga-c42a7`.

## Comandos

Todos se ejecutan en la raíz del repositorio.

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias (solo la primera vez). |
| `npm run dev` | Inicia la app en http://localhost:8766 con datos reales de Firebase. |
| `npm run build` | Genera la versión final en `dist/`. |
| `npm run deploy` | (Opcional, Firebase Hosting) compila y publica en https://hormiga-c42a7.web.app. Antes necesitas `npm install -g firebase-tools` y `firebase login`. |

Si abres **http://localhost:8766/?local**, la app entra en modo de prueba:
- Los datos quedan solo en tu navegador, no en Firebase.
- Puedes cambiar entre Usuario y Admin.
- Funciona solo con `npm run dev`.

## Estructura

```
src/
  main.jsx                 punto de entrada
  App.jsx                  pestañas y pantalla según la sesión
  styles.css               estilos (paleta Hijuelas)
  domain/
    companies.js           empresas, columnas de la plantilla y reglas del Excel  ← aquí se cambian campos y reglas
    rules.js               cálculo de valores, validaciones, estados
    txt.js                 armado del TXT y codificación ANSI
    utils.js               utilidades
  data/
    firebase.js            configuración de Firebase
    stores.js              lectura y escritura en Firestore (y modo local de prueba)
    AppProvider.jsx        sesión, rol admin y datos compartidos (contexto de React)
  components/              Header, Login, Toast, celdas y tabla de artículos
  pages/                   Nueva solicitud, Mis solicitudes, Bandeja admin, Exportar, Historial, Catálogos
firestore.rules            reglas de seguridad (publicadas en la consola o con firebase deploy)
```

## Cambios habituales

- **Agregar, quitar o cambiar un campo o una regla:** edita `src/domain/companies.js`.
  - `who: "user"` es un campo amarillo, que llena el usuario.
  - `"auto"` es un campo que se calcula con una regla, definida en `f`.
  - `"admin"` es un campo que completa el administrador.
- **Grupos, dimensiones y almacén por defecto:** se cambian desde la pestaña **Catálogos** de la app, sin tocar el código.
- **Administradores:** se gestionan en Firestore, en la colección `admins`. Cada administrador es un documento cuyo ID es su correo en minúsculas.
- **Usuarios:** se crean en Firebase → Authentication → Usuarios.

## Datos en Firestore

| Colección | Contenido | Quién accede |
|---|---|---|
| `articulos` | Solicitudes | Cada usuario ve las suyas; el admin ve todas. |
| `config/catalogos` | Grupos, dimensiones y almacén | Todos leen; solo el admin escribe. |
| `exportaciones` | Historial de TXT descargados | Solo el admin. |
| `admins` | Correos de los administradores | Se edita solo desde la consola de Firebase. |

## Usuarios y permisos

- Cada persona tiene un documento `usuarios/{correo en minúsculas}` con `rol` (`usuario` o `admin`), `empresas` (`HG`, `VH`, `ISL`) y `bloqueado`.
- Para dar acceso a alguien:
  1. Crea su cuenta en Firebase Authentication (correo y contraseña).
  2. En la app, ve a **Administración → Usuarios → Agregar usuario** y marca sus empresas. También puedes esperar a que entre una vez: aparecerá como "Sin empresas".
- Un administrador ve siempre las tres empresas.
- `admins/{correo}` sigue existiendo como administrador principal: no se puede quitar desde la app y evita quedarse sin administradores.
- Las reglas de `firestore.rules` impiden que un usuario cree o edite solicitudes de empresas que no tiene asignadas.

## Solicitudes numeradas

- Cada envío de un usuario es una **solicitud** con un correlativo por empresa: `H&G-0001`, `VH-0001`, `ISL-0001`. El contador vive en `contadores/{HG|VH|ISL}.ultimo` y solo avanza de a uno (lo exigen las reglas).
- Cada artículo guarda `solicitudId` (`HG-0007`) y `solicitudNum` (`7`).
- Bandeja agrupa los artículos bajo su solicitud. En Exportar, cada solicitud completa se descarga en su propio archivo: `OITM_HG_SOL-0007_20261124.txt`.
- Las solicitudes enviadas antes de este cambio se numeran solas la primera vez que un administrador abre la app. Se agrupan por usuario y momento de envío.

## Diseño (tema, colores y vistas)

- **Tema claro «Bosque y papel»** (fondo crema, menú verde bosque, títulos en serif) y **modo oscuro**. Se cambia con el botón *Oscuro / Claro* del menú lateral, o arriba en el celular. La elección se guarda en el navegador.
- **Compacto:** el botón del menú reduce el espacio de las tablas para ver más filas.
- **Color por empresa:** H&G verde, VH azul, ISL ámbar. Se ve en los selectores de empresa, la franja de la Bandeja, Exportar e Historial, y en las solicitudes.
- **Inicio:** resumen por empresa y las últimas solicitudes con su recorrido.
- **Recorrido de la hormiga:** cada solicitud muestra sus pasos (Enviada, En revisión, Lista, En SAP).
- **Bandeja en tablero:** el botón *Lista / Tablero* muestra las solicitudes en columnas por estado.
- **Login «Hormiguero»:** fondo verde bosque con un corte de tierra donde una hormiga recorre las cámaras Enviada, En revisión, Lista y En SAP. No cambia con el tema. En desarrollo, `?login` lo muestra sin cerrar la sesión.

## Publicar en Vercel

1. En Vercel: **Add New → Project** e importar `DevGrupoHijuelas/Hormiga`.
2. Configuración (Vercel la detecta sola):
   - Framework Preset: **Vite**
   - Root Directory: la raíz (`./`)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js: 22.x (o mínimo 20.19; ya está fijado en `engines` de `package.json`)
3. No necesita variables de entorno: la configuración web de Firebase está en `src/data/firebase.js` (es pública por diseño; la seguridad está en `firestore.rules`).
4. En Firebase Console → **Authentication → Settings → Authorized domains**, agregar el dominio de Vercel (ej. `hormiga.vercel.app` y el dominio propio si se usa).
5. Recomendado: en Google Cloud → APIs y servicios → Credenciales, restringir la API key del navegador a los dominios de Vercel y Firebase.

Notas:
- La app no usa rutas en la URL, así que no hace falta `vercel.json`. Si más adelante se agregan rutas, configurar un rewrite de todo a `/index.html`.
- Vercel solo publica la página. Las **reglas de Firestore** se publican aparte, desde la consola de Firebase o con `firebase deploy --only firestore:rules`.
- El modo de prueba `?local` funciona solo con `npm run dev`; en producción siempre usa Firebase.
