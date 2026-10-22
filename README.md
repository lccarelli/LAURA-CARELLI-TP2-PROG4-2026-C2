# Trabajo Practico Red Social

**Red social**

TP2 de Programación IV.
**UTN FRA | División 341 | 2026 C2**

**Profesores**

- Agustín Friadenrich
- Natalia Diez

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Tailwind_CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-24_LTS-339933?logo=node.js&logoColor=white)

---

## Indice

- [Características técnicas](#características-técnicas)
- [Cómo correr el proyecto](#cómo-correr-el-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Estructura de carpetas](#estructura-de-carpetas)

---

## Características técnicas

| Pieza     | Versión                       |
| --------- | ----------------------------- |
| Angular   | 21.2.x                        |
| NestJS    | 12.x                          |
| MongoDB   | 8 (Docker)                    |
| Mongoose  | 9.x                           |
| Node      | 24 (LTS)                      |
| Tailwind  | 4.1.x                         |
| Vitest    | 4.x                           |
| Oxlint    | backend                       |
| Prettier  | 3.x                           |

---

## Cómo correr el proyecto

Base de datos, desde la raíz:

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
| `npm run test:e2e`   | Tests de API contra Mongo             |
| `npm run lint`       | Oxlint sobre `src/` y `test/`         |
| `npm run format`     | Prettier da formateo                  |

| Comando (frontend) | Qué hace                      |
| ------------------ | ----------------------------- |
| `npm start`        | Levantar desarrollo           |
| `npm run build`    | Build de producción a `dist/` |
| `npm test`         | Tests en modo watch           |

---

## Variables de entorno

Se definen en `backend/.env` (hay un ejemplo en `backend/.env.example`). El `.env` no se sube.

| Variable       | Para qué                                              |
| -------------- | ----------------------------------------------------- |
| `MONGO_URI`    | Conexión a MongoDB                                    |
| `PORT`         | Puerto del backend (3001 en local)                    |
| `FRONTEND_URL` | Origen permitido por CORS (por defecto `http://localhost:4200`) |

La URL de la API que usa el frontend está en `frontend/src/environments/`.

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
└── docker-compose.yml        Mongo y backend
```
