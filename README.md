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
- [Estructura de carpetas](#estructura-de-carpetas)

---

## Aplicación en línea

| Pieza      | Dónde                       | Dirección                                                |
| ---------- | --------------------------- | -------------------------------------------------------- |
| Frontend   | Vercel                      | https://laura-carelli-tp-2-prog-4-2026-c2.vercel.app     |
| Backend    | Render                      | https://laura-carelli-tp2-prog4-2026-c2.onrender.com     |
| Base       | MongoDB Atlas               | Base `redsocial`                                         |
| Imágenes   | Cloudinary                  | Carpeta `banquete`                                       |

El plan gratis de Render duerme el backend tras unos minutos sin uso: el primer pedido puede tardar hasta un minuto en responder.

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
| ESLint    | frontend, con `angular-eslint` 22 |
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
| `npm run lint`       | Oxlint sobre `src/` y `test/`         |
| `npm run format`     | Prettier da formateo                  |

| Comando (frontend) | Qué hace                      |
| ------------------ | ----------------------------- |
| `npm start`        | Levantar desarrollo           |
| `npm run build`    | Build de producción a `dist/` |
| `npm test`         | Tests en modo watch           |
| `npm run test:cov` | Tests con cobertura           |
| `npm run lint`     | ESLint sobre TypeScript y templates |

---

## Hooks de git

| Hook         | Qué hace                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: Oxlint y Prettier en `backend/`, ESLint y Prettier en `frontend/` |
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

## Estructura de carpetas

```
.
├── backend/                  NestJS
│   └── src/
│       ├── app.module.ts
│       ├── main.ts
│       └── validacion-global.ts
├── frontend/                 Angular
│   └── src/
│       ├── app/
│       └── environments/
├── .husky/                   Hooks de git
├── .nvmrc
├── commitlint.config.js
├── package.json              Solo herramientas del repo
└── docker-compose.yml        Mongo y backend
```
