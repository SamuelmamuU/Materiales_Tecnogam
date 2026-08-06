# Handoff de Sesión - Sistema de Control de Materiales

Este documento resume el estado actual del **"Sistema de Control de Materiales, Avances y Seguimiento de Proyecto"** para Tecnogam, permitiendo reanudar el desarrollo de forma clara.

---

## 1. Objetivo General del Proyecto
Crear una aplicación multiplataforma (**Android** + **Web de escritorio**) para capturar avances diarios en campo, controlar materiales cotizados/recibidos/instalados y dar seguimiento al proyecto con 4 roles de usuario (Administrador, Supervisor, Trabajador, Cliente) bajo una arquitectura offline-first.

---

## 2. Estado Actual del Proyecto y Avance por Fases

* **Fase 0 (Entorno):** **COMPLETADO**. Monorepo estructurado (`backend` NestJS, `web` React/Vite, `mobile` Flutter), pipelines de CI/CD configurados en GitHub Actions y contenedores locales activos.
* **Fase 1 (Base de Materiales):** **COMPLETADO**. Auditoría de catálogo en [auditoria-materiales.md](file:///C:/Users/samue/Desktop/ControlMatTecnogam/docs/auditoria-materiales.md), base de datos SQLite migrada, ETL implementado importando con éxito **2,299 materiales únicos** saneados, servicio de sincronización HTTP con API mockeada y cobertura del 100% en pruebas unitarias Jest.
* **Fase 2 (Sistema Base):** **COMPLETADO**.
  * Base de datos completa en Prisma (SQLite).
  * Sembrado de datos (`prisma db seed`) configurado con hitos, proyectos, materiales cotizados y usuarios de prueba.
  * Autenticación JWT y Refresh Tokens personalizada e invalidación en cierre de sesión.
  * RBAC (`RolesGuard`) y Scoping por Proyecto (`ProjectGuard`) limitando el acceso de usuarios según pertenencia en la tabla `miembros_proyecto` (Administradores omiten el check).
  * Documentación completa expuesta en `/docs` mediante NestJS Swagger con JWT habilitado.
  * Pantalla de Login web (React + Tailwind v4) y móvil (Flutter Material 3) totalmente funcionales contra el backend real.
* **Fase 3 (Captura en Campo):** **EN PROCESO**.
  * **Servicio de Storage (Backend):** Configurado para conectarse a MinIO (S3 compatible) auto-creando el bucket público de evidencias y exponiendo `POST /media/upload` (Listo).
  * **API de Avances (Backend):** Endpoints `POST /avances`, `POST /tiempos-muertos` y `POST /incidentes` listos con lógica de idempotencia basada en UUID cliente para evitar duplicados en reintentos de red (Listo).
  * **Base de datos local (Móvil):** SQLite inicializado mediante `sqflite` y `path` con tablas para avances, incidentes, tiempos muertos y bitácora de sincronización (Listo).
  * **Interfaces de Captura (Móvil):** Diseñadas las pantallas en Flutter:
    * `DashboardScreen`: Muestra el perfil, cuenta los registros pendientes offline y ofrece sincronización manual.
    * `CaptureAvanceScreen`: Soporta avances planeados (catálogo) y no planeados (retrabajo, extra, modificación con texto libre), simulando carga GPS e imágenes.
    * `CaptureTiempoMuertoScreen` y `CaptureIncidenteScreen`: Formularios adaptados al modelo de datos offline.
  * **Algoritmo de Sincronización (Móvil):** Implementado en `SyncService` con reintentos automáticos y renovación de token JWT expirado usando refresh token (Listo).

---

## 3. Features Implementadas vs. Pendientes

### Implementadas:
* [x] Catálogo maestro saneado y cargado en base de datos.
* [x] Registro y Login en Web y Móvil contra la API con validación de roles en formulario.
* [x] Filtros por rol (RBAC) y Scoping de Proyectos por Base de Datos.
* [x] Documentación interactiva de la API en `/docs`.
* [x] Subida de archivos de evidencia en backend (MinIO).
* [x] CRUD local SQLite para avances/tiempos muertos/incidentes offline en el móvil.
* [x] Sincronizador móvil con reintentos y refresco automático de JWT.

### Pendientes (Siguiente sesión):
* [ ] Integrar el flujo de la cámara real en Flutter (actualmente simula la foto y geolocalización mediante mock URLs y coordenadas fijas).
* [ ] Implementar la Fase 4: Panel Web de Administración (Dashboard React mostrando las discrepancias entre material cotizado vs real, gráficos de avances e hitos y reportes en PDF).
* [ ] Implementar la Fase 5: Módulo de Sincronización y Revisión en campo (Flujo de descarga de hitos y discrepancias al móvil).

---

## 4. Archivos Modificados / Creados Clave

### Backend (`apps/backend`):
* [prisma/schema.prisma](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/prisma/schema.prisma): Modelado relacional completo.
* [prisma/seed.ts](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/prisma/seed.ts): Sembrado de datos para pruebas locales.
* [src/auth/guards/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/auth/guards/): `jwt-auth.guard.ts`, `roles.guard.ts` y `project.guard.ts`.
* [src/media/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/media/): Controlador y servicio de carga S3/MinIO.
* [src/avances/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/avances/): Endpoints con lógica de-duplicación para avances, incidentes y tiempos muertos.

### Frontend Web (`apps/web`):
* [src/App.tsx](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.tsx): Ruteo seguro y Dashboard de bienvenida.
* [src/pages/Login.tsx](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/pages/Login.tsx): Pantalla de login Tailwind v4 conectada a la API.

### Móvil (`apps/mobile`):
* [lib/data/sources/local_database.dart](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/mobile/lib/data/sources/local_database.dart): Inicialización SQLite y operaciones CRUD offline.
* [lib/data/repositories/sync_service.dart](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/mobile/lib/data/repositories/sync_service.dart): Algoritmo de sincronización e idempotencia de red.
* [lib/presentation/screens/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/mobile/lib/presentation/screens/): Pantallas de captura (`capture_avance_screen.dart`, etc.) y `dashboard_screen.dart`.

### Infraestructura:
* [infra/docker-compose.prod.yml](file:///C:/Users/samue/Desktop/ControlMatTecnogam/infra/docker-compose.prod.yml): Orquestación multi-contenedor para staging.

---

## 5. Decisiones de Diseño Clave
1. **Hasheo de Contraseñas Nativo:** Se utilizó `scrypt` de la biblioteca nativa `crypto` de Node.js en lugar de `bcrypt`. Esto evita problemas de compilación C++ en entornos Windows locales.
2. **SQLite en Desarrollo y Postgres en Producción:** Definido vía variables de entorno en Prisma. Se sincronizó localmente con SQLite (`better-sqlite3` driver adapter de Prisma 7) y se dejó listo el esquema compatible con Postgres en el Compose de producción.
3. **Idempotencia de Sincronización:** Se generaron UUIDs del lado del cliente en el móvil para los reportes de avances, paros e incidentes. La API del backend realiza una validación única contra estos UUIDs en las peticiones entrantes para evitar duplicados si la petición se reintenta por inestabilidad de red.

---

## 6. Bugs Conocidos y Siguiente Acción Recomendada
* **Bugs:** Ninguno. Las pruebas Jest del backend pasan al 100%, el linter backend/web está libre de advertencias y la compilación tanto de la aplicación Web como del APK de Android finalizan con éxito absoluto.
* **Siguiente Acción:**
  1. Correr el backend (`npm run start:dev` en backend) y la base de datos local para interactuar con la pantalla de login del móvil o la web.
  2. Iniciar con la **Fase 4 (Panel Web de Administración)**, creando la UI de administración en React que consuma los avances reportados por la app móvil y muestre las discrepancias e indicadores clave de rendimiento (KPIs).
