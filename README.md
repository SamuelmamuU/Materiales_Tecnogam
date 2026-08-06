# Sistema de Control de Materiales, Avances y Seguimiento de Proyecto

Este es un monorepo que contiene la solución multiplataforma para el **Sistema de Control de Materiales, Avances y Seguimiento de Proyecto** de la empresa de instalación Tecnogam.

## Estructura del Monorepo

El repositorio está organizado de la siguiente manera:

```text
├── apps/
│   ├── backend/      # Backend API en NestJS + Prisma + PostgreSQL
│   ├── web/          # Frontend Web en React + Vite + Tailwind CSS + shadcn/ui
│   └── mobile/       # Aplicación Móvil en Flutter (Exclusivo para Android en esta fase)
├── docs/             # Documentación del proyecto (requerimientos, tecnologías, plan, mockup)
└── infra/            # Configuración de Docker Compose local y scripts de despliegue
```

## Tecnologías Utilizadas

- **Backend:** NestJS, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, MinIO, Swagger.
- **Frontend Web:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts.
- **Móvil (Android):** Flutter, Dart, SQLite (Drift), WorkManager, Camera, Geolocator.
- **Infraestructura:** Docker, docker-compose, GitHub Actions.

## Instrucciones de Arranque Local

### Requisitos Previos

Asegúrate de tener instalado en tu máquina local:
- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (con soporte para Android SDK)
- [Docker](https://www.docker.com/) y Docker Compose

### Paso 1: Levantar Servicios de Infraestructura Local
Desde la raíz del repositorio, ejecuta:
```bash
docker compose -f infra/docker-compose.yml up -d
```
Esto iniciará los siguientes contenedores locales en segundo plano:
- **PostgreSQL** (Puerto `5432`): Base de datos transaccional principal.
- **Redis** (Puerto `6379`): Cola de mensajería para sincronización con BullMQ.
- **MinIO** (Puertos `9000` y `9001`): Almacenamiento de evidencias fotográficas compatible con S3.

### Paso 2: Configuración del Backend (NestJS)
1. Ve a la carpeta del backend:
   ```bash
   cd apps/backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno copiando el archivo `.env.example` (una vez creado) o usa las del docker-compose.
4. Ejecuta las migraciones de base de datos:
   ```bash
   npx prisma migrate dev
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run start:dev
   ```

### Paso 3: Configuración del Dashboard Web (React)
1. Ve a la carpeta de la web:
   ```bash
   cd apps/web
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Paso 4: Configuración de la App Móvil (Flutter)
1. Ve a la carpeta de la app móvil:
   ```bash
   cd apps/mobile
   ```
2. Obtén las dependencias:
   ```bash
   flutter pub get
   ```
3. Levanta la app en tu emulador o dispositivo Android conectado:
   ```bash
   flutter run
   ```

---

## Convenciones de Desarrollo

### Ramas y Flujo Git
Sigue la estructura de ramas del plan de proyecto:
- **Ramas de tareas**: `feature/<fase>-<tarea-corta>` (Ej: `feature/f3-motor-contraste`).
- Todo el trabajo debe integrarse mediante Pull Requests.

### Convención de Commits
Se utiliza la convención `tipo(alcance): descripción`:
- `feat`: Nueva funcionalidad (Ej: `feat(backend): implement auth endpoints`).
- `fix`: Corrección de errores.
- `test`: Añadir o modificar pruebas.
- `docs`: Documentación.
- `chore`: Tareas de mantenimiento, dependencias o configuración.

### Definición de Hecho (DoD)
Antes de marcar una tarea como completada, asegúrate de:
1. Código implementado siguiendo el stack definido.
2. Pruebas unitarias/de integración automatizadas que cubran la lógica de negocio.
3. Endpoints documentados en Swagger.
4. Sin errores de linter o compilación.
5. Coherencia total con los layouts e interacciones definidos en el Mockup (`docs/mockup_app_control_materiales.html`).
