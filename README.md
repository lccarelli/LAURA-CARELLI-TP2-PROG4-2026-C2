# Trabajo Practico Red Social

**Banquete**: red social culinaria para compartir experiencias, tips y todo lo que pasa en la cocina.

TP2 de Programación IV.
**UTN FRA | División 341 | 2026 C2**

**Profesores**

- Agustín Friadenrich
- Natalia Diez

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Tailwind_CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-24_LTS-339933?logo=node.js&logoColor=white)

---

## Indice

- [Aplicación en línea](#aplicación-en-línea)
- [Características técnicas](#características-técnicas)
- [Cómo correr el proyecto](#cómo-correr-el-proyecto)
- [Hooks de git](#hooks-de-git)
- [Variables de entorno](#variables-de-entorno)
- [Pipeline y despliegue](#pipeline-y-despliegue)
- [Funcionalidades](#funcionalidades)
- [Sesión](#sesión)
- [Logs](#logs)
- [Estructura de carpetas](#estructura-de-carpetas)

---

## Aplicación en línea

| Pieza      | Dónde                       | Dirección                                                |
| ---------- | --------------------------- | -------------------------------------------------------- |
| Frontend   | Vercel                      | https://laura-carelli-tp-2-prog-4-2026-c2.vercel.app     |
| Backend    | Render                      | https://laura-carelli-tp2-prog4-2026-c2.onrender.com     |
| Base       | MongoDB Atlas               | Base `redsocial`                                         |
| Imágenes   | Cloudinary                  | Carpeta `banquete`                                       |

El plan gratis de Render duerme el backend tras unos minutos sin uso: el primera solicitud puede tardar hasta un minuto en responder.

---

## Características técnicas

| Pieza     | Versión                       |
| --------- | ----------------------------- |
| Angular   | 22.2.x                        |
| NestJS    | 12.x                          |
| MongoDB   | 8 (Docker)                    |
| Mongoose  | 9.x                           |
| Node      | 24 (LTS)                      |
| Tailwind  | 4.1.x                         |
| Vitest    | 4.x                           |
| Oxlint    | backend                       |
| ESLint    | frontend con `angular-eslint` 22; backend sólo con las reglas de Sonar |
| `eslint-plugin-sonarjs` | frontend y backend: las mismas reglas que SonarCloud |
| Prettier  | 3.x                           |

---

## Cómo correr el proyecto

Desde la raíz, una sola vez (usa Node 24 e instala los hooks de git y el commitlint):

```bash
nvm use
npm ci
```

Base de datos:

```bash
docker compose up -d mongo
```

Backend (`http://localhost:3001`):

```bash
cd backend
cp .env.example .env
npm ci
npm run start:dev
```

Frontend (`http://localhost:4200`):

```bash
cd frontend
npm ci
npm start
```

Backend y base juntos en contenedores:

```bash
docker compose up --build
```

| Comando (backend)    | Qué hace                              |
| -------------------- | ------------------------------------- |
| `npm run start:dev`  | Levantar desarrollo                   |
| `npm run build`      | Build de producción a `dist/`         |
| `npm test`           | Tests de unidad                       |
| `npm run test:cov`   | Tests de unidad con cobertura         |
| `npm run test:e2e`   | Tests de API contra Mongo             |
| `npm run test:e2e:cov` | Tests de API con cobertura          |
| `npm run lint`       | Oxlint y ESLint (reglas de Sonar) sobre `src/` y `test/` |
| `npm run format`     | Prettier da formateo                  |

| Comando (frontend) | Qué hace                      |
| ------------------ | ----------------------------- |
| `npm start`        | Levantar desarrollo           |
| `npm run build`    | Build de producción a `dist/` |
| `npm test`         | Tests en modo watch           |
| `npm run test:cov` | Tests con cobertura           |
| `npm run lint`     | ESLint sobre TypeScript y templates, con las reglas de Sonar |

---

## Hooks de git

| Hook         | Qué hace                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: Oxlint, ESLint y Prettier en `backend/`; ESLint y Prettier en `frontend/` |
| `commit-msg` | `commitlint`: tipos `feat`, `fix`, `docs`, `refactor`, `test`, `chore`           |
| `pre-push`   | Bloquea el push directo a `main`                                                 |

---

## Variables de entorno

Se definen en `backend/.env` (hay un ejemplo en `backend/.env.example`). El `.env` no se sube.

| Variable       | Para qué                                              |
| -------------- | ----------------------------------------------------- |
| `MONGO_URI`    | Conexión a MongoDB                                    |
| `PORT`         | Puerto del backend (3001 en local)                    |
| `FRONTEND_URL` | Origen permitido por CORS (por defecto `http://localhost:4200`) |
| `JWT_SECRET`   | Clave con la que se firma el token                    |
| `ADMIN_EMAIL`  | Correo que queda como administrador al registrarse    |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME` | Cuenta de Cloudinary donde se guardan las imágenes |
| `CLOUDINARY_CARPETA` | Carpeta raíz en Cloudinary (opcional, por defecto `banquete`). En desarrollo conviene otra, como `banquete-dev`, para no mezclar las fotos de prueba |
| `LIMITE_*` | Límites de solicitudes, todos opcionales. La lista está en [Límite de solicitudes](#límite-de-solicitudes) |

La URL de la API que usa el frontend está en `frontend/src/environments/`.

---

## Pipeline y despliegue

El flujo está en `.github/workflows/ci.yml`.

| Cuándo                | Qué corre                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Pull request a `main` | Lint, build y tests con cobertura del backend (contra un Mongo de servicio) y del frontend; commitlint sobre los mensajes |
| Merge a `main`        | Lo anterior y, si todo pasa, deploy del backend en Render (deploy hook) y del frontend en Vercel |

La cobertura de cada ejecución queda en el resumen del job y como archivo descargable.

---

## Funcionalidades

### Publicaciones y me gusta

- **Listado** (`/publicaciones`): tarjetas con imagen, tipo, título y autoría. Se ordena por más recientes o por más me gusta, 10 por página.
- **Detalle** (`/publicaciones/:id`): la publicación completa con ficha, ingredientes, pasos con fotos y comentarios.
- **Me gusta:** botón de corazón en la tarjeta y dentro del detalle. Se puede dar y quitar; el contador sube y baja al instante con lo que responde el servidor. Si el servidor dice que ya estaba dado (o ya estaba quitado), el botón se corrige solo, sin mostrar un error.
- **Eliminar:** quien publicó, o una persona con perfil administrador (que puede dar de baja **cualquier** publicación), la elimina desde la tarjeta del listado o desde el botón "Eliminar publicación" del detalle, siempre con confirmación. La baja es lógica: la publicación y sus comentarios dejan de estar disponibles (el detalle y los comentarios responden 404) y al terminar se vuelve al listado. Una persona común no ve el botón en publicaciones ajenas y, si lo intentara contra la API, recibe 403.

### Nueva publicación

Pantalla `/publicaciones/nueva` (requiere sesión). Se elige un tipo y el formulario se adapta:

| Tipo | Qué lleva |
| --- | --- |
| `receta` | Título, mensaje, portada, **ficha**, **ingredientes** y **pasos** |
| `tip` | Título, mensaje y portada |
| `experiencia` | Título, mensaje y portada |

**Campos comunes**

| Campo | Regla |
| --- | --- |
| Título | Obligatorio, hasta 55 caracteres |
| Mensaje | Obligatorio, hasta 2000 caracteres, con contador |
| Portada | Opcional. JPG, PNG, WebP o GIF de hasta 2 MB. Una foto más pesada (por ejemplo, una sacada con el teléfono) se reduce sola en el navegador antes de subirse. Se ve una vista previa y se puede quitar |

**Ficha de la receta** (todo opcional)

- **Rinde:** cantidad de porciones o de unidades (1 a 100).
- **Tiempo:** de 1 a 10080 minutos (una semana), con botones rápidos de 15, 30, 45, 60, 90 y 120 minutos.
- **Costo:** de 1 a 4 signos `$`.
- **Calorías:** de 1 a 10000 kcal.
- Porciones, tiempo y calorías tienen botones para sumar y restar.

**Ingredientes** (hasta 40)

- Cada fila tiene cantidad, unidad y nombre. Unidades: gramos, kilos, mililitros, litros, taza, cucharada, cucharadita, unidad, pizca y "a gusto".
- Las unidades que admiten fracciones ofrecen ¼, ½ y ¾. "A gusto" no pide cantidad.
- Una fila a medias se marca: sin nombre pero con cantidad, o con nombre pero sin cantidad (salvo "a gusto"). Una fila totalmente vacía se ignora al publicar.

**Pasos** (hasta 40)

- Cada paso tiene un título opcional (hasta 80 caracteres) y un texto de hasta 2000.
- Se pueden **reordenar** arrastrándolos.
- Cada paso admite hasta **5 fotos**, con un máximo de **20 en toda la receta**, con las mismas reglas de formato y peso que la portada.
- Un paso con título o fotos pero sin texto cuenta como incompleto y bloquea la publicación. Un paso totalmente vacío se ignora.

**Al publicar**

1. Se validan todos los campos y se marcan los errores en cada uno.
2. Se arma un `multipart/form-data` y se envía `POST /publicaciones`. Los ingredientes y los pasos viajan como JSON; la portada va como `imagen` y las fotos de los pasos como `imagenesPasos`.
3. El backend valida otra vez (`whitelist`, `forbidNonWhitelisted`, largos, rangos y tipo de archivo) y sube las imágenes a Cloudinary.
4. Mientras espera, el botón se bloquea. Si falla, el aviso aparece en la pantalla con el mensaje de la API en el idioma elegido. Si sale bien, borra el borrador y lleva al listado.

**Borrador.** Todo lo que se escribe se guarda solo en el navegador, con una pausa de 0,8 segundos después de la última tecla, al salir de la pantalla, al ocultar o cerrar la pestaña y al recargar. Al volver a entrar se recupera con un aviso y la opción de descartarlo.

- Guarda tipo, título, mensaje, ficha, costo, ingredientes y pasos en `localStorage` (clave `borrador:<id del usuario>`). La portada y las fotos de los pasos van aparte, en IndexedDB (`banquete` / `fotos-borrador`): guarda los archivos tal cual, sin convertirlos a texto, así no choca con el límite de unos 5 MB de `localStorage`. Si el navegador no tiene IndexedDB, el borrador sigue funcionando sin fotos.
- Cada persona tiene el suyo; no se mezclan en un mismo navegador.
- Lo que se lee del almacenamiento se valida otra vez (tipos, medidas, máximos, solo dígitos en la ficha), porque `localStorage` se puede modificar a mano.
- Si la sesión ya venció, la pantalla avisa, mantiene el borrador y ofrece "Ingresar de nuevo".

### Comentarios

- Debajo de cada publicación. Del más reciente al más antiguo, **10 por página**.
- **Escribir:** hasta 500 caracteres, con contador. El comentario nuevo aparece arriba sin recargar y el contador de la publicación sube.
- **Editar:** solo la autoría del comentario (el backend responde `403 COMENTARIO_AJENO` si no). Se edita en el mismo lugar con "Guardar" y "Cancelar", y queda la etiqueta "editado". Mandar el mismo texto no lo marca como modificado.
- **Estados:** cargando, vacío y error con "Reintentar". Los errores salen como aviso en la página, sin ventanas flotantes.
- **Cargar más:** el botón "Ver más" se llena como una barra de progreso cuando queda a la vista; si se queda 1,5 segundos, carga la página siguiente sin hacer clic. También se puede apretar. Si una carga falla, no insiste sola: espera el clic. Lo mismo vale para el listado de publicaciones.

### Mi perfil

Las **últimas 3 publicaciones** de la persona, y debajo de cada una sus **3 comentarios más recientes** con un enlace "Ver todos los comentarios (N)" a la publicación. Cada una carga sus comentarios por separado: si falla una, las otras siguen viéndose.

### Administración de usuarios

Sólo para personas con perfil administrador (el correo de `ADMIN_EMAIL` queda con ese perfil al registrarse).

- **Enlace "Administración"** en la barra, visible sólo para administradores, que lleva a `/dashboard/usuarios`.
- **Listado** con foto, nombre, usuario, correo, perfil y estado (habilitado o deshabilitado), de a 10, con el botón "Ver más" que se acciona solo al llegar al final con el scroll.
- **Crear usuario:** el botón "Crear usuario" del listado lleva a su propia página, `/dashboard/usuarios/nuevo`, con las mismas validaciones del registro (nombre, apellido, correo, usuario, clave repetida, fecha de nacimiento, descripción y foto opcional) y **dos radio buttons**, "Usuario" y "Administrador". Al crear, vuelve al listado con un aviso y la persona aparece primera. Si el correo o el usuario ya existen se avisa en la misma página, sin perder lo escrito. El formulario es el mismo componente que usa el registro, que no ofrece elegir perfil.
- **Deshabilitar:** cada persona habilitada tiene un botón "Deshabilitar" (la propia cuenta y quienes ya están deshabilitadas no lo tienen). Abre un **modal de confirmación** accesible, sin `alert`, con el foco en "Cancelar" y Escape para cerrar. Al confirmar, la fila pasa a "Deshabilitado" sin recargar y se avisa con el nombre de usuario. Si la API falla (por ejemplo, la persona ya no existe), el modal se cierra y se avisa, y la fila no cambia.
- **Habilitar o deshabilitar, un solo endpoint:** `PATCH /usuarios/:id` con el body `{ "habilitado": true }` o `{ "habilitado": false }` (sólo administradores). No borra nada: la persona sigue en el listado y su correo y usuario siguen ocupados. Responde **200 con la persona ya actualizada** (sin la clave), 404 `USUARIO_NO_ENCONTRADO` si no existe, 400 `CUENTA_PROPIA` si se intenta con la propia cuenta (así un administrador deshabilitado, cuyo token sigue vigente hasta 15 minutos, no puede volver a habilitarse solo) y 400 `DATOS_INVALIDOS` con un id mal formado, sin body o con un `habilitado` que no es booleano. Repetir el mismo estado responde 200 de nuevo y no deja un segundo log. El body sólo admite `habilitado`: ningún otro dato (perfil, nombre...) se cambia por acá.
- **Por qué un `PATCH` y no `DELETE` más `POST`:** deshabilitar y habilitar son el mismo cambio, el valor de un campo, así que tienen un solo endpoint. Una baja lógica no es un borrado: la persona sigue visible en el `GET /usuarios`, y `DELETE` se reserva para sacar un recurso de verdad. Es lo que hacen SCIM (el estándar de gestión de usuarios) y Auth0 (`active: false` y `blocked: true` con `PATCH`). Decisión y alternativas en `docs/20-bitacora-de-decisiones.md`.
- **Habilitar:** a quien está deshabilitada le aparece un botón "Habilitar", con el mismo modal de confirmación (sin el estilo de peligro). Al confirmar, la fila vuelve a "Habilitado" sin recargar, el botón pasa a "Deshabilitar" y se avisa con el nombre de usuario. Los botones de cada fila cambian según el estado.
- **Quien está deshabilitada no ingresa:** `POST /auth/ingresar` con la clave correcta responde **403 `USUARIO_DESHABILITADO`** y el login muestra "Tu usuario está deshabilitado. Contactá a un administrador." El estado se controla **después** de verificar la clave: con una clave incorrecta responde 401 `CREDENCIALES_INVALIDAS`, así que no se revela el estado de una cuenta a quien no la conoce. Su token anterior deja de servir para `autorizar` y `refrescar` (401 `USUARIO_NO_AUTORIZADO`) y la app cierra su sesión con ese motivo; el token ya emitido sigue valiendo para el resto de la API hasta que vence, como máximo 15 minutos.
- **Protección:** las rutas `/dashboard/usuarios` y `/dashboard/usuarios/nuevo` sacan de ahí a quien no es administrador (a las publicaciones, o al login si no hay sesión). En la API, `GET /usuarios?offset&limit`, `POST /usuarios` y `PATCH /usuarios/:id` responden 403 `NO_ES_ADMINISTRADOR` con el token de una persona común y 401 sin token. El listado y el alta nunca devuelven la clave.
- **API de alta** (`POST /usuarios`, `multipart/form-data`): los datos del registro más `perfil` (`usuario` o `administrador`) e `imagen` opcional. Responde 201 con el usuario creado, **sin token** (la sesión sigue siendo la del administrador), 409 `CORREO_REPETIDO` o `USUARIO_REPETIDO`, y 400 por datos inválidos (incluido un perfil que no existe). Cada alta deja un log `usuario_creado` con quién la hizo.

### Estadísticas

Sólo para administradores. El enlace "Estadísticas" de la barra lleva a `/dashboard/estadisticas`, que redirige al login sin sesión y a las publicaciones a quien no es administrador.

- **Selector de lapso:** dos fechas, "Desde" y "Hasta", por defecto los últimos 30 días contados en la zona de Buenos Aires. Al cambiar una se vuelve a pedir; si había un pedido en curso se cancela. Un rango incompleto, con `desde` posterior a `hasta` o de más de 366 días se avisa en la pantalla y no llama a la API.
- **Publicaciones por usuario:** gráfico de **barras horizontales**, de más a menos publicaciones, con `chart.js` (se descarga recién al entrar a esta página). Los colores salen de las variables del tema y se redibuja al cambiar entre claro y oscuro; se destruye al salir de la pantalla. Tiene estados de carga, vacío y error con "Reintentar".
- **Comentarios por día:** gráfico de **líneas** con un punto por día del rango; los días sin comentarios valen 0, así que la línea no se corta. Con más de 40 días se ocultan los puntos y el cursor muestra el valor del día. Estados de carga, vacío (ningún comentario en el rango) y error con "Reintentar" propios: si falla uno, el otro gráfico se sigue viendo.
- **Publicaciones con más comentarios:** gráfico de **barras horizontales** con el top 10 del rango. Los títulos largos se cortan a 30 caracteres con puntos suspensivos y el texto completo aparece en el tooltip al pasar el mouse. Mismos estados (carga, vacío, error con "Reintentar") que las otras dos secciones, cada una independiente.
- **Publicaciones por tipo:** gráfico de **torta** con el reparto de las publicaciones activas del rango entre receta, tip culinario y experiencia (el único gráfico que muestra partes de un todo). La leyenda va abajo, así que cada porción se identifica sin depender del color, y el tooltip muestra la cantidad y el porcentaje. Sus tres colores son variables propias del tema (`--tema-torta-1` a `3`), distintos en claro y oscuro.
- **Resumen del período y rango rápido:** arriba de los gráficos, tres números grandes (publicaciones, comentarios y personas activas) y, debajo de cada uno, cuánto cambió contra el lapso anterior de igual largo (por ejemplo "100 % más" o "20 % menos"; "Sin datos previos" si antes no había nada), con una nota que dice con qué fechas se compara. El cambio se escribe con palabras y con un símbolo, no sólo con color. Debajo de las fechas hay botones de **7 días, 30 días, 90 días y 1 año** que fijan las dos fechas hasta hoy; el botón queda marcado mientras el rango coincida con él.
- **API:** `GET /estadisticas/publicaciones-por-usuario?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` devuelve `[{ usuario, nombreUsuario, cantidad }]`, ordenado por cantidad y luego por nombre de usuario. Cuenta sólo publicaciones **activas**. Los dos extremos están incluidos y se interpretan en la hora de Buenos Aires (UTC-3, sin horario de verano): `desde` empieza a las 00:00 y `hasta` termina a las 23:59:59 de ese día. 400 `DATOS_INVALIDOS` si falta una fecha, no es `YYYY-MM-DD` o hay un parámetro de más; 400 `RANGO_INVALIDO` si `desde` es posterior a `hasta`; 400 `RANGO_DEMASIADO_LARGO` si supera 366 días; 403 `NO_ES_ADMINISTRADOR` con el token de una persona común y 401 sin token.
- **API de comentarios:** `GET /estadisticas/comentarios-por-dia?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` devuelve `[{ fecha, cantidad }]`, un elemento por cada día del rango en orden cronológico, con `cantidad: 0` en los días sin comentarios. El día se calcula en la hora de Buenos Aires (un comentario de las 22:00 cuenta en ese día aunque en UTC sea el siguiente). Cuenta sólo los comentarios de publicaciones **activas**. Mismo rango, mismos errores y mismos permisos que la anterior.
- **API de comentarios por publicación:** `GET /estadisticas/comentarios-por-publicacion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` devuelve como máximo **10** elementos `{ publicacion, titulo, cantidad }`, de más a menos comentarios y, si empatan, por título. Cuenta los comentarios hechos en el rango y sólo de publicaciones **activas** (una publicación dada de baja no ocupa un lugar del ranking). Mismo rango, mismos errores y mismos permisos que las anteriores.
- **API de publicaciones por tipo:** `GET /estadisticas/publicaciones-por-tipo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` devuelve siempre los tres tipos, en el orden `receta`, `tip`, `experiencia`, como `[{ tipo, cantidad }]`, con `cantidad: 0` si no hubo. Cuenta sólo publicaciones **activas**. Mismo rango, mismos errores y mismos permisos que las anteriores.
- **API del resumen:** `GET /estadisticas/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` devuelve `{ actual, anterior }`, y cada uno trae `desde`, `hasta`, `publicaciones` (activas), `comentarios` (de publicaciones activas) y `personasActivas` (quienes publicaron o comentaron, contadas una sola vez). `anterior` es el lapso de igual largo que termina el día anterior a `desde`, para poder comparar. Mismo rango, mismos errores y mismos permisos que las anteriores.


### Pantalla de carga

Al abrir la aplicación con una sesión guardada se muestra una pantalla de carga (el cubreplato animado) mientras se llama a `POST /auth/autorizar`. Si el token es válido se actualizan los datos de la persona y se sigue en la dirección que se abrió; si no, se va al login. Si pasan más de 4 segundos aparece "El servidor se está despertando" (el plan gratis de Render tarda hasta un minuto). Sin sesión, la app despierta al servidor en segundo plano con `GET /health`. El mismo cubreplato se usa en todas las esperas de la aplicación.

---

## Sesión

El token JWT dura **15 minutos**. Un aviso modal pregunta si se quiere extender a los **10 minutos** de haberse emitido, cuando faltan 5.

| Qué | Cómo funciona |
| --- | --- |
| Aviso a los 10 minutos | El frontend lee el vencimiento (`exp`) del propio token y lo compara con la hora cada segundo. Cuando faltan 5 minutos aparece un modal con la cuenta regresiva. No depende de un temporizador de 10 minutos, así que no se atrasa en pestañas en segundo plano y sobrevive a recargar la página |
| Extender sesión | `POST /auth/refrescar` devuelve un token nuevo de 15 minutos para la misma persona, con el perfil que tiene hoy en la base; si la cuenta se deshabilitó o ya no existe responde `401` con `USUARIO_NO_AUTORIZADO` y el modal cierra la sesión y lleva al login con ese motivo. El modal se cierra y vuelve a avisar 10 minutos después. Si falla la red, el modal sigue y se puede reintentar |
| Cerrar sesión | Desde el modal: borra el token y lleva al login |
| Si no se responde | Al llegar a cero se cierra la sesión y el login explica el motivo |
| Si una petición devuelve 401 | Un interceptor cierra la sesión y lleva al login con el motivo, sin ventanas flotantes. Se ignoran los 401 de ingresar, registrar y refrescar (ahí significan credenciales inválidas) |
| Verificar la sesión | `POST /auth/autorizar` devuelve los datos actuales de la persona, sin la clave, leídos de la base. Responde `401` si falta el token, es inválido o venció, y `401` con `USUARIO_NO_AUTORIZADO` si la persona ya no existe o está deshabilitada. No entrega un token nuevo |
| Duración máxima | Cada token lleva `inicio`, la hora del ingreso, y se conserva al renovar. Pasadas **12 horas** desde el ingreso, `refrescar` responde `401` con `SESION_VENCIDA` y hay que ingresar de nuevo |
| En "Nueva publicación" | Por excepción, esta pantalla renueva el token sola (al entrar, cada 5 minutos y al volver a mostrar la pestaña) para no perder lo que se está escribiendo; ahí el modal no aparece |

**Tests:** `backend/test/autorizar.e2e-spec.ts` (datos actuales, sin clave, persona inexistente o deshabilitada, tokens inválidos), `backend/test/refrescar.e2e-spec.ts` (renovación, duración, `inicio` constante, tope de 12 horas, tokens vencidos o firmados con otra clave), `servicios/sesion/sesion.spec.ts` (aviso a los 10 minutos, extender, cerrar, vencimiento, red caída), `componentes/aviso-sesion/aviso-sesion.spec.ts`, `servicios/auth/auth.spec.ts` (lectura del vencimiento), `interceptores/sesion-vencida-interceptor.spec.ts`, `servicios/borrador/borrador.spec.ts`, `servicios/fotos-borrador/fotos-borrador.spec.ts` y `pages/nueva-publicacion/nueva-publicacion.spec.ts`.

---

## Logs

El backend escribe **una línea de JSON por evento** en la salida estándar, en local y en producción. Render las junta y de ahí pueden salir hacia Grafana (Loki) sin transformarlas. Todo el código, incluidos los mensajes de arranque de Nest, sale con el mismo formato.

```json
{
  "timestamp":"2026-11-03T14:20:11.512Z",
  "nivel":"info",
  "servicio":"banquete",
  "modulo":"LogsHttpInterceptor",
  "id_solicitud":"7f0c2b1e-4a53-4f0e-9d1a-0c5e8a2b6d11",
  "evento":"solicitud_exitosa",
  "mensaje":"POST /auth/ingresar 201",
  "metodo":"POST",
  "path":"/auth/ingresar",
  "estado_http":201,
  "latencia_ms":84,
  "ip":"203.0.113.7",
  "id_usuario":"665f1c..."
}
```

### Campos

| Campo            | Qué es                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| `timestamp`      | Fecha y hora en ISO 8601 (UTC)                                                      |
| `nivel`          | `info`, `warn` o `error`                                                            |
| `servicio`       | Nombre fijo (`banquete`), para filtrar si hay más de un servicio                    |
| `modulo`         | Clase que escribió el log; sale del nombre de la clase que lo crea                  |
| `id_solicitud`   | Identificador que une todos los logs de una misma solicitud HTTP                    |
| `evento`         | Nombre estable del hecho (`ingreso_fallido`, `imagen_subida`, `solicitud_exitosa`...) |
| `mensaje`        | Texto legible para una persona                                                      |
| resto            | Campos específicos de cada evento (`id_usuario`, `nombre_usuario`, `estado_http`, `latencia_ms`...) |

Las claves siempre salen en ese orden y en `snake_case`, para que las consultas de Grafana usen los mismos nombres en todos lados.

### Quién hizo qué

Toda línea que corresponde a una persona trae su `id_usuario` **y** su `nombre_usuario`, para identificarla de un vistazo sin buscar el id. El nombre viaja en el token y, para los eventos de negocio, se confirma contra la base.

| Evento                    | Campos de negocio                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `usuario_registrado`      | `id_usuario`, `nombre_usuario`, `perfil`                                                            |
| `usuario_creado`          | `id_usuario`, `nombre_usuario`, `perfil`, `id_administrador`                                        |
| `usuario_deshabilitado`   | `id_usuario`, `id_administrador`                                                                    |
| `usuario_habilitado`      | `id_usuario`, `id_administrador`                                                                    |
| `ingreso_correcto`        | `id_usuario`, `nombre_usuario`                                                                      |
| `ingreso_rechazado`       | `id_usuario`, `nombre_usuario` (cuenta deshabilitada)                                               |
| `publicacion_creada`      | `id_publicacion`, `id_usuario`, `nombre_usuario`, `tipo`                                            |
| `publicacion_eliminada`   | `id_publicacion`, `id_usuario`, `nombre_usuario`, `id_autor`, `nombre_autor`, `por_administrador`   |
| `me_gusta_dado`           | `id_publicacion`, `id_usuario`, `nombre_usuario`, `id_autor`, `nombre_autor`, `cantidad_me_gusta`   |
| `me_gusta_quitado`        | los mismos, con la cantidad que quedó                                                               |

La línea del evento y la línea HTTP de la misma solicitud comparten `id_solicitud` (la HTTP trae además la IP).

### Historial de me gusta

Los logs sirven para auditar, pero se pierden. Para poder sacar métricas, cada me gusta dado o quitado queda también como un documento en la colección **`eventos_megusta`**, que **sólo se agrega y nunca se modifica ni se borra**. La colección `megusta` sólo guarda los me gusta vigentes; ésta guarda toda la historia.

| Campo               | Qué es                                                        |
| ------------------- | ------------------------------------------------------------- |
| `tipo`              | `dado` o `quitado`                                            |
| `usuario`, `nombreUsuario`   | Quién lo hizo                                        |
| `publicacion`, `tituloPublicacion` | A qué publicación, con el título de ese momento |
| `autor`, `nombreAutor`       | Quién es el autor de la publicación                  |
| `cantidadMeGusta`   | Cuántos me gusta tenía la publicación justo después          |
| `fecha`             | Cuándo                                                        |

Los nombres se copian en cada evento, así la información queda legible aunque cambie el título o se dé de baja la publicación. Si guardar el evento falla, el me gusta se guarda igual y queda una línea de error `evento_me_gusta_no_registrado`.

Consultas de ejemplo en `mongosh`:

```js
// Me gusta dados por día
db.eventos_megusta.aggregate([
  { $match: { tipo: 'dado' } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }, total: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

// Cuántos me gusta recibió cada autor (dados menos quitados)
db.eventos_megusta.aggregate([
  { $group: { _id: '$nombreAutor', neto: { $sum: { $cond: [{ $eq: ['$tipo', 'dado'] }, 1, -1] } } } },
  { $sort: { neto: -1 } }
])

// Cuándo y quién dio y quitó me gusta en una publicación
db.eventos_megusta.find({ publicacion: ObjectId('...') }).sort({ fecha: 1 })
```

### Niveles

| Nivel   | Cuándo                                                                      |
| ------- | --------------------------------------------------------------------------- |
| `info`  | Funcionamiento normal: respuestas 2xx y 3xx, ingreso correcto, imagen subida |
| `warn`  | El cliente hizo algo mal: respuestas 4xx, ingreso fallido, token rechazado, límite superado |
| `error` | Falló el servidor: respuestas 5xx, errores no controlados                    |

### Arquitectura

Todo vive en `backend/src/logs/`.

| Pieza                    | Archivo                      | Qué hace                                                                                         |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `LoggerGlobal`           | `logger-global.ts`           | Implementa el `LoggerService` de Nest. Se pasa a `NestFactory.create`, así los logs internos de Nest salen con el mismo formato. También arma y escribe la línea JSON (`crearLog`, `emitirLog`) |
| `LoggerFactory`       | `logs.factory.ts`            | Proveedor global. `crear('NombreDeClase')` devuelve un logger ya asociado a ese módulo           |
| `ContextLogger`          | `logs.factory.ts`            | Logger que usan los servicios: `info`, `advertir` y `error`, cada uno con `evento`, `mensaje` y campos extra |
| `EVENTOS_DE_LOG`         | `logs.factory.ts`            | Catálogo de nombres de evento, para que no se escriban a mano                                    |
| `asignarIdSolicitud`     | `id-solicitud.middleware.ts` | Middleware que le da un id a cada solicitud y lo guarda en un `AsyncLocalStorage`                |
| `LogsHttpInterceptor`    | `logs-http.interceptor.ts`   | Registra una línea por solicitud respondida: método, path, estado, latencia, IP y usuario        |
| `LogsModule`             | `logs.module.ts`             | Módulo `@Global()`: registra la fábrica, el interceptor (`APP_INTERCEPTOR`) y aplica el middleware a todas las rutas |

Cómo se usa en un servicio:

```ts
constructor(loggerFactory: LoggerFactory) {
  this.logger = loggerFactory.crear(AuthService.name);
}

this.logger.info(EVENTOS_DE_LOG.INGRESO_CORRECTO, 'Ingreso correcto', { id_usuario });
```

### Cómo viaja una solicitud

1. Llega la solicitud y el middleware toma el encabezado `X-Request-Id` si tiene entre 8 y 64 caracteres alfanuméricos, guiones o guiones bajos; si no, genera un UUID. Lo devuelve en el mismo encabezado de la respuesta.
2. El id queda guardado en un `AsyncLocalStorage` durante toda la solicitud. Por eso los servicios no lo reciben por parámetro: `crearLog` lo lee solo.
3. Los guards y servicios escriben sus eventos. Todos salen con el mismo `id_solicitud`.
4. Al responder, el interceptor escribe la línea de la solicitud: `solicitud_exitosa` (2xx y 3xx), `solicitud_rechazada` (4xx) o `solicitud_fallida` (5xx). El `path` no incluye los parámetros de consulta (`?...`), para no guardar datos que viajen ahí.

Los interceptores corren después de los guards. Cuando un guard rechaza la solicitud (401 o 429), el interceptor no llega a verla, así que `AuthGuard` (`token_ausente`) y `LimiteSolicitudesGuard` (`limite_superado`) escriben cada uno su `warn`.

### Qué no se escribe

Los logs no incluyen claves, tokens, el encabezado `Authorization`, cadenas de conexión, claves de API ni el cuerpo de las solicitudes. De las personas solo se registra su `id_usuario`, nunca el correo.

### Ver los logs en Grafana (local)

`docker-compose.yml` incluye tres servicios para mirar los logs del backend que corre en Docker:

| Servicio  | Qué hace                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `alloy`   | Lee la salida de los contenedores del servicio `backend` y la manda a Loki |
| `loki`    | Guarda los logs                                                          |
| `grafana` | Los muestra en `http://localhost:3000` (sin login, solo para uso local)  |

```bash
docker compose up --build
```

El dashboard **Banquete - Logs** ya viene cargado: solicitudes por resultado (`solicitud_exitosa`, `solicitud_rechazada`, `solicitud_fallida`), cantidad de fallidas y rechazadas, latencia p95, eventos de aviso y error, y la lista de logs. En la variable `id_solicitud` de arriba se pega un id para ver todo lo que pasó en esa solicitud.

![Dashboard Banquete - Logs en Grafana](grafana/dashboard-logs.png)

En *Explore* se pueden hacer consultas libres con LogQL. Por ejemplo, los ingresos fallidos:

```
{service_name="backend"} | json | evento="ingreso_fallido"
```

Solo se ven los logs del backend levantado con Docker Compose, no los del `npm run start:dev` ni los de Render. La configuración está en `grafana/`.

### Límite de solicitudes

Se usa `@nestjs/throttler`. Cada IP tiene dos contadores que corren juntos, y alcanza con pasarse de uno para recibir el `429`:

| Nombre      | Para qué sirve                                              | Ventana por defecto |
| ----------- | ----------------------------------------------------------- | ------------------- |
| `burst`     | Frena ráfagas: muchas solicitudes en muy poco tiempo        | 1 segundo           |
| `sustained` | Frena el uso excesivo sostenido: muchas solicitudes en un rato | 60 segundos      |

**Valores por defecto**

| Rutas                               | `burst`        | `sustained`                                        |
| ----------------------------------- | -------------- | -------------------------------------------------- |
| Todas (general)                     | 10 por segundo | 120 por minuto                                     |
| `POST /auth/ingresar` y `POST /auth/registro` | 3 por segundo | 10 por minuto. Al pasarse, la IP queda **bloqueada 5 minutos** |
| `GET /health`                       | sin límite     | sin límite                                         |

El bloqueo de 5 minutos existe porque ingreso y registro son los blancos de los intentos de adivinar claves: pasarse del límite sostenido castiga más que pasarse del burst, que solo espera un segundo. Como las dos rutas comparten el contador, una IP bloqueada en el ingreso tampoco puede registrarse durante ese tiempo.

**Variables de entorno** (todas opcionales; si falta alguna vale el número por defecto)

| Variable                                | Por defecto | Qué cambia                                              |
| --------------------------------------- | ----------- | ------------------------------------------------------- |
| `LIMITE_BURST_SEGUNDOS`                 | 1           | Ventana del `burst`, en todas las rutas con límite      |
| `LIMITE_BURST_SOLICITUDES`              | 10          | Máximo del `burst` en el resto de las rutas             |
| `LIMITE_SUSTAINED_SEGUNDOS`             | 60          | Ventana del `sustained`, en todas las rutas con límite  |
| `LIMITE_SUSTAINED_SOLICITUDES`          | 120         | Máximo del `sustained` en el resto de las rutas         |
| `LIMITE_INGRESO_BURST_SOLICITUDES`      | 3           | Máximo del `burst` en ingreso y registro                |
| `LIMITE_INGRESO_SUSTAINED_SOLICITUDES`  | 10          | Máximo del `sustained` en ingreso y registro            |
| `LIMITE_INGRESO_BLOQUEO_SEGUNDOS`       | 300         | Duración del bloqueo al pasarse del `sustained` en ingreso y registro |

| Variable                                | Por defecto | Qué cambia                                              |
| --------------------------------------- | ----------- | ------------------------------------------------------- |

**Cómo está armado**

- `backend/src/configs/throttler.config.ts` define las tres piezas: `LIMITES_GENERALES` (los dos contadores, registrados en `ThrottlerModule.forRoot`), `LIMITES_AUTENTICACION` (se aplica con `@Throttle` en `ingresar` y `registro`) y `SIN_LIMITES` (se aplica con `@SkipThrottle` en `HealthController`).
- Los valores son funciones que leen la variable en cada solicitud, porque los decoradores de los controladores se evalúan antes de que se cargue el `.env`.
- `LimiteSolicitudesGuard` (`backend/src/common/`) extiende el `ThrottlerGuard` de la librería y se registra como guard global con `APP_GUARD`. Agrega el código de error, el encabezado `Retry-After` estándar y un log `limite_superado`.
- Se cuenta por IP. Como en Render hay un proxy delante, `main.ts` configura `trust proxy` para tomar la IP real del cliente y no la del proxy.
- Los contadores viven en memoria: se reinician con cada deploy o reinicio. Sirve mientras haya una sola instancia del backend; con varias haría falta un almacenamiento compartido, como Redis.

**Qué recibe el cliente al pasarse**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 300
Retry-After-sustained: 300
```

```json
{ "message": "Demasiadas solicitudes, espera un momento", "codigo": "DEMASIADAS_SOLICITUDES" }
```

- `Retry-After` son los segundos que hay que esperar. La librería suma además `Retry-After-burst` o `Retry-After-sustained`, según el contador que se superó.
- El frontend traduce el `codigo` (`DEMASIADAS_SOLICITUDES`) a un mensaje en el idioma elegido; no muestra el texto de `message`.

**Tests** (`backend/test/limites.e2e-spec.ts`): el cuarto ingreso en un segundo responde `429`; la respuesta trae el código y `Retry-After`; el registro tiene el mismo límite; pasado un segundo vuelve a aceptar; más de 10 intentos en un minuto bloquean más de un minuto; el resto de las rutas admite 10 por segundo y `/health` no tiene ninguno.

---

## Estructura de carpetas

```
.
├── backend/                  NestJS
│   └── src/
│       ├── auth/
│       ├── common/           Guard de límite de solicitudes y DTOs compartidos
│       ├── configs/          Límites de solicitudes
│       ├── health/           GET /health
│       ├── imagenes/
│       ├── logs/             Logs estructurados e id de solicitud
│       ├── publicaciones/
│       ├── usuarios/
│       ├── app.module.ts
│       ├── main.ts
│       └── validacion-global.ts
├── frontend/                 Angular
│   └── src/
│       ├── app/
│       └── environments/
├── grafana/                  Alloy, fuente de datos y dashboard de logs
├── .husky/                   Hooks de git
├── .nvmrc
├── commitlint.config.js
├── package.json              Solo herramientas del repo
└── docker-compose.yml        Mongo y backend
```
